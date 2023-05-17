import { CircleGeometry, MeshBasicMaterial, Mesh, Object3D } from "three";
import { type PointActor } from "../services/point.machine";

type PointArgs = {
  geometry?: CircleGeometry;
  material?: MeshBasicMaterial;
  parent?: Object3D;
};

export class Point extends Mesh {
  type = "Point";
  isPoint = true;
  geometry: CircleGeometry;
  material: MeshBasicMaterial;
  machine?: PointActor;

  constructor({
    geometry = new CircleGeometry(6, 32),
    material = new MeshBasicMaterial({ color: 0xffffff }),
    parent,
  }: PointArgs) {
    super(geometry, material);

    this.geometry = geometry;
    this.material = material;

    if (parent) parent.add(this);
  }

  setMachine = (machine: PointActor) => {
    this.machine = machine;
  };

  static create = (args: PointArgs) => {
    return new Point(args);
  };
}
