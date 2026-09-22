import type { MouseEvent } from "react";
import type { CanvasObject, Hotspot } from "../../types";
import { connectorPathD, resolveLineEndpoint } from "../../lib/geometry";

/** Invisible click targets for objects that carry notes, rendered as its
 *  own top layer (above HotspotsLayer) so its full-bleed deselect rect
 *  never swallows these clicks first. Only objects with non-empty notes
 *  get a shape here — everything else stays pass-through (pointer-events
 *  none), so hotspots underneath keep working normally everywhere else. */
export function ObjectNotesHitLayer({
  objects,
  hotspots,
  onOpenNotes,
}: {
  objects: CanvasObject[];
  hotspots: Hotspot[];
  onOpenNotes: (id: string) => void;
}) {
  const targets = objects.filter((o) => !o.hidden && o.notes.trim());
  if (targets.length === 0) return null;

  return (
    <svg className="dy-stage-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
      {targets.map((o) => {
        const common = {
          fill: "transparent",
          stroke: "transparent",
          className: "dy-obj-notes-hit",
          style: { pointerEvents: "auto" as const },
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            onOpenNotes(o.id);
          },
        };
        if (o.kind === "line") {
          const from = resolveLineEndpoint(o, "from", hotspots);
          const to = resolveLineEndpoint(o, "to", hotspots);
          return <path key={o.id} d={connectorPathD(from, to, o.curved)} strokeWidth={3} {...common} />;
        }
        if (o.kind === "pulse") {
          return <circle key={o.id} cx={o.x} cy={o.y} r={Math.max(o.maxRadius, 2.5)} {...common} />;
        }
        return <rect key={o.id} x={o.x} y={o.y} width={o.w} height={o.h} {...common} />;
      })}
    </svg>
  );
}
