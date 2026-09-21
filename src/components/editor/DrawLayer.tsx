import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Hotspot, HotspotShape, Point } from "../../types";
import {
  boundingBox,
  clamp,
  clientToPercent,
  moveShape,
  movePoint,
  pointInAnyShape,
  pointsToSvgAttr,
  rectFromPoints,
  resizeRect,
  shapeToPolygonPoints,
  type RectHandle,
} from "../../lib/geometry";

export type Tool = "select" | "rect" | "polygon";
export type DrawMode = "new" | "add-area" | "spotlight" | "connector-shape" | "ai-region";

type DragTarget =
  | { kind: "area"; hotspotId: string; index: number }
  | { kind: "spotlight"; hotspotId: string };

type DragSession =
  | { type: "move"; target: DragTarget; start: Point; startShape: HotspotShape }
  | {
      type: "resize";
      target: DragTarget;
      handle: RectHandle;
      start: Point;
      startShape: HotspotShape & { kind: "rect" };
    }
  | {
      type: "vertex";
      target: DragTarget;
      index: number;
      start: Point;
      startShape: HotspotShape & { kind: "polygon" };
    }
  | { type: "anchor"; id: string; start: Point; startAnchor: Point };

interface DrawLayerProps {
  hotspots: Hotspot[];
  selectedId: string | null;
  tool: Tool;
  drawMode: DrawMode;
  onSelect: (id: string | null) => void;
  onCreate: (shape: HotspotShape) => void;
  onAddArea: (id: string, shape: HotspotShape) => void;
  onSetSpotlight: (id: string, shape: HotspotShape) => void;
  onSetConnectorShape: (id: string, shape: HotspotShape) => void;
  onPickAIRegion: (shape: HotspotShape) => void;
  onCommitAreaShape: (id: string, index: number, shape: HotspotShape) => void;
  onCommitSpotlightShape: (id: string, shape: HotspotShape) => void;
  onCommitAnchor: (id: string, anchor: Point) => void;
  onToolChange: (tool: Tool) => void;
  onDrawModeChange: (mode: DrawMode) => void;
}

