import { useRef } from "react";
import type { CanvasObject, Hotspot, ObjectGroup } from "../../types";
import { parseSvgIntrinsicSize, readTextFile } from "../../lib/svgImport";
import { renderMarkdown } from "../../lib/markdown";
import { Section } from "./Section";

interface ObjectInspectorProps {
  object: CanvasObject;
  hotspots: Hotspot[];
  objectGroups: ObjectGroup[];
  groupSiblings: CanvasObject[];
  onChange: (patch: Partial<CanvasObject>) => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onUngroup: () => void;
  onSyncField: (field: string, value: unknown) => void;
}

const KIND_LABEL: Record<CanvasObject["kind"], string> = {
  text: "Texte",
  image: "Image / icône",
  shape: "Forme",
  line: "Ligne",
  pulse: "Point pulsé",
  embed: "Fichier importé",
};

/** Numeric/color fields worth offering as one-click "sync to the group"
 *  actions — this is how two otherwise-independent objects (say, an
 *  imported SVG pulse and a traveling-dot line) get "combined" into one
 *  coordinated effect: push one's speed onto every sibling that has the
 *  same field, instead of tuning each by hand. */
const SYNCABLE_FIELDS: { field: string; label: string }[] = [
  { field: "speedMs", label: "Vitesse (ms)" },
  { field: "strokeColor", label: "Couleur du trait" },
  { field: "color", label: "Couleur" },
];

