import type { ImageMeta, Project } from "../types";

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

function validateProject(data: unknown): Project {
  if (!data || typeof data !== "object") throw new Error("Fichier projet invalide.");
  const p = data as Partial<Project>;
  if (p.schemaVersion !== 1) throw new Error("Version de schéma non supportée.");
  if (!p.image || !Array.isArray(p.hotspots) || !Array.isArray(p.groups) || !p.theme) {
    throw new Error("Structure de projet incomplète.");
  }
  return p as Project;
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
