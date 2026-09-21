import type { HotspotContent } from "../types";

/**
 * Optional AI-assist feature: calls a vision-capable LLM directly from the
 * browser with the user's own API key (never stored anywhere but this
 * device's localStorage, per provider) to (1) detect candidate hotspots on
 * ANY uploaded image, with support for multi-area/spotlight blocks and for
 * re-analyzing just one region with free-form instructions, and (2) draft
 * the A-to-Z content for a given block. Every prompt is exported as a plain
 * string/function so it is visible, editable, and reproduced verbatim in
 * docs/GUIDE.md.
 *
 * Several providers are supported (see AI_PROVIDERS) so you can use
 * whichever key you already have, including free-tier options — Anthropic
 * and OpenAI use their native APIs; everything else (Qwen included) goes
 * through the OpenAI-compatible chat-completions shape most providers
 * implement, so adding another one is just a new entry in AI_PROVIDERS, no
 * new request logic. A direct browser call to Anthropic needs the
 * "anthropic-dangerous-direct-browser-access" header; if your key's CORS/
 * organization policy blocks that, proxy the request through a one-line
 * serverless function instead — the prompt and payload stay identical.
 */

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_AI_MODEL = "claude-sonnet-4-5";

export type AIProviderId = "anthropic" | "openai" | "qwen" | "custom-openai";

export interface AIProviderConfig {
  id: AIProviderId;
  label: string;
  /** Chat-completions endpoint for OpenAI-compatible providers; ignored for
   *  "anthropic", which always uses ANTHROPIC_API_URL. Editable per-session
   *  for "custom-openai" so any OpenAI-compatible host works (Groq,
   *  OpenRouter, Together AI, a local server, …). */
  baseUrl: string;
  defaultModel: string;
  /** Where to get a key — shown next to the key field, not sent anywhere. */
  docsHint: string;
}

