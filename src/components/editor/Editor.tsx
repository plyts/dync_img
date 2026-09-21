import { useRef, useState } from "react";
import { useProject } from "../../state/store";
import { Stage } from "../Stage";
import { DrawLayer, type Tool } from "./DrawLayer";
import { HotspotList } from "./HotspotList";
import { Inspector } from "./Inspector";
import { GroupsPanel } from "./GroupsPanel";
import { AIAssistModal } from "./AIAssistModal";
import { readImageFile, exportProjectJson, readProjectFile, downloadTextFile } from "../../lib/projectIO";
import { buildStandaloneHtml } from "../../lib/exportBundle";
import type { Hotspot } from "../../types";

export function Editor() {
  const store = useProject();
  const { project } = store;
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const selected = project.hotspots.find((h) => h.id === selectedId) ?? null;

  async function handleImageUpload(file: File) {
    const image = await readImageFile(file);
    store.setImage(image);
  }

  async function handleProjectImport(file: File) {
    const imported = await readProjectFile(file);
    store.replace(imported);
    setSelectedId(null);
  }

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
          <button className="dy-btn primary" onClick={() => setAiOpen(true)}>
            ✨ Assistant IA
          </button>
        </div>
      </div>

      <div className="dy-editor-main">
        <div className="dy-stage-col">
          <Stage image={project.image} emptyState="Charge une image (PNG, JPEG, SVG…) pour commencer.">
            <DrawLayer
              hotspots={project.hotspots}
              selectedId={selectedId}
              tool={tool}
              onSelect={setSelectedId}
              onCreate={(shape) => {
                const created = store.addHotspot(shape);
                setSelectedId(created.id);
              }}
              onCommitShape={(id, shape) =>
                store.updateHotspot(id, (h) => ({ ...h, shape }))
              }
              onCommitAnchor={(id, anchor) =>
                store.updateHotspot(id, (h) => ({ ...h, anchor }))
              }
              onToolChange={setTool}
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
              groups={project.groups}
              palette={project.theme.palette}
              onChange={(updater) => store.updateHotspot(selected.id, updater)}
              onDelete={() => {
                store.removeHotspot(selected.id);
                setSelectedId(null);
              }}
            />
          )}

          <GroupsPanel
            groups={project.groups}
            palette={project.theme.palette}
            onAdd={(label) => store.addGroup(label)}
            onUpdate={(id, patch) => store.updateGroup(id, (g) => ({ ...g, ...patch }))}
            onRemove={(id) => store.removeGroup(id)}
          />
        </div>
      </div>

      {aiOpen && (
        <AIAssistModal
          project={project}
          selectedLabel={selected?.label ?? null}
          onClose={() => setAiOpen(false)}
          onImportDetected={(detectedList) => {
            const created = store.addHotspots(
              detectedList.map(
                (d): Hotspot["shape"] => ({
                  kind: "rect",
                  x: d.shape.x,
                  y: d.shape.y,
                  w: d.shape.w,
                  h: d.shape.h,
                }),
              ),
            );
            created.forEach((h, i) => {
              const label = detectedList[i].label;
              store.updateHotspot(h.id, (hotspot) => ({ ...hotspot, label }));
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
