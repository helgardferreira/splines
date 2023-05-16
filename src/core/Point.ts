import {
  CircleGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector2,
  Object3D,
} from "three";
import {
  createPointMachine,
  type PointService,
} from "../services/point.machine";
import { interpret } from "xstate";

type PointArgs = {
  geometry?: CircleGeometry;
  material?: MeshBasicMaterial;
  parent?: Object3D;
  t?: number;
  position?: Vector2;
  zIndex?: number;
  id?: number;
  label?: string;
};

export class Point extends Mesh {
  type = "Point";
  isPoint = true;
  geometry: CircleGeometry;
  material: MeshBasicMaterial;
  machine: PointService;

  constructor({
    geometry = new CircleGeometry(6, 32),
    material = new MeshBasicMaterial({ color: 0xffffff }),
    parent,
    t,
    position,
    zIndex,
    id,
    label,
  }: PointArgs) {
    super(geometry, material);

    this.geometry = geometry;
    this.material = material;

    if (parent) parent.add(this);

    this.machine = interpret(
      createPointMachine({
        meshRef: this,
        t,
        position,
        zIndex,
        id,
        label,
      })
    ).start();
  }

  static create = (args: PointArgs) => {
    return new Point(args);
  };
}
