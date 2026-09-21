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
  /** Every field below is optional: unset = inherit the project-wide
   *  interaction settings (or the hotspot's own color for `color`). */
  strokeWidth?: number;
  dotRadius?: number;
  dotSpeedMs?: number;
  ringSpeedMs?: number;
  color?: string;
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
  /** Per-block visual overrides; `{}` = fully inherits the project style. */
  style: HotspotStyleOverride;
  /**
   * Raw CSS, scoped automatically to this block (every element belonging to
   * it carries a `.hs-{id}` class). Use `&` for compound state selectors on
   * the frame itself, e.g. `&.hovered { stroke-width: 2; }` or
   * `&.selected { animation: spin 3s linear infinite; }`. This is the escape
   * hatch for anything the structured fields above don't cover — literally
   * any CSS property, any animation, on this one block.
   */
  customCss: string;
  content: HotspotContent;
}

/**
 * Per-block visual overrides. Every field is optional: unset = inherit the
 * project-wide value from `theme.interaction`. This is how you make one
 * frame's outline thinner, a sub-block's dashes shorter, or turn off the
 * outline/pulse entirely on a single block — without touching the rest.
 */
export interface HotspotStyleOverride {
  /** false = no dashed contour at all on this block, in any state. */
  showOutline?: boolean;
  /** "dash-length gap-length" in image-percent units, e.g. "2 1.4". */
  dashPattern?: string;
  hoverTintOpacity?: number;
  selectionStrokeWidth?: number;
  spotlightCornerRadius?: number;
  pulseEnabled?: boolean;
  pulseMinRadius?: number;
  pulseMaxRadius?: number;
  pulseSpeedMs?: number;
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

/**
 * Freeform objects placed directly on the image — independent of hotspots.
 * Purely decorative/annotative: they render in the viewer and export but
 * aren't clickable there. In the editor, the rect-shaped kinds (text, image,
 * shape) are draggable/resizable via x/y/w/h like everything else; the line
 * kind is dragged by its two endpoints instead.
 */
export type CanvasObjectKind = "text" | "image" | "shape" | "line" | "pulse" | "embed";

interface CanvasObjectMeta {
  id: string;
  order: number;
  hidden?: boolean;
}

interface RectObjectBase extends CanvasObjectMeta {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextObject extends RectObjectBase {
  kind: "text";
  text: string;
  color: string;
  /** Font size in percent of the image width — stays proportional at any
   *  export size, like every other measurement in this app. */
  fontSize: number;
  fontWeight: "normal" | "bold";
  align: "left" | "center" | "right";
  background: string | null;
}

export interface ImageObject extends RectObjectBase {
  kind: "image";
  src: string;
  alt: string;
  opacity: number;
}

export interface ShapeObject extends RectObjectBase {
  kind: "shape";
  shapeType: "rect" | "ellipse";
  strokeColor: string;
  strokeWidth: number;
  fill: string;
  dashPattern: string;
}

/**
 * An imported animation file — an SVG (its own SMIL/CSS animations play
 * natively once embedded) or a raw HTML+CSS+JS snippet — placed on the
 * image and manipulated exactly like any other object: moved, resized,
 * deleted, reordered. `markup` is the file's/snippet's source, kept as-is;
 * `sourceW`/`sourceH` are the SVG's own intrinsic size (parsed at import
 * time), used to scale it correctly into the object's x/y/w/h box. Ignored
 * for the "html" format, which fills its box directly.
 */
export interface EmbedObject extends RectObjectBase {
  kind: "embed";
  format: "svg" | "html";
  markup: string;
  sourceW: number;
  sourceH: number;
}

/**
 * A freestanding line between any two points — each end either free (a
 * plain point) or anchored to a hotspot, in which case it follows that
 * block if it moves. Independent of the per-hotspot/group Connector system:
 * this one isn't tied to any selection, always visible, and can join any
 * two blocks (or a block and a free point, or two free points).
 */
export interface LineObject extends CanvasObjectMeta {
  kind: "line";
  from: Point;
  to: Point;
  fromHotspotId: string | null;
  toHotspotId: string | null;
  curved: boolean;
  strokeColor: string;
  strokeWidth: number;
  dashPattern: string;
  /** Marching-ants dash animation along the line. */
  animated: boolean;
  /** A dot traveling from `from` to `to` on a loop. */
  dotEnabled: boolean;
  dotColor: string;
  dotRadius: number;
  /** Shared duration for both the dash march and the dot travel. */
  speedMs: number;
}

/**
 * A standalone pulsing point — the same idle "there's something here" badge
 * used on hotspots, but free-standing and not tied to any block. One of the
 * ready-made animated widgets (alongside the line's own dash/dot animations)
 * you drop onto the image and tweak, rather than build from scratch.
 */
export interface PulseObject extends CanvasObjectMeta {
  kind: "pulse";
  x: number;
  y: number;
  color: string;
  minRadius: number;
  maxRadius: number;
  speedMs: number;
}

export type CanvasObject = TextObject | ImageObject | ShapeObject | LineObject | PulseObject | EmbedObject;

export interface Project {
  schemaVersion: 2;
  id: string;
  name: string;
  image: ImageMeta;
  groups: Group[];
  hotspots: Hotspot[];
  objects: CanvasObject[];
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
  showPanelConnector: false,
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
    objects: [],
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
