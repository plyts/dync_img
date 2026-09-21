import type { ChangeEvent, ReactNode } from "react";
import type { InteractionSettings, ProjectTheme } from "../../types";

interface StylePanelProps {
  theme: ProjectTheme;
  onChangeInteraction: (patch: Partial<InteractionSettings>) => void;
  onChangeTheme: (patch: Partial<ProjectTheme>) => void;
  onClose: () => void;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="dy-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function StylePanel({ theme, onChangeInteraction, onChangeTheme, onClose }: StylePanelProps) {
  const s = theme.interaction;

  function num(key: keyof InteractionSettings) {
    return {
      value: s[key] as number,
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        onChangeInteraction({ [key]: Number(e.target.value) }),
    };
  }

  return (
    <div className="dy-modal-backdrop" onClick={onClose}>
      <div className="dy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Style &amp; interactions</h3>
        <p style={{ fontSize: 13, color: "var(--dy-muted)" }}>
          Tout ce qui pilote le survol, la sélection et les animations — modifiable ici, sans
          toucher au code, à tout moment (avant ou après le chargement de ton image).
        </p>

        <Row label="Panneau de détail">
          <select
            value={theme.panelSide}
            onChange={(e) => onChangeTheme({ panelSide: e.target.value as "left" | "right" })}
          >
            <option value="right">Glisse depuis la droite</option>
            <option value="left">Glisse depuis la gauche</option>
          </select>
        </Row>

        <Row label={`Largeur du panneau (${s.panelWidthPx}px)`}>
          <input type="range" min={320} max={640} step={10} {...num("panelWidthPx")} />
        </Row>

        <Row label={`Teinte au survol / sélection (${Math.round(s.hoverTintOpacity * 100)}%)`}>
          <input type="range" min={0} max={0.6} step={0.02} {...num("hoverTintOpacity")} />
        </Row>

        <Row label="Motif des pointillés (contour)">
          <input
            type="text"
            value={s.dashPattern}
            onChange={(e) => onChangeInteraction({ dashPattern: e.target.value })}
            placeholder="2 1.4"
          />
        </Row>

        <Row label={`Épaisseur du contour sélectionné (${s.selectionStrokeWidth})`}>
          <input type="range" min={0.3} max={2} step={0.1} {...num("selectionStrokeWidth")} />
        </Row>

        <Row label={`Opacité du voile (${Math.round(s.dimOpacity * 100)}%)`}>
          <input type="range" min={0} max={0.9} step={0.02} {...num("dimOpacity")} />
        </Row>

        <Row label={`Arrondi du spotlight (${s.spotlightCornerRadius})`}>
          <input type="range" min={0} max={10} step={0.5} {...num("spotlightCornerRadius")} />
        </Row>

        <Row label={`Vitesse du trou de lumière (${s.spotlightTransitionMs}ms)`}>
          <input type="range" min={100} max={1200} step={20} {...num("spotlightTransitionMs")} />
        </Row>

        <Row label="Pastilles pulsantes au repos">
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={s.pulseEnabled}
              onChange={(e) => onChangeInteraction({ pulseEnabled: e.target.checked })}
            />
            Activées
          </label>
        </Row>

        {s.pulseEnabled && (
          <>
            <Row label={`Rayon des pastilles (${s.pulseMinRadius} → ${s.pulseMaxRadius})`}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="range" min={0.2} max={2} step={0.1} {...num("pulseMinRadius")} />
                <input type="range" min={1} max={6} step={0.2} {...num("pulseMaxRadius")} />
              </div>
            </Row>
            <Row label={`Vitesse des pastilles (${s.pulseSpeedMs}ms)`}>
              <input type="range" min={600} max={4000} step={100} {...num("pulseSpeedMs")} />
            </Row>
          </>
        )}

        <Row label={`Vitesse du point sur le connecteur (${s.connectorDotSpeedMs}ms)`}>
          <input type="range" min={400} max={4000} step={100} {...num("connectorDotSpeedMs")} />
        </Row>

        <Row label={`Vitesse des ondes d'arrivée (${s.ringSpeedMs}ms)`}>
          <input type="range" min={600} max={4000} step={100} {...num("ringSpeedMs")} />
        </Row>

        <Row label={`Rythme des étapes "de A à Z" (${s.stepStaggerMs}ms)`}>
          <input type="range" min={0} max={600} step={10} {...num("stepStaggerMs")} />
        </Row>

        <Row label={`Vitesse de frappe de l'exemple (${s.typewriterSpeedMs}ms/caractère)`}>
          <input type="range" min={2} max={60} step={1} {...num("typewriterSpeedMs")} />
        </Row>

        <Row label="Focus clavier (Tab)">
          <label style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={s.focusFollowsHover}
              onChange={(e) => onChangeInteraction({ focusFollowsHover: e.target.checked })}
            />
            Déclenche les mêmes effets que le survol
          </label>
        </Row>

        <button className="dy-btn primary" onClick={onClose} style={{ width: "100%", marginTop: 8 }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
