import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { CanvasObject, EmbedObject, Group, Hotspot, HotspotShape, ImageMeta, ImageObject, LineObject, Project, PulseObject, ShapeObject, TextObject } from "../types";
import { DEFAULT_PALETTE, emptyContent } from "../types";
import { centroid, centroidOfAreas } from "../lib/geometry";

interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

type HistoryAction =
  | { type: "set"; updater: (p: Project) => Project }
  | { type: "replace"; project: Project }
  | { type: "undo" }
  | { type: "redo" };

const HISTORY_LIMIT = 100;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "set": {
      const next = action.updater(state.present);
      if (next === state.present) return state;
      const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
      return { past, present: { ...next, updatedAt: new Date().toISOString() }, future: [] };
    }
    case "replace":
      return { past: [], present: action.project, future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest };
    }
    default:
      return state;
  }
}

function nextColor(project: Project): string {
  const palette = project.theme.palette.length ? project.theme.palette : DEFAULT_PALETTE;
  return palette[project.hotspots.length % palette.length];
}

function buildHotspot(
  project: Project,
  areas: HotspotShape[],
  indexOffset = 0,
  spotlightShape: HotspotShape | null = null,
): Hotspot {
  const palette = project.theme.palette.length ? project.theme.palette : DEFAULT_PALETTE;
  const index = project.hotspots.length + indexOffset;
  return {
    id: crypto.randomUUID(),
    label: `Élément ${index + 1}`,
    color: palette[index % palette.length],
    groupId: null,
    order: index,
    areas,
    spotlightShape,
    anchor: areas.length === 1 ? centroid(areas[0]) : centroidOfAreas(areas),
    seeAlso: [],
    style: {},
    customCss: "",
    content: emptyContent(),
  };
}

/** Successive new objects step diagonally so they never spawn stacked
 *  exactly on top of one another (which would hide all but the topmost). */
function spawnOffset(project: Project): number {
  return (project.objects.length % 6) * 3;
}

function buildTextObject(project: Project): TextObject {
  const o = spawnOffset(project);
  return {
    id: crypto.randomUUID(),
    kind: "text",
    x: 38 + o,
    y: 42 + o,
    w: 24,
    h: 9,
    order: project.objects.length,
    text: "Texte",
    color: "#2c2a27",
    fontSize: 3.2,
    fontWeight: "normal",
    align: "left",
    background: null,
  };
}

function buildShapeObject(project: Project, shapeType: "rect" | "ellipse"): ShapeObject {
  const o = spawnOffset(project);
  return {
    id: crypto.randomUUID(),
    kind: "shape",
    x: 35 + o,
    y: 35 + o,
    w: 22,
    h: 16,
    order: project.objects.length,
    shapeType,
    strokeColor: "#2c2a27",
    strokeWidth: 0.6,
    fill: "none",
    dashPattern: "2 1.4",
  };
}

function buildImageObject(project: Project, src: string, alt: string): ImageObject {
  const o = spawnOffset(project);
  return {
    id: crypto.randomUUID(),
    kind: "image",
    x: 40 + o,
    y: 40 + o,
    w: 16,
    h: 16,
    order: project.objects.length,
    src,
    alt,
    opacity: 1,
  };
}

function buildLineObject(project: Project): LineObject {
  const o = spawnOffset(project);
  return {
    id: crypto.randomUUID(),
    kind: "line",
    order: project.objects.length,
    from: { x: 25 + o, y: 25 + o },
    to: { x: 65 + o, y: 55 + o },
    fromHotspotId: null,
    toHotspotId: null,
    curved: false,
    strokeColor: "#2c2a27",
    strokeWidth: 0.5,
    dashPattern: "2 1.4",
    animated: false,
    dotEnabled: false,
    dotColor: "#2c2a27",
    dotRadius: 0.7,
    speedMs: 1800,
  };
}

