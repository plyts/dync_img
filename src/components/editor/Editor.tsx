import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useProject } from "../../state/store";
import { Stage } from "../Stage";
import { DrawLayer, type DrawMode, type Tool } from "./DrawLayer";
import { HotspotList } from "./HotspotList";
import { Inspector } from "./Inspector";
import { GroupsPanel } from "./GroupsPanel";
import { StylePanel } from "./StylePanel";
import { AIAssistModal } from "./AIAssistModal";
import { MiniPreview } from "./MiniPreview";
import { ObjectsLayer } from "./ObjectsLayer";
import { ObjectInspector } from "./ObjectInspector";
import { ObjectsList } from "./ObjectsList";
import { SequencerPanel } from "./SequencerPanel";
import { readImageFile, exportProjectJson, readProjectFile, downloadTextFile } from "../../lib/projectIO";
import { buildStandaloneHtml } from "../../lib/exportBundle";
import { boundingBox } from "../../lib/geometry";
import { HTML_EMBED_STARTER, parseSvgIntrinsicSize, readTextFile } from "../../lib/svgImport";
import type { PercentRect } from "../../lib/ai";
import type { CanvasObject, HotspotShape, InteractionSettings, ProjectTheme } from "../../types";

export function Editor() {
  const store = useProject();
  const { project } = store;
  const [tool, setTool] = useState<Tool>("select");
  const [drawMode, setDrawMode] = useState<DrawMode>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRegion, setAiRegion] = useState<PercentRect | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [sequencerOpen, setSequencerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("dy-sidebar-width"));
      return saved >= 280 && saved <= 720 ? saved : 360;
    } catch {
      return 360;
    }
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const objectImageInputRef = useRef<HTMLInputElement>(null);
  const svgEmbedInputRef = useRef<HTMLInputElement>(null);

  const selected = project.hotspots.find((h) => h.id === selectedId) ?? null;
  const selectedObject = project.objects.find((o) => o.id === selectedObjectId) ?? null;

  function selectHotspot(id: string | null) {
    setSelectedId(id);
    if (id) setSelectedObjectId(null);
  }

  function selectObject(id: string | null) {
    setSelectedObjectId(id);
    if (id) setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId && !selectedObjectId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      e.preventDefault();
      if (selectedId) {
        store.removeHotspot(selectedId);
        setSelectedId(null);
      } else if (selectedObjectId) {
        store.removeObject(selectedObjectId);
        setSelectedObjectId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, selectedObjectId, store]);

  async function handleObjectImageUpload(file: File) {
    const image = await readImageFile(file);
    const created = store.addImageObject(image.src, file.name);
    selectObject(created.id);
  }

  async function handleSvgEmbedUpload(file: File) {
    const text = await readTextFile(file);
    const { width, height } = parseSvgIntrinsicSize(text);
    const created = store.addEmbedObject("svg", text, width, height);
    selectObject(created.id);
  }

  function startSidebarResize(e: ReactPointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    function onMove(ev: PointerEvent) {
      const next = Math.min(720, Math.max(280, startWidth - (ev.clientX - startX)));
      setSidebarWidth(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setSidebarWidth((w) => {
        try {
          localStorage.setItem("dy-sidebar-width", String(w));
        } catch {
          // storage unavailable — width just won't persist across sessions
        }
        return w;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function handleImageUpload(file: File) {
    const image = await readImageFile(file);
    store.setImage(image);
  }

  async function handleProjectImport(file: File) {
    const imported = await readProjectFile(file);
    store.replace(imported);
    setSelectedId(null);
  }

  function updateInteraction(patch: Partial<InteractionSettings>) {
    store.update((p) => ({
      ...p,
      theme: { ...p.theme, interaction: { ...p.theme.interaction, ...patch } },
    }));
  }

  function updateTheme(patch: Partial<ProjectTheme>) {
    store.update((p) => ({ ...p, theme: { ...p.theme, ...patch } }));
  }

  const drawModeLabel =
    drawMode === "add-area"
      ? "+ Zone…"
      : drawMode === "spotlight"
        ? "Spotlight…"
        : drawMode === "connector-shape"
          ? "Zone d'arrivée…"
          : drawMode === "ai-region"
            ? "Zone IA…"
            : "Dessin";

  return (
    <div className="dy-editor">
      <div className="dy-topbar" style={{ borderTop: "none" }}>
        <div className="dy-editor-toolbar">
          <div className="tool-group">
            <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>
              ↖ Sélection
            </button>
            <button className={tool === "rect" ? "active" : ""} onClick={() => setTool("rect")}>
              ▭ Rectangle
            </button>
            <button className={tool === "polygon" ? "active" : ""} onClick={() => setTool("polygon")}>
              ⬡ Polygone
            </button>
          </div>
          {drawMode !== "new" && (
            <button
              className="dy-btn"
              onClick={() => setDrawMode("new")}
              title="Revenir au dessin de nouveaux blocs"
            >
              {drawModeLabel} ✕
            </button>
          )}
          <button className="dy-btn" onClick={store.undo} disabled={!store.canUndo}>
            ↺ Annuler
          </button>
          <button className="dy-btn" onClick={store.redo} disabled={!store.canRedo}>
            ↻ Rétablir
          </button>
          <button className="dy-btn" onClick={() => imageInputRef.current?.click()}>
            🖼 Image
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f);
              e.target.value = "";
            }}
          />
          <button className="dy-btn" onClick={() => jsonInputRef.current?.click()}>
            ⭱ Importer JSON
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProjectImport(f);
              e.target.value = "";
            }}
          />
          <button className="dy-btn" onClick={() => exportProjectJson(project)}>
            ⭳ Exporter JSON
          </button>
          <button
            className="dy-btn"
            onClick={() => downloadTextFile(`${project.name || "projet"}.html`, buildStandaloneHtml(project), "text/html")}
          >
            ⭳ Export HTML autonome
          </button>
          <button className="dy-btn" onClick={() => setStyleOpen(true)}>
            🎨 Style
          </button>
          <button className="dy-btn" onClick={() => setSequencerOpen(true)} disabled={!project.image.src}>
            🎬 Séquenceur
          </button>
          <button
            className={`dy-btn${previewOpen ? " active" : ""}`}
            onClick={() => setPreviewOpen((v) => !v)}
            title="Voir en direct le rendu réel pendant que tu modifies les paramètres"
          >
            👁 Aperçu en direct
          </button>
          <button
            className="dy-btn"
            onClick={() => {
              setAiRegion(null);
              setDrawMode("ai-region");
              if (tool === "select") setTool("rect");
            }}
            disabled={!project.image.src}
          >
            🔍 Affiner une zone (IA)
          </button>
          <button
            className="dy-btn primary"
            onClick={() => {
              setAiRegion(null);
              setAiOpen(true);
            }}
          >
            ✨ Assistant IA
          </button>
          <div className="tool-group">
            <button onClick={() => selectObject(store.addTextObject().id)} disabled={!project.image.src}>
              🔤 Texte
            </button>
            <button onClick={() => objectImageInputRef.current?.click()} disabled={!project.image.src}>
              🖼 Image/icône
            </button>
            <button onClick={() => selectObject(store.addShapeObject("rect").id)} disabled={!project.image.src}>
              ▭ Forme
            </button>
            <button onClick={() => selectObject(store.addShapeObject("ellipse").id)} disabled={!project.image.src}>
              ◯ Forme
            </button>
            <button onClick={() => selectObject(store.addLineObject().id)} disabled={!project.image.src}>
              ／ Ligne
            </button>
            <button onClick={() => selectObject(store.addPulseObject().id)} disabled={!project.image.src}>
              🔵 Point pulsé
            </button>
          </div>
          <div className="tool-group">
            <button
              onClick={() => {
                const created = store.addLineObject();
                store.updateObject(created.id, (o) => ({ ...o, animated: true }));
                selectObject(created.id);
              }}
              disabled={!project.image.src}
              title="Ligne pointillée déjà réglée en défilement animé"
            >
              ┄ Ligne animée
            </button>
            <button
              onClick={() => {
                const created = store.addLineObject();
                store.updateObject(created.id, (o) => ({ ...o, dotEnabled: true }));
                selectObject(created.id);
              }}
              disabled={!project.image.src}
              title="Ligne déjà réglée avec un point qui voyage du début à la fin"
            >
              ．→ Ligne + point
            </button>
          </div>
          <div className="tool-group">
            <button
              onClick={() => svgEmbedInputRef.current?.click()}
              disabled={!project.image.src}
              title="Importer un fichier .svg — ses animations internes (SMIL, CSS) sont conservées"
            >
              📦 SVG animé
            </button>
            <button
              onClick={() =>
                selectObject(store.addEmbedObject("html", HTML_EMBED_STARTER, 100, 100).id)
              }
              disabled={!project.image.src}
              title="Bloc HTML/CSS/JS personnalisé, à éditer dans le panneau de droite"
            >
              📦 Bloc HTML/CSS/JS
            </button>
          </div>
          <input
            ref={objectImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleObjectImageUpload(f);
              e.target.value = "";
            }}
          />
          <input
            ref={svgEmbedInputRef}
            type="file"
            accept="image/svg+xml,.svg"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleSvgEmbedUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="dy-editor-main">
        <div className="dy-stage-col" style={{ position: "relative" }}>
          <Stage image={project.image} emptyState="Charge une image (PNG, JPEG, SVG…) pour commencer.">
            <DrawLayer
              hotspots={project.hotspots}
              selectedId={selectedId}
              tool={tool}
              drawMode={drawMode}
              onSelect={selectHotspot}
              onCreate={(shape) => {
                const created = store.addHotspot(shape);
                selectHotspot(created.id);
              }}
              onAddArea={(id, shape) =>
                store.updateHotspot(id, (h) => ({ ...h, areas: [...h.areas, shape] }))
              }
              onSetSpotlight={(id, shape) =>
                store.updateHotspot(id, (h) => ({ ...h, spotlightShape: shape }))
              }
              onSetConnectorShape={(id, shape) =>
                store.updateHotspot(id, (h) => ({
                  ...h,
                  connector: h.connector
                    ? { ...h.connector, toShape: shape }
                    : { to: h.anchor, toShape: shape, curved: false },
                }))
              }
              onPickAIRegion={(shape) => {
                const box = boundingBox(shape);
                setAiRegion({ x: box.x1, y: box.y1, w: box.w, h: box.h });
                setAiOpen(true);
              }}
              onCommitAreaShape={(id, index, shape) =>
                store.updateHotspot(id, (h) => ({
                  ...h,
                  areas: h.areas.map((a, i) => (i === index ? shape : a)),
                }))
              }
              onCommitSpotlightShape={(id, shape) =>
                store.updateHotspot(id, (h) => ({ ...h, spotlightShape: shape }))
              }
              onCommitAnchor={(id, anchor) => store.updateHotspot(id, (h) => ({ ...h, anchor }))}
              onToolChange={setTool}
              onDrawModeChange={setDrawMode}
            />
            <ObjectsLayer
              objects={project.objects}
              hotspots={project.hotspots}
              selectedId={selectedObjectId}
              interactive={tool === "select" && drawMode === "new"}
              onSelect={selectObject}
              onChange={(id, patch) =>
                store.updateObject(id, (o) => ({ ...o, ...patch }) as CanvasObject)
              }
            />
          </Stage>
          {previewOpen && <MiniPreview selectedId={selectedId} onClose={() => setPreviewOpen(false)} />}
        </div>

        <div className="dy-sidebar-resize-handle" onPointerDown={startSidebarResize} title="Redimensionner" />
        <div className="dy-sidebar" style={{ width: sidebarWidth, flexBasis: sidebarWidth }}>
          <HotspotList
            hotspots={project.hotspots}
            selectedId={selectedId}
            onSelect={selectHotspot}
            onReorder={store.reorderHotspot}
          />

          <ObjectsList
            objects={project.objects}
            hotspots={project.hotspots}
            objectGroups={project.objectGroups}
            selectedId={selectedObjectId}
            onSelect={selectObject}
            onReorder={store.reorderObject}
            onToggleHidden={(id) => store.updateObject(id, (o) => ({ ...o, hidden: !o.hidden }))}
            onDelete={(id) => {
              store.removeObject(id);
              if (selectedObjectId === id) setSelectedObjectId(null);
            }}
            onGroup={(ids) => store.groupObjects(ids)}
          />

          {selectedObject && (
            <ObjectInspector
              object={selectedObject}
              hotspots={project.hotspots}
              objectGroups={project.objectGroups}
              groupSiblings={project.objects.filter(
                (o) => o.id !== selectedObject.id && o.groupId && o.groupId === selectedObject.groupId,
              )}
              onChange={(patch) =>
                store.updateObject(selectedObject.id, (o) => ({ ...o, ...patch }) as CanvasObject)
              }
              onDelete={() => {
                store.removeObject(selectedObject.id);
                setSelectedObjectId(null);
              }}
              onBringToFront={() => store.bringObjectToFront(selectedObject.id)}
              onSendToBack={() => store.sendObjectToBack(selectedObject.id)}
              onUngroup={() => {
                if (selectedObject.groupId) store.ungroupObjects(selectedObject.groupId);
              }}
              onSyncField={(field, value) => {
                if (selectedObject.groupId) store.syncGroupField(selectedObject.groupId, field, value);
              }}
            />
          )}

          {selected && (
            <Inspector
              hotspot={selected}
              allHotspots={project.hotspots}
              groups={project.groups}
              palette={project.theme.palette}
              interaction={project.theme.interaction}
              objects={project.objects}
              onSelectObject={selectObject}
              onChange={(updater) => store.updateHotspot(selected.id, updater)}
              onDelete={() => {
                store.removeHotspot(selected.id);
                setSelectedId(null);
              }}
              onRemoveArea={(index) =>
                store.updateHotspot(selected.id, (h) => ({
                  ...h,
                  areas: h.areas.filter((_, i) => i !== index),
                }))
              }
              onStartAddArea={() => {
                setDrawMode("add-area");
                if (tool === "select") setTool("rect");
              }}
              onStartSetSpotlight={() => {
                setDrawMode("spotlight");
                if (tool === "select") setTool("rect");
              }}
              onResetSpotlight={() =>
                store.updateHotspot(selected.id, (h) => ({ ...h, spotlightShape: null }))
              }
              onStartConnectorShape={() => {
                setDrawMode("connector-shape");
                if (tool === "select") setTool("rect");
              }}
              onBringToFront={() => store.bringToFront(selected.id)}
              onSendToBack={() => store.sendToBack(selected.id)}
            />
          )}

          <GroupsPanel
            groups={project.groups}
            palette={project.theme.palette}
            onAdd={(label) => store.addGroup(label)}
            onUpdate={(id, patch) => {
              store.updateGroup(id, (g) => ({ ...g, ...patch }));
              if (patch.color) {
                project.hotspots
                  .filter((h) => h.groupId === id)
                  .forEach((h) => store.updateHotspot(h.id, (hh) => ({ ...hh, color: patch.color! })));
              }
            }}
            onRemove={(id) => store.removeGroup(id)}
          />
        </div>
      </div>

      {styleOpen && (
        <StylePanel
          theme={project.theme}
          onChangeInteraction={updateInteraction}
          onChangeTheme={updateTheme}
          onClose={() => setStyleOpen(false)}
        />
      )}

      {sequencerOpen && (
        <SequencerPanel
          sequences={project.sequences}
          hotspots={project.hotspots}
          objects={project.objects}
          onAddSequence={() => store.addSequence()}
          onUpdateSequence={(id, patch) => store.updateSequence(id, (s) => ({ ...s, ...patch }))}
          onRemoveSequence={(id) => store.removeSequence(id)}
          onAddStep={store.addSequenceStep}
          onUpdateStep={store.updateSequenceStep}
          onRemoveStep={store.removeSequenceStep}
          onReorderStep={store.reorderSequenceStep}
          onClose={() => setSequencerOpen(false)}
        />
      )}

      {aiOpen && (
        <AIAssistModal
          project={project}
          selectedLabel={selected?.label ?? null}
          initialRegion={aiRegion}
          onClearRegion={() => setAiRegion(null)}
          onClose={() => setAiOpen(false)}
          onImportDetected={(detectedList) => {
            const rectShape = (r: { x: number; y: number; w: number; h: number }): HotspotShape => ({
              kind: "rect",
              x: r.x,
              y: r.y,
              w: r.w,
              h: r.h,
            });

            const groupIdByLabel = new Map<string, string>();
            for (const g of project.groups) groupIdByLabel.set(g.label.toLowerCase(), g.id);
            for (const d of detectedList) {
              const key = d.groupLabel?.trim().toLowerCase();
              if (key && !groupIdByLabel.has(key)) {
                const created = store.addGroup(d.groupLabel!.trim());
                groupIdByLabel.set(key, created.id);
              }
            }

            const created = store.addHotspotsBatch(
              detectedList.map((d) => ({
                areas: d.areas.map(rectShape),
                spotlightShape: d.spotlight ? rectShape(d.spotlight) : null,
              })),
            );
            created.forEach((h, i) => {
              const d = detectedList[i];
              const key = d.groupLabel?.trim().toLowerCase();
              store.updateHotspot(h.id, (hotspot) => ({
                ...hotspot,
                label: d.label,
                groupId: key ? (groupIdByLabel.get(key) ?? null) : null,
              }));
            });
          }}
          onApplyContent={(content, notesMarkdown) => {
            if (selected) store.applyAiHotspotDraft(selected.id, content, notesMarkdown);
          }}
        />
      )}
    </div>
  );
}
