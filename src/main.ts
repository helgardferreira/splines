import { init } from "./init";
import "./index.css";
import { BufferGeometry, Group, LineBasicMaterial, Vector2 } from "three";
import { Experience } from "./types";
import { LineMesh } from "./core/LineMesh";
import { LineCurve } from "./core/LineCurve";
import { addLineControls } from "./services/lineControls.machine";
import { lerp } from "./math";
import { Point } from "./core/Point";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const spawnLine =
  ({
    p0,
    p1,
    t = 1,
    zIndex,
  }: {
    p0: Vector2;
    p1: Vector2;
    t?: number;
    zIndex?: number;
  }) =>
  ({ scene }: Experience) => {
    const group = new Group();
    const curve = new LineCurve(p0, p1, t, 2);

    const points: Vector2[] = [];

    curve.getPoints().forEach((point) => points.push(point));

    const line = new LineMesh(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color: 0xffffff,
      })
    );

    line.name = "line";
    line.curve = curve;
    group.add(line);

    Point.create({
      parent: group,
      position: p0,
      zIndex,
      id: 0,
    });
    Point.create({
      parent: group,
      position: p1,
      zIndex,
      id: 1,
    });
    Point.create({
      parent: group,
      position: lerp(p0, p1, t / 2),
      zIndex: 10,
      label: "bezier-point",
      t: t / 2,
    });

    scene.add(group);

    return {
      line,
    };
  };

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(
  spawnLine({
    p0: new Vector2(-100, 0),
    p1: new Vector2(0, 100),
    t: 1,
    zIndex: 0,
  }),
  spawnLine({
    p0: new Vector2(0, 100),
    p1: new Vector2(100, 0),
    t: 1,
    zIndex: 1,
  }),
  render,
  addLineControls
);
