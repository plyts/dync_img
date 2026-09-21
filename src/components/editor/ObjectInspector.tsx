import type { CanvasObject } from "../../types";

interface ObjectInspectorProps {
  object: CanvasObject;
  onChange: (patch: Partial<CanvasObject>) => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function ObjectInspector({ object, onChange, onDelete, onBringToFront, onSendToBack }: ObjectInspectorProps) {
  return (
    <div>
      <h3>{object.kind === "text" ? "Texte" : object.kind === "image" ? "Image / icône" : "Forme"}</h3>

      {object.kind === "text" && (
        <>
          <div className="dy-field">
            <label>Contenu</label>
            <textarea
              rows={3}
              value={object.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
          <div className="dy-field">
            <label>Couleur</label>
            <input type="color" value={object.color} onChange={(e) => onChange({ color: e.target.value })} />
          </div>
          <div className="dy-field">
            <label>Taille ({object.fontSize.toFixed(1)})</label>
            <input
              type="range"
              min={1}
              max={8}
              step={0.1}
              value={object.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            />
          </div>
          <div className="dy-field">
            <label>Graisse</label>
            <select
              value={object.fontWeight}
              onChange={(e) => onChange({ fontWeight: e.target.value as "normal" | "bold" })}
            >
              <option value="normal">Normale</option>
              <option value="bold">Grasse</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Alignement</label>
            <select
              value={object.align}
              onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
            >
              <option value="left">Gauche</option>
              <option value="center">Centré</option>
              <option value="right">Droite</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Fond{object.background ? "" : " — aucun"}</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="color"
                value={object.background ?? "#ffffff"}
                onChange={(e) => onChange({ background: e.target.value })}
              />
              {object.background && (
                <button className="dy-btn" onClick={() => onChange({ background: null })}>
                  ↺ Aucun
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {object.kind === "image" && (
        <>
          <div className="dy-field">
            <label>Texte alternatif</label>
            <input type="text" value={object.alt} onChange={(e) => onChange({ alt: e.target.value })} />
          </div>
          <div className="dy-field">
            <label>Opacité ({Math.round(object.opacity * 100)}%)</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={object.opacity}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      {object.kind === "shape" && (
        <>
          <div className="dy-field">
            <label>Forme</label>
            <select
              value={object.shapeType}
              onChange={(e) => onChange({ shapeType: e.target.value as "rect" | "ellipse" })}
            >
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Couleur du trait</label>
            <input
              type="color"
              value={object.strokeColor}
              onChange={(e) => onChange({ strokeColor: e.target.value })}
            />
          </div>
          <div className="dy-field">
            <label>Épaisseur du trait ({object.strokeWidth.toFixed(1)})</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={object.strokeWidth}
              onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
            />
          </div>
          <div className="dy-field">
            <label>Pointillés</label>
            <select
              value={object.dashPattern === "1 0" ? "solid" : "dashed"}
              onChange={(e) => onChange({ dashPattern: e.target.value === "solid" ? "1 0" : "2 1.4" })}
            >
              <option value="dashed">Pointillé</option>
              <option value="solid">Continu</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Remplissage{object.fill === "none" ? " — aucun" : ""}</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="color"
                value={object.fill === "none" ? "#ffffff" : object.fill}
                onChange={(e) => onChange({ fill: e.target.value })}
              />
              {object.fill !== "none" && (
                <button className="dy-btn" onClick={() => onChange({ fill: "none" })}>
                  ↺ Aucun
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="dy-field">
        <label>Empilement</label>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dy-btn" onClick={onBringToFront} style={{ flex: 1 }}>
            ↥ Devant
          </button>
          <button className="dy-btn" onClick={onSendToBack} style={{ flex: 1 }}>
            ↧ Derrière
          </button>
        </div>
      </div>

      <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={!object.hidden} onChange={(e) => onChange({ hidden: !e.target.checked })} />
        Visible
      </label>

      <button className="dy-btn" onClick={onDelete} style={{ width: "100%" }}>
        Supprimer cet objet
      </button>
    </div>
  );
}
