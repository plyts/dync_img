import type { Hotspot } from "../../types";

interface HotspotListProps {
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
}

export function HotspotList({ hotspots, selectedId, onSelect, onReorder }: HotspotListProps) {
  const sorted = [...hotspots].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div>
        <h3>Blocs</h3>
        <div className="dy-empty-state">
          Choisis l'outil rectangle ou polygone puis dessine sur l'image pour créer un bloc.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>Blocs ({sorted.length})</h3>
      {sorted.map((h) => (
        <div
          key={h.id}
          className={`dy-hotspot-row${h.id === selectedId ? " active" : ""}`}
          onClick={() => onSelect(h.id)}
        >
          <span className="dot" style={{ background: h.color }} />
          <span className="name">{h.label || "Sans nom"}</span>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(h.id, -1);
            }}
            aria-label="Monter dans l'ordre"
          >
            ↑
          </button>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(h.id, 1);
            }}
            aria-label="Descendre dans l'ordre"
          >
            ↓
          </button>
        </div>
      ))}
    </div>
  );
}
