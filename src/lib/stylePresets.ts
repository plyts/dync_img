import type { HotspotStyleOverride } from "../types";

/**
 * Ready-made bundles of style-override fields — pick one to set several
 * properties at once, then fine-tune any of them individually afterwards
 * with the sliders below (a preset just pre-fills the same fields those
 * sliders control).
 */
export interface StylePreset {
  id: string;
  label: string;
  hint: string;
  patch: HotspotStyleOverride;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "default",
    label: "Défaut du projet",
    hint: "Retire tous les réglages de ce bloc : il hérite entièrement du style global.",
    patch: {},
  },
  {
    id: "thin-clean",
    label: "Trait fin & net",
    hint: "Contour continu fin, angles à peine arrondis.",
    patch: { showOutline: true, dashPattern: "1 0", selectionStrokeWidth: 0.4, spotlightCornerRadius: 0.5 },
  },
  {
    id: "thick-bold",
    label: "Trait épais",
    hint: "Contour continu marqué — pour un bloc qu'on veut voir en premier.",
    patch: { showOutline: true, dashPattern: "1 0", selectionStrokeWidth: 1.8, spotlightCornerRadius: 2 },
  },
  {
    id: "wide-dash",
    label: "Pointillés larges",
    hint: "Le motif « cahier » avec des tirets plus longs.",
    patch: { showOutline: true, dashPattern: "4 3", selectionStrokeWidth: 0.9 },
  },
  {
    id: "rounded",
    label: "Angles arrondis doux",
    hint: "Coins très arrondis et surbrillance un peu plus visible.",
    patch: { spotlightCornerRadius: 6, hoverTintOpacity: 0.22 },
  },
  {
    id: "fill-only",
    label: "Sans contour",
    hint: "Pas de trait, uniquement la surbrillance colorée au survol/sélection.",
    patch: { showOutline: false, hoverTintOpacity: 0.35 },
  },
  {
    id: "discreet",
    label: "Discret",
    hint: "Tout en sourdine : fin, peu de teinte, pas de pastille.",
    patch: { hoverTintOpacity: 0.08, dashPattern: "1.2 1.6", selectionStrokeWidth: 0.5, pulseEnabled: false },
  },
  {
    id: "pulse-soft",
    label: "Pulsation douce",
    hint: "Pastille lente et discrète pour signaler le bloc au repos.",
    patch: { pulseEnabled: true, pulseMinRadius: 0.5, pulseMaxRadius: 1.6, pulseSpeedMs: 2800 },
  },
  {
    id: "pulse-strong",
    label: "Pulsation vive",
    hint: "Pastille rapide et ample — attire l'œil immédiatement.",
    patch: { pulseEnabled: true, pulseMinRadius: 1, pulseMaxRadius: 3.6, pulseSpeedMs: 1000 },
  },
];
