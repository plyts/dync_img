import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import type { Hotspot, Project } from "../../types";
import { pointsToSvgAttr, shapeToPolygonPoints } from "../../lib/geometry";

interface HotspotsLayerProps {
  project: Project;
  hoverId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

export function HotspotsLayer({
  project,
  hoverId,
  selectedId,
  onHover,
  onSelect,
  onDeselect,
}: HotspotsLayerProps) {
  const selected = project.hotspots.find((h) => h.id === selectedId) ?? null;
  const hovered = project.hotspots.find((h) => h.id === hoverId && h.id !== selectedId) ?? null;
  const [connectorDrawn, setConnectorDrawn] = useState(false);

  useEffect(() => {
    setConnectorDrawn(false);
    if (!selected) return;
    const raf = requestAnimationFrame(() => setConnectorDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [selected?.id]);

  const targetX = project.theme.panelSide === "left" ? 0 : 100;

  return (
    <>
      <svg
        className="dy-stage-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onClick={onDeselect}
      >
        <rect x={0} y={0} width={100} height={100} fill="transparent" />
        {project.hotspots.map((h) => (
          <HotspotShape
            key={h.id}
            hotspot={h}
            state={
              h.id === selectedId
                ? "selected"
                : selected
                  ? "dimmed"
                  : h.id === hoverId
                    ? "hovered"
                    : "idle"
            }
            onEnter={() => onHover(h.id)}
            onLeave={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(h.id);
            }}
          />
        ))}
        {selected && (
          <path
            pathLength={1}
            className={`dy-connector${connectorDrawn ? " drawn" : ""}`}
            d={`M ${selected.anchor.x} ${selected.anchor.y} C ${(selected.anchor.x + targetX) / 2} ${selected.anchor.y}, ${(selected.anchor.x + targetX) / 2} ${selected.anchor.y}, ${targetX} ${selected.anchor.y}`}
          />
        )}
      </svg>
      {hovered && (
        <div
          className="dy-anchor-label dy-font-display"
          style={{ left: `${hovered.anchor.x}%`, top: `${hovered.anchor.y}%` }}
        >
          {hovered.label}
        </div>
      )}
    </>
  );
}

function HotspotShape({
  hotspot,
  state,
  onEnter,
  onLeave,
  onClick,
}: {
  hotspot: Hotspot;
  state: "idle" | "hovered" | "selected" | "dimmed";
  onEnter: () => void;
  onLeave: () => void;
  onClick: (e: MouseEvent) => void;
}) {
  const points = pointsToSvgAttr(shapeToPolygonPoints(hotspot.shape));
  return (
    <polygon
      points={points}
      className={`dy-hotspot${state !== "idle" ? ` ${state}` : ""}`}
      style={{ "--hs-color": hotspot.color } as CSSProperties}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    />
  );
}
