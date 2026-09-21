import type { Project } from "../types";
import themeCss from "../styles/theme.css?raw";
import appCss from "../styles/app.css?raw";

/**
 * Produces a single, dependency-free .html file that reproduces the exact
 * viewer experience (fidelity to the source image, hover/selection, the
 * sliding right/left panel, the A-to-Z step reveal) for any project, without
 * needing this React app, a build step, or a server. Open it directly in a
 * browser, or drop it anywhere static files are served.
 */
export function buildStandaloneHtml(project: Project): string {
  const fontHref =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(project.theme.fontDisplay) +
    ":wght@400;600;700&family=" +
    encodeURIComponent(project.theme.fontMono) +
    ":wght@400;700&display=swap";

  const dataJson = JSON.stringify(project).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(project.name)}</title>
<link rel="stylesheet" href="${fontHref}" />
<style>
${themeCss}
${appCss}
body { overflow: hidden; }
</style>
</head>
<body>
<div class="dy-app">
  <header class="dy-topbar">
    <h1 class="dy-font-display">${escapeHtml(project.name)}</h1>
  </header>
  <main class="dy-viewer-main" id="dy-root"></main>
</div>
<script id="dy-project-data" type="application/json">${dataJson}</script>
<script>${RUNTIME_JS}</script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/**
 * Vanilla-JS runtime, string-concatenated on purpose (no template literals)
 * so it can be embedded inside an outer template literal without any
 * backtick/${} escaping headaches.
 */
