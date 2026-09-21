import { useEffect } from "react";

const injected = new Set<string>();

/**
 * Loads any pair of Google Fonts on demand so a project's theme (which
 * fonts to use for the "handwritten" display face and the mono/code face)
 * is fully data-driven instead of hard-coded to Caveat/Space Mono.
 */
export function useGoogleFonts(displayFamily: string, monoFamily: string) {
  useEffect(() => {
    const families = [displayFamily, monoFamily]
      .filter(Boolean)
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;700`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    if (injected.has(href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    injected.add(href);
  }, [displayFamily, monoFamily]);
}
