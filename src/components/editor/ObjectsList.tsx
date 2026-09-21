import type { CanvasObject, Hotspot } from "../../types";

interface ObjectsListProps {
  objects: CanvasObject[];
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
}

const KIND_ICON: Record<CanvasObject["kind"], string> = {
  text: "🔤",
  image: "🖼",
  shape: "▭",
  line: "／",
  pulse: "🔵",
};

function labelFor(o: CanvasObject, hotspots: Hotspot[]): string {
  if (o.kind === "text") return o.text.trim() ? o.text.trim().slice(0, 24) : "Texte vide";
  if (o.kind === "image") return o.alt || "Image";
  if (o.kind === "shape") return o.shapeType === "ellipse" ? "Forme (ellipse)" : "Forme (rectangle)";
  if (o.kind === "pulse") return "Point pulsé";
  const nameOf = (id: string | null) => (id ? (hotspots.find((h) => h.id === id)?.label ?? "?") : "libre");
  return `Ligne : ${nameOf(o.fromHotspotId)} → ${nameOf(o.toHotspotId)}`;
}

export function ObjectsList({
  objects,
  hotspots,
  selectedId,
  onSelect,
  onReorder,
  onToggleHidden,
  onDelete,
}: ObjectsListProps) {
  const sorted = [...objects].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div>
        <h3>Objets libres</h3>
        <div className="dy-empty-state">
          Texte, image, forme ou ligne — ajoute-en depuis la barre d'outils, au-dessus de l'image.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>Objets libres ({sorted.length})</h3>
      {sorted.map((o) => (
        <div
          key={o.id}
          className={`dy-hotspot-row${o.id === selectedId ? " active" : ""}`}
          onClick={() => onSelect(o.id)}
        >
          <span aria-hidden="true">{KIND_ICON[o.kind]}</span>
          <span className="name" style={{ opacity: o.hidden ? 0.5 : 1 }}>
            {labelFor(o, hotspots)}
          </span>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden(o.id);
            }}
            aria-label={o.hidden ? "Afficher" : "Cacher"}
            title={o.hidden ? "Afficher" : "Cacher"}
          >
            {o.hidden ? "🚫" : "👁"}
          </button>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(o.id, -1);
            }}
            aria-label="Monter dans l'ordre"
          >
            ↑
          </button>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReorder(o.id, 1);
            }}
            aria-label="Descendre dans l'ordre"
          >
            ↓
          </button>
          <button
            className="dy-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(o.id);
            }}
            aria-label="Supprimer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
