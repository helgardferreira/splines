import { type Object3D, Group, Vector2 } from "three";
import {
  type ActorRefFrom,
  type InterpreterFrom,
  assign,
  createMachine,
  spawn,
} from "xstate";
import { type Line } from "../core/Line";
import { Point } from "../core/Point";
import { lerp } from "../math";
import { type PointActor, createPointMachine } from "./point.machine";
import { sendParent } from "xstate/lib/actions";

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
  line: Line;
  p0: Vector2;
  p1: Vector2;
  pLerp: Vector2;
  tLine: number;
  bezierPoint?: PointActor;
};

type PanPointEvent = { type: "PAN_POINT"; x: number; y: number };
type PanStartEvent = { type: "PAN_START"; x: number; y: number };
type PanEndEvent = { type: "PAN_END"; x: number; y: number };
type ScrubBezierEvent = { type: "SCRUB_BEZIER"; t: number };
type LineMachineEvent =
  | PanPointEvent
  | PanStartEvent
  | PanEndEvent
  | ScrubBezierEvent;

type LineMachineArgs = {
  points: [Vector2, Vector2];
  line: Line;
  parent?: Object3D;
  t?: number;
  zIndex?: number;
};

export const createLineMachine = ({
  points,
  line,
  parent,
  t: tLine = 1,
}: LineMachineArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MA6VFlgGIAFAQQDkB9IgeQEkyAVAbQAYBdRUABwHtZUALqh7pOIAB6IArABYsATgDsANinKATFIA0IAJ6IZARmVYAzFPmnFUgL42daTDjyFSlAMoMSAJWbsxvPxCImKSCFKmWCpqmjr6CKbqLFgyLBq29iCO2Lj4xOQUAKJkACKsHEgggYLCopVhGljKiQAchrF6iOrqcjIR7RkOGDkuBO4Awt4AqgBCFDOFAFq0hd7lAXw1IfUG6nGI7S1YGZnoPBBwYtkbQbWhiAC0yvsIT3ZDTrlgN1t1oGEtOSGGLaTrhQyKMwDOx2IA */
      id: "line",

      tsTypes: {} as import("./line.machine.typegen").Typegen0,
      predictableActionArguments: true,

      schema: {
        context: {} as LineMachineContext,
        events: {} as LineMachineEvent,
      },

      context: {
        groupRef: new Group(),
        line,
        p0: points[0],
        p1: points[1],
        pLerp: points[1].clone(),
        tLine,
      },
      initial: "idle",

      states: {
        idle: {
          on: {
            PAN_POINT: {
              target: "idle",
              internal: true,
              actions: "panPoint",
            },

            PAN_START: {
              target: "idle",
              internal: true,
              actions: "panStart",
            },

            PAN_END: {
              target: "idle",
              internal: true,
              actions: "panEnd",
            },

            SCRUB_BEZIER: {
              target: "idle",
              actions: "scrubBezier",
              internal: true,
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

          line.geometry.setFromPoints(curvePoints);

          groupRef.add(line);

          const bezierPoint = Point.create({
            parent: groupRef,
          });
          const bezierPointActor = spawn(
            createPointMachine({
              position: lerp(points[0], pLerp, 1 / 2),
              zIndex: 10,
              t: 1 / 2,
              point: bezierPoint,
            })
          );
          bezierPoint.setMachine(bezierPointActor);

          if (parent) parent.add(groupRef);

          return {
            bezierPoint: bezierPointActor,
          };
        }),
        panPoint: sendParent(({ p0, pLerp }, { x, y }) => {
          const { t } = getPointOnLine(p0, pLerp, new Vector2(x, y));

          // bezierPoint.send({
          //   type: "SET_POSITION",
          //   position: vector,
          //   t,
          // });

          return {
            type: "SCRUB_BEZIER",
            t,
          };
        }),
        scrubBezier: ({ bezierPoint, p0, pLerp }, { t }) => {
          if (bezierPoint) {
            bezierPoint.send({
              type: "SET_POSITION",
              position: lerp(p0, pLerp, t),
              t,
            });
          }
        },
        panStart: ({ p0, p1, pLerp, line, bezierPoint }, { x, y }) => {
          p0.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          if (bezierPoint) {
            const bezierContext = bezierPoint.getSnapshot()?.context;
            if (bezierContext) {
              const { t } = bezierContext;
              const position = lerp(p0, pLerp, t);

              bezierPoint.send({
                type: "SET_POSITION",
                position,
              });
            }
          }

          line.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          line.geometry.getAttribute("position").needsUpdate = true;
        },
        panEnd: ({ p0, p1, pLerp, tLine, line, bezierPoint }, { x, y }) => {
          p1.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          if (bezierPoint) {
            const bezierContext = bezierPoint.getSnapshot()?.context;
            if (bezierContext) {
              const { t } = bezierContext;

              const position = lerp(p0, pLerp, t);

              bezierPoint.send({
                type: "SET_POSITION",
                position,
              });
            }
          }

          line.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          line.geometry.getAttribute("position").needsUpdate = true;
        },
      },
    }
  );

export type LineService = InterpreterFrom<ReturnType<typeof createLineMachine>>;
export type LineActor = ActorRefFrom<ReturnType<typeof createLineMachine>>;
