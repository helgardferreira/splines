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

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const createCircle = (position: Vector2) => {
  const circle = new Mesh(
    new CircleGeometry(0.2, 32),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  circle.position.set(position.x, position.y, 0);

  return circle;
};

const spawnLine = ({ scene, camera }: Experience) => {
  const material = new LineBasicMaterial({
    color: 0xff0000,
  });

  const curve = new LineCurve(new Vector2(-10, 0), new Vector2(0, -10));

  const points: Vector2[] = [];

  for (const point of curve.getPoints(1)) {
    console.log("point", point);
    scene.add(createCircle(point));
    points.push(point);
  }

  const geometry = new BufferGeometry().setFromPoints(points);

  const line = new LineMesh(geometry, material);

  scene.add(line);
  camera.zoom = 20;
  camera.updateProjectionMatrix();
};

const animate = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => animate({ renderer, scene, camera }));
};

init(container)(spawnLine, animate);
