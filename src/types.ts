import {
  type Intersection,
  type OrthographicCamera,
  type Scene,
  type WebGLRenderer,
} from "three";

import { type Point } from "./core/Point";

export type Experience = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
};

export type PointIntersection = Intersection<Point>;
