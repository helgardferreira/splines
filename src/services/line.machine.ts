import {
  BufferGeometry,
  Group,
  LineBasicMaterial,
  Object3D,
  Vector2,
} from "three";
import { InterpreterFrom, assign, createMachine, spawn } from "xstate";
import { Line } from "../core/Line";
import { Point } from "../core/Point";
import { lerp } from "../math";
import { PointActor, createPointMachine } from "./point.machine";

function getPointsOnLine(p0: Vector2, p1: Vector2, numPoints = 100): Vector2[] {
  const points = [];

  for (let d = 0; d <= numPoints; d++) {
    const point = lerp(p0, p1, d / numPoints);
    points.push(point);
  }

  return points;
}

function getPointOnLine(
  p0: Vector2,
  p1: Vector2,
  p: Vector2,
  target = new Vector2()
): {
  vector: Vector2;
  t: number;
} {
  // Formula for calculating the closest point on a line given a separate point
  const x1 = p0.x;
  const y1 = p0.y;
  const x2 = p1.x;
  const y2 = p1.y;

  const dx = x2 - x1;
  const dy = y2 - y1;

  const t = Math.max(
    Math.min(((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy), 1),
    0
  );

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return {
    vector: target.set(closestX, closestY),
    t,
  };
}

type LineMachineContext = {
  groupRef: Group;
  lineRef: Line;
  p0: Vector2;
  p1: Vector2;
  pLerp: Vector2;
  tLine: number;
  points: {
    [key: string]: PointActor;
  };
};

type CreatePointEvent = { type: "CREATE_POINT" };
type PanBezierEvent = { type: "PAN_BEZIER"; x: number; y: number };
type PanStartPointEvent = { type: "PAN_START_POINT"; x: number; y: number };
type PanEndPointEvent = { type: "PAN_END_POINT"; x: number; y: number };
type LineMachineEvent =
  | CreatePointEvent
  | PanBezierEvent
  | PanStartPointEvent
  | PanEndPointEvent;

type LineMachineArgs = {
  points: Vector2[];
  lineRef: Line;
  material?: LineBasicMaterial;
  parent?: Object3D;
  t?: number;
  zIndex?: number;
};

export const createLineMachine = ({
  points,
  lineRef,
  material = new LineBasicMaterial({
    color: 0xffffff,
  }),
  parent,
  t: tLine = 1,
  zIndex,
}: LineMachineArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MA6VFlgGIAFAQQDkB9AIQFEAtASRoCUBtABgF1FQAHAe1ioALqn7oeIAB6IAbLKwAOAEzsAzAEZlAVgA0IAJ6I1qrABZ2snQF9r+tJhx5CpSgGUAKiWYeKRAPIMZB4c3EggAkKi4pIyCGbK+kYIyspm5tqaNnYgDti4+MTkFDRkACJ+gcGhkpEiYhLhcdrsWADsamZqbXqGiFqKWNq2Oej8EHCSebWC9TFNiAC0sklLsrb2GPnOM1ENsYgAnIOybYeyij2r8coaWGrah93DI0A */
      id: "line",

      tsTypes: {} as import("./line.machine.typegen").Typegen0,
      predictableActionArguments: true,

      schema: {
        context: {} as LineMachineContext,
        events: {} as LineMachineEvent,
      },

      context: {
        groupRef: new Group(),
        lineRef,
        points: {},
        p0: points[0],
        p1: points[1],
        pLerp: points[1].clone(),
        tLine,
      },
      initial: "idle",

      states: {
        idle: {
          on: {
            PAN_BEZIER: {
              target: "idle",
              internal: true,
              actions: "panBezier",
            },

            PAN_START_POINT: {
              target: "idle",
              internal: true,
              actions: "panStart",
            },

            PAN_END_POINT: {
              target: "idle",
              internal: true,
              actions: "panEnd",
            },
          },
        },
      },

      entry: "createLine",
    },
    {
      actions: {
        createLine: assign(({ groupRef, p0, p1, pLerp, tLine }) => {
          const curvePoints: Vector2[] = [];

          lerp(p0, p1, tLine, pLerp);

          getPointsOnLine(points[0], pLerp).forEach((point) =>
            curvePoints.push(point)
          );

          const geometry = new BufferGeometry().setFromPoints(curvePoints);
          lineRef.geometry = geometry;
          lineRef.material = material;

          groupRef.add(lineRef);

          const startPoint = Point.create({
            parent: groupRef,
          });
          const startPointActor = spawn(
            createPointMachine({
              position: points[0],
              zIndex,
              id: 0,
              meshRef: startPoint,
            })
          );
          startPoint.setMachine(startPointActor);

          const endPoint = Point.create({
            parent: groupRef,
          });
          const endPointActor = spawn(
            createPointMachine({
              position: points[1],
              zIndex,
              id: 1,
              meshRef: endPoint,
            })
          );
          endPoint.setMachine(endPointActor);

          const bezierPoint = Point.create({
            parent: groupRef,
          });
          const bezierPointActor = spawn(
            createPointMachine({
              position: lerp(points[0], pLerp, 1 / 2),
              zIndex: 10,
              type: "bezier-point",
              t: 1 / 2,
              meshRef: bezierPoint,
            })
          );
          bezierPoint.setMachine(bezierPointActor);

          if (parent) parent.add(groupRef);

          return {
            points: {
              start: startPointActor,
              end: endPointActor,
              bezier: bezierPointActor,
            },
          };
        }),
        panBezier: ({ points, p0, pLerp }, { x, y }) => {
          const { vector, t } = getPointOnLine(p0, pLerp, new Vector2(x, y));

          points.bezier.send({
            type: "SET_POSITION",
            position: vector,
            t,
          });
        },
        panStart: ({ p0, p1, pLerp, lineRef, points }, { x, y }) => {
          points.start.send({
            type: "SET_POSITION",
            position: new Vector2(x, y),
          });

          p0.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          const bezierContext = points.bezier.getSnapshot()?.context;
          if (bezierContext) {
            const { t } = bezierContext;
            const position = lerp(p0, pLerp, t);

            points.bezier.send({
              type: "SET_POSITION",
              position,
            });
          }

          lineRef.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          lineRef.geometry.getAttribute("position").needsUpdate = true;
        },
        panEnd: ({ p0, p1, pLerp, tLine, lineRef, points }, { x, y }) => {
          points.end.send({
            type: "SET_POSITION",
            position: new Vector2(x, y),
          });

          p1.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          const bezierContext = points.bezier.getSnapshot()?.context;
          if (bezierContext) {
            const { t } = bezierContext;

            const position = lerp(p0, pLerp, t);

            points.bezier.send({
              type: "SET_POSITION",
              position,
            });
          }

          lineRef.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          lineRef.geometry.getAttribute("position").needsUpdate = true;
        },
      },
    }
  );

export type LineService = InterpreterFrom<ReturnType<typeof createLineMachine>>;
