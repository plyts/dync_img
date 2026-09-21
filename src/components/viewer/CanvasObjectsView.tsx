import type { CanvasObject, Hotspot } from "../../types";
import { CanvasObjectContent } from "../CanvasObjectContent";

/** Static, non-interactive render of the project's freeform objects —
 *  purely decorative, sitting behind the hotspots layer so a hotspot's
 *  spotlight/hit-area always wins on overlap. Objects that carry notes
 *  still get a click target, but from ObjectNotesHitLayer (rendered above
 *  the hotspots layer instead) — otherwise HotspotsLayer's own full-bleed
 *  "click empty space to deselect" rect, painted on top of this one, would
 *  swallow every click before it ever reached an object underneath. */
export function CanvasObjectsView({
  objects,
  hotspots,
  flashObjectId,
}: {
  objects: CanvasObject[];
  hotspots: Hotspot[];
  flashObjectId?: string | null;
}) {
  if (objects.length === 0) return null;
  return (
    <svg className="dy-stage-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
      {[...objects]
        .sort((a, b) => a.order - b.order)
        .map((o) =>
          o.id === flashObjectId ? (
            <g key={o.id} className="dy-seq-flashing">
              <CanvasObjectContent obj={o} hotspots={hotspots} />
            </g>
          ) : (
            <CanvasObjectContent key={o.id} obj={o} hotspots={hotspots} />
          ),
        )}
    </svg>
  );
}
