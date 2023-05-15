import { init } from "./init";
import "./index.css";
import {
  BufferGeometry,
  CircleGeometry,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector2,
} from "three";
import { Experience } from "./types";
import { LineMesh } from "./core/LineMesh";
import { LineCurve } from "./core/LineCurve";
import { addLineControls } from "./services/lineControls.machine";
import {
  EMPTY,
  distinctUntilKeyChanged,
  from,
  map,
  switchMap,
  tap,
  timer,
} from "rxjs";
import { createSpringMachine } from "./services/spring.machine";
import { interpret } from "xstate";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) throw new Error("Container not found");

const createCircle = (position: Vector2, idx: number, zIndex = 0) => {
  const circle = new Mesh(
    new CircleGeometry(6, 32),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  circle.position.set(position.x, position.y, zIndex);
  circle.name = `circle-${idx}`;

  return circle;
};

const spawnLine =
  ({
    p0,
    p1,
    t = 1,
    zIndex,
  }: {
    p0: Vector2;
    p1: Vector2;
    t?: number;
    zIndex?: number;
  }) =>
  ({ scene }: Experience) => {
    const group = new Group();

    const curve = new LineCurve(p0, p1, t, 2);

    const points: Vector2[] = [];

    group.add(createCircle(p0, 0, zIndex));
    group.add(createCircle(p1, 1, zIndex));

    curve.getPoints().forEach((point) => points.push(point));

    const line = new LineMesh(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color: 0xffffff,
      })
    );

    line.name = "line";
    line.curve = curve;
    group.add(line);

    scene.add(group);

    return {
      line,
    };
  };

const spawnAnimatedLine =
  (args: { p0: Vector2; p1: Vector2; zIndex?: number }) =>
  (experience: Experience) => {
    const { line } = spawnLine({ ...args, t: 0 })(experience);

    const springService = interpret(
      createSpringMachine({
        stiffness: 20,
        damping: 1,
        mass: 1,
        overshootClamping: true,
        fromValue: 0,
        toValue: 1,
      })
    ).start();

    const spring$ = from(springService);

    spring$
      .pipe(map(({ context: { currentValue } }) => currentValue))
      .subscribe((t) => {
        line.curve!.setT(t);
        line.geometry.setFromPoints(line.curve!.getPoints());
      });

    timer(1000)
      .pipe(
        tap(() => springService.send({ type: "PLAY" })),
        switchMap(() =>
          spring$.pipe(
            map(({ context: { currentValue }, value }) => ({
              currentValue,
              value,
            }))
          )
        ),
        distinctUntilKeyChanged("value"),
        switchMap(({ currentValue, value }) => {
          if (value === "idle") {
            if (currentValue === 1) {
              return timer(1000).pipe(
                tap(() => springService.send({ type: "REWIND" }))
              );
            }
            return timer(1000).pipe(
              tap(() => springService.send({ type: "PLAY" }))
            );
          }

          return EMPTY;
        })
      )
      .subscribe();
  };

const render = ({ renderer, scene, camera }: Experience) => {
  renderer.render(scene, camera);
  requestAnimationFrame(() => render({ renderer, scene, camera }));
};

init(container)(
  spawnLine({
    p0: new Vector2(-200, 0),
    p1: new Vector2(200, 0),
    t: 1,
    zIndex: 0,
  }),
  spawnAnimatedLine({
    p0: new Vector2(-200, 20),
    p1: new Vector2(200, 20),
    zIndex: 2,
  }),
  render,
  (experience) => {
    addLineControls(experience).subscribe(({ value }) => {
      // console.log(value);
    });
  }
);
