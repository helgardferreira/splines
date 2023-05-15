import { OrthographicCamera, Scene, WebGLRenderer } from "three";
import { Experience } from "./types";

export const init = (container: HTMLElement) => {
  const { width, height } = container.getBoundingClientRect();

  const camera = new OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    10000
  );
  camera.position.set(0, 0, 1000);
  camera.zoom = 1;
  camera.updateProjectionMatrix();

  const scene = new Scene();

  const renderer = new WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  renderer.render(scene, camera);

  return (...cbs: ((experience: Experience) => unknown)[]) => {
    for (const cb of cbs) {
      cb({ renderer, scene, camera });
    }
  };
};
