import { useState } from "react";
import { ProjectProvider, useProject } from "./state/store";
import { buildSampleProject } from "./lib/sampleProject";
import { useGoogleFonts } from "./lib/useGoogleFonts";
import { interactionCssVars } from "./lib/interactionVars";
import { Viewer } from "./components/viewer/Viewer";
import { Editor } from "./components/editor/Editor";

type Mode = "view" | "edit";

function AppShell() {
  const { project, rename } = useProject();
  const [mode, setMode] = useState<Mode>("edit");
  useGoogleFonts(project.theme.fontDisplay, project.theme.fontMono);

  return (
    <div className="dy-app" style={interactionCssVars(project.theme.interaction)}>
      <div className="dy-topbar">
        <input
          value={project.name}
          onChange={(e) => rename(e.target.value)}
          style={{
            fontFamily: "var(--dy-font-display)",
            fontSize: 28,
            border: "none",
            background: "transparent",
            color: "inherit",
            flex: 1,
            minWidth: 0,
          }}
        />
        <div className="dy-mode-switch">
          <button className={mode === "view" ? "active" : ""} onClick={() => setMode("view")}>
            Aperçu
          </button>
          <button className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>
            Éditeur
          </button>
        </div>
      </div>
      {mode === "view" ? <Viewer /> : <Editor />}
    </div>
  );
}

export default function App() {
  const [initial] = useState(buildSampleProject);
  return (
    <ProjectProvider initial={initial}>
      <AppShell />
    </ProjectProvider>
  );
}
