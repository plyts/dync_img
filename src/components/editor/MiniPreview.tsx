import { useState } from "react";
import { Viewer } from "../viewer/Viewer";

interface MiniPreviewProps {
  selectedId: string | null;
  onClose: () => void;
}

/** The Viewer is rendered at a fixed "source" size, then CSS-scaled down into
 *  a small clipped frame — this reproduces the exact real rendering (layout,
 *  animations, hit-testing all keep working through a CSS transform) rather
 *  than a separate, simplified re-implementation that could drift from it. */
const SIZES = {
  sm: { frameW: 360, frameH: 258 },
  lg: { frameW: 680, frameH: 486 },
} as const;
const SOURCE_W = 900;
const SOURCE_H = 645;

export function MiniPreview({ selectedId, onClose }: MiniPreviewProps) {
  const [size, setSize] = useState<"sm" | "lg">("sm");
  const cfg = SIZES[size];
  const scale = cfg.frameW / SOURCE_W;

  return (
    <div className="dy-mini-preview" style={{ width: cfg.frameW }}>
      <div className="dy-mini-preview-head">
        <span>👁 Aperçu en direct</span>
        <button
          type="button"
          className="dy-btn"
          onClick={() => setSize(size === "sm" ? "lg" : "sm")}
          aria-label={size === "sm" ? "Agrandir l'aperçu" : "Réduire l'aperçu"}
          title={size === "sm" ? "Agrandir" : "Réduire"}
        >
          {size === "sm" ? "⤢" : "⤡"}
        </button>
        <button type="button" className="dy-btn" onClick={onClose} aria-label="Fermer l'aperçu">
          ✕
        </button>
      </div>
      <div className="dy-mini-preview-frame" style={{ width: cfg.frameW, height: cfg.frameH }}>
        <div
          className="dy-mini-preview-scaler"
          style={{
            width: SOURCE_W,
            height: SOURCE_H,
            transform: `scale(${scale})`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Viewer syncSelectedId={selectedId} />
        </div>
      </div>
    </div>
  );
}
