import type { CSSProperties } from "react";
import type { CanvasObject, Hotspot } from "../types";
import { connectorPathD, resolveLineEndpoint } from "../lib/geometry";

/**
 * Renders one freeform canvas object as SVG children — same viewBox="0 0
 * 100 100" percent-unit coordinate system as every hotspot, so it scales
 * exactly like the rest of the schema (font size, stroke width, etc. are
 * all in image-percent units, not px). Used identically by the read-only
 * viewer/export render and by the editor's draggable overlay. `hotspots`
 * is only needed to resolve a line object's anchored endpoints.
 */
export function CanvasObjectContent({ obj, hotspots = [] }: { obj: CanvasObject; hotspots?: Hotspot[] }) {
  if (obj.hidden) return null;

  if (obj.kind === "line") {
    const from = resolveLineEndpoint(obj, "from", hotspots);
    const to = resolveLineEndpoint(obj, "to", hotspots);
    const d = connectorPathD(from, to, obj.curved);
    const style = {
      "--dy-line-color": obj.strokeColor,
      "--dy-line-width": obj.strokeWidth,
      "--dy-line-dash": obj.dashPattern,
      "--dy-line-speed": `${obj.speedMs}ms`,
    } as CSSProperties;
    return (
      <g pointerEvents="none">
        <path d={d} className={`dy-line-object${obj.animated ? " animated" : ""}`} style={style} />
        {obj.dotEnabled && (
          <circle r={obj.dotRadius} className="dy-line-dot" style={{ "--dy-line-dot-color": obj.dotColor } as CSSProperties}>
            <animateMotion dur={`${obj.speedMs}ms`} repeatCount="indefinite" path={d} />
          </circle>
        )}
      </g>
    );
  }

  if (obj.kind === "pulse") {
    const style = {
      "--hs-color": obj.color,
      "--dy-pulse-min": obj.minRadius,
      "--dy-pulse-max": obj.maxRadius,
      "--dy-pulse-speed": `${obj.speedMs}ms`,
    } as CSSProperties;
    return <circle cx={obj.x} cy={obj.y} className="dy-pulse" style={style} pointerEvents="none" />;
  }

  if (obj.kind === "text") {
    const lines = obj.text.split("\n");
    const anchor = obj.align === "center" ? "middle" : obj.align === "right" ? "end" : "start";
    const tx = obj.align === "center" ? obj.x + obj.w / 2 : obj.align === "right" ? obj.x + obj.w : obj.x;
    return (
      <g pointerEvents="none">
        {obj.background && <rect x={obj.x} y={obj.y} width={obj.w} height={obj.h} fill={obj.background} rx={0.6} />}
        <text
          x={tx}
          y={obj.y + obj.fontSize * 0.9}
          fontSize={obj.fontSize}
          fill={obj.color}
          textAnchor={anchor}
          style={{ fontFamily: "var(--dy-font-display)", fontWeight: obj.fontWeight }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={tx} dy={i === 0 ? 0 : obj.fontSize * 1.15}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  }

  if (obj.kind === "image") {
    return (
      <image
        href={obj.src}
        x={obj.x}
        y={obj.y}
        width={obj.w}
        height={obj.h}
        opacity={obj.opacity}
        pointerEvents="none"
      />
    );
  }

  const common = {
    stroke: obj.strokeWidth > 0 ? obj.strokeColor : "none",
    strokeWidth: obj.strokeWidth,
    strokeDasharray: obj.dashPattern,
    fill: obj.fill,
    pointerEvents: "none" as const,
  };
  if (obj.shapeType === "ellipse") {
    return <ellipse cx={obj.x + obj.w / 2} cy={obj.y + obj.h / 2} rx={obj.w / 2} ry={obj.h / 2} {...common} />;
  }
  return <rect x={obj.x} y={obj.y} width={obj.w} height={obj.h} {...common} />;
}
