import type { Hotspot } from "../types";

/** Every DOM element belonging to a hotspot (its spotlight, its hit areas,
 *  its pulse badge) carries this class, so a block's custom CSS is scoped
 *  to it automatically without the user having to know its id. */
export function hotspotScopeClass(id: string): string {
  return `hs-${id}`;
}

/** Wraps each hotspot's raw CSS in its scope class and concatenates them
 *  into one stylesheet. Native CSS nesting (`&.hovered { ... }`) lets the
 *  user target this block's own states without repeating the scope class. */
export function buildScopedCustomCss(hotspots: Hotspot[]): string {
  return hotspots
    .filter((h) => h.customCss.trim().length > 0)
    .map((h) => `.${hotspotScopeClass(h.id)} {\n${h.customCss}\n}`)
    .join("\n\n");
}