const RUNTIME_JS = [
  "(function () {",
  "  var SVG_NS = 'http://www.w3.org/2000/svg';",
  "  var project = JSON.parse(document.getElementById('dy-project-data').textContent);",
  "  var root = document.getElementById('dy-root');",
  "  var byId = {};",
  "  project.hotspots.forEach(function (h) { byId[h.id] = h; });",
  "  var sorted = project.hotspots.slice().sort(function (a, b) { return a.order - b.order; });",
  "  var selectedId = null;",
  "  var hoverId = null;",
  "",
  "  function h(tag, attrs, children) {",
  "    var e = document.createElement(tag);",
  "    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'style') e.setAttribute('style', attrs[k]); else e.setAttribute(k, attrs[k]); }",
  "    (children || []).forEach(function (c) { if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });",
  "    return e;",
  "  }",
  "  function s(tag, attrs) {",
  "    var e = document.createElementNS(SVG_NS, tag);",
  "    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);",
  "    return e;",
  "  }",
  "  function shapePoints(shape) {",
  "    if (shape.kind === 'rect') {",
  "      return [[shape.x, shape.y], [shape.x + shape.w, shape.y], [shape.x + shape.w, shape.y + shape.h], [shape.x, shape.y + shape.h]];",
  "    }",
  "    return shape.points.map(function (p) { return [p.x, p.y]; });",
  "  }",
  "  function pointsAttr(pts) { return pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }",
  "",
  "  var stageCol = h('div', { class: 'dy-stage-col' });",
  "  var legend = null;",
  "  if (project.groups.length) {",
  "    legend = h('div', { class: 'dy-legend' });",
  "    project.groups.forEach(function (g) {",
  "      var first = sorted.filter(function (hs) { return hs.groupId === g.id; })[0];",
  "      var dot = h('span', { class: 'dy-legend-dot', style: 'background:' + g.color });",
  "      var btn = h('button', {}, [dot, g.label]);",
  "      btn.addEventListener('click', function () { if (first) select(first.id); });",
  "      legend.appendChild(btn);",
  "    });",
  "    stageCol.appendChild(legend);",
  "  }",
  "",
  "  var stage = h('div', { class: 'dy-stage' });",
  "  var stageBox = h('div', { class: 'dy-stage-box', style: 'aspect-ratio:' + project.image.width + '/' + project.image.height });",
  "  var img = h('img', { class: 'dy-stage-img', src: project.image.src, alt: project.image.alt, draggable: 'false' });",
  "  var svg = s('svg', { class: 'dy-stage-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });",
  "  var bg = s('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'transparent' });",
  "  svg.appendChild(bg);",
  "  var polygons = {};",
  "  project.hotspots.forEach(function (hs) {",
  "    var p = s('polygon', { points: pointsAttr(shapePoints(hs.shape)), class: 'dy-hotspot' });",
  "    p.style.setProperty('--hs-color', hs.color);",
  "    p.addEventListener('mouseenter', function () { hoverId = hs.id; render(); });",
  "    p.addEventListener('mouseleave', function () { hoverId = null; render(); });",
  "    p.addEventListener('click', function (e) { e.stopPropagation(); select(hs.id); });",
  "    polygons[hs.id] = p;",
  "    svg.appendChild(p);",
  "  });",
  "  var connector = s('path', { class: 'dy-connector' });",
  "  connector.setAttribute('pathLength', '1');",
  "  connector.style.display = 'none';",
  "  svg.appendChild(connector);",
  "  bg.addEventListener('click', function () { select(null); });",
  "  stageBox.appendChild(img);",
  "  stageBox.appendChild(svg);",
  "  var label = h('div', { class: 'dy-anchor-label dy-font-display', style: 'display:none' });",
  "  stageBox.appendChild(label);",
  "  stage.appendChild(stageBox);",
  "  stageCol.appendChild(stage);",
  "",
  "  var panel = h('aside', { class: 'dy-panel' });",
  "  root.appendChild(stageCol);",
  "  root.appendChild(panel);",
  "",
  "  function select(id) { selectedId = id; render(); }",
  "  function stepBy(dir) {",
  "    if (!sorted.length) return;",
  "    var idx = sorted.findIndex(function (hs) { return hs.id === selectedId; });",
  "    var next = idx === -1 ? 0 : (idx + dir + sorted.length) % sorted.length;",
  "    select(sorted[next].id);",
  "  }",
  "",
  "  function typewriter(container, text, delay) {",
  "    container.textContent = '\\u00A0';",
  "    setTimeout(function () {",
  "      var i = 0;",
  "      var interval = setInterval(function () {",
  "        i++;",
  "        container.textContent = text.slice(0, i);",
  "        if (i >= text.length) clearInterval(interval);",
  "      }, 14);",
  "    }, delay);",
  "  }",
  "",
  "  function buildPanel(hs) {",
  "    panel.innerHTML = '';",
  "    var inner = h('div', { class: 'dy-panel-inner' });",
  "    var headerDot = h('span', { class: 'dy-color-dot', style: 'background:' + hs.color });",
  "    var title = h('h2', {}, [hs.label]);",
  "    var closeBtn = h('button', { class: 'dy-btn' }, ['\\u2715']);",
  "    closeBtn.addEventListener('click', function () { select(null); });",
  "    var header = h('div', { class: 'dy-panel-header' }, [headerDot, title, closeBtn]);",
  "",
  "    var body = h('div', { class: 'dy-panel-body' });",
  "    var group = project.groups.filter(function (g) { return g.id === hs.groupId; })[0];",
  "    if (group) body.appendChild(h('div', { class: 'dy-tools' }, [h('span', {}, [group.label])]));",
  "    if (hs.content.summary) body.appendChild(h('p', { class: 'dy-summary' }, [hs.content.summary]));",
  "",
  "    if (hs.content.steps.length) {",
  "      var stepsWrap = h('div', {}, [h('h3', { class: 'dy-block-title' }, ['De A \\u00e0 Z'])]);",
  "      var list = h('ol', { class: 'dy-step-list', style: 'list-style:none;margin:0;padding-left:22px' });",
  "      hs.content.steps.forEach(function (st, i) {",
  "        var li = h('li', { class: 'dy-step', style: 'animation-delay:' + (i * 0.15) + 's' }, [",
  "          h('h4', {}, [st.title]),",
  "          h('p', {}, [st.body]),",
  "        ]);",
  "        list.appendChild(li);",
  "      });",
  "      stepsWrap.appendChild(list);",
  "      body.appendChild(stepsWrap);",
  "    }",
  "",
  "    if (hs.content.example) {",
  "      var exWrap = h('div', {}, [h('h3', { class: 'dy-block-title' }, ['Exemple'])]);",
  "      var exBox = h('div', { class: 'dy-example' });",
  "      exWrap.appendChild(exBox);",
  "      body.appendChild(exWrap);",
  "      typewriter(exBox, hs.content.example, hs.content.steps.length * 150 + 300);",
  "    }",
  "",
  "    if (hs.content.whenToUse) body.appendChild(h('div', {}, [h('h3', { class: 'dy-block-title' }, [\"Quand l'utiliser\"]), h('p', { class: 'dy-summary' }, [hs.content.whenToUse])]));",
  "    if (hs.content.caution) body.appendChild(h('div', {}, [h('h3', { class: 'dy-block-title' }, [\"Point d'attention\"]), h('p', { class: 'dy-summary' }, [hs.content.caution])]));",
  "    if (hs.content.tools.length) {",
  "      var toolsWrap = h('div', {}, [h('h3', { class: 'dy-block-title' }, ['Outils'])]);",
  "      var toolsRow = h('div', { class: 'dy-tools' });",
  "      hs.content.tools.forEach(function (t) { toolsRow.appendChild(h('span', {}, [t])); });",
  "      toolsWrap.appendChild(toolsRow);",
  "      body.appendChild(toolsWrap);",
  "    }",
  "",
  "    var prevBtn = h('button', { class: 'dy-btn' }, ['\\u2190 Pr\\u00e9c\\u00e9dent']);",
  "    prevBtn.addEventListener('click', function () { stepBy(-1); });",
  "    var nextBtn = h('button', { class: 'dy-btn' }, ['Suivant \\u2192']);",
  "    nextBtn.addEventListener('click', function () { stepBy(1); });",
  "    var replayBtn = h('button', { class: 'dy-btn' }, ['\\u21bb Rejouer']);",
  "    replayBtn.addEventListener('click', function () { buildPanel(hs); });",
  "    var footer = h('div', { class: 'dy-panel-footer' }, [prevBtn, nextBtn, h('span', { class: 'spacer' }), replayBtn]);",
  "",
  "    inner.appendChild(header);",
  "    inner.appendChild(body);",
  "    inner.appendChild(footer);",
  "    panel.appendChild(inner);",
  "  }",
  "",
  "  function render() {",
  "    project.hotspots.forEach(function (hs) {",
  "      var p = polygons[hs.id];",
  "      p.classList.remove('hovered', 'selected', 'dimmed');",
  "      if (hs.id === selectedId) p.classList.add('selected');",
  "      else if (selectedId) p.classList.add('dimmed');",
  "      else if (hs.id === hoverId) p.classList.add('hovered');",
  "    });",
  "    if (!selectedId && hoverId && byId[hoverId]) {",
  "      var hh = byId[hoverId];",
  "      label.style.display = '';",
  "      label.style.left = hh.anchor.x + '%';",
  "      label.style.top = hh.anchor.y + '%';",
  "      label.textContent = hh.label;",
  "    } else {",
  "      label.style.display = 'none';",
  "    }",
  "    if (selectedId) {",
  "      var hs = byId[selectedId];",
  "      var targetX = project.theme.panelSide === 'left' ? 0 : 100;",
  "      var midX = (hs.anchor.x + targetX) / 2;",
  "      connector.setAttribute('d', 'M ' + hs.anchor.x + ' ' + hs.anchor.y + ' C ' + midX + ' ' + hs.anchor.y + ', ' + midX + ' ' + hs.anchor.y + ', ' + targetX + ' ' + hs.anchor.y);",
  "      connector.style.display = '';",
  "      connector.classList.remove('drawn');",
  "      requestAnimationFrame(function () { connector.classList.add('drawn'); });",
  "      panel.classList.add('open');",
  "      buildPanel(hs);",
  "    } else {",
  "      connector.classList.remove('drawn');",
  "      connector.style.display = 'none';",
  "      panel.classList.remove('open');",
  "      panel.innerHTML = '';",
  "    }",
  "  }",
  "",
  "  document.addEventListener('keydown', function (e) {",
  "    if (!selectedId) return;",
  "    if (e.key === 'Escape') select(null);",
  "    if (e.key === 'ArrowRight') stepBy(1);",
  "    if (e.key === 'ArrowLeft') stepBy(-1);",
  "  });",
  "",
  "  render();",
  "})();",
].join("\n");
