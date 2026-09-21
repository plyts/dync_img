import type { HotspotContent } from "../types";

/**
 * Optional AI-assist feature: calls the Anthropic Messages API directly from
 * the browser with the user's own API key (never stored anywhere but this
 * tab's memory) to (1) detect candidate hotspots on ANY uploaded image, with
 * support for multi-area/spotlight blocks and for re-analyzing just one
 * region with free-form instructions, and (2) draft the A-to-Z content for a
 * given block. Every prompt is exported as a plain string/function so it is
 * visible, editable, and reproduced verbatim in docs/GUIDE.md.
 *
 * A direct browser call needs the "anthropic-dangerous-direct-browser-access"
 * header. If your key's CORS/organization policy blocks that, proxy this
 * same request through a one-line serverless function instead — the prompt
 * and payload below stay identical either way.
 */

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_AI_MODEL = "claude-sonnet-4-5";

export const HOTSPOT_DETECTION_SYSTEM_PROMPT = `Tu es un assistant qui prépare des schémas interactifs.
On te donne l'image d'une architecture, d'un diagramme ou d'un schéma technique
(éventuellement recadrée sur une seule région si l'utilisateur veut l'affiner).
Ta tâche : repérer les blocs/composants visuellement distincts et proposer,
pour chacun, une ou plusieurs zones cliquables rectangulaires.

Règles :
- Coordonnées en pourcentage de l'image fournie (0 à 100), x/y = coin haut-gauche, w/h = largeur/hauteur.
- La plupart des blocs n'ont besoin que d'une seule zone dans "areas".
- Utilise plusieurs zones dans "areas" UNIQUEMENT quand un même bloc logique doit être
  cliquable à plusieurs endroits distincts de l'image (ex. un titre de famille + les
  nœuds du pipeline qu'elle alimente).
- Si le bloc a plusieurs zones ET qu'un cadre visuel plus large doit s'éclairer
  quand on clique sur n'importe laquelle d'entre elles, fournis "spotlight"
  (un rectangle qui englobe visuellement le bloc). Sinon omets "spotlight"
  (l'union des "areas" sera utilisée automatiquement).
- "label" = le texte visible sur le bloc, ou un nom court si aucun texte n'est visible.
- "groupLabel" = le nom de la famille/catégorie visuelle à laquelle le bloc appartient, si le
  schéma a des regroupements colorés/encadrés ; sinon omets ce champ.
- "order" = un entier reflétant l'ordre logique de lecture ou de pipeline (gauche->droite, haut->bas).
- Ne fais JAMAIS chevaucher les zones cliquables de deux blocs différents.
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour, au format :
{"hotspots": [{
  "label": string,
  "order": number,
  "groupLabel"?: string,
  "areas": [{"x": number, "y": number, "w": number, "h": number}],
  "spotlight"?: {"x": number, "y": number, "w": number, "h": number}
}]}`;

