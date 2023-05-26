import { Vector2 } from "three";

export function getPointOnLine(
  p0: Vector2,
  p1: Vector2,
  p: Vector2,
  target = new Vector2()
): {
  vector: Vector2;
  t: number;
} {
  // Formula for calculating the closest point on a line given a separate point
  const x1 = p0.x;
  const y1 = p0.y;
  const x2 = p1.x;
  const y2 = p1.y;

  const dx = x2 - x1;
  const dy = y2 - y1;

  const t = Math.max(
    Math.min(((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy), 1),
    0
  );

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return {
    vector: target.set(closestX, closestY),
    t,
  };
}
