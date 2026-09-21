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

export interface Hotspot {
  id: string;
  label: string;
  color: string;
  groupId: string | null;
  order: number;
  shape: HotspotShape;
  anchor: Point;
  content: HotspotContent;
}

export interface Group {
  id: string;
  label: string;
  color: string;
}

export interface ProjectTheme {
  palette: string[];
  fontDisplay: string;
  fontMono: string;
  panelSide: "left" | "right";
}

export interface ImageMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface Project {
  schemaVersion: 1;
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
    schemaVersion: 1,
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
    },
    createdAt: now,
    updatedAt: now,
  };
}
