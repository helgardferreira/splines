import {
  Object3D,
  BufferGeometry,
  LineBasicMaterial,
  Matrix4,
  Ray,
  Sphere,
  Vector3,
  Raycaster,
  Intersection,
  Vector2,
} from "three";
import { LineService, createLineMachine } from "../services/line.machine";
import { interpret } from "xstate";

type LineArgs = {
  p0: Vector2;
  p1: Vector2;
  material?: LineBasicMaterial;
  parent?: Object3D;
  t?: number;
  zIndex?: number;
};

export class Line extends Object3D {
  isLine = true;
  type = "Line";

  geometry!: BufferGeometry;
  material!: LineBasicMaterial;
  machine: LineService;

  protected _inverseMatrix = new Matrix4();
  protected _ray = new Ray();
  protected _sphere = new Sphere();

  constructor({
    p0,
    p1,
    material = new LineBasicMaterial(),
    parent,
    t,
    zIndex,
  }: LineArgs) {
    super();

    this.machine = interpret(
      createLineMachine({
        lineRef: this,
        p0,
        p1,
        material,
        parent,
        t,
        zIndex,
      })
    ).start();
  }

  raycast(raycaster: Raycaster, intersects: Intersection[]) {
    const geometry = this.geometry;
    const matrixWorld = this.matrixWorld;
    const threshold = raycaster.params.Line!.threshold;
    const drawRange = geometry.drawRange;

    // Checking boundingSphere distance to ray
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

    this._sphere.copy(geometry.boundingSphere as Sphere);
    this._sphere.applyMatrix4(matrixWorld);
    this._sphere.radius += threshold;

    if (raycaster.ray.intersectsSphere(this._sphere) === false) return;

    this._inverseMatrix.copy(matrixWorld).invert();
    this._ray.copy(raycaster.ray).applyMatrix4(this._inverseMatrix);

    const localThreshold =
      threshold / ((this.scale.x + this.scale.y + this.scale.z) / 3);
    const localThresholdSq = localThreshold * localThreshold;

    const vStart = new Vector3();
    const vEnd = new Vector3();
    const interSegment = new Vector3();
    const interRay = new Vector3();
    // const step = this.isLineSegments ? 2 : 1;
    const step = 1;

    const index = geometry.index;
    const attributes = geometry.attributes;
    const positionAttribute = attributes.position;

    if (index !== null) {
      const start = Math.max(0, drawRange.start);
      const end = Math.min(index.count, drawRange.start + drawRange.count);

      for (let i = start, l = end - 1; i < l; i += step) {
        const a = index.getX(i);
        const b = index.getX(i + 1);

        vStart.fromBufferAttribute(positionAttribute, a);
        vEnd.fromBufferAttribute(positionAttribute, b);

        const distSq = this._ray.distanceSqToSegment(
          vStart,
          vEnd,
          interRay,
          interSegment
        );

        if (distSq > localThresholdSq) continue;

        interRay.applyMatrix4(this.matrixWorld); // Move back to world space for distance calculation

        const distance = raycaster.ray.origin.distanceTo(interRay);

        if (distance < raycaster.near || distance > raycaster.far) continue;

        intersects.push({
          distance: distance,
          // point: raycaster.ray.at( distance ),
          point: interSegment.clone().applyMatrix4(this.matrixWorld),
          index: i,
          face: null,
          faceIndex: undefined,
          object: this,
        });
      }
    } else {
      const start = Math.max(0, drawRange.start);
      const end = Math.min(
        positionAttribute.count,
        drawRange.start + drawRange.count
      );

      for (let i = start, l = end - 1; i < l; i += step) {
        vStart.fromBufferAttribute(positionAttribute, i);
        vEnd.fromBufferAttribute(positionAttribute, i + 1);

        const distSq = this._ray.distanceSqToSegment(
          vStart,
          vEnd,
          interRay,
          interSegment
        );

        if (distSq > localThresholdSq) continue;

        interRay.applyMatrix4(this.matrixWorld); // Move back to world space for distance calculation

        const distance = raycaster.ray.origin.distanceTo(interRay);

        if (distance < raycaster.near || distance > raycaster.far) continue;

        intersects.push({
          distance: distance,
          // point: raycaster.ray.at( distance ),
          point: interSegment.clone().applyMatrix4(this.matrixWorld),
          index: i,
          face: null,
          faceIndex: undefined,
          object: this,
        });
      }
    }
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);

    this.material = source.material;
    this.geometry = source.geometry;

    return this;
  }

  static create(args: LineArgs) {
    return new Line(args);
  }
}
