import { useEffect, useState, type CSSProperties } from "react";
import type { Connector, Hotspot, Project } from "../../types";
import {
  connectorPathD,
  effectiveHotspotStyle,
  effectiveSpotlight,
  pointsToSvgAttr,
  shapeToPolygonPoints,
} from "../../lib/geometry";

interface HotspotsLayerProps {
  project: Project;
  hoverId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

function effectiveConnector(project: Project, hotspot: Hotspot): Connector | null {
  if (hotspot.connector !== undefined) return hotspot.connector;
  const group = project.groups.find((g) => g.id === hotspot.groupId);
  return group?.connector ?? null;
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
  const [connectorDrawn, setConnectorDrawn] = useState(false);
  const interaction = project.theme.interaction;

  useEffect(() => {
    setConnectorDrawn(false);
    if (!selected) return;
    const raf = requestAnimationFrame(() => setConnectorDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [selected?.id]);

  const targetX = project.theme.panelSide === "left" ? 0 : 100;
  const groupConnector = selected ? effectiveConnector(project, selected) : null;

  return (
    <>
      <svg className="dy-stage-svg" viewBox="0 0 100 100" preserveAspectRatio="none" onClick={onDeselect}>
        <rect x={0} y={0} width={100} height={100} fill="transparent" />

        {project.hotspots.map((h) => {
          const state: "idle" | "hovered" | "selected" | "dimmed" =
            h.id === selectedId ? "selected" : selected ? "dimmed" : h.id === hoverId ? "hovered" : "idle";
          const spotlight = effectiveSpotlight(h.areas, h.spotlightShape);
          const es = effectiveHotspotStyle(interaction, h.style);
          return (
            <SpotlightShape
              key={`spot-${h.id}`}
              shape={spotlight}
              color={h.color}
              state={state}
              style={es}
            />
          );
        })}

        {selected && groupConnector?.toShape && (
          <SpotlightShape
            shape={groupConnector.toShape}
            color={selected.color}
            state="selected"
            style={effectiveHotspotStyle(interaction, selected.style)}
          />
        )}

        {project.hotspots.map((h) => {
          const es = effectiveHotspotStyle(interaction, h.style);
          const showPulse = es.pulseEnabled && !selectedId && h.id !== hoverId;
          return (
            <g key={`hit-${h.id}`}>
              {h.areas.map((area, index) => (
                <polygon
                  key={index}
                  points={pointsToSvgAttr(shapeToPolygonPoints(area))}
                  className="dy-hotspot-hit"
                  tabIndex={0}
                  onMouseEnter={() => onHover(h.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => interaction.focusFollowsHover && onHover(h.id)}
                  onBlur={() => interaction.focusFollowsHover && onHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(h.id);
                  }}
                />
              ))}
              {showPulse && (
                <PulseBadge
                  point={h.anchor}
                  color={h.color}
                  minRadius={es.pulseMinRadius}
                  maxRadius={es.pulseMaxRadius}
                  speedMs={es.pulseSpeedMs}
                />
              )}
            </g>
          );
        })}

        {selected && interaction.showPanelConnector && (
          <path
            pathLength={1}
            className={`dy-connector${connectorDrawn ? " drawn" : ""}`}
            d={connectorPathD(selected.anchor, { x: targetX, y: selected.anchor.y }, interaction.panelConnectorCurved)}
          />
        )}

        {selected && groupConnector && (
          <GroupConnector
            from={selected.anchor}
            to={groupConnector.to}
            curved={groupConnector.curved}
            color={selected.color}
            drawn={connectorDrawn}
          />
        )}
      </svg>
      {hoverId &&
        hoverId !== selectedId &&
        (() => {
          const hovered = project.hotspots.find((h) => h.id === hoverId);
          if (!hovered) return null;
          return (
            <div
              className="dy-anchor-label dy-font-display"
              style={{ left: `${hovered.anchor.x}%`, top: `${hovered.anchor.y}%` }}
            >
              {hovered.label}
            </div>
          );
        })()}
    </>
  );
}

function SpotlightShape({
  shape,
  color,
  state,
  style: es,
}: {
  shape: ReturnType<typeof effectiveSpotlight>;
  color: string;
  state: "idle" | "hovered" | "selected" | "dimmed";
  style: ReturnType<typeof effectiveHotspotStyle>;
}) {
  const style = {
    "--hs-color": color,
    "--dy-hover-opacity": es.hoverTintOpacity,
    "--dy-dash": es.dashPattern,
    "--dy-selection-stroke": es.selectionStrokeWidth,
    ...(es.showOutline ? null : { strokeOpacity: 0 }),
  } as CSSProperties;
  const cls = `dy-hotspot${state !== "idle" ? ` ${state}` : ""}`;
  if (shape.kind === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={es.spotlightCornerRadius}
        ry={es.spotlightCornerRadius}
        className={cls}
        style={style}
      />
    );
  }
  return <polygon points={pointsToSvgAttr(shapeToPolygonPoints(shape))} className={cls} style={style} />;
}

function PulseBadge({
  point,
  color,
  minRadius,
  maxRadius,
  speedMs,
}: {
  point: { x: number; y: number };
  color: string;
  minRadius: number;
  maxRadius: number;
  speedMs: number;
}) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      className="dy-pulse"
      style={
        {
          "--hs-color": color,
          "--dy-pulse-min": minRadius,
          "--dy-pulse-max": maxRadius,
          "--dy-pulse-speed": `${speedMs}ms`,
        } as CSSProperties
      }
    />
  );
}

function GroupConnector({
  from,
  to,
  curved,
  color,
  drawn,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  curved: boolean;
  color: string;
  drawn: boolean;
}) {
  const d = connectorPathD(from, to, curved);
  const style = { "--hs-color": color } as CSSProperties;
  return (
    <>
      <path pathLength={1} d={d} className={`dy-group-connector${drawn ? " drawn" : ""}`} style={style} />
      {drawn && (
        <>
          <circle r={0.7} className="dy-group-connector-dot" style={style}>
            <animateMotion dur="var(--dy-connector-dot-speed, 1600ms)" repeatCount="indefinite" path={d} />
          </circle>
          <circle cx={to.x} cy={to.y} className="dy-ring" style={style} />
        </>
      )}
    </>
  );
}
