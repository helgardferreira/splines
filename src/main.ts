import { init } from "./init";
import "./index.css";
import {
  BufferGeometry,
  CircleGeometry,
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
    new CircleGeometry(0.2, 32),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  circle.position.set(position.x, position.y, 0);
  circle.name = `circle-${idx}`;

  return circle;
};

const spawnLine = ({ scene, camera }: Experience) => {
  const material = new LineBasicMaterial({
    color: 0xff0000,
  });

  const curve = new LineCurve(new Vector2(-10, 0), new Vector2(0, -10));
  const numPoints = 2;

  const points: Vector2[] = [];

  curve.getPoints(numPoints - 1).forEach((point, idx) => {
    scene.add(createCircle(point, idx));
    points.push(point);
  });

  const geometry = new BufferGeometry().setFromPoints(points);

  const line = new LineMesh(geometry, material);
  line.name = "line";

  scene.add(line);
  camera.zoom = 50;
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