export function ObjectInspector({
  object,
  hotspots,
  objectGroups,
  groupSiblings,
  onChange,
  onDelete,
  onBringToFront,
  onSendToBack,
  onUngroup,
  onSyncField,
}: ObjectInspectorProps) {
  const group = objectGroups.find((g) => g.id === object.groupId) ?? null;

  return (
    <div>
      <h3>{KIND_LABEL[object.kind]}</h3>

      {object.kind === "text" && (
        <Section title="Contenu" defaultOpen>
          <div className="dy-field">
            <label>Texte</label>
            <textarea rows={3} value={object.text} onChange={(e) => onChange({ text: e.target.value })} />
          </div>
        </Section>
      )}

      {object.kind === "text" && (
        <Section title="Apparence" defaultOpen>
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
            <select value={object.fontWeight} onChange={(e) => onChange({ fontWeight: e.target.value as "normal" | "bold" })}>
              <option value="normal">Normale</option>
              <option value="bold">Grasse</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Alignement</label>
            <select value={object.align} onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}>
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
        </Section>
      )}

      {object.kind === "image" && (
        <Section title="Apparence" defaultOpen>
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
        </Section>
      )}

      {object.kind === "shape" && (
        <Section title="Apparence" defaultOpen>
          <div className="dy-field">
            <label>Forme</label>
            <select value={object.shapeType} onChange={(e) => onChange({ shapeType: e.target.value as "rect" | "ellipse" })}>
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
            </select>
          </div>
          <div className="dy-field">
            <label>Couleur du trait</label>
            <input type="color" value={object.strokeColor} onChange={(e) => onChange({ strokeColor: e.target.value })} />
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
        </Section>
      )}

      {object.kind === "embed" && (
        <Section title="Fichier" defaultOpen>
          <EmbedFields object={object} onChange={onChange} />
        </Section>
      )}

      {object.kind === "pulse" && (
        <Section title="Apparence" defaultOpen>
          <div className="dy-field">
            <label>Couleur</label>
            <input type="color" value={object.color} onChange={(e) => onChange({ color: e.target.value })} />
          </div>
          <div className="dy-field">
            <label>Rayon min. ({object.minRadius.toFixed(1)})</label>
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.1}
              value={object.minRadius}
              onChange={(e) => onChange({ minRadius: Number(e.target.value) })}
            />
          </div>
          <div className="dy-field">
            <label>Rayon max. ({object.maxRadius.toFixed(1)})</label>
            <input
              type="range"
              min={1}
              max={6}
              step={0.2}
              value={object.maxRadius}
              onChange={(e) => onChange({ maxRadius: Number(e.target.value) })}
            />
          </div>
        </Section>
      )}

      {object.kind === "pulse" && (
        <Section title="Animation" defaultOpen>
          <div className="dy-field">
            <label>Vitesse ({object.speedMs} ms)</label>
            <input
              type="range"
              min={600}
              max={4000}
              step={100}
              value={object.speedMs}
              onChange={(e) => onChange({ speedMs: Number(e.target.value) })}
            />
          </div>
        </Section>
      )}

      {object.kind === "line" && (
        <Section title="Connexions" defaultOpen>
          <div className="dy-field">
            <label>Point de départ</label>
            <select value={object.fromHotspotId ?? ""} onChange={(e) => onChange({ fromHotspotId: e.target.value || null })}>
              <option value="">Libre (glisser sur l'image)</option>
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label || "Sans nom"}
                </option>
              ))}
            </select>
          </div>
          <div className="dy-field">
            <label>Point d'arrivée</label>
            <select value={object.toHotspotId ?? ""} onChange={(e) => onChange({ toHotspotId: e.target.value || null })}>
              <option value="">Libre (glisser sur l'image)</option>
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label || "Sans nom"}
                </option>
              ))}
            </select>
          </div>
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={object.curved} onChange={(e) => onChange({ curved: e.target.checked })} />
            Ligne courbe (sinon droite)
          </label>
        </Section>
      )}

      {object.kind === "line" && (
        <Section title="Apparence" defaultOpen>
          <div className="dy-field">
            <label>Couleur</label>
            <input type="color" value={object.strokeColor} onChange={(e) => onChange({ strokeColor: e.target.value })} />
          </div>
          <div className="dy-field">
            <label>Épaisseur ({object.strokeWidth.toFixed(1)})</label>
            <input
              type="range"
              min={0.1}
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
        </Section>
      )}

      {object.kind === "line" && (
        <Section title="Animation" defaultOpen>
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={object.animated} onChange={(e) => onChange({ animated: e.target.checked })} />
            Pointillés animés (défilement)
          </label>
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={object.dotEnabled} onChange={(e) => onChange({ dotEnabled: e.target.checked })} />
            Point qui voyage du début à la fin
          </label>
          {object.dotEnabled && (
            <>
              <div className="dy-field">
                <label>Couleur du point</label>
                <input type="color" value={object.dotColor} onChange={(e) => onChange({ dotColor: e.target.value })} />
              </div>
              <div className="dy-field">
                <label>Rayon du point ({object.dotRadius.toFixed(1)})</label>
                <input
                  type="range"
                  min={0.3}
                  max={2}
                  step={0.1}
                  value={object.dotRadius}
                  onChange={(e) => onChange({ dotRadius: Number(e.target.value) })}
                />
              </div>
            </>
          )}
          {(object.animated || object.dotEnabled) && (
            <div className="dy-field">
              <label>Vitesse ({object.speedMs} ms)</label>
              <input
                type="range"
                min={400}
                max={5000}
                step={100}
                value={object.speedMs}
                onChange={(e) => onChange({ speedMs: Number(e.target.value) })}
              />
            </div>
          )}
        </Section>
      )}

      <Section title="Notes (Markdown)">
        <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "0 0 6px" }}>
          Commentaires, détails, liens (y compris vers un portfolio externe) — si ce champ n'est pas
          vide, l'objet devient cliquable dans l'aperçu/export et ouvre ces notes dans une fenêtre.
        </p>
        <textarea
          rows={5}
          value={object.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder={"Détails, remarques…\n[Voir le projet complet](https://mon-portfolio.exemple)"}
          className="dy-code-textarea"
        />
        {object.notes.trim() && (
          <div
            className="dy-md-notes-preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(object.notes) }}
          />
        )}
      </Section>

      <Section title="Combiner (groupe)">
        {group ? (
          <>
            <p style={{ fontSize: 12, margin: "0 0 8px" }}>
              Membre du groupe « {group.label} » ({groupSiblings.length + 1} objets).
            </p>
            {SYNCABLE_FIELDS.filter(
              ({ field }) =>
                Object.prototype.hasOwnProperty.call(object, field) &&
                groupSiblings.some((s) => Object.prototype.hasOwnProperty.call(s, field)),
            ).map(({ field, label }) => (
              <button
                key={field}
                className="dy-btn"
                style={{ width: "100%", marginBottom: 6 }}
                onClick={() => onSyncField(field, (object as unknown as Record<string, unknown>)[field])}
              >
                🔗 Synchroniser « {label} » sur le groupe
              </button>
            ))}
            <button className="dy-btn" style={{ width: "100%" }} onClick={onUngroup}>
              Dissoudre le groupe
            </button>
          </>
        ) : (
          <p style={{ fontSize: 12, color: "var(--dy-muted)", margin: 0 }}>
            Sélectionne plusieurs objets dans la liste « Objets libres » puis clique « Grouper » pour
            les combiner — utile par ex. pour synchroniser la vitesse d'un point pulsé importé et
            d'une ligne animée.
          </p>
        )}
      </Section>

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

function EmbedFields({
  object,
  onChange,
}: {
  object: Extract<CanvasObject, { kind: "embed" }>;
  onChange: (patch: Partial<Extract<CanvasObject, { kind: "embed" }>>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleReplace(file: File) {
    const text = await readTextFile(file);
    if (object.format === "svg") {
      const { width, height } = parseSvgIntrinsicSize(text);
      onChange({ markup: text, sourceW: width, sourceH: height });
    } else {
      onChange({ markup: text });
    }
  }

  return (
    <>
      <p style={{ fontSize: 11, color: "var(--dy-muted)", margin: "0 0 8px" }}>
        {object.format === "svg"
          ? "Fichier SVG importé — ses animations internes (SMIL, CSS) jouent telles quelles."
          : "Bloc HTML/CSS/JS importé — le CSS et le JS qu'il contient s'exécutent tels quels dans la page finale."}
      </p>
      <button className="dy-btn" onClick={() => fileInputRef.current?.click()} style={{ width: "100%", marginBottom: 8 }}>
        ⭱ Remplacer le fichier{object.format === "svg" ? " .svg" : " .html"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={object.format === "svg" ? "image/svg+xml,.svg" : ".html,text/html"}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplace(f);
          e.target.value = "";
        }}
      />
      <div className="dy-field">
        <label>Code source</label>
        <textarea rows={8} value={object.markup} onChange={(e) => onChange({ markup: e.target.value })} className="dy-code-textarea" />
      </div>
    </>
  );
}
