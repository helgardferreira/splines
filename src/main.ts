import { init } from "./init";
import "./index.css";
import {
  BufferGeometry,
  CircleGeometry,
  Intersection,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
} from "three";
import { Experience } from "./types";
import { LineMesh } from "./core/LineMesh";
import { LineCurve } from "./core/LineCurve";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  from,
  fromEvent,
  of,
  scan,
  switchMap,
  tap,
} from "rxjs";
import { filterBoxConstraint, mapNormalizedPointer } from "./lib/rxjs";

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

type BasicIntersection = Intersection<Mesh<BufferGeometry, MeshBasicMaterial>>;

const addRaycasting = ({
  scene,
  camera,
  renderer: { domElement },
}: Experience) => {
  const raycaster = new Raycaster();
  const box = domElement.getBoundingClientRect();

  fromEvent<PointerEvent>(window, "pointermove")
    .pipe(
      filterBoxConstraint(box),
      mapNormalizedPointer(box),
      switchMap((pointer) => {
        raycaster.setFromCamera(pointer as Vector2, camera);
        const intersects: BasicIntersection[] = raycaster
          .intersectObjects(scene.children)
          .filter((intersection) =>
            /circle/.test(intersection.object.name)
          ) as BasicIntersection[];

        return intersects.length > 0 ? from(intersects) : of(undefined);
      }),
      scan(
        (acc, intersection) => {
          if (intersection === undefined) {
            if (acc.intersection) {
              return {
                cache: {
                  ...acc.cache,
                  [acc.intersection.object.name]: { isIntersected: false },
                },
                intersection: undefined,
                isIntersecting: false,
              };
            }
            return {
              cache: acc.cache,
              intersection: undefined,
              isIntersecting: false,
            };
          }

          if (
            acc.intersection &&
            acc.intersection.object.name !== intersection.object.name
          ) {
            return {
              intersection,
              cache: {
                ...acc.cache,
                [acc.intersection.object.name]: { isIntersected: false },
                [intersection.object.name]: { isIntersected: true },
              },
              isIntersecting: true,
            };
          }

          return {
            intersection,
            cache: {
              ...acc.cache,
              [intersection.object.name]: { isIntersected: true },
            },
            isIntersecting: true,
          };
        },
        {
          cache: {},
          intersection: undefined,
          isIntersecting: false,
        } as {
          cache: {
            [id: string]: {
              isIntersected: boolean;
            };
          };
          intersection: BasicIntersection | undefined;
          isIntersecting: boolean;
        }
      ),
      tap(({ intersection, isIntersecting }) => {
        console.log(isIntersecting, intersection?.object.name);
        if (isIntersecting) {
          document.body.style.cursor = "grab";
        } else {
          document.body.style.cursor = "default";
        }
      })
    )
    .subscribe();
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
  camera.zoom = 20;
  camera.updateProjectionMatrix();
};

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(spawnLine, render, addRaycasting);
