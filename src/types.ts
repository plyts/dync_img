export type Point = { x: number; y: number };

export type HotspotShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "polygon"; points: Point[] };

export interface StepContent {
  id: string;
  title: string;
  body: string;
}

export interface HotspotContent {
  summary: string;
  steps: StepContent[];
  example: string;
  whenToUse: string;
  caution: string;
  tools: string[];
}

/**
 * A connector draws a line + traveling dot + arrival ring from a hotspot (or
 * its group) toward a point elsewhere in the image (e.g. a pipeline node),
 * and optionally lights up a second shape at the arrival point at the same
 * time as the hotspot's own spotlight.
 */
export interface Connector {
  to: Point;
  toShape: HotspotShape | null;
  /** Straight line, or a gentle arc — always has a defined start (the
   *  hotspot's anchor) and end (`to`), just a different path between them. */
  curved: boolean;
}

export interface Hotspot {
  id: string;
  label: string;
  color: string;
  groupId: string | null;
  order: number;
  /** Clickable zones. Usually one; a block can have several (e.g. a family
   *  title plus a few pipeline nodes that all open the same fiche). */
  areas: HotspotShape[];
  /** What actually lights up on hover/selection. `null` = union of `areas`
   *  (the common case). Set it explicitly to make a small clickable area
   *  (a title) light up a larger frame (an "overview" block), which is how
   *  nested/overview blocks are built — geometrically, with no parent/child
   *  field needed. */
  spotlightShape: HotspotShape | null;
  anchor: Point;
  /** `undefined` = inherit the group's connector (if any). `null` = no
   *  connector even if the group has one. An object = a per-hotspot
   *  override. */
  connector?: Connector | null;
  /** Ids of other hotspots surfaced as "Explorer aussi" in the panel. */
  seeAlso: string[];
  content: HotspotContent;
}

export interface Group {
  id: string;
  label: string;
  color: string;
  connector: Connector | null;
}

export interface InteractionSettings {
  hoverTintOpacity: number;
  dashPattern: string;
  selectionStrokeWidth: number;
  dimOpacity: number;
  pulseEnabled: boolean;
  pulseMinRadius: number;
  pulseMaxRadius: number;
  pulseSpeedMs: number;
  spotlightTransitionMs: number;
  spotlightCornerRadius: number;
  connectorDotSpeedMs: number;
  ringSpeedMs: number;
  stepStaggerMs: number;
  typewriterSpeedMs: number;
  panelWidthPx: number;
  focusFollowsHover: boolean;
  /** The line from the selected block to the panel edge — some people find
   *  it redundant once the panel is open, so it can be hidden entirely. */
  showPanelConnector: boolean;
  panelConnectorCurved: boolean;
}

export interface ProjectTheme {
  palette: string[];
  fontDisplay: string;
  fontMono: string;
  panelSide: "left" | "right";
  interaction: InteractionSettings;
}

export interface ImageMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface Project {
  schemaVersion: 2;
  id: string;
  name: string;
  image: ImageMeta;
  groups: Group[];
  hotspots: Hotspot[];
  theme: ProjectTheme;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PALETTE = [
  "#e0574f",
  "#4f8fe0",
  "#4fae6b",
  "#c98fe0",
  "#e0a24f",
  "#4fc9c2",
];

export const DEFAULT_INTERACTION: InteractionSettings = {
  hoverTintOpacity: 0.18,
  dashPattern: "2 1.4",
  selectionStrokeWidth: 0.9,
  dimOpacity: 0.45,
  pulseEnabled: true,
  pulseMinRadius: 0.7,
  pulseMaxRadius: 3,
  pulseSpeedMs: 2200,
  spotlightTransitionMs: 520,
  spotlightCornerRadius: 1.8,
  connectorDotSpeedMs: 1600,
  ringSpeedMs: 1700,
  stepStaggerMs: 150,
  typewriterSpeedMs: 14,
  panelWidthPx: 440,
  focusFollowsHover: true,
  showPanelConnector: true,
  panelConnectorCurved: true,
};

export function emptyContent(): HotspotContent {
  return {
    summary: "",
    steps: [],
    example: "",
    whenToUse: "",
    caution: "",
    tools: [],
  };
}

export function createEmptyProject(name = "Nouveau projet"): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name,
    image: { src: "", width: 0, height: 0, alt: name },
    groups: [],
    hotspots: [],
    theme: {
      palette: DEFAULT_PALETTE,
      fontDisplay: "Caveat",
      fontMono: "Space Mono",
      panelSide: "right",
      interaction: { ...DEFAULT_INTERACTION },
    },
    createdAt: now,
    updatedAt: now,
  };
}
