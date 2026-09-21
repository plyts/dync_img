import type { ImageMeta, Project } from "../types";
import { DEFAULT_INTERACTION } from "../types";

export function readImageFile(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({ src, width: img.naturalWidth, height: img.naturalHeight, alt: file.name });
      };
      img.onerror = () => reject(new Error("Fichier image invalide."));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function downloadTextFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportProjectJson(project: Project) {
  downloadTextFile(
    `${slug(project.name)}.dyimg.json`,
    JSON.stringify(project, null, 2),
  );
}

export function readProjectFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier projet."));
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        resolve(validateProject(data));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("JSON invalide."));
      }
    };
    reader.readAsText(file);
  });
}

/** v1 hotspots had a single `shape` field; v2 has `areas: HotspotShape[]` plus
 *  an optional `spotlightShape` and `seeAlso`. Groups gained an optional
 *  `connector`, and the theme gained `interaction` settings. */
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  const hotspots = Array.isArray(raw.hotspots) ? raw.hotspots : [];
  const theme = (raw.theme ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    schemaVersion: 2,
    groups: groups.map((g) => ({ connector: null, ...(g as object) })),
    hotspots: hotspots.map((h) => {
      const { shape, ...rest } = h as Record<string, unknown> & { shape?: unknown };
      return {
        areas: shape ? [shape] : [],
        spotlightShape: null,
        seeAlso: [],
        ...rest,
      };
    }),
    theme: { ...theme, interaction: theme.interaction ?? { ...DEFAULT_INTERACTION } },
  };
}

/** Fills in interaction/connector fields added after a project was saved, so
 *  older v2 files (already exported before those fields existed) keep
 *  working instead of throwing on a missing key. Doesn't bump
 *  schemaVersion — this is additive normalization, not a format change. */
function normalizeConnector(raw: unknown): Record<string, unknown> {
  const c = raw as Record<string, unknown>;
  return { curved: false, ...c };
}

function normalizeProject(raw: Record<string, unknown>): Record<string, unknown> {
  const theme = (raw.theme ?? {}) as Record<string, unknown>;
  const interaction = { ...DEFAULT_INTERACTION, ...((theme.interaction as object) ?? {}) };
  const groups = ((raw.groups as Record<string, unknown>[]) ?? []).map((g) => ({
    ...g,
    connector: g.connector ? normalizeConnector(g.connector) : null,
  }));
  const hotspots = ((raw.hotspots as Record<string, unknown>[]) ?? []).map((h) => {
    const withStyle = { ...h, style: (h.style as object) ?? {}, customCss: (h.customCss as string) ?? "" };
    if (!("connector" in h)) return withStyle;
    return { ...withStyle, connector: h.connector ? normalizeConnector(h.connector) : null };
  });
  const objects = (Array.isArray(raw.objects) ? raw.objects : []).map((o: Record<string, unknown>) => ({
    notes: "",
    groupId: null,
    ...o,
  }));
  const objectGroups = Array.isArray(raw.objectGroups) ? raw.objectGroups : [];
  return { ...raw, theme: { ...theme, interaction }, groups, hotspots, objects, objectGroups };
}

function validateProject(data: unknown): Project {
  if (!data || typeof data !== "object") throw new Error("Fichier projet invalide.");
  let p = data as Record<string, unknown>;
  if (p.schemaVersion === 1) {
    p = migrateV1ToV2(p);
  } else if (p.schemaVersion !== 2) {
    throw new Error("Version de schéma non supportée.");
  }
  p = normalizeProject(p);
  if (!p.image || !Array.isArray(p.hotspots) || !Array.isArray(p.groups) || !p.theme) {
    throw new Error("Structure de projet incomplète.");
  }
  return p as unknown as Project;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "projet"
  );
}
