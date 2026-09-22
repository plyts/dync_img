import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasObject, EmbedObject, Hotspot, ImageObject, LineObject, Point, ShapeObject, TextObject } from "../../types";
import { clientToPercent, resizeRect, resolveLineEndpoint, type RectHandle } from "../../lib/geometry";
import { CanvasObjectContent } from "../CanvasObjectContent";

interface ObjectsLayerProps {
  objects: CanvasObject[];
  hotspots: Hotspot[];
  selectedId: string | null;
  /** Object dragging/resizing is only offered while the hotspot tools are
   *  idle (select tool, no active draw mode) so it never fights hotspot
   *  drawing/resizing sharing the same stage. */
  interactive: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CanvasObject>) => void;
}

type RectObject = TextObject | ImageObject | ShapeObject | EmbedObject;

function isRectObject(o: CanvasObject): o is RectObject {
  return o.kind !== "line" && o.kind !== "pulse";
}

type DragSession =
  | { type: "move"; id: string; start: Point; startX: number; startY: number }
  | { type: "resize"; id: string; handle: RectHandle; start: Point; startShape: { kind: "rect"; x: number; y: number; w: number; h: number } }
  | { type: "line-endpoint"; id: string; which: "from" | "to"; start: Point; startPoint: Point }
  | { type: "point"; id: string; start: Point; startPoint: Point };

