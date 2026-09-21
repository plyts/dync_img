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

  return (
    <div>
      <h3>Groupes</h3>
      {groups.map((g) => (
        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
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
          <button className="dy-btn" onClick={() => onRemove(g.id)} aria-label="Supprimer le groupe">
            ✕
          </button>
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
