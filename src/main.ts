import { init } from "./init";
import "./index.css";
import { Vector2 } from "three";
import { Experience } from "./types";
import { addLineControls } from "./services/lineControls.machine";
import { Line } from "./core/Line";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const spawnLine =
  ({
    points,
    t = 1,
    zIndex,
  }: {
    points: Vector2[];
    t?: number;
    zIndex?: number;
  }) =>
  ({ scene }: Experience) => {
    Line.create({
      points,
      parent: scene,
      t,
      zIndex,
    });
  };

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(
  spawnLine({
    points: [new Vector2(-100, 0), new Vector2(0, 100)],
    t: 1,
    zIndex: 0,
  }),
  spawnLine({
    points: [new Vector2(0, 100), new Vector2(100, 0)],
    t: 1,
    zIndex: 1,
  }),
  render,
  addLineControls
);
