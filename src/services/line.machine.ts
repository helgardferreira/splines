import { type Object3D, Group, Vector2 } from "three";
import { type ActorRefFrom, type InterpreterFrom, createMachine } from "xstate";
import { type Line } from "../core/Line";
import { lerp } from "../math";

function getPointsOnLine(p0: Vector2, p1: Vector2, numPoints = 100): Vector2[] {
  const points = [];

  for (let d = 0; d <= numPoints; d++) {
    const point = lerp(p0, p1, d / numPoints);
    points.push(point);
  }

  return points;
}

type LineMachineContext = {
  groupRef: Group;
  line: Line;
  p0: Vector2;
  p1: Vector2;
  pLerp: Vector2;
  tLine: number;
};

type PanStartEvent = { type: "PAN_START"; x: number; y: number };
type PanEndEvent = { type: "PAN_END"; x: number; y: number };
type LineMachineEvent = PanStartEvent | PanEndEvent;

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
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MA6VFlgGIAFAQQDkB9AZQBUSAlGgbQAYBdRUABwHtZUALqh7pOIAB6IALACYANCACeiGTKlYpAVgDMARhmaAvoYVpMOPIVKUAomQAirDkhC9+QkWMkJNLLAA4ANgB2XX9gzQVlBH1-LCNjBXQeCDgxMzAxN0FhURdvAFpAqMQixJAMi3wsvhzPfMRgmSxtAE4WQIMShG0DDQ6DY2MgA */
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
          },
        },
      },

      entry: "createLine",
    },
    {
      actions: {
        createLine: ({ groupRef, p0, p1, pLerp, tLine }) => {
          const curvePoints: Vector2[] = [];

          lerp(p0, p1, tLine, pLerp);

          getPointsOnLine(points[0], pLerp).forEach((point) =>
            curvePoints.push(point)
          );

          line.geometry.setFromPoints(curvePoints);

          groupRef.add(line);

          if (parent) parent.add(groupRef);
        },
        panStart: ({ p0, p1, pLerp, line }, { x, y }) => {
          p0.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          line.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          line.geometry.getAttribute("position").needsUpdate = true;
        },
        panEnd: ({ p0, p1, pLerp, tLine, line }, { x, y }) => {
          p1.set(x, y);
          lerp(p0, p1, tLine, pLerp);

          line.geometry.setFromPoints(getPointsOnLine(p0, pLerp));
          line.geometry.getAttribute("position").needsUpdate = true;
        },
      },
    }
  );

export type LineService = InterpreterFrom<ReturnType<typeof createLineMachine>>;
export type LineActor = ActorRefFrom<ReturnType<typeof createLineMachine>>;
