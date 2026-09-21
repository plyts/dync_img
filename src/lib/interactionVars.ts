import type { CSSProperties } from "react";
import type { InteractionSettings } from "../types";

/** Every tunable animation/interaction value lives in project.theme.interaction
 *  and is applied here as CSS custom properties, so the Style panel can
 *  change behavior live without touching any .css file. */
export function interactionCssVars(s: InteractionSettings): CSSProperties {
  return {
    "--dy-hover-opacity": s.hoverTintOpacity,
    "--dy-dash": s.dashPattern,
    "--dy-selection-stroke": s.selectionStrokeWidth,
    "--dy-dim-opacity": s.dimOpacity,
    "--dy-pulse-display": s.pulseEnabled ? "block" : "none",
    "--dy-pulse-min": s.pulseMinRadius,
    "--dy-pulse-max": s.pulseMaxRadius,
    "--dy-pulse-speed": `${s.pulseSpeedMs}ms`,
    "--dy-spotlight-ms": `${s.spotlightTransitionMs}ms`,
    "--dy-spotlight-radius": s.spotlightCornerRadius,
    "--dy-connector-dot-speed": `${s.connectorDotSpeedMs}ms`,
    "--dy-ring-speed": `${s.ringSpeedMs}ms`,
    "--dy-panel-width": `${s.panelWidthPx}px`,
  } as CSSProperties;
}
