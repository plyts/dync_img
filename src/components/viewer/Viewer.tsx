import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../state/store";
import { Stage } from "../Stage";
import { HotspotsLayer } from "./HotspotsLayer";
import { DetailPanel } from "./DetailPanel";

export function Viewer() {
  const { project } = useProject();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);

  const sorted = useMemo(
    () => [...project.hotspots].sort((a, b) => a.order - b.order),
    [project.hotspots],
  );
  const selectedIndex = sorted.findIndex((h) => h.id === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : null;

  function select(id: string) {
    setSelectedId(id);
    setPlayKey((k) => k + 1);
  }

  function step(direction: 1 | -1) {
    if (sorted.length === 0) return;
    const nextIndex =
      selectedIndex === -1
        ? 0
        : (selectedIndex + direction + sorted.length) % sorted.length;
    select(sorted[nextIndex].id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key === "Escape") setSelectedId(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIndex, sorted]);

  return (
    <div className="dy-viewer-main">
      <div className="dy-stage-col">
        {project.groups.length > 0 && (
          <div className="dy-legend">
            {project.groups.map((g) => {
              const first = sorted.find((h) => h.groupId === g.id);
              return (
                <button key={g.id} onClick={() => first && select(first.id)}>
                  <span className="dy-legend-dot" style={{ background: g.color }} />
                  {g.label}
                </button>
              );
            })}
          </div>
        )}
        <Stage image={project.image}>
          <HotspotsLayer
            project={project}
            hoverId={hoverId}
            selectedId={selectedId}
            onHover={setHoverId}
            onSelect={select}
            onDeselect={() => setSelectedId(null)}
          />
        </Stage>
      </div>
      <DetailPanel
        project={project}
        hotspot={selected}
        playKey={playKey}
        onClose={() => setSelectedId(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onReplay={() => setPlayKey((k) => k + 1)}
        onSelect={select}
      />
    </div>
  );
}
