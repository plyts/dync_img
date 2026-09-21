import { useState } from "react";
import type { HotspotContent, Project } from "../../types";
import {
  buildContentDraftUserPrompt,
  buildHotspotDetectionUserPrompt,
  CONTENT_DRAFT_SYSTEM_PROMPT,
  detectHotspotsFromImage,
  draftHotspotContent,
  HOTSPOT_DETECTION_SYSTEM_PROMPT,
  type DetectedHotspot,
  type PercentRect,
} from "../../lib/ai";

const KEY_STORAGE = "dyimg.anthropic-api-key";

interface AIAssistModalProps {
  project: Project;
  selectedLabel: string | null;
  initialRegion: PercentRect | null;
  onClearRegion: () => void;
  onClose: () => void;
  onImportDetected: (hotspots: DetectedHotspot[]) => void;
  onApplyContent: (content: HotspotContent) => void;
}

export function AIAssistModal({
  project,
  selectedLabel,
  initialRegion,
  onClearRegion,
  onClose,
  onImportDetected,
  onApplyContent,
}: AIAssistModalProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? "");
  const [remember, setRemember] = useState(Boolean(localStorage.getItem(KEY_STORAGE)));
  const [tab, setTab] = useState<"detect" | "content">(initialRegion || !selectedLabel ? "detect" : "content");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedHotspot[] | null>(null);
  const [drafted, setDrafted] = useState<HotspotContent | null>(null);

  function persistKey() {
    if (remember) localStorage.setItem(KEY_STORAGE, apiKey);
    else localStorage.removeItem(KEY_STORAGE);
  }

  async function runDetect() {
    setLoading(true);
    setError(null);
    setDetected(null);
    try {
      persistKey();
      const result = await detectHotspotsFromImage(apiKey, project.image.src, {
        extraInstructions: extra,
        region: initialRegion ?? undefined,
      });
      setDetected(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function runDraft() {
    if (!selectedLabel) return;
    setLoading(true);
    setError(null);
    setDrafted(null);
    try {
      persistKey();
      const context = `Schéma "${project.name}". Autres blocs : ${project.hotspots.map((h) => h.label).join(", ") || "aucun"}.`;
      const result = await draftHotspotContent(apiKey, selectedLabel, context);
      setDrafted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dy-modal-backdrop" onClick={onClose}>
      <div className="dy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Assistant IA (optionnel)</h3>
        <p style={{ fontSize: 13, color: "var(--dy-muted)" }}>
          Utilise ta propre clé API Anthropic. Elle n'est jamais envoyée ailleurs qu'à
          api.anthropic.com et reste dans ce navigateur.
        </p>

        <div className="dy-field">
          <label>Clé API Anthropic</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Se souvenir de la clé sur cet appareil (localStorage)
          </label>
        </div>

        <div className="dy-mode-switch" style={{ marginBottom: 12 }}>
          <button className={tab === "detect" ? "active" : ""} onClick={() => setTab("detect")}>
            Détecter les blocs
          </button>
          <button
            className={tab === "content" ? "active" : ""}
            onClick={() => setTab("content")}
            disabled={!selectedLabel}
          >
            Rédiger le contenu
          </button>
        </div>

        {tab === "detect" ? (
          <div>
            {initialRegion ? (
              <div className="dy-field">
                <label>Zone à affiner</label>
                <p style={{ fontSize: 12 }}>
                  Analyse limitée à la région dessinée (x:{Math.round(initialRegion.x)}%,
                  y:{Math.round(initialRegion.y)}%, {Math.round(initialRegion.w)}×
                  {Math.round(initialRegion.h)}%).
                </p>
                <button className="dy-btn" onClick={onClearRegion}>
                  Revenir à l'image entière
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--dy-muted)" }}>
                Analyse l'image entière. Pour redécouper plus finement une seule zone (plus
                précis), ferme cette fenêtre et utilise « 🔍 Affiner une zone » dans la barre
                d'outils.
              </p>
            )}
            <div className="dy-field">
              <label>Instructions (optionnel)</label>
              <textarea
                rows={2}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={
                  initialRegion
                    ? "ex : découpe cette zone en 4 sous-blocs, un par technique listée"
                    : "ex : ignore la légende en bas de l'image"
                }
              />
            </div>
            <details style={{ marginBottom: 10, fontSize: 12 }}>
              <summary>Voir le prompt envoyé à l'IA</summary>
              <pre className="dy-example">
                {HOTSPOT_DETECTION_SYSTEM_PROMPT}
                {"\n\n---\n\n"}
                {buildHotspotDetectionUserPrompt(extra, Boolean(initialRegion))}
              </pre>
            </details>
            <button className="dy-btn primary" onClick={runDetect} disabled={!apiKey || loading}>
              {loading ? "Analyse en cours…" : "Analyser"}
            </button>
            {detected && (
              <div style={{ marginTop: 12 }}>
                <p>{detected.length} bloc(s) détecté(s) :</p>
                <ul>
                  {detected.map((d, i) => (
                    <li key={i}>
                      {d.label}
                      {d.areas.length > 1 ? ` (${d.areas.length} zones)` : ""}
                      {d.groupLabel ? ` — ${d.groupLabel}` : ""}
                    </li>
                  ))}
                </ul>
                <button
                  className="dy-btn primary"
                  onClick={() => {
                    onImportDetected(detected);
                    onClose();
                  }}
                >
                  Créer ces blocs
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13 }}>
              Bloc sélectionné : <strong>{selectedLabel}</strong>
            </p>
            <details style={{ marginBottom: 10, fontSize: 12 }}>
              <summary>Voir le prompt envoyé à l'IA</summary>
              <pre className="dy-example">
                {CONTENT_DRAFT_SYSTEM_PROMPT}
                {"\n\n---\n\n"}
                {buildContentDraftUserPrompt(selectedLabel ?? "", project.name)}
              </pre>
            </details>
            <button className="dy-btn primary" onClick={runDraft} disabled={!apiKey || loading}>
              {loading ? "Rédaction en cours…" : "Générer la fiche"}
            </button>
            {drafted && (
              <div style={{ marginTop: 12 }}>
                <p className="dy-summary">{drafted.summary}</p>
                <button
                  className="dy-btn primary"
                  onClick={() => {
                    onApplyContent(drafted);
                    onClose();
                  }}
                >
                  Appliquer au bloc
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>{error}</p>
        )}

        <button className="dy-btn" onClick={onClose} style={{ marginTop: 14 }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
