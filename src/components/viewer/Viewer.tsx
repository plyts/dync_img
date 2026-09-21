import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../state/store";
import { Stage } from "../Stage";
import { HotspotsLayer } from "./HotspotsLayer";
import { DetailPanel } from "./DetailPanel";
import { CanvasObjectsView } from "./CanvasObjectsView";
import { ObjectNotesHitLayer } from "./ObjectNotesHitLayer";
import { ObjectNotesModal } from "./ObjectNotesModal";
import type { AnimationSequence } from "../../types";

interface ViewerProps {
  /**
   * When provided (even as `null`), the viewer's selection follows this id
   * instead of only its own clicks — used by the editor's live preview so
   * selecting a block in the Inspector opens the same block here. The user
   * can still click other blocks inside the preview to explore; the next
   * change to this prop re-syncs it.
   */
  syncSelectedId?: string | null;
}

export function Viewer({ syncSelectedId }: ViewerProps = {}) {
  const { project } = useProject();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [notesObjectId, setNotesObjectId] = useState<string | null>(null);
  const notesObject = project.objects.find((o) => o.id === notesObjectId) ?? null;
  const [playingSequenceId, setPlayingSequenceId] = useState<string | null>(null);
  const [flashObjectId, setFlashObjectId] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);

  function stopSequence() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setPlayingSequenceId(null);
    setFlashObjectId(null);
  }

  function playSequence(seq: AnimationSequence) {
    stopSequence();
    if (seq.steps.length === 0) return;
    setPlayingSequenceId(seq.id);
    let elapsed = 0;
    const fire = (i: number) => {
      const step = seq.steps[i];
      elapsed += step.delayMs;
      const timer = window.setTimeout(() => {
        if (step.targetType === "hotspot") {
          select(step.targetId);
        } else {
          setFlashObjectId(step.targetId);
          window.setTimeout(() => setFlashObjectId(null), 1100);
        }
        if (i + 1 < seq.steps.length) {
          fire(i + 1);
        } else if (seq.loop) {
          elapsed = 0;
          fire(0);
        } else {
          setPlayingSequenceId(null);
        }
      }, elapsed);
      timersRef.current.push(timer);
    };
    fire(0);
  }

  useEffect(() => stopSequence, []);

  useEffect(() => {
    if (syncSelectedId === undefined) return;
    setSelectedId(syncSelectedId);
    setPlayKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSelectedId]);

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
        {project.sequences.length > 0 && (
          <div className="dy-seq-play-bar">
            {project.sequences.map((seq) => {
              const playing = playingSequenceId === seq.id;
              return (
                <button
                  key={seq.id}
                  className={playing ? "playing" : ""}
                  onClick={() => (playing ? stopSequence() : playSequence(seq))}
                  disabled={seq.steps.length === 0}
                >
                  {playing ? "⏹" : "▶"} {seq.label}
                </button>
              );
            })}
          </div>
        )}
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
          <CanvasObjectsView objects={project.objects} hotspots={project.hotspots} flashObjectId={flashObjectId} />
          <HotspotsLayer
            project={project}
            hoverId={hoverId}
            selectedId={selectedId}
            onHover={setHoverId}
            onSelect={select}
            onDeselect={() => setSelectedId(null)}
          />
          <ObjectNotesHitLayer objects={project.objects} hotspots={project.hotspots} onOpenNotes={setNotesObjectId} />
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
      {notesObject && <ObjectNotesModal object={notesObject} onClose={() => setNotesObjectId(null)} />}
    </div>
  );
}
