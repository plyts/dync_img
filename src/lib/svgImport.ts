/**
 * Reads an uploaded SVG's own intrinsic size (from its `viewBox`, falling
 * back to `width`/`height`) so an EmbedObject can be scaled correctly into
 * its x/y/w/h box on the stage. Defaults to a 100x100 square when neither
 * is present or parseable — the file still renders, just without a
 * guaranteed aspect ratio.
 */
export function parseSvgIntrinsicSize(markup: string): { width: number; height: number } {
  try {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const root = doc.documentElement;
    if (root.nodeName === "parsererror" || !root) return { width: 100, height: 100 };

    const viewBox = root.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        return { width: parts[2], height: parts[3] };
      }
    }

    const w = parseFloat(root.getAttribute("width") ?? "");
    const h = parseFloat(root.getAttribute("height") ?? "");
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    // fall through to the default below
  }
  return { width: 100, height: 100 };
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(file);
  });
}

export const HTML_EMBED_STARTER = `<style>
  .dy-embed-demo {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dy-embed-demo span {
    width: 40%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #4f8fe0;
    animation: dy-embed-spin 2s linear infinite;
  }
  @keyframes dy-embed-spin {
    to { transform: rotate(360deg); }
  }
</style>
<div class="dy-embed-demo"><span></span></div>
<script>
  // Le JS de ce bloc s'exécute tel quel dans la page finale.
</script>`;
