import { useState } from "react";
import type { Group, Hotspot, HotspotStyleOverride, InteractionSettings, StepContent } from "../../types";

interface InspectorProps {
  hotspot: Hotspot;
  allHotspots: Hotspot[];
  groups: Group[];
  palette: string[];
  interaction: InteractionSettings;
  onChange: (updater: (h: Hotspot) => Hotspot) => void;
  onDelete: () => void;
  onRemoveArea: (index: number) => void;
  onStartAddArea: () => void;
  onStartSetSpotlight: () => void;
  onResetSpotlight: () => void;
  onStartConnectorShape: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function Inspector({
  hotspot,
  allHotspots,
  groups,
  palette,
  interaction,
  onChange,
  onDelete,
  onRemoveArea,
  onStartAddArea,
  onStartSetSpotlight,
  onResetSpotlight,
  onStartConnectorShape,
  onBringToFront,
  onSendToBack,
}: InspectorProps) {
  const group = groups.find((g) => g.id === hotspot.groupId) ?? null;
  const connectorMode: "inherit" | "none" | "custom" =
    hotspot.connector === undefined ? "inherit" : hotspot.connector === null ? "none" : "custom";
  return (
    <div>
      <h3>Fiche du bloc</h3>

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
      </div>

      <div className="dy-field">
        <label>Groupe</label>
        <select
          value={hotspot.groupId ?? ""}
          onChange={(e) => {
            const v = e.target.value || null;
            onChange((h) => ({ ...h, groupId: v }));
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
          </div>
        )}
      </div>

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

      <button className="dy-btn" onClick={onDelete} style={{ width: "100%" }}>
        Supprimer ce bloc
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
