import {
  type BufferGeometry,
  type Intersection,
  type Mesh,
  type MeshBasicMaterial,
  type OrthographicCamera,
  type Scene,
  type WebGLRenderer,
} from "three";

export type Experience = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
};

export type BasicIntersection = Intersection<
  Mesh<BufferGeometry, MeshBasicMaterial>
>;