const RECT_HANDLES: RectHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function DrawLayer({
  hotspots,
  selectedId,
  tool,
  drawMode,
  onSelect,
  onCreate,
  onAddArea,
  onSetSpotlight,
  onSetConnectorShape,
  onPickAIRegion,
  onCommitAreaShape,
  onCommitSpotlightShape,
  onCommitAnchor,
  onToolChange,
  onDrawModeChange,
}: DrawLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rectDraft, setRectDraft] = useState<{ a: Point; b: Point } | null>(null);
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  const [polyCursor, setPolyCursor] = useState<Point | null>(null);
  const [draftShape, setDraftShape] = useState<{ target: DragTarget; shape: HotspotShape } | null>(
    null,
  );
  const [draftAnchor, setDraftAnchor] = useState<{ id: string; anchor: Point } | null>(null);
  const dragRef = useRef<DragSession | null>(null);

  function toPt(e: { clientX: number; clientY: number }): Point {
    return clientToPercent(svgRef.current!, e.clientX, e.clientY);
  }

  function areaShapeFor(h: Hotspot, index: number): HotspotShape {
    if (
      draftShape &&
      draftShape.target.kind === "area" &&
      draftShape.target.hotspotId === h.id &&
      draftShape.target.index === index
    ) {
      return draftShape.shape;
    }
    return h.areas[index];
  }

  function spotlightShapeFor(h: Hotspot): HotspotShape | null {
    if (draftShape && draftShape.target.kind === "spotlight" && draftShape.target.hotspotId === h.id) {
      return draftShape.shape;
    }
    return h.spotlightShape;
  }

  function anchorFor(h: Hotspot): Point {
    return draftAnchor && draftAnchor.id === h.id ? draftAnchor.anchor : h.anchor;
  }

  function allAreaShapes(h: Hotspot): HotspotShape[] {
    return h.areas.map((_, i) => areaShapeFor(h, i));
  }

  function finishDraw(shape: HotspotShape) {
    if (drawMode === "add-area" && selectedId) {
      onAddArea(selectedId, shape);
    } else if (drawMode === "spotlight" && selectedId) {
      onSetSpotlight(selectedId, shape);
    } else if (drawMode === "connector-shape" && selectedId) {
      onSetConnectorShape(selectedId, shape);
    } else if (drawMode === "ai-region") {
      onPickAIRegion(shape);
    } else {
      onCreate(shape);
    }
    onToolChange("select");
    onDrawModeChange("new");
  }

  function handlePointerDownRoot(e: ReactPointerEvent<SVGSVGElement>) {
    const pt = toPt(e);

    if (tool === "rect") {
      setRectDraft({ a: pt, b: pt });
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "polygon") {
      setPolyPoints((pts) => [...pts, pt]);
      return;
    }

    for (let i = hotspots.length - 1; i >= 0; i--) {
      const h = hotspots[i];
      if (pointInAnyShape(allAreaShapes(h), pt)) {
        onSelect(h.id);
        const areaIndex = h.areas.findIndex((_, idx) => {
          const shape = areaShapeFor(h, idx);
          return pointInAnyShape([shape], pt);
        });
        if (areaIndex >= 0) {
          dragRef.current = {
            type: "move",
            target: { kind: "area", hotspotId: h.id, index: areaIndex },
            start: pt,
            startShape: h.areas[areaIndex],
          };
          (e.target as Element).setPointerCapture(e.pointerId);
        }
        return;
      }
    }
    onSelect(null);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const pt = toPt(e);

    if (rectDraft) {
      setRectDraft({ a: rectDraft.a, b: pt });
      return;
    }

    if (tool === "polygon" && polyPoints.length > 0) {
      setPolyCursor(pt);
      return;
    }

    const session = dragRef.current;
    if (!session) return;
    const dx = pt.x - session.start.x;
    const dy = pt.y - session.start.y;

    if (session.type === "move") {
      setDraftShape({ target: session.target, shape: moveShape(session.startShape, dx, dy) });
    } else if (session.type === "resize") {
      setDraftShape({
        target: session.target,
        shape: resizeRect(session.startShape, session.handle, dx, dy),
      });
    } else if (session.type === "vertex") {
      const points = session.startShape.points.map((p, i) =>
        i === session.index ? movePoint(p, dx, dy) : p,
      );
      setDraftShape({ target: session.target, shape: { kind: "polygon", points } });
    } else if (session.type === "anchor") {
      setDraftAnchor({ id: session.id, anchor: movePoint(session.startAnchor, dx, dy) });
    }
  }

  function handlePointerUp() {
    if (rectDraft) {
      const shape = rectFromPoints(rectDraft.a, rectDraft.b);
      setRectDraft(null);
      if (shape.w > 0.5 && shape.h > 0.5) finishDraw(shape);
      return;
    }
    const session = dragRef.current;
    if (session) {
      if (session.type === "anchor" && draftAnchor && draftAnchor.id === session.id) {
        onCommitAnchor(session.id, draftAnchor.anchor);
      } else if (session.type !== "anchor" && draftShape) {
        const { target, shape } = draftShape;
        if (target.kind === "area") onCommitAreaShape(target.hotspotId, target.index, shape);
        else onCommitSpotlightShape(target.hotspotId, shape);
      }
    }
    dragRef.current = null;
    setDraftShape(null);
    setDraftAnchor(null);
  }

  function finishPolygon() {
    if (polyPoints.length >= 3) finishDraw({ kind: "polygon", points: polyPoints });
    setPolyPoints([]);
    setPolyCursor(null);
  }

  function cancelPolygon() {
    setPolyPoints([]);
    setPolyCursor(null);
  }

  const drawingHint =
    drawMode === "add-area"
      ? "Dessine une zone supplémentaire pour le bloc sélectionné"
      : drawMode === "spotlight"
        ? "Dessine la zone qui doit s'éclairer (spotlight)"
        : drawMode === "connector-shape"
          ? "Dessine la zone qui s'éclaire au point d'arrivée du connecteur"
          : drawMode === "ai-region"
            ? "Dessine la zone à faire analyser/redécouper par l'IA"
            : null;

  return (
    <>
      <svg
        ref={svgRef}
        className="dy-draw-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDownRoot}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={tool === "polygon" ? finishPolygon : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && tool === "polygon") finishPolygon();
          if (e.key === "Escape") {
            if (tool === "polygon") cancelPolygon();
            onDrawModeChange("new");
          }
        }}
      >
        <rect x={0} y={0} width={100} height={100} fill="transparent" />

        {hotspots.map((h) => {
          const isSelected = h.id === selectedId;
          const spotlight = spotlightShapeFor(h);
          return (
            <g key={h.id}>
              {isSelected && spotlight && (
                <polygon
                  points={pointsToSvgAttr(shapeToPolygonPoints(spotlight))}
                  fill={h.color}
                  fillOpacity={0.1}
                  stroke={h.color}
                  strokeOpacity={0.9}
                  strokeWidth={0.5}
                  strokeDasharray="4 2"
                />
              )}
              {h.areas.map((_, index) => {
                const shape = areaShapeFor(h, index);
                const points = pointsToSvgAttr(shapeToPolygonPoints(shape));
                return (
                  <polygon
                    key={index}
                    points={points}
                    fill={h.color}
                    fillOpacity={isSelected ? 0.22 : 0.08}
                    stroke={h.color}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    strokeWidth={isSelected ? 0.7 : 0.4}
                    strokeDasharray="2 1.4"
                    style={{ cursor: tool === "select" ? "move" : "default" }}
                  />
                );
              })}
              {isSelected && tool === "select" && drawMode === "new" && (
                <>
                  {h.areas.map((_, index) => (
                    <EditHandles
                      key={index}
                      shape={areaShapeFor(h, index)}
                      onHandleDown={(handle, e) => {
                        e.stopPropagation();
                        const pt = toPt(e);
                        const shape = areaShapeFor(h, index);
                        if (shape.kind === "rect") {
                          dragRef.current = {
                            type: "resize",
                            target: { kind: "area", hotspotId: h.id, index },
                            handle,
                            start: pt,
                            startShape: shape,
                          };
                        }
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                      onVertexDown={(vIndex, e) => {
                        e.stopPropagation();
                        const pt = toPt(e);
                        const shape = areaShapeFor(h, index);
                        if (shape.kind === "polygon") {
                          dragRef.current = {
                            type: "vertex",
                            target: { kind: "area", hotspotId: h.id, index },
                            index: vIndex,
                            start: pt,
                            startShape: shape,
                          };
                        }
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                    />
                  ))}
                  {spotlight && (
                    <EditHandles
                      shape={spotlight}
                      variant="spotlight"
                      onHandleDown={(handle, e) => {
                        e.stopPropagation();
                        const pt = toPt(e);
                        if (spotlight.kind === "rect") {
                          dragRef.current = {
                            type: "resize",
                            target: { kind: "spotlight", hotspotId: h.id },
                            handle,
                            start: pt,
                            startShape: spotlight,
                          };
                        }
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                      onVertexDown={(vIndex, e) => {
                        e.stopPropagation();
                        const pt = toPt(e);
                        if (spotlight.kind === "polygon") {
                          dragRef.current = {
                            type: "vertex",
                            target: { kind: "spotlight", hotspotId: h.id },
                            index: vIndex,
                            start: pt,
                            startShape: spotlight,
                          };
                        }
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                    />
                  )}
                  <AnchorHandle
                    anchor={anchorFor(h)}
                    onAnchorDown={(e) => {
                      e.stopPropagation();
                      const pt = toPt(e);
                      dragRef.current = { type: "anchor", id: h.id, start: pt, startAnchor: anchorFor(h) };
                      (e.target as Element).setPointerCapture(e.pointerId);
                    }}
                  />
                </>
              )}
            </g>
          );
        })}

        {rectDraft && (
          <rect
            x={Math.min(rectDraft.a.x, rectDraft.b.x)}
            y={Math.min(rectDraft.a.y, rectDraft.b.y)}
            width={Math.abs(rectDraft.a.x - rectDraft.b.x)}
            height={Math.abs(rectDraft.a.y - rectDraft.b.y)}
            fill="var(--dy-ink)"
            fillOpacity={0.15}
            stroke="var(--dy-ink)"
            strokeDasharray="2 1.4"
            strokeWidth={0.5}
          />
        )}

        {tool === "polygon" && polyPoints.length > 0 && (
          <polyline
            points={pointsToSvgAttr(polyCursor ? [...polyPoints, polyCursor] : polyPoints)}
            fill="none"
            stroke="var(--dy-ink)"
            strokeDasharray="2 1.4"
            strokeWidth={0.5}
          />
        )}
        {tool === "polygon" &&
          polyPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={0.8} className="dy-handle" />
          ))}
      </svg>
      {drawingHint && <div className="dy-draw-hint">{drawingHint}</div>}
    </>
  );
}

function EditHandles({
  shape,
  variant = "area",
  onHandleDown,
  onVertexDown,
}: {
  shape: HotspotShape;
  variant?: "area" | "spotlight";
  onHandleDown: (handle: RectHandle, e: ReactPointerEvent<SVGElement>) => void;
  onVertexDown: (index: number, e: ReactPointerEvent<SVGElement>) => void;
}) {
  const cls = variant === "spotlight" ? "dy-handle dy-handle-spotlight" : "dy-handle";
  if (shape.kind === "rect") {
    const box = boundingBox(shape);
    const positions: Record<RectHandle, Point> = {
      nw: { x: box.x1, y: box.y1 },
      n: { x: (box.x1 + box.x2) / 2, y: box.y1 },
      ne: { x: box.x2, y: box.y1 },
      e: { x: box.x2, y: (box.y1 + box.y2) / 2 },
      se: { x: box.x2, y: box.y2 },
      s: { x: (box.x1 + box.x2) / 2, y: box.y2 },
      sw: { x: box.x1, y: box.y2 },
      w: { x: box.x1, y: (box.y1 + box.y2) / 2 },
    };
    return (
      <>
        {RECT_HANDLES.map((handle) => {
          const p = positions[handle];
          return (
            <rect
              key={handle}
              x={p.x - 0.9}
              y={p.y - 0.9}
              width={1.8}
              height={1.8}
              className={cls}
              onPointerDown={(e) => onHandleDown(handle, e)}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      {shape.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={0.9}
          className={cls}
          onPointerDown={(e) => onVertexDown(i, e)}
        />
      ))}
    </>
  );
}

function AnchorHandle({
  anchor,
  onAnchorDown,
}: {
  anchor: Point;
  onAnchorDown: (e: ReactPointerEvent<SVGElement>) => void;
}) {
  return (
    <circle
      cx={clamp(anchor.x)}
      cy={clamp(anchor.y)}
      r={1.1}
      fill="var(--dy-bg)"
      stroke="var(--dy-ink)"
      strokeWidth={0.5}
      style={{ cursor: "grab" }}
      onPointerDown={onAnchorDown}
    />
  );
}
