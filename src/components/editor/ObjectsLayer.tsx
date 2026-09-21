import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasObject, Point } from "../../types";
import { clientToPercent, resizeRect, type RectHandle } from "../../lib/geometry";
import { CanvasObjectContent } from "../CanvasObjectContent";

interface ObjectsLayerProps {
  objects: CanvasObject[];
  selectedId: string | null;
  /** Object dragging/resizing is only offered while the hotspot tools are
   *  idle (select tool, no active draw mode) so it never fights hotspot
   *  drawing/resizing sharing the same stage. */
  interactive: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CanvasObject>) => void;
}

type DragSession =
  | { type: "move"; id: string; start: Point; startX: number; startY: number }
  | { type: "resize"; id: string; handle: RectHandle; start: Point; startShape: { kind: "rect"; x: number; y: number; w: number; h: number } };

const HANDLES: RectHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function ObjectsLayer({ objects, selectedId, interactive, onSelect, onChange }: ObjectsLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [draft, setDraft] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);

  function toPt(e: { clientX: number; clientY: number }): Point {
    return clientToPercent(svgRef.current!, e.clientX, e.clientY);
  }

  function boxFor(o: CanvasObject) {
    return draft && draft.id === o.id ? draft : o;
  }

  function handleMove(e: ReactPointerEvent<SVGSVGElement>) {
    const session = dragRef.current;
    if (!session) return;
    const pt = toPt(e);
    const dx = pt.x - session.start.x;
    const dy = pt.y - session.start.y;
    if (session.type === "move") {
      setDraft((d) => {
        const obj = objects.find((o) => o.id === session.id);
        if (!obj) return d;
        return { id: session.id, x: session.startX + dx, y: session.startY + dy, w: obj.w, h: obj.h };
      });
    } else {
      const next = resizeRect(session.startShape, session.handle, dx, dy);
      setDraft({ id: session.id, x: next.x, y: next.y, w: next.w, h: next.h });
    }
  }

  function handleUp() {
    const session = dragRef.current;
    if (session && draft && draft.id === session.id) {
      onChange(session.id, { x: draft.x, y: draft.y, w: draft.w, h: draft.h });
    }
    dragRef.current = null;
    setDraft(null);
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
        const box = boxFor(o);
        const isSelected = interactive && o.id === selectedId;
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
            <CanvasObjectContent obj={{ ...o, ...box }} />
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
