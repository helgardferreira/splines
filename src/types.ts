import { OrthographicCamera, Scene, WebGLRenderer } from "three";

export type Experience = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
};
