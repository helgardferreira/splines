import { Vector2 } from "three";

export const lerp = (
  p0: Vector2,
  p1: Vector2,
  t: number,
  target = new Vector2()
): Vector2 => {
  return target
    .copy(p0)
    .multiplyScalar(1 - t)
    .add(p1.clone().multiplyScalar(t));
};