export const AI_PROVIDERS: Record<AIProviderId, AIProviderConfig> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    baseUrl: ANTHROPIC_API_URL,
    defaultModel: DEFAULT_AI_MODEL,
    docsHint: "Clé sur console.anthropic.com",
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT-4o)",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    docsHint: "Clé sur platform.openai.com",
  },
  qwen: {
    id: "qwen",
    label: "Qwen (Alibaba — quota gratuit)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen-vl-max",
    docsHint: "Clé gratuite (quota d'essai) sur dashscope.console.aliyun.com",
  },
  "custom-openai": {
    id: "custom-openai",
    label: "Autre (compatible OpenAI)",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.2-90b-vision-preview",
    docsHint: "Groq, OpenRouter, Together AI, un serveur local… — renseigne l'URL et le modèle ci-dessous. Plusieurs ont un niveau gratuit.",
  },
};

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
  "tools": string[] (2 à 4 outils/technos typiques),
  "notes": {
    "links": [{"label": string, "url": string}] (2 à 4 ressources externes réelles et vérifiables — paper arXiv, documentation officielle, dépôt GitHub ; n'invente jamais une URL, omets un lien si tu n'es pas sûr qu'il existe),
    "tip": string (1-2 phrases : une nuance, un lien avec un autre bloc du schéma, ou une mise en garde pratique qui N'EST PAS déjà dans "caution" ou "whenToUse")
  }
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

interface OpenAIChatResponse {
  choices: Array<{ message?: { content?: string } }>;
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

/** Every provider besides Anthropic speaks the same OpenAI-compatible
 *  chat-completions shape — Bearer auth, messages[], an image_url content
 *  part that takes a data URL directly (no base64 pre-extraction needed). */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  system: string,
  userText: string,
  imageDataUrl: string | undefined,
  model: string,
): Promise<string> {
  const userContent = imageDataUrl
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : userText;

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Appel API échoué (${res.status}) : ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as OpenAIChatResponse;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Réponse vide de l'API.");
  return text;
}

/** Single entry point used by both detection and content drafting — routes
 *  to the right request shape for the chosen provider. `imageDataUrl` is
 *  omitted for the text-only content-drafting call. */
async function callProvider(
  provider: AIProviderConfig,
  apiKey: string,
  system: string,
  userText: string,
  imageDataUrl: string | undefined,
  model: string,
  baseUrlOverride?: string,
): Promise<string> {
  if (provider.id === "anthropic") {
    const userContent: Array<Record<string, unknown>> = [];
    if (imageDataUrl) {
      const { mediaType, data } = dataUrlToBase64(imageDataUrl);
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
    userContent.push({ type: "text", text: userText });
    return callAnthropic(apiKey, system, userContent, model);
  }
  return callOpenAICompatible(baseUrlOverride || provider.baseUrl, apiKey, system, userText, imageDataUrl, model);
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
  provider: AIProviderConfig,
  apiKey: string,
  imageDataUrl: string,
  opts: { extraInstructions?: string; model?: string; region?: PercentRect; baseUrlOverride?: string } = {},
): Promise<DetectedHotspot[]> {
  const targetDataUrl = opts.region ? await cropImageDataUrl(imageDataUrl, opts.region) : imageDataUrl;
  const text = await callProvider(
    provider,
    apiKey,
    HOTSPOT_DETECTION_SYSTEM_PROMPT,
    buildHotspotDetectionUserPrompt(opts.extraInstructions, Boolean(opts.region)),
    targetDataUrl,
    opts.model ?? provider.defaultModel,
    opts.baseUrlOverride,
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

export interface DraftedNoteLink {
  label: string;
  url: string;
}

export interface DraftedNotes {
  links: DraftedNoteLink[];
  tip: string;
}

export interface DraftedHotspotContent {
  content: HotspotContent;
  notes: DraftedNotes;
}

export async function draftHotspotContent(
  provider: AIProviderConfig,
  apiKey: string,
  label: string,
  schemaContext: string,
  model?: string,
  baseUrlOverride?: string,
): Promise<DraftedHotspotContent> {
  const text = await callProvider(
    provider,
    apiKey,
    CONTENT_DRAFT_SYSTEM_PROMPT,
    buildContentDraftUserPrompt(label, schemaContext),
    undefined,
    model ?? provider.defaultModel,
    baseUrlOverride,
  );
  const parsed = extractJson(text) as {
    summary?: string;
    steps?: Array<{ title: string; body: string }>;
    example?: string;
    whenToUse?: string;
    caution?: string;
    tools?: string[];
    notes?: { links?: Array<{ label?: string; url?: string }>; tip?: string };
  };
  return {
    content: {
      summary: parsed.summary ?? "",
      steps: (parsed.steps ?? []).map((s) => ({ id: crypto.randomUUID(), title: s.title, body: s.body })),
      example: parsed.example ?? "",
      whenToUse: parsed.whenToUse ?? "",
      caution: parsed.caution ?? "",
      tools: parsed.tools ?? [],
    },
    notes: {
      links: (parsed.notes?.links ?? [])
        .filter((l): l is { label: string; url: string } => Boolean(l.label?.trim() && l.url?.trim()))
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
      tip: parsed.notes?.tip?.trim() ?? "",
    },
  };
}

/**
 * Renders drafted notes into the exact Markdown the app's own renderer
 * supports (lib/markdown.ts: bold/italic/code/links/line-breaks only — no
 * #headings or >blockquotes), so it displays cleanly in the object's
 * click-to-reveal notes modal instead of showing literal "###"/">" marks.
 */
export function formatHotspotNotesMarkdown(label: string, notes: DraftedNotes): string {
  if (!notes.links.length && !notes.tip) return "";
  const lines = [`**${label}**`];
  if (notes.links.length) {
    lines.push("", "**Pour aller plus loin**");
    for (const l of notes.links) lines.push(`- [${l.label}](${l.url})`);
  }
  if (notes.tip) lines.push("", `**→** ${notes.tip}`);
  return lines.join("\n");
}
