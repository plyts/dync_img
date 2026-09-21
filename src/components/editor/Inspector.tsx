import { useState } from "react";
import type { Group, Hotspot, StepContent } from "../../types";

interface InspectorProps {
  hotspot: Hotspot;
  allHotspots: Hotspot[];
  groups: Group[];
  palette: string[];
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
