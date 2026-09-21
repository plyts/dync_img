import { forwardRef, type ReactNode } from "react";
import type { ImageMeta } from "../types";

interface StageProps {
  image: ImageMeta;
  children?: ReactNode;
  emptyState?: ReactNode;
}

/**
 * Renders the image inside a box whose aspect-ratio always matches the
 * image's intrinsic size. Because of that, any overlay (SVG viewBox
 * "0 0 100 100" with preserveAspectRatio="none", or plain percentage-based
 * absolutely positioned elements) lines up pixel-perfectly with the
 * displayed image without ever measuring the DOM or listening for resize.
 */
export const Stage = forwardRef<HTMLDivElement, StageProps>(function Stage(
  { image, children, emptyState },
  ref,
) {
  if (!image.src || !image.width || !image.height) {
    return <div className="dy-dropzone">{emptyState ?? "Aucune image chargée."}</div>;
  }

  return (
    <div className="dy-stage">
      <div
        ref={ref}
        className="dy-stage-box"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        <img className="dy-stage-img" src={image.src} alt={image.alt} draggable={false} />
        {children}
      </div>
    </div>
  );
});
