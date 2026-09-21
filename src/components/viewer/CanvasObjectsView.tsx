import type { CanvasObject, Hotspot } from "../../types";
import { CanvasObjectContent } from "../CanvasObjectContent";

/** Static, non-interactive render of the project's freeform objects —
 *  decorative/annotative, not clickable, sitting behind the hotspots layer
 *  so a hotspot's spotlight/hit-area always wins on overlap. */
export function CanvasObjectsView({ objects, hotspots }: { objects: CanvasObject[]; hotspots: Hotspot[] }) {
  if (objects.length === 0) return null;
  return (
    <svg className="dy-stage-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
      {[...objects]
        .sort((a, b) => a.order - b.order)
        .map((o) => (
          <CanvasObjectContent key={o.id} obj={o} hotspots={hotspots} />
        ))}
    </svg>
  );
}
