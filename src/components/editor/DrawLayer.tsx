import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Hotspot, HotspotShape, Point } from "../../types";
import {
  boundingBox,
  clamp,
  clientToPercent,
  moveShape,
  movePoint,
  pointInShape,
  pointsToSvgAttr,
  rectFromPoints,
  resizeRect,
  shapeToPolygonPoints,
  type RectHandle,
} from "../../lib/geometry";

export type Tool = "select" | "rect" | "polygon";

type DragSession =
  | { type: "move"; id: string; start: Point; startShape: HotspotShape }
  | { type: "resize"; id: string; handle: RectHandle; start: Point; startShape: HotspotShape & { kind: "rect" } }
  | { type: "vertex"; id: string; index: number; start: Point; startShape: HotspotShape & { kind: "polygon" } }
  | { type: "anchor"; id: string; start: Point; startAnchor: Point };

interface DrawLayerProps {
  hotspots: Hotspot[];
  selectedId: string | null;
  tool: Tool;
  onSelect: (id: string | null) => void;
  onCreate: (shape: HotspotShape) => void;
  onCommitShape: (id: string, shape: HotspotShape) => void;
  onCommitAnchor: (id: string, anchor: Point) => void;
  onToolChange: (tool: Tool) => void;
}

const RECT_HANDLES: RectHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function DrawLayer({
  hotspots,
  selectedId,
  tool,
  onSelect,
  onCreate,
  onCommitShape,
  onCommitAnchor,
  onToolChange,
}: DrawLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rectDraft, setRectDraft] = useState<{ a: Point; b: Point } | null>(null);
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  const [polyCursor, setPolyCursor] = useState<Point | null>(null);
  const [draft, setDraft] = useState<{ id: string; shape?: HotspotShape; anchor?: Point } | null>(
    null,
  );
  const dragRef = useRef<DragSession | null>(null);

  function toPt(e: { clientX: number; clientY: number }): Point {
    return clientToPercent(svgRef.current!, e.clientX, e.clientY);
  }

  function shapeFor(h: Hotspot): HotspotShape {
    return draft && draft.id === h.id && draft.shape ? draft.shape : h.shape;
  }

  function anchorFor(h: Hotspot): Point {
    return draft && draft.id === h.id && draft.anchor ? draft.anchor : h.anchor;
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

    // select tool: hit-test topmost hotspot
    for (let i = hotspots.length - 1; i >= 0; i--) {
      const h = hotspots[i];
      if (pointInShape(shapeFor(h), pt)) {
        onSelect(h.id);
        dragRef.current = { type: "move", id: h.id, start: pt, startShape: h.shape };
        (e.target as Element).setPointerCapture(e.pointerId);
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
      setDraft({ id: session.id, shape: moveShape(session.startShape, dx, dy) });
    } else if (session.type === "resize") {
      setDraft({ id: session.id, shape: resizeRect(session.startShape, session.handle, dx, dy) });
    } else if (session.type === "vertex") {
      const points = session.startShape.points.map((p, i) =>
        i === session.index ? movePoint(p, dx, dy) : p,
      );
      setDraft({ id: session.id, shape: { kind: "polygon", points } });
    } else if (session.type === "anchor") {
      setDraft({ id: session.id, anchor: movePoint(session.startAnchor, dx, dy) });
    }
  }

  function handlePointerUp() {
    if (rectDraft) {
      const shape = rectFromPoints(rectDraft.a, rectDraft.b);
      setRectDraft(null);
      if (shape.w > 0.5 && shape.h > 0.5) {
        onCreate(shape);
        onToolChange("select");
      }
      return;
    }
    const session = dragRef.current;
    if (session && draft && draft.id === session.id) {
      if (draft.shape) onCommitShape(session.id, draft.shape);
      if (draft.anchor) onCommitAnchor(session.id, draft.anchor);
    }
    dragRef.current = null;
    setDraft(null);
  }

  function finishPolygon() {
    if (polyPoints.length >= 3) {
      onCreate({ kind: "polygon", points: polyPoints });
      onToolChange("select");
    }
    setPolyPoints([]);
    setPolyCursor(null);
  }

  function cancelPolygon() {
    setPolyPoints([]);
    setPolyCursor(null);
  }

  return (
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
        if (e.key === "Escape" && tool === "polygon") cancelPolygon();
      }}
    >
      <rect x={0} y={0} width={100} height={100} fill="transparent" />

      {hotspots.map((h) => {
        const shape = shapeFor(h);
        const points = pointsToSvgAttr(shapeToPolygonPoints(shape));
        const isSelected = h.id === selectedId;
        return (
          <g key={h.id}>
            <polygon
              points={points}
              fill={h.color}
              fillOpacity={isSelected ? 0.22 : 0.08}
              stroke={h.color}
              strokeOpacity={isSelected ? 1 : 0.6}
              strokeWidth={isSelected ? 0.7 : 0.4}
              strokeDasharray="2 1.4"
              style={{ cursor: tool === "select" ? "move" : "default" }}
            />
            {isSelected && tool === "select" && (
              <EditHandles
                shape={shape}
                anchor={anchorFor(h)}
                onHandleDown={(handle, e) => {
                  e.stopPropagation();
                  const pt = toPt(e);
                  if (shape.kind === "rect") {
                    dragRef.current = {
                      type: "resize",
                      id: h.id,
                      handle,
                      start: pt,
                      startShape: shape,
                    };
                  }
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onVertexDown={(index, e) => {
                  e.stopPropagation();
                  const pt = toPt(e);
                  if (shape.kind === "polygon") {
                    dragRef.current = {
                      type: "vertex",
                      id: h.id,
                      index,
                      start: pt,
                      startShape: shape,
                    };
                  }
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onAnchorDown={(e) => {
                  e.stopPropagation();
                  const pt = toPt(e);
                  dragRef.current = {
                    type: "anchor",
                    id: h.id,
                    start: pt,
                    startAnchor: anchorFor(h),
                  };
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
              />
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
  );
}

function EditHandles({
  shape,
  anchor,
  onHandleDown,
  onVertexDown,
  onAnchorDown,
}: {
  shape: HotspotShape;
  anchor: Point;
  onHandleDown: (handle: RectHandle, e: ReactPointerEvent<SVGElement>) => void;
  onVertexDown: (index: number, e: ReactPointerEvent<SVGElement>) => void;
  onAnchorDown: (e: ReactPointerEvent<SVGElement>) => void;
}) {
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
              className="dy-handle"
              onPointerDown={(e) => onHandleDown(handle, e)}
            />
          );
        })}
        <AnchorHandle anchor={anchor} onAnchorDown={onAnchorDown} />
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
          className="dy-handle"
          onPointerDown={(e) => onVertexDown(i, e)}
        />
      ))}
      <AnchorHandle anchor={anchor} onAnchorDown={onAnchorDown} />
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