export function buildHotspotDetectionUserPrompt(extraInstructions?: string, isRefinement = false): string {
  return [
    isRefinement
      ? "Cette image est un recadrage d'une zone précise du schéma original. Redécoupe UNIQUEMENT cette zone selon l'instruction ci-dessous."
      : "Analyse cette image et détecte tous les blocs/composants qu'elle contient.",
    extraInstructions?.trim() ? `Instruction de l'utilisateur : ${extraInstructions.trim()}` : "",
    "Réponds uniquement avec le JSON demandé.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const CONTENT_DRAFT_SYSTEM_PROMPT = `Tu es un rédacteur technique qui explique un composant d'architecture "de A à Z".
On te donne le nom d'un bloc et le contexte du schéma auquel il appartient.
Rédige une fiche pédagogique concise, dans un style clair, sans jargon inutile.

Réponds UNIQUEMENT avec un JSON valide au format :
{
  "summary": string (1-2 phrases),
  "steps": [{"title": string, "body": string}] (3 à 5 étapes qui détaillent le fonctionnement de A à Z),
  "example": string (un exemple concret court, type appel de code ou requête),
  "whenToUse": string (1-2 phrases),
  "caution": string (1-2 phrases sur un piège ou une limite),
  "tools": string[] (2 à 4 outils/technos typiques)
}`;

export function buildContentDraftUserPrompt(label: string, schemaContext: string): string {
  return [
    `Bloc à documenter : "${label}".`,
    schemaContext.trim() ? `Contexte du schéma (autres blocs, domaine, pipeline) : ${schemaContext.trim()}` : "",
    "Réponds uniquement avec le JSON demandé.",
  ]
    .filter(Boolean)
    .join("\n");
}

interface AnthropicMessageResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callAnthropic(
  apiKey: string,
  system: string,
  userContent: Array<Record<string, unknown>>,
  model: string,
): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Appel API échoué (${res.status}) : ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as AnthropicMessageResponse;
  const text = data.content.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Réponse vide de l'API.");
  return text;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Pas de JSON trouvé dans la réponse.");
  return JSON.parse(text.slice(start, end + 1));
}

function dataUrlToBase64(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Image invalide (attendu une data URL base64).");
  return { mediaType: match[1], data: match[2] };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Fichier image invalide."));
    img.src = src;
  });
}

export interface PercentRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crops the image to a percent-space region, client-side, so a "refine this
 *  region" request sends the AI a focused close-up instead of the whole
 *  image — better accuracy, fewer tokens. */
export async function cropImageDataUrl(imageDataUrl: string, region: PercentRect): Promise<string> {
  const img = await loadImage(imageDataUrl);
  const sx = (region.x / 100) * img.naturalWidth;
  const sy = (region.y / 100) * img.naturalHeight;
  const sw = (region.w / 100) * img.naturalWidth;
  const sh = (region.h / 100) * img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte canvas indisponible.");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export interface DetectedHotspot {
  label: string;
  order: number;
  groupLabel?: string;
  areas: PercentRect[];
  spotlight?: PercentRect;
}

function remapRect(r: PercentRect, offset: { x: number; y: number }, scale: { x: number; y: number }): PercentRect {
  return {
    x: offset.x + r.x * scale.x,
    y: offset.y + r.y * scale.y,
    w: r.w * scale.x,
    h: r.h * scale.y,
  };
}

export async function detectHotspotsFromImage(
  apiKey: string,
  imageDataUrl: string,
  opts: { extraInstructions?: string; model?: string; region?: PercentRect } = {},
): Promise<DetectedHotspot[]> {
  const targetDataUrl = opts.region ? await cropImageDataUrl(imageDataUrl, opts.region) : imageDataUrl;
  const { mediaType, data } = dataUrlToBase64(targetDataUrl);
  const text = await callAnthropic(
    apiKey,
    HOTSPOT_DETECTION_SYSTEM_PROMPT,
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data } },
      { type: "text", text: buildHotspotDetectionUserPrompt(opts.extraInstructions, Boolean(opts.region)) },
    ],
    opts.model ?? DEFAULT_AI_MODEL,
  );
  const parsed = extractJson(text) as { hotspots?: DetectedHotspot[] };
  if (!Array.isArray(parsed.hotspots)) throw new Error("Format de réponse inattendu.");

  if (!opts.region) return parsed.hotspots;

  const offset = { x: opts.region.x, y: opts.region.y };
  const scale = { x: opts.region.w / 100, y: opts.region.h / 100 };
  return parsed.hotspots.map((h) => ({
    ...h,
    areas: h.areas.map((a) => remapRect(a, offset, scale)),
    spotlight: h.spotlight ? remapRect(h.spotlight, offset, scale) : undefined,
  }));
}

export async function draftHotspotContent(
  apiKey: string,
  label: string,
  schemaContext: string,
  model = DEFAULT_AI_MODEL,
): Promise<HotspotContent> {
  const text = await callAnthropic(
    apiKey,
    CONTENT_DRAFT_SYSTEM_PROMPT,
    [{ type: "text", text: buildContentDraftUserPrompt(label, schemaContext) }],
    model,
  );
  const parsed = extractJson(text) as {
    summary?: string;
    steps?: Array<{ title: string; body: string }>;
    example?: string;
    whenToUse?: string;
    caution?: string;
    tools?: string[];
  };
  return {
    summary: parsed.summary ?? "",
    steps: (parsed.steps ?? []).map((s) => ({ id: crypto.randomUUID(), title: s.title, body: s.body })),
    example: parsed.example ?? "",
    whenToUse: parsed.whenToUse ?? "",
    caution: parsed.caution ?? "",
    tools: parsed.tools ?? [],
  };
}
