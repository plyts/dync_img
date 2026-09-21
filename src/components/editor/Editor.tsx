import { useEffect, useRef, useState } from "react";
import { useProject } from "../../state/store";
import { Stage } from "../Stage";
import { DrawLayer, type DrawMode, type Tool } from "./DrawLayer";
import { HotspotList } from "./HotspotList";
import { Inspector } from "./Inspector";
import { GroupsPanel } from "./GroupsPanel";
import { StylePanel } from "./StylePanel";
import { AIAssistModal } from "./AIAssistModal";
import { readImageFile, exportProjectJson, readProjectFile, downloadTextFile } from "../../lib/projectIO";
import { buildStandaloneHtml } from "../../lib/exportBundle";
import { boundingBox } from "../../lib/geometry";
import type { PercentRect } from "../../lib/ai";
import type { HotspotShape, InteractionSettings, ProjectTheme } from "../../types";

export function Editor() {
  const store = useProject();
  const { project } = store;
  const [tool, setTool] = useState<Tool>("select");
  const [drawMode, setDrawMode] = useState<DrawMode>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRegion, setAiRegion] = useState<PercentRect | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const selected = project.hotspots.find((h) => h.id === selectedId) ?? null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      e.preventDefault();
      store.removeHotspot(selectedId);
      setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, store]);

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
              onSelect={setSelectedId}
              onCreate={(shape) => {
                const created = store.addHotspot(shape);
                setSelectedId(created.id);
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
          </Stage>
        </div>

        <div className="dy-sidebar">
          <HotspotList
            hotspots={project.hotspots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={store.reorderHotspot}
          />

          {selected && (
            <Inspector
              hotspot={selected}
              allHotspots={project.hotspots}
              groups={project.groups}
              palette={project.theme.palette}
              interaction={project.theme.interaction}
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
          onApplyContent={(content) => {
            if (selected) store.updateHotspot(selected.id, (h) => ({ ...h, content }));
          }}
        />
      )}
    </div>
  );
}
