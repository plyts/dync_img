import type { HotspotShape, Point } from "../types";

/**
 * All coordinates in this module are percentages (0-100) of the image box.
 * The image box always matches the image's intrinsic aspect ratio (see
 * Stage.tsx), so a plain percentage-based SVG viewBox="0 0 100 100" with
 * preserveAspectRatio="none" lines up pixel-perfectly with the <img> without
 * any resize-observer math.
 */

export function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

export function clientToPercent(
  el: Element,
  clientX: number,
  clientY: number,
): Point {
  const rect = el.getBoundingClientRect();
  const x = rect.width === 0 ? 0 : ((clientX - rect.left) / rect.width) * 100;
  const y = rect.height === 0 ? 0 : ((clientY - rect.top) / rect.height) * 100;
  return { x: clamp(x), y: clamp(y) };
}

export function rectFromPoints(a: Point, b: Point) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { kind: "rect" as const, x, y, w, h };
}

export function shapeToPolygonPoints(shape: HotspotShape): Point[] {
  if (shape.kind === "rect") {
    const { x, y, w, h } = shape;
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  return shape.points;
}

export function pointsToSvgAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function centroid(shape: HotspotShape): Point {
  const pts = shapeToPolygonPoints(shape);
  const sum = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

export function boundingBox(shape: HotspotShape) {
  const pts = shapeToPolygonPoints(shape);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x1 = Math.min(...xs);
  const y1 = Math.min(...ys);
  const x2 = Math.max(...xs);
  const y2 = Math.max(...ys);
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

/** Ray-casting point-in-polygon test; rects are tested as their 4-corner polygon. */
export function pointInShape(shape: HotspotShape, pt: Point): boolean {
  const pts = shapeToPolygonPoints(shape);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function moveShape(shape: HotspotShape, dx: number, dy: number): HotspotShape {
  if (shape.kind === "rect") {
    return {
      ...shape,
      x: clamp(shape.x + dx, 0, 100 - shape.w),
      y: clamp(shape.y + dy, 0, 100 - shape.h),
    };
  }
  return {
    ...shape,
    points: shape.points.map((p) => ({
      x: clamp(p.x + dx),
      y: clamp(p.y + dy),
    })),
  };
}

export function movePoint(pt: Point, dx: number, dy: number): Point {
  return { x: clamp(pt.x + dx), y: clamp(pt.y + dy) };
}

export type RectHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function resizeRect(
  shape: { kind: "rect"; x: number; y: number; w: number; h: number },
  handle: RectHandle,
  dx: number,
  dy: number,
) {
  let { x, y, w, h } = shape;
  const x2 = x + w;
  const y2 = y + h;

  if (handle.includes("w")) {
    x = clamp(x + dx, 0, x2 - 1);
    w = x2 - x;
  }
  if (handle.includes("e")) {
    const newX2 = clamp(x2 + dx, x + 1, 100);
    w = newX2 - x;
  }
  if (handle.includes("n")) {
    y = clamp(y + dy, 0, y2 - 1);
    h = y2 - y;
  }
  if (handle.includes("s")) {
    const newY2 = clamp(y2 + dy, y + 1, 100);
    h = newY2 - y;
  }

  return { ...shape, x, y, w, h };
}

export function unionBoundingBox(shapes: HotspotShape[]) {
  const boxes = shapes.map(boundingBox);
  const x1 = Math.min(...boxes.map((b) => b.x1));
  const y1 = Math.min(...boxes.map((b) => b.y1));
  const x2 = Math.max(...boxes.map((b) => b.x2));
  const y2 = Math.max(...boxes.map((b) => b.y2));
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

export function unionRectShape(shapes: HotspotShape[]): HotspotShape {
  const box = unionBoundingBox(shapes);
  return { kind: "rect", x: box.x1, y: box.y1, w: box.w, h: box.h };
}

export function pointInAnyShape(shapes: HotspotShape[], pt: Point): boolean {
  return shapes.some((s) => pointInShape(s, pt));
}

/** What actually lights up: the explicit spotlight, or the union of all
 *  clickable areas when none was set (the common single-area case). */
export function effectiveSpotlight(
  areas: HotspotShape[],
  spotlightShape: HotspotShape | null,
): HotspotShape {
  return spotlightShape ?? unionRectShape(areas);
}

export function centroidOfAreas(areas: HotspotShape[]): Point {
  const pts = areas.map(centroid);
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

/** A connector's path always has a defined start and end (`from`/`to`) — only
 *  the shape between them changes: a straight line, or a gentle arc bowed
 *  perpendicular to the line by a fraction of its length. */
export function connectorPathD(from: Point, to: Point, curved: boolean): string {
  if (!curved) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bend = dist * 0.18;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

export function polygonSignedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}
