import { useState, type ReactNode } from "react";

/** A collapsible, titled property-panel section — the same pattern used
 *  throughout established design tools (Figma, Webflow, Framer): a row of
 *  grouped fields behind a chevron, so a dense sidebar stays scannable.
 *  Shared by every inspector panel in the editor. */
export function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dy-insp-section">
      <button
        type="button"
        className="dy-insp-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`dy-insp-chevron${open ? " open" : ""}`}>▸</span>
        <span className="dy-insp-section-title">{title}</span>
      </button>
      {open && <div className="dy-insp-section-body">{children}</div>}
    </div>
  );
}
