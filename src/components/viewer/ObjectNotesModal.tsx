import type { CanvasObject } from "../../types";
import { renderMarkdown } from "../../lib/markdown";

const KIND_LABEL: Record<CanvasObject["kind"], string> = {
  text: "Texte",
  image: "Image",
  shape: "Forme",
  line: "Ligne",
  pulse: "Point pulsé",
  embed: "Fichier importé",
};

export function ObjectNotesModal({ object, onClose }: { object: CanvasObject; onClose: () => void }) {
  return (
    <div className="dy-modal-backdrop" onClick={onClose}>
      <div className="dy-modal dy-obj-notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dy-obj-notes-head">
          <h2 className="dy-font-display">{KIND_LABEL[object.kind]}</h2>
          <button className="dy-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="dy-panel-body dy-obj-notes-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(object.notes) }} />
      </div>
    </div>
  );
}
