import { init } from "./init";
import "./index.css";
import {
  BufferGeometry,
  CircleGeometry,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector2,
} from "three";
import { Experience } from "./types";
import { LineMesh } from "./core/LineMesh";
import { LineCurve } from "./core/LineCurve";
import { addLineControls } from "./services/lineControls.machine";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const createCircle = (position: Vector2, idx: number) => {
  const circle = new Mesh(
    new CircleGeometry(6, 32),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  circle.position.set(position.x, position.y, 0);
  circle.name = `circle-${idx}`;

  return circle;
};

const spawnLine = ({ scene, camera }: Experience) => {
  const group = new Group();

  const curve = new LineCurve(new Vector2(-200, 0), new Vector2(200, 0));
  const numPoints = 2;

  const points: Vector2[] = [];

  curve.getPoints(numPoints - 1).forEach((point, idx) => {
    group.add(createCircle(point, idx));
    points.push(point);
  });

  const line = new LineMesh(
    new BufferGeometry().setFromPoints(points),
    new LineBasicMaterial({
      color: 0xff0000,
    })
  );
  line.name = "line";
  group.add(line);

  scene.add(group);
  camera.updateProjectionMatrix();
};

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(spawnLine, render, (experience) => {
  addLineControls(experience).subscribe(({ value }) => {
    console.log(value);
  });
});