const HANDLES: RectHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function ObjectsLayer({ objects, hotspots, selectedId, interactive, onSelect, onChange }: ObjectsLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [draftBox, setDraftBox] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);
  const [draftLinePoint, setDraftLinePoint] = useState<{ id: string; which: "from" | "to"; point: Point } | null>(
    null,
  );
  const [draftPoint, setDraftPoint] = useState<{ id: string; point: Point } | null>(null);

  function toPt(e: { clientX: number; clientY: number }): Point {
    return clientToPercent(svgRef.current!, e.clientX, e.clientY);
  }

  function boxFor(o: RectObject) {
    return draftBox && draftBox.id === o.id ? draftBox : o;
  }

  function endpointFor(o: LineObject, which: "from" | "to"): Point {
    if (draftLinePoint && draftLinePoint.id === o.id && draftLinePoint.which === which) return draftLinePoint.point;
    return resolveLineEndpoint(o, which, hotspots);
  }

  function handleMove(e: ReactPointerEvent<SVGSVGElement>) {
    const session = dragRef.current;
    if (!session) return;
    const pt = toPt(e);
    const dx = pt.x - session.start.x;
    const dy = pt.y - session.start.y;
    if (session.type === "move") {
      setDraftBox((d) => {
        const obj = objects.find((o) => o.id === session.id);
        if (!obj || !isRectObject(obj)) return d;
        return { id: session.id, x: session.startX + dx, y: session.startY + dy, w: obj.w, h: obj.h };
      });
    } else if (session.type === "resize") {
      const next = resizeRect(session.startShape, session.handle, dx, dy);
      setDraftBox({ id: session.id, x: next.x, y: next.y, w: next.w, h: next.h });
    } else if (session.type === "line-endpoint") {
      setDraftLinePoint({
        id: session.id,
        which: session.which,
        point: { x: session.startPoint.x + dx, y: session.startPoint.y + dy },
      });
    } else {
      setDraftPoint({ id: session.id, point: { x: session.startPoint.x + dx, y: session.startPoint.y + dy } });
    }
  }

  function handleUp() {
    const session = dragRef.current;
    if (session) {
      if (session.type === "line-endpoint" && draftLinePoint && draftLinePoint.id === session.id) {
        onChange(session.id, session.which === "from" ? { from: draftLinePoint.point } : { to: draftLinePoint.point });
      } else if (session.type === "point" && draftPoint && draftPoint.id === session.id) {
        onChange(session.id, { x: draftPoint.point.x, y: draftPoint.point.y });
      } else if (session.type !== "line-endpoint" && session.type !== "point" && draftBox && draftBox.id === session.id) {
        onChange(session.id, { x: draftBox.x, y: draftBox.y, w: draftBox.w, h: draftBox.h });
      }
    }
    dragRef.current = null;
    setDraftBox(null);
    setDraftLinePoint(null);
    setDraftPoint(null);
  }

  return (
    <svg
      ref={svgRef}
      className="dy-draw-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ pointerEvents: "none" }}
      onPointerMove={interactive ? handleMove : undefined}
      onPointerUp={interactive ? handleUp : undefined}
    >
      {objects.map((o) => {
        const isSelected = interactive && o.id === selectedId;

        if (o.kind === "line") {
          const from = endpointFor(o, "from");
          const to = endpointFor(o, "to");
          return (
            <g key={o.id} style={{ pointerEvents: interactive && !o.hidden ? "auto" : "none" }}>
              <path
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                fill="none"
                stroke={isSelected ? "var(--dy-ink)" : "transparent"}
                strokeWidth={1.4}
                style={{ cursor: interactive ? "pointer" : "default" }}
                onPointerDown={(e) => {
                  if (!interactive) return;
                  e.stopPropagation();
                  onSelect(o.id);
                }}
              />
              <CanvasObjectContent obj={{ ...o, from, to }} hotspots={hotspots} />
              {isSelected &&
                (["from", "to"] as const).map((which) => {
                  const anchored = which === "from" ? o.fromHotspotId : o.toHotspotId;
                  const p = which === "from" ? from : to;
                  return (
                    <circle
                      key={which}
                      cx={p.x}
                      cy={p.y}
                      r={1.1}
                      className="dy-handle"
                      style={{ pointerEvents: anchored ? "none" : "auto", opacity: anchored ? 0.5 : 1 }}
                      onPointerDown={(e) => {
                        if (anchored) return;
                        e.stopPropagation();
                        const pt = toPt(e);
                        dragRef.current = { type: "line-endpoint", id: o.id, which, start: pt, startPoint: p };
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                    />
                  );
                })}
            </g>
          );
        }

        if (o.kind === "pulse") {
          const p = draftPoint && draftPoint.id === o.id ? draftPoint.point : o;
          return (
            <g key={o.id} style={{ pointerEvents: interactive && !o.hidden ? "auto" : "none" }}>
              <circle
                cx={p.x}
                cy={p.y}
                r={Math.max(o.maxRadius, 2)}
                fill="transparent"
                stroke={isSelected ? "var(--dy-ink)" : "transparent"}
                strokeWidth={0.4}
                strokeDasharray="1.4 1"
                style={{ cursor: interactive ? "move" : "default" }}
                onPointerDown={(e) => {
                  if (!interactive) return;
                  e.stopPropagation();
                  onSelect(o.id);
                  const pt = toPt(e);
                  dragRef.current = { type: "point", id: o.id, start: pt, startPoint: { x: o.x, y: o.y } };
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
              />
              <CanvasObjectContent obj={{ ...o, x: p.x, y: p.y }} hotspots={hotspots} />
            </g>
          );
        }

        const box = boxFor(o);
        return (
          <g key={o.id} style={{ pointerEvents: interactive && !o.hidden ? "auto" : "none" }}>
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              fill="transparent"
              stroke={isSelected ? "var(--dy-ink)" : "transparent"}
              strokeWidth={0.4}
              strokeDasharray="1.4 1"
              style={{ cursor: interactive ? "move" : "default" }}
              onPointerDown={(e) => {
                if (!interactive) return;
                e.stopPropagation();
                onSelect(o.id);
                const pt = toPt(e);
                dragRef.current = { type: "move", id: o.id, start: pt, startX: o.x, startY: o.y };
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
            />
            <CanvasObjectContent obj={{ ...o, ...box }} hotspots={hotspots} />
            {isSelected &&
              HANDLES.map((handle) => {
                const positions: Record<RectHandle, Point> = {
                  nw: { x: box.x, y: box.y },
                  n: { x: box.x + box.w / 2, y: box.y },
                  ne: { x: box.x + box.w, y: box.y },
                  e: { x: box.x + box.w, y: box.y + box.h / 2 },
                  se: { x: box.x + box.w, y: box.y + box.h },
                  s: { x: box.x + box.w / 2, y: box.y + box.h },
                  sw: { x: box.x, y: box.y + box.h },
                  w: { x: box.x, y: box.y + box.h / 2 },
                };
                const p = positions[handle];
                return (
                  <rect
                    key={handle}
                    x={p.x - 0.9}
                    y={p.y - 0.9}
                    width={1.8}
                    height={1.8}
                    className="dy-handle"
                    style={{ pointerEvents: "auto" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const pt = toPt(e);
                      dragRef.current = {
                        type: "resize",
                        id: o.id,
                        handle,
                        start: pt,
                        startShape: { kind: "rect", x: o.x, y: o.y, w: o.w, h: o.h },
                      };
                      (e.target as Element).setPointerCapture(e.pointerId);
                    }}
                  />
                );
              })}
          </g>
        );
      })}
    </svg>
  );
}