function buildPulseObject(project: Project): PulseObject {
  const o = spawnOffset(project);
  return {
    id: crypto.randomUUID(),
    kind: "pulse",
    order: project.objects.length,
    x: 45 + o,
    y: 45 + o,
    color: "#2c2a27",
    minRadius: 0.7,
    maxRadius: 3,
    speedMs: 2200,
  };
}

function buildEmbedObject(
  project: Project,
  format: "svg" | "html",
  markup: string,
  sourceW: number,
  sourceH: number,
): EmbedObject {
  const o = spawnOffset(project);
  const w = sourceH > 0 ? Math.min(30, (30 * sourceW) / sourceH) : 24;
  const h = sourceW > 0 ? (w * sourceH) / sourceW : 24;
  return {
    id: crypto.randomUUID(),
    kind: "embed",
    order: project.objects.length,
    x: 35 + o,
    y: 35 + o,
    w,
    h,
    format,
    markup,
    sourceW,
    sourceH,
  };
}

export interface ProjectStore {
  project: Project;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  replace: (project: Project) => void;
  update: (updater: (p: Project) => Project) => void;
  rename: (name: string) => void;
  setImage: (image: ImageMeta) => void;
  addHotspot: (shape: HotspotShape) => Hotspot;
  addHotspots: (shapes: HotspotShape[]) => Hotspot[];
  addHotspotsBatch: (
    specs: Array<{ areas: HotspotShape[]; spotlightShape?: HotspotShape | null }>,
  ) => Hotspot[];
  updateHotspot: (id: string, updater: (h: Hotspot) => Hotspot) => void;
  removeHotspot: (id: string) => void;
  reorderHotspot: (id: string, direction: -1 | 1) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  addGroup: (label: string) => Group;
  updateGroup: (id: string, updater: (g: Group) => Group) => void;
  removeGroup: (id: string) => void;
  addTextObject: () => TextObject;
  addShapeObject: (shapeType: "rect" | "ellipse") => ShapeObject;
  addImageObject: (src: string, alt: string) => ImageObject;
  addLineObject: () => LineObject;
  addPulseObject: () => PulseObject;
  addEmbedObject: (format: "svg" | "html", markup: string, sourceW: number, sourceH: number) => EmbedObject;
  reorderObject: (id: string, direction: -1 | 1) => void;
  updateObject: (id: string, updater: (o: CanvasObject) => CanvasObject) => void;
  removeObject: (id: string) => void;
  bringObjectToFront: (id: string) => void;
  sendObjectToBack: (id: string) => void;
}

const ProjectContext = createContext<ProjectStore | null>(null);

