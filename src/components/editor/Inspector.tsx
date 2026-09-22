import { useState } from "react";
import type { CanvasObject, Group, Hotspot, HotspotStyleOverride, InteractionSettings, StepContent } from "../../types";
import { effectiveHotspotStyle } from "../../lib/geometry";
import { STYLE_PRESETS } from "../../lib/stylePresets";
import { Section } from "./Section";

interface InspectorProps {
  hotspot: Hotspot;
  allHotspots: Hotspot[];
  groups: Group[];
  palette: string[];
  interaction: InteractionSettings;
  objects: CanvasObject[];
  onChange: (updater: (h: Hotspot) => Hotspot) => void;
  onDelete: () => void;
  onRemoveArea: (index: number) => void;
  onStartAddArea: () => void;
  onStartSetSpotlight: () => void;
  onResetSpotlight: () => void;
  onStartConnectorShape: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onSelectObject: (id: string) => void;
}

export function Inspector({
  hotspot,
  allHotspots,
  groups,
  palette,
  interaction,
  objects,
  onChange,
  onDelete,
  onRemoveArea,
  onStartAddArea,
  onStartSetSpotlight,
  onResetSpotlight,
  onStartConnectorShape,
  onBringToFront,
  onSendToBack,
  onSelectObject,
}: InspectorProps) {
  const group = groups.find((g) => g.id === hotspot.groupId) ?? null;
  const linkedLines = objects.filter(
    (o) => o.kind === "line" && (o.fromHotspotId === hotspot.id || o.toHotspotId === hotspot.id),
  );
  const connectorMode: "inherit" | "none" | "custom" =
    hotspot.connector === undefined ? "inherit" : hotspot.connector === null ? "none" : "custom";
  return (
    <div className="dy-inspector">
      <div className="dy-insp-identity">
      <div className="dy-field">
        <label>Nom</label>
        <input
          type="text"
          value={hotspot.label}
          onChange={(e) => {
            const v = e.target.value;
            onChange((h) => ({ ...h, label: v }));
          }}
        />
      </div>

      <div className="dy-field">
        <label>Couleur</label>
        {hotspot.groupId ? (
          <p style={{ fontSize: 12, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{ width: 14, height: 14, borderRadius: "50%", background: hotspot.color, display: "inline-block" }}
            />
            Héritée du groupe — retire-le du groupe pour choisir une couleur propre.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => onChange((h) => ({ ...h, color: c }))}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: c,
                  border: c === hotspot.color ? "2px solid var(--dy-ink)" : "1px solid transparent",
                  cursor: "pointer",
                }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={hotspot.color}
              onChange={(e) => {
                const v = e.target.value;
                onChange((h) => ({ ...h, color: v }));
              }}
            />
          </div>
        )}
      </div>

      <div className="dy-field">
        <label>Groupe</label>
        <select
          value={hotspot.groupId ?? ""}
          onChange={(e) => {
            const v = e.target.value || null;
            const targetGroup = groups.find((g) => g.id === v);
            onChange((h) => ({ ...h, groupId: v, color: targetGroup ? targetGroup.color : h.color }));
          }}
        >
          <option value="">— aucun —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      </div>

      <Section title="Sélection & empilement" defaultOpen>
      <div className="dy-field">
        <label>Zones cliquables ({hotspot.areas.length})</label>
        {hotspot.areas.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
            <span style={{ flex: 1 }}>
              Zone {i + 1} — {a.kind === "rect" ? "rectangle" : `polygone (${a.points.length} pts)`}
            </span>
            {hotspot.areas.length > 1 && (
              <button className="dy-btn" onClick={() => onRemoveArea(i)} aria-label={`Supprimer la zone ${i + 1}`}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="dy-btn" onClick={onStartAddArea} style={{ width: "100%" }}>
          + Ajouter une zone (dessiner)
        </button>
        <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "4px 0 0" }}>
          Plusieurs zones peuvent ouvrir la même fiche — utile pour un bloc « vue d'ensemble » (ex.
          le titre + les nœuds du pipeline qu'il alimente).
        </p>
      </div>

      <div className="dy-field">
        <label>Spotlight (ce qui s'éclaire)</label>
        <p style={{ fontSize: 12, margin: "0 0 6px" }}>
          {hotspot.spotlightShape
            ? "Zone personnalisée définie."
            : "Par défaut : l'union des zones cliquables ci-dessus."}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dy-btn" onClick={onStartSetSpotlight} style={{ flex: 1 }}>
            {hotspot.spotlightShape ? "Redessiner" : "Dessiner un spotlight personnalisé"}
          </button>
          {hotspot.spotlightShape && (
            <button className="dy-btn" onClick={onResetSpotlight}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="dy-field">
        <label>Empilement (blocs imbriqués)</label>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dy-btn" onClick={onBringToFront} style={{ flex: 1 }}>
            ↥ Devant
          </button>
          <button className="dy-btn" onClick={onSendToBack} style={{ flex: 1 }}>
            ↧ Derrière
          </button>
        </div>
      </div>
      </Section>

      <Section title="Presets de style" defaultOpen>
        <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "0 0 8px" }}>
          Un jeu de paramètres prêt à l'emploi — clique pour l'appliquer, puis affine chaque
          réglage dans « Apparence » ci-dessous si besoin.
        </p>
        <PresetGrid
          style={hotspot.style}
          onApply={(patch) =>
            onChange((h) => ({
              ...h,
              // an empty patch ("Défaut du projet") clears every override rather
              // than merging as a no-op; any other preset merges its fields in.
              style: Object.keys(patch).length === 0 ? {} : { ...h.style, ...patch },
            }))
          }
        />
      </Section>

      <Section title="Apparence" defaultOpen>
        <StyleOverridePanel
          style={hotspot.style}
          interaction={interaction}
          onChange={(patch) => onChange((h) => ({ ...h, style: { ...h.style, ...patch } }))}
          onReset={(key) =>
            onChange((h) => {
              const next = { ...h.style };
              delete next[key];
              return { ...h, style: next };
            })
          }
        />
      </Section>

      <Section title="CSS">
        <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "0 0 6px" }}>
          Ce que ce bloc applique réellement, généré à partir des réglages ci-dessus — se met à
          jour en direct.
        </p>
        <CssCodePreview hotspotId={hotspot.id} style={effectiveHotspotStyle(interaction, hotspot.style)} />
        <div className="dy-field" style={{ marginTop: 10 }}>
          <label>CSS avancé (bloc par bloc)</label>
          <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "0 0 6px" }}>
            Tout ce qui n'est pas couvert ci-dessus : n'importe quelle propriété CSS, sur ce bloc
            uniquement. Utilise <code>&amp;</code> pour cibler ses propres états, ex.{" "}
            <code>&amp;.hovered {"{"} stroke-width: 2; {"}"}</code> ou{" "}
            <code>&amp;.selected {"{"} animation: spin 3s linear infinite; {"}"}</code>.
          </p>
          <textarea
            rows={5}
            value={hotspot.customCss}
            onChange={(e) => {
              const v = e.target.value;
              onChange((h) => ({ ...h, customCss: v }));
            }}
            placeholder={"&.hovered {\n  stroke-width: 2;\n}"}
            className="dy-code-textarea"
          />
        </div>
      </Section>

      <Section title="Connecteur">
        <div className="dy-field">
        <label>Connecteur</label>
        <select
          value={connectorMode}
          onChange={(e) => {
            const mode = e.target.value as "inherit" | "none" | "custom";
            if (mode === "inherit") {
              onChange((h) => {
                const { connector: _drop, ...rest } = h;
                return rest as Hotspot;
              });
            } else if (mode === "none") {
              onChange((h) => ({ ...h, connector: null }));
            } else {
              onChange((h) => ({ ...h, connector: { to: { ...h.anchor }, toShape: null, curved: false } }));
            }
          }}
        >
          <option value="inherit">Hérite du groupe{group ? ` (${group.label})` : " (aucun)"}</option>
          <option value="none">Aucun</option>
          <option value="custom">Personnalisé</option>
        </select>
        {connectorMode === "custom" && hotspot.connector && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                value={Math.round(hotspot.connector.to.x)}
                onChange={(e) =>
                  onChange((h) => ({
                    ...h,
                    connector: h.connector ? { ...h.connector, to: { ...h.connector.to, x: Number(e.target.value) } } : h.connector,
                  }))
                }
                style={{ width: "50%" }}
              />
              <input
                type="number"
                value={Math.round(hotspot.connector.to.y)}
                onChange={(e) =>
                  onChange((h) => ({
                    ...h,
                    connector: h.connector ? { ...h.connector, to: { ...h.connector.to, y: Number(e.target.value) } } : h.connector,
                  }))
                }
                style={{ width: "50%" }}
              />
            </div>
            <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "4px 0" }}>
              Point d'arrivée en % (x, y). Optionnel : dessine aussi une zone qui s'éclaire à
              l'arrivée.
            </p>
            <label
              style={{ textTransform: "none", display: "flex", gap: 4, alignItems: "center", fontSize: 12, marginBottom: 6 }}
            >
              <input
                type="checkbox"
                checked={hotspot.connector.curved}
                onChange={(e) =>
                  onChange((h) => ({
                    ...h,
                    connector: h.connector ? { ...h.connector, curved: e.target.checked } : h.connector,
                  }))
                }
              />
              Ligne courbe (sinon droite)
            </label>
            <button className="dy-btn" onClick={onStartConnectorShape} style={{ width: "100%" }}>
              {hotspot.connector.toShape ? "Redessiner la zone d'arrivée" : "+ Zone qui s'éclaire à l'arrivée"}
            </button>

            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, cursor: "pointer" }}>Réglages fins du connecteur</summary>
              <div style={{ marginTop: 6 }}>
                <ConnectorNumberField
                  label="Épaisseur du trait"
                  value={hotspot.connector.strokeWidth}
                  min={0.1}
                  max={2}
                  step={0.1}
                  onChange={(v) =>
                    onChange((h) => (h.connector ? { ...h, connector: { ...h.connector, strokeWidth: v } } : h))
                  }
                  onReset={() =>
                    onChange((h) => {
                      if (!h.connector) return h;
                      const { strokeWidth: _s, ...rest } = h.connector;
                      return { ...h, connector: rest as Hotspot["connector"] };
                    })
                  }
                />
                <ConnectorNumberField
                  label="Rayon du point animé"
                  value={hotspot.connector.dotRadius}
                  min={0.2}
                  max={2}
                  step={0.1}
                  onChange={(v) =>
                    onChange((h) => (h.connector ? { ...h, connector: { ...h.connector, dotRadius: v } } : h))
                  }
                  onReset={() =>
                    onChange((h) => {
                      if (!h.connector) return h;
                      const { dotRadius: _d, ...rest } = h.connector;
                      return { ...h, connector: rest as Hotspot["connector"] };
                    })
                  }
                />
                <ConnectorNumberField
                  label="Vitesse du point (ms)"
                  value={hotspot.connector.dotSpeedMs}
                  min={400}
                  max={4000}
                  step={100}
                  onChange={(v) =>
                    onChange((h) => (h.connector ? { ...h, connector: { ...h.connector, dotSpeedMs: v } } : h))
                  }
                  onReset={() =>
                    onChange((h) => {
                      if (!h.connector) return h;
                      const { dotSpeedMs: _sp, ...rest } = h.connector;
                      return { ...h, connector: rest as Hotspot["connector"] };
                    })
                  }
                />
                <ConnectorNumberField
                  label="Vitesse de l'onde (ms)"
                  value={hotspot.connector.ringSpeedMs}
                  min={600}
                  max={4000}
                  step={100}
                  onChange={(v) =>
                    onChange((h) => (h.connector ? { ...h, connector: { ...h.connector, ringSpeedMs: v } } : h))
                  }
                  onReset={() =>
                    onChange((h) => {
                      if (!h.connector) return h;
                      const { ringSpeedMs: _r, ...rest } = h.connector;
                      return { ...h, connector: rest as Hotspot["connector"] };
                    })
                  }
                />
                <div className="dy-field">
                  <label>Couleur{hotspot.connector.color === undefined ? " — celle du bloc" : ""}</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="color"
                      value={hotspot.connector.color ?? hotspot.color}
                      onChange={(e) =>
                        onChange((h) =>
                          h.connector ? { ...h, connector: { ...h.connector, color: e.target.value } } : h,
                        )
                      }
                    />
                    {hotspot.connector.color !== undefined && (
                      <button
                        className="dy-btn"
                        onClick={() =>
                          onChange((h) => {
                            if (!h.connector) return h;
                            const { color: _c, ...rest } = h.connector;
                            return { ...h, connector: rest as Hotspot["connector"] };
                          })
                        }
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}
        </div>
      </Section>

      <Section title={`Objets liés${linkedLines.length ? ` (${linkedLines.length})` : ""}`}>
        {linkedLines.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--dy-muted)", margin: 0 }}>
            Aucun objet libre (ligne, texte…) ne pointe vers ce bloc pour l'instant.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {linkedLines.map((line) => {
              const isFrom = line.kind === "line" && line.fromHotspotId === hotspot.id;
              return (
                <div key={line.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ flex: 1 }}>／ Ligne — {isFrom ? "point de départ" : "point d'arrivée"}</span>
                  <button className="dy-btn" onClick={() => onSelectObject(line.id)}>
                    Voir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Contenu">
      <div className="dy-field">
        <label>Explorer aussi</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allHotspots
            .filter((h) => h.id !== hotspot.id)
            .map((h) => {
              const active = hotspot.seeAlso.includes(h.id);
              return (
                <button
                  key={h.id}
                  className="dy-btn"
                  style={active ? { background: "var(--dy-ink)", color: "var(--dy-bg)" } : undefined}
                  onClick={() =>
                    onChange((hh) => ({
                      ...hh,
                      seeAlso: active ? hh.seeAlso.filter((id) => id !== h.id) : [...hh.seeAlso, h.id],
                    }))
                  }
                >
                  {h.label || "Sans nom"}
                </button>
              );
            })}
        </div>
      </div>

      <div className="dy-field">
        <label>Résumé</label>
        <textarea
          rows={2}
          value={hotspot.content.summary}
          onChange={(e) => {
            const v = e.target.value;
            onChange((h) => ({ ...h, content: { ...h.content, summary: v } }));
          }}
        />
      </div>

      <StepsEditor
        steps={hotspot.content.steps}
        onChange={(steps) => onChange((h) => ({ ...h, content: { ...h.content, steps } }))}
      />

      <div className="dy-field">
        <label>Exemple</label>
        <textarea
          rows={3}
          value={hotspot.content.example}
          onChange={(e) => {
            const v = e.target.value;
            onChange((h) => ({ ...h, content: { ...h.content, example: v } }));
          }}
        />
      </div>

      <div className="dy-field">
        <label>Quand l'utiliser</label>
        <textarea
          rows={2}
          value={hotspot.content.whenToUse}
          onChange={(e) => {
            const v = e.target.value;
            onChange((h) => ({ ...h, content: { ...h.content, whenToUse: v } }));
          }}
        />
      </div>

      <div className="dy-field">
        <label>Point d'attention</label>
        <textarea
          rows={2}
          value={hotspot.content.caution}
          onChange={(e) => {
            const v = e.target.value;
            onChange((h) => ({ ...h, content: { ...h.content, caution: v } }));
          }}
        />
      </div>

      <div className="dy-field">
        <label>Outils</label>
        <TagInput
          tags={hotspot.content.tools}
          onChange={(tools) => onChange((h) => ({ ...h, content: { ...h.content, tools } }))}
        />
      </div>
      </Section>

      <button className="dy-btn" onClick={onDelete} style={{ width: "100%" }}>
        Supprimer ce bloc
      </button>
    </div>
  );
}

