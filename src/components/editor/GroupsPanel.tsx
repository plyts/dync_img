import { useState } from "react";
import type { Group } from "../../types";

interface GroupsPanelProps {
  groups: Group[];
  palette: string[];
  onAdd: (label: string) => void;
  onUpdate: (id: string, patch: Partial<Group>) => void;
  onRemove: (id: string) => void;
}

export function GroupsPanel({ groups, palette, onAdd, onUpdate, onRemove }: GroupsPanelProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <h3>Groupes</h3>
      {groups.map((g) => (
        <div key={g.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="color"
              value={g.color}
              onChange={(e) => onUpdate(g.id, { color: e.target.value })}
              list="dy-palette"
            />
            <input
              type="text"
              value={g.label}
              onChange={(e) => onUpdate(g.id, { label: e.target.value })}
              style={{ flex: 1 }}
            />
            <button
              className="dy-btn"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
              aria-label="Connecteur du groupe"
            >
              🎯
            </button>
            <button className="dy-btn" onClick={() => onRemove(g.id)} aria-label="Supprimer le groupe">
              ✕
            </button>
          </div>
          {expanded === g.id && (
            <div style={{ marginTop: 6, paddingLeft: 4 }}>
              <label style={{ fontSize: 11, color: "var(--dy-muted)" }}>
                Connecteur de groupe (ligne + point animé + onde vers un point de l'image, hérité
                par tous les blocs du groupe sauf override)
              </label>
              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                <label style={{ textTransform: "none", display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={g.connector !== null}
                    onChange={(e) =>
                      onUpdate(g.id, { connector: e.target.checked ? { to: { x: 50, y: 50 }, toShape: null } : null })
                    }
                  />
                  Actif
                </label>
                {g.connector && (
                  <>
                    <input
                      type="number"
                      value={Math.round(g.connector.to.x)}
                      onChange={(e) =>
                        onUpdate(g.id, {
                          connector: { ...g.connector!, to: { ...g.connector!.to, x: Number(e.target.value) } },
                        })
                      }
                      style={{ width: 60 }}
                    />
                    <input
                      type="number"
                      value={Math.round(g.connector.to.y)}
                      onChange={(e) =>
                        onUpdate(g.id, {
                          connector: { ...g.connector!, to: { ...g.connector!.to, y: Number(e.target.value) } },
                        })
                      }
                      style={{ width: 60 }}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <datalist id="dy-palette">
        {palette.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          placeholder="Nouveau groupe"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        />
        <button
          className="dy-btn"
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
