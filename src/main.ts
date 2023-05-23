import { init } from "./init";
import "./index.css";
import { Vector2 } from "three";
import { Experience } from "./types";
import { addLineControls } from "./services/lineControls.machine";
import { createLinesMachine } from "./services/lines.machine";
import { interpret } from "xstate";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const spawnLines =
  ({ points, zIndex }: { points: Vector2[]; zIndex?: number }) =>
  ({ scene }: Experience) => {
    const linesService = interpret(createLinesMachine({ points, zIndex, parent: scene })).start();

    setTimeout(() => {
      console.log(linesService.getSnapshot().context)
    }, 1000);
  };

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(
  spawnLines({
    points: [
      new Vector2(-200, 0),
      new Vector2(-100, 100),
      new Vector2(100, 100),
      new Vector2(200, 0),
    ],
    zIndex: 0,
  }),
  render,
  addLineControls
);
