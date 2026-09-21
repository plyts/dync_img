/**
 * Tiny, dependency-free Markdown renderer for content fields (summary, step
 * body, "quand l'utiliser", "point d'attention"): bold, italic, inline code,
 * fenced code blocks, and links. Input is HTML-escaped before any markdown
 * substitution runs, so raw HTML/script in a field can never execute — only
 * the markdown syntax below produces tags.
 */
export function renderMarkdown(text: string): string {
  if (!text) return "";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const codeBlocks: string[] = [];
  let working = text.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="dy-md-code"><code>${escapeHtml(code.trim())}</code></pre>`);
    return `\u0000CB${idx}\u0000`;
  });

  working = escapeHtml(working);
  working = working.replace(/`([^`\n]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  working = working.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label: string, url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  working = working.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
  working = working.replace(/\n/g, "<br>");

  codeBlocks.forEach((block, idx) => {
    working = working.replace(`\u0000CB${idx}\u0000`, block);
  });

  return working;
}
