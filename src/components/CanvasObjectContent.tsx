import type { CanvasObject } from "../types";

/**
 * Renders one freeform canvas object as SVG children — same viewBox="0 0
 * 100 100" percent-unit coordinate system as every hotspot, so it scales
 * exactly like the rest of the schema (font size, stroke width, etc. are
 * all in image-percent units, not px). Used identically by the read-only
 * viewer/export render and by the editor's draggable overlay.
 */
export function CanvasObjectContent({ obj }: { obj: CanvasObject }) {
  if (obj.hidden) return null;

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