export function ProjectProvider({
  initial,
  children,
}: {
  initial: Project;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial,
    future: [],
  });

  const update = useCallback((updater: (p: Project) => Project) => {
    dispatch({ type: "set", updater });
  }, []);

  const store = useMemo<ProjectStore>(() => {
    return {
      project: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      replace: (project) => dispatch({ type: "replace", project }),
      update,
      rename: (name) => update((p) => ({ ...p, name })),
      setImage: (image) => update((p) => ({ ...p, image })),
      // addHotspot/addHotspots/addGroup read `state.present` (this render's
      // snapshot) rather than the reducer's live state, so they must build
      // every new item up front — never derive a value from inside the
      // `update()` callback and read it back afterwards, since that callback
      // may run later, against a different state, or not run synchronously.
      addHotspot: (shape) => {
        const created = buildHotspot(state.present, [shape]);
        update((p) => ({ ...p, hotspots: [...p.hotspots, created] }));
        return created;
      },
      addHotspots: (shapes) => {
        const created = shapes.map((shape, i) => buildHotspot(state.present, [shape], i));
        update((p) => ({ ...p, hotspots: [...p.hotspots, ...created] }));
        return created;
      },
      addHotspotsBatch: (specs) => {
        const created = specs.map((spec, i) =>
          buildHotspot(state.present, spec.areas, i, spec.spotlightShape ?? null),
        );
        update((p) => ({ ...p, hotspots: [...p.hotspots, ...created] }));
        return created;
      },
      updateHotspot: (id, updater) =>
        update((p) => ({
          ...p,
          hotspots: p.hotspots.map((h) => (h.id === id ? updater(h) : h)),
        })),
      removeHotspot: (id) =>
        update((p) => ({
          ...p,
          hotspots: p.hotspots
            .filter((h) => h.id !== id)
            .map((h, i) => ({ ...h, order: i })),
        })),
      reorderHotspot: (id, direction) =>
        update((p) => {
          const sorted = [...p.hotspots].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((h) => h.id === id);
          const swapWith = idx + direction;
          if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return p;
          const a = sorted[idx];
          const b = sorted[swapWith];
          const hotspots = p.hotspots.map((h) => {
            if (h.id === a.id) return { ...h, order: b.order };
            if (h.id === b.id) return { ...h, order: a.order };
            return h;
          });
          return { ...p, hotspots };
        }),
      bringToFront: (id) =>
        update((p) => {
          const item = p.hotspots.find((h) => h.id === id);
          if (!item) return p;
          return { ...p, hotspots: [...p.hotspots.filter((h) => h.id !== id), item] };
        }),
      sendToBack: (id) =>
        update((p) => {
          const item = p.hotspots.find((h) => h.id === id);
          if (!item) return p;
          return { ...p, hotspots: [item, ...p.hotspots.filter((h) => h.id !== id)] };
        }),
      addGroup: (label) => {
        const group: Group = {
          id: crypto.randomUUID(),
          label,
          color: nextColor(state.present),
          connector: null,
        };
        update((p) => ({ ...p, groups: [...p.groups, group] }));
        return group;
      },
      updateGroup: (id, updater) =>
        update((p) => ({
          ...p,
          groups: p.groups.map((g) => (g.id === id ? updater(g) : g)),
        })),
      removeGroup: (id) =>
        update((p) => ({
          ...p,
          groups: p.groups.filter((g) => g.id !== id),
          hotspots: p.hotspots.map((h) => (h.groupId === id ? { ...h, groupId: null } : h)),
        })),
      addTextObject: () => {
        const created = buildTextObject(state.present);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      addShapeObject: (shapeType) => {
        const created = buildShapeObject(state.present, shapeType);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      addImageObject: (src, alt) => {
        const created = buildImageObject(state.present, src, alt);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      addLineObject: () => {
        const created = buildLineObject(state.present);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      addPulseObject: () => {
        const created = buildPulseObject(state.present);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      addEmbedObject: (format, markup, sourceW, sourceH) => {
        const created = buildEmbedObject(state.present, format, markup, sourceW, sourceH);
        update((p) => ({ ...p, objects: [...p.objects, created] }));
        return created;
      },
      updateObject: (id, updater) =>
        update((p) => ({
          ...p,
          objects: p.objects.map((o) => (o.id === id ? updater(o) : o)),
        })),
      removeObject: (id) =>
        update((p) => ({ ...p, objects: p.objects.filter((o) => o.id !== id) })),
      bringObjectToFront: (id) =>
        update((p) => {
          const item = p.objects.find((o) => o.id === id);
          if (!item) return p;
          return { ...p, objects: [...p.objects.filter((o) => o.id !== id), item] };
        }),
      sendObjectToBack: (id) =>
        update((p) => {
          const item = p.objects.find((o) => o.id === id);
          if (!item) return p;
          return { ...p, objects: [item, ...p.objects.filter((o) => o.id !== id)] };
        }),
      reorderObject: (id, direction) =>
        update((p) => {
          const sorted = [...p.objects].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((o) => o.id === id);
          const swapWith = idx + direction;
          if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return p;
          const a = sorted[idx];
          const b = sorted[swapWith];
          const objects = p.objects.map((o) => {
            if (o.id === a.id) return { ...o, order: b.order };
            if (o.id === b.id) return { ...o, order: a.order };
            return o;
          });
          return { ...p, objects };
        }),
    };
  }, [state, update]);

  return <ProjectContext.Provider value={store}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}
