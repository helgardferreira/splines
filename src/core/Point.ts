import { type CircleGeometry, type MeshBasicMaterial, Mesh } from "three";

export class Point extends Mesh {
  type = "Point";
  isPoint = true;

  constructor(
    public geometry: CircleGeometry,
    public material: MeshBasicMaterial,
    public t = 0
  ) {
    super(geometry, material);
  }
}
