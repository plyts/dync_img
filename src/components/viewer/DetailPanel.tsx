import type { Hotspot, Project } from "../../types";
import { useTypewriter } from "../../lib/useTypewriter";

interface DetailPanelProps {
  project: Project;
  hotspot: Hotspot | null;
  playKey: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
}

export function DetailPanel({
  project,
  hotspot,
  playKey,
  onClose,
  onPrev,
  onNext,
  onReplay,
}: DetailPanelProps) {
  const open = Boolean(hotspot);
  const group = hotspot ? project.groups.find((g) => g.id === hotspot.groupId) : null;

  return (
    <aside className={`dy-panel${open ? " open" : ""}`}>
      {hotspot && (
        <div className="dy-panel-inner" key={`${hotspot.id}-${playKey}`}>
          <div className="dy-panel-header">
            <span className="dy-color-dot" style={{ background: hotspot.color }} />
            <h2>{hotspot.label}</h2>
            <button className="dy-btn" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
          <div className="dy-panel-body">
            {group && <div className="dy-tools"><span>{group.label}</span></div>}
            {hotspot.content.summary && <p className="dy-summary">{hotspot.content.summary}</p>}

            {hotspot.content.steps.length > 0 && (
              <div>
                <h3 className="dy-block-title">De A à Z</h3>
                <ol className="dy-step-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {hotspot.content.steps.map((step, i) => (
                    <li
                      key={step.id}
                      className="dy-step"
                      style={{ animationDelay: `${i * 0.15}s`, paddingLeft: 8 }}
                    >
                      <h4>{step.title}</h4>
                      <p>{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {hotspot.content.example && (
              <div>
                <h3 className="dy-block-title">Exemple</h3>
                <TypedExample
                  text={hotspot.content.example}
                  delay={hotspot.content.steps.length * 150 + 300}
                />
              </div>
            )}

            {hotspot.content.whenToUse && (
              <div>
                <h3 className="dy-block-title">Quand l'utiliser</h3>
                <p className="dy-summary">{hotspot.content.whenToUse}</p>
              </div>
            )}

            {hotspot.content.caution && (
              <div>
                <h3 className="dy-block-title">Point d'attention</h3>
                <p className="dy-summary">{hotspot.content.caution}</p>
              </div>
            )}

            {hotspot.content.tools.length > 0 && (
              <div>
                <h3 className="dy-block-title">Outils</h3>
                <div className="dy-tools">
                  {hotspot.content.tools.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="dy-panel-footer">
            <button className="dy-btn" onClick={onPrev}>
              ← Précédent
            </button>
            <button className="dy-btn" onClick={onNext}>
              Suivant →
            </button>
            <span className="spacer" />
            <button className="dy-btn" onClick={onReplay}>
              ↻ Rejouer
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function TypedExample({ text, delay }: { text: string; delay: number }) {
  const shown = useTypewriter(text, delay);
  return <div className="dy-example">{shown || " "}</div>;
}