function PresetGrid({
  style,
  onApply,
}: {
  style: HotspotStyleOverride;
  onApply: (patch: HotspotStyleOverride) => void;
}) {
  function matches(patch: HotspotStyleOverride) {
    const keys = Object.keys(patch) as (keyof HotspotStyleOverride)[];
    if (keys.length === 0) return Object.keys(style).length === 0;
    return keys.every((k) => style[k] === patch[k]);
  }

  return (
    <div className="dy-preset-grid">
      {STYLE_PRESETS.map((preset) => {
        const active = matches(preset.patch);
        const showOutline = preset.patch.showOutline ?? true;
        const radius = preset.patch.spotlightCornerRadius ?? 3;
        const tint = preset.patch.hoverTintOpacity ?? 0.18;
        const pulsing = preset.patch.pulseEnabled === true;
        return (
          <button
            key={preset.id}
            type="button"
            className={`dy-preset-card${active ? " active" : ""}`}
            title={preset.hint}
            onClick={() => onApply(preset.patch)}
          >
            <span
              className="dy-preset-swatch"
              style={{
                borderStyle: showOutline ? "dashed" : "none",
                borderWidth: showOutline ? Math.max(1, (preset.patch.selectionStrokeWidth ?? 0.9) * 2) : 0,
                borderRadius: Math.max(2, radius * 2),
                background: `color-mix(in srgb, var(--dy-ink) ${Math.round(tint * 100)}%, transparent)`,
              }}
            >
              {pulsing && <span className="dy-preset-pulse-dot" />}
            </span>
            <span className="dy-preset-label">{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CssCodePreview({
  hotspotId,
  style,
}: {
  hotspotId: string;
  style: ReturnType<typeof effectiveHotspotStyle>;
}) {
  const [copied, setCopied] = useState(false);
  const scope = `hs-${hotspotId}`;
  const lines = [
    `.${scope} {`,
    `  --dy-dash: ${style.showOutline ? style.dashPattern : "none"};`,
    `  --dy-selection-stroke-width: ${style.selectionStrokeWidth};`,
    `  --dy-corner-radius: ${style.spotlightCornerRadius};`,
    `  --dy-hover-tint: ${style.hoverTintOpacity};`,
    `  outline: ${style.showOutline ? "dashed" : "none"};`,
    `}`,
  ];
  if (style.pulseEnabled) {
    lines.push(
      "",
      `.${scope} .dy-pulse {`,
      `  --dy-pulse-min: ${style.pulseMinRadius};`,
      `  --dy-pulse-max: ${style.pulseMaxRadius};`,
      `  animation-duration: ${style.pulseSpeedMs}ms;`,
      `}`,
    );
  }
  const css = lines.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable (e.g. insecure context) — silently ignore
    }
  }

  return (
    <div className="dy-insp-code-wrap">
      <pre className="dy-insp-code">
        <code>{css}</code>
      </pre>
      <button type="button" className="dy-btn dy-insp-code-copy" onClick={copy}>
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}

function StepsEditor({
  steps,
  onChange,
}: {
  steps: StepContent[];
  onChange: (steps: StepContent[]) => void;
}) {
  function addStep() {
    onChange([...steps, { id: crypto.randomUUID(), title: `Étape ${steps.length + 1}`, body: "" }]);
  }
  function updateStep(id: string, patch: Partial<StepContent>) {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStep(id: string) {
    onChange(steps.filter((s) => s.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const i = steps.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="dy-field">
      <label>Étapes (de A à Z)</label>
      {steps.map((s) => (
        <div key={s.id} className="dy-step-editor">
          <div className="dy-step-editor-head">
            <strong>{s.title || "Étape"}</strong>
            <button className="dy-btn" onClick={() => move(s.id, -1)} aria-label="Monter">
              ↑
            </button>
            <button className="dy-btn" onClick={() => move(s.id, 1)} aria-label="Descendre">
              ↓
            </button>
            <button className="dy-btn" onClick={() => removeStep(s.id)} aria-label="Supprimer">
              ✕
            </button>
          </div>
          <input
            type="text"
            value={s.title}
            placeholder="Titre de l'étape"
            onChange={(e) => updateStep(s.id, { title: e.target.value })}
            style={{ marginBottom: 6, width: "100%" }}
          />
          <textarea
            rows={2}
            value={s.body}
            placeholder="Description"
            onChange={(e) => updateStep(s.id, { body: e.target.value })}
            style={{ width: "100%" }}
          />
        </div>
      ))}
      <button className="dy-btn" onClick={addStep} style={{ width: "100%" }}>
        + Ajouter une étape
      </button>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  }

  return (
    <div className="dy-tag-input">
      {tags.map((t) => (
        <span key={t}>
          {t}
          <button
            onClick={() => onChange(tags.filter((x) => x !== t))}
            style={{ border: "none", background: "none", cursor: "pointer" }}
            aria-label={`Retirer ${t}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder="ajouter…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

function OverrideRange({
  label,
  override,
  global,
  min,
  max,
  step,
  onChange,
  onReset,
  format,
}: {
  label: string;
  override: number | undefined;
  global: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onReset: () => void;
  format?: (v: number) => string;
}) {
  const value = override ?? global;
  const isOverridden = override !== undefined;
  const fmt = format ?? ((v: number) => String(v));
  return (
    <div className="dy-field">
      <label>
        {label} ({fmt(value)}){isOverridden ? "" : " — global"}
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ flex: 1 }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {isOverridden && (
          <button className="dy-btn" onClick={onReset} aria-label={`Réinitialiser ${label}`}>
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

function StyleOverridePanel({
  style,
  interaction,
  onChange,
  onReset,
}: {
  style: HotspotStyleOverride;
  interaction: InteractionSettings;
  onChange: (patch: Partial<HotspotStyleOverride>) => void;
  onReset: (key: keyof HotspotStyleOverride) => void;
}) {
  const showOutline = style.showOutline !== false;
  const pulseEnabled = style.pulseEnabled ?? interaction.pulseEnabled;

  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--dy-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Style de ce bloc
      </label>
      <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "2px 0 8px" }}>
        Chaque réglage hérite du panneau 🎨 Style global sauf si tu le changes ici.
      </p>

      <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={showOutline}
          onChange={(e) => (e.target.checked ? onReset("showOutline") : onChange({ showOutline: false }))}
        />
        Afficher le contour (pointillés)
      </label>

      {showOutline && (
        <>
          <div className="dy-field">
            <label>Motif des pointillés{style.dashPattern === undefined ? " — global" : ""}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={style.dashPattern ?? interaction.dashPattern}
                onChange={(e) => onChange({ dashPattern: e.target.value })}
                placeholder={interaction.dashPattern}
              />
              {style.dashPattern !== undefined && (
                <button className="dy-btn" onClick={() => onReset("dashPattern")}>
                  ↺
                </button>
              )}
            </div>
          </div>

          <OverrideRange
            label="Épaisseur du contour sélectionné"
            override={style.selectionStrokeWidth}
            global={interaction.selectionStrokeWidth}
            min={0.3}
            max={2}
            step={0.1}
            onChange={(v) => onChange({ selectionStrokeWidth: v })}
            onReset={() => onReset("selectionStrokeWidth")}
          />
        </>
      )}

      <OverrideRange
        label="Teinte au survol / sélection"
        override={style.hoverTintOpacity}
        global={interaction.hoverTintOpacity}
        min={0}
        max={0.6}
        step={0.02}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange({ hoverTintOpacity: v })}
        onReset={() => onReset("hoverTintOpacity")}
      />

      <OverrideRange
        label="Arrondi du spotlight"
        override={style.spotlightCornerRadius}
        global={interaction.spotlightCornerRadius}
        min={0}
        max={10}
        step={0.5}
        onChange={(v) => onChange({ spotlightCornerRadius: v })}
        onReset={() => onReset("spotlightCornerRadius")}
      />

      <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
        <input
          type="checkbox"
          checked={pulseEnabled}
          onChange={(e) => onChange({ pulseEnabled: e.target.checked })}
        />
        Pastille pulsante (au repos)
        {style.pulseEnabled !== undefined && (
          <button className="dy-btn" onClick={() => onReset("pulseEnabled")} style={{ marginLeft: "auto" }}>
            ↺
          </button>
        )}
      </label>

      {pulseEnabled && (
        <>
          <OverrideRange
            label="Rayon min. pastille"
            override={style.pulseMinRadius}
            global={interaction.pulseMinRadius}
            min={0.2}
            max={2}
            step={0.1}
            onChange={(v) => onChange({ pulseMinRadius: v })}
            onReset={() => onReset("pulseMinRadius")}
          />
          <OverrideRange
            label="Rayon max. pastille"
            override={style.pulseMaxRadius}
            global={interaction.pulseMaxRadius}
            min={1}
            max={6}
            step={0.2}
            onChange={(v) => onChange({ pulseMaxRadius: v })}
            onReset={() => onReset("pulseMaxRadius")}
          />
          <OverrideRange
            label="Vitesse pastille (ms)"
            override={style.pulseSpeedMs}
            global={interaction.pulseSpeedMs}
            min={600}
            max={4000}
            step={100}
            onChange={(v) => onChange({ pulseSpeedMs: v })}
            onReset={() => onReset("pulseSpeedMs")}
          />
        </>
      )}
    </div>
  );
}

function ConnectorNumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onReset,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  const fallback = (min + max) / 2;
  const isOverridden = value !== undefined;
  return (
    <div className="dy-field">
      <label>
        {label} ({value ?? fallback}){isOverridden ? "" : " — global"}
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? fallback}
          style={{ flex: 1 }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {isOverridden && (
          <button className="dy-btn" onClick={onReset} aria-label={`Réinitialiser ${label}`}>
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
