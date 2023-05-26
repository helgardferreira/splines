import { interpret } from "xstate";
import { Vector2 } from "three";

import "./index.css";

import { init } from "./init";
import { Experience } from "./types";
import { addLineControls } from "./services/lineControls.machine";
import { LinesService, createLinesMachine } from "./services/lines.machine";
import {
  ExperienceWithLines,
  createScrubLerpMachine,
} from "./services/scrubLerp.machine";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const spawnLines =
  ({ points, zIndex }: { points: Vector2[]; zIndex?: number }) =>
  ({ scene }: Experience): { linesService: LinesService } => ({
    linesService: interpret(
      createLinesMachine({ points, zIndex, parent: scene })
    ).start(),
  });

const spawnLerpScrubber = (experience: ExperienceWithLines) => {
  interpret(createScrubLerpMachine(experience)).start();
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
      /* new Vector2(-200, 0),
      new Vector2(-100, 100),
      new Vector2(100, 100),
      new Vector2(200, 0),
      new Vector2(100, -100),
      new Vector2(-100, -100),
      new Vector2(-200, 0), */
      /* new Vector2(-150, 200),
      new Vector2(0, 200),
      new Vector2(0, 0),
      new Vector2(-150, 0),
      new Vector2(-150, -200),
      new Vector2(0, -200), */
    ],
    zIndex: 0,
  }),
  spawnLerpScrubber,
  render,
  addLineControls
);
