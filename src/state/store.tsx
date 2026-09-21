import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Group, Hotspot, HotspotShape, ImageMeta, Project } from "../types";
import { DEFAULT_PALETTE, emptyContent } from "../types";
import { centroid } from "../lib/geometry";

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

function makeHotspot(project: Project, shape: HotspotShape, indexOffset = 0): Hotspot {
  const palette = project.theme.palette.length ? project.theme.palette : DEFAULT_PALETTE;
  const index = project.hotspots.length + indexOffset;
  return {
    id: crypto.randomUUID(),
    label: `Élément ${index + 1}`,
    color: palette[index % palette.length],
    groupId: null,
    order: index,
    shape,
    anchor: centroid(shape),
    content: emptyContent(),
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
  updateHotspot: (id: string, updater: (h: Hotspot) => Hotspot) => void;
  removeHotspot: (id: string) => void;
  reorderHotspot: (id: string, direction: -1 | 1) => void;
  addGroup: (label: string) => Group;
  updateGroup: (id: string, updater: (g: Group) => Group) => void;
  removeGroup: (id: string) => void;
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
        const created = makeHotspot(state.present, shape);
        update((p) => ({ ...p, hotspots: [...p.hotspots, created] }));
        return created;
      },
      addHotspots: (shapes) => {
        const created = shapes.map((shape, i) => makeHotspot(state.present, shape, i));
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
      addGroup: (label) => {
        const group: Group = {
          id: crypto.randomUUID(),
          label,
          color: nextColor(state.present),
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
    };
  }, [state, update]);

  return <ProjectContext.Provider value={store}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}
