import { useState } from "react";
import type { AnimationSequence, CanvasObject, Hotspot, SequenceStep } from "../../types";
import { KIND_ICON, labelFor } from "./ObjectsList";

interface SequencerPanelProps {
  sequences: AnimationSequence[];
  hotspots: Hotspot[];
  objects: CanvasObject[];
  onAddSequence: () => AnimationSequence;
  onUpdateSequence: (id: string, patch: Partial<AnimationSequence>) => void;
  onRemoveSequence: (id: string) => void;
  onAddStep: (sequenceId: string, targetType: "hotspot" | "object", targetId: string) => void;
  onUpdateStep: (sequenceId: string, stepId: string, patch: Partial<SequenceStep>) => void;
  onRemoveStep: (sequenceId: string, stepId: string) => void;
  onReorderStep: (sequenceId: string, stepId: string, direction: -1 | 1) => void;
  onClose: () => void;
}

function targetLabel(step: SequenceStep, hotspots: Hotspot[], objects: CanvasObject[]): string {
  if (step.targetType === "hotspot") {
    return hotspots.find((h) => h.id === step.targetId)?.label || "Bloc supprimé";
  }
  const obj = objects.find((o) => o.id === step.targetId);
  return obj ? `${KIND_ICON[obj.kind]} ${labelFor(obj, hotspots)}` : "Objet supprimé";
}

export function SequencerPanel({
  sequences,
  hotspots,
  objects,
  onAddSequence,
  onUpdateSequence,
  onRemoveSequence,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onReorderStep,
  onClose,
}: SequencerPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(sequences[0]?.id ?? null);
  const active = sequences.find((s) => s.id === activeId) ?? null;
  const [newTargetType, setNewTargetType] = useState<"hotspot" | "object">("hotspot");
  const [newTargetId, setNewTargetId] = useState<string>(hotspots[0]?.id ?? "");

  return (
    <div className="dy-modal-backdrop" onClick={onClose}>
      <div className="dy-modal dy-sequencer-modal" onClick={(e) => e.stopPropagation()}>
        <h3>🎬 Séquenceur d'animation</h3>
        <p style={{ fontSize: 12, color: "var(--dy-muted)", margin: "0 0 12px" }}>
          Construis une visite guidée : une liste d'étapes ordonnée, chacune sélectionnant un bloc
          (avec son animation habituelle — spotlight, connecteur, panneau) ou faisant clignoter un
          objet libre, avec un délai réglable avant chaque étape. Un bouton « ▶ » apparaît dans
          l'aperçu/export pour la lancer.
        </p>

        <div className="dy-field">
          <label>Séquence</label>
          <div style={{ display: "flex", gap: 6 }}>
            <select value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value || null)} style={{ flex: 1 }}>
              <option value="">— aucune —</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.steps.length} étape{s.steps.length > 1 ? "s" : ""})
                </option>
              ))}
            </select>
            <button
              className="dy-btn"
              onClick={() => {
                const created = onAddSequence();
                setActiveId(created.id);
              }}
            >
              + Nouvelle
            </button>
          </div>
        </div>

        {active && (
          <>
            <div className="dy-field">
              <label>Nom</label>
              <input
                type="text"
                value={active.label}
                onChange={(e) => onUpdateSequence(active.id, { label: e.target.value })}
              />
            </div>

            <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={active.loop}
                onChange={(e) => onUpdateSequence(active.id, { loop: e.target.checked })}
              />
              Boucler la visite
            </label>

            <div className="dy-field">
              <label>Étapes ({active.steps.length})</label>
              {active.steps.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--dy-muted)", margin: "0 0 8px" }}>
                  Aucune étape — ajoute-en une ci-dessous.
                </p>
              )}
              {active.steps.map((step, i) => (
                <div key={step.id} className="dy-seq-step-row">
                  <span className="dy-seq-step-index">{i + 1}</span>
                  <span className="name">{targetLabel(step, hotspots, objects)}</span>
                  <span className="dy-seq-step-delay">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={step.delayMs}
                      onChange={(e) => onUpdateStep(active.id, step.id, { delayMs: Number(e.target.value) })}
                    />
                    <span>ms</span>
                  </span>
                  <button className="dy-btn" onClick={() => onReorderStep(active.id, step.id, -1)} aria-label="Monter">
                    ↑
                  </button>
                  <button className="dy-btn" onClick={() => onReorderStep(active.id, step.id, 1)} aria-label="Descendre">
                    ↓
                  </button>
                  <button className="dy-btn" onClick={() => onRemoveStep(active.id, step.id)} aria-label="Supprimer">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="dy-field">
              <label>Ajouter une étape</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={newTargetType}
                  onChange={(e) => {
                    const t = e.target.value as "hotspot" | "object";
                    setNewTargetType(t);
                    setNewTargetId(t === "hotspot" ? (hotspots[0]?.id ?? "") : (objects[0]?.id ?? ""));
                  }}
                >
                  <option value="hotspot">Bloc</option>
                  <option value="object">Objet libre</option>
                </select>
                <select value={newTargetId} onChange={(e) => setNewTargetId(e.target.value)} style={{ flex: 1 }}>
                  {(newTargetType === "hotspot" ? hotspots : objects).map((t) => (
                    <option key={t.id} value={t.id}>
                      {newTargetType === "hotspot" ? (t as Hotspot).label || "Sans nom" : labelFor(t as CanvasObject, hotspots)}
                    </option>
                  ))}
                </select>
                <button
                  className="dy-btn"
                  disabled={!newTargetId}
                  onClick={() => onAddStep(active.id, newTargetType, newTargetId)}
                >
                  + Étape
                </button>
              </div>
            </div>

            <button className="dy-btn" onClick={() => onRemoveSequence(active.id)}>
              Supprimer cette séquence
            </button>
          </>
        )}

        <button className="dy-btn" onClick={onClose} style={{ marginTop: 14, width: "100%" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
