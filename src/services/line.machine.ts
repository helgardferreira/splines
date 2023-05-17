import {
  BufferGeometry,
  Group,
  LineBasicMaterial,
  Object3D,
  Vector2,
} from "three";
import { InterpreterFrom, assign, createMachine, spawn } from "xstate";
import { LineCurve } from "../core/LineCurve";
import { Line } from "../core/Line";
import { Point } from "../core/Point";
import { lerp } from "../math";
import { PointActor, createPointMachine } from "./point.machine";

type LineMachineContext = {
  groupRef: Group;
  curveRef: LineCurve;
  lineRef: Line;
  points: {
    [key: string]: PointActor;
  };
};

type CreatePointEvent = { type: "CREATE_POINT" };
type PanBezierEvent = { type: "PAN_BEZIER"; x: number; y: number };
type PanStartEvent = { type: "PAN_START"; x: number; y: number };
type PanEndEvent = { type: "PAN_END"; x: number; y: number };
type LineMachineEvent =
  | CreatePointEvent
  | PanBezierEvent
  | PanStartEvent
  | PanEndEvent;

type LineMachineArgs = {
  p0: Vector2;
  p1: Vector2;
  lineRef: Line;
  material?: LineBasicMaterial;
  parent?: Object3D;
  t?: number;
  zIndex?: number;
};

export const createLineMachine = ({
  p0,
  p1,
  lineRef,
  material = new LineBasicMaterial({
    color: 0xffffff,
  }),
  parent,
  t = 1,
  zIndex,
}: LineMachineArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MA6VFlgGIAFAQQDkB9AIQFEAtASRoCUBtABgF1FQAHAe1ioALqn7oeIAB6IALACYANCACeiAMzyAjFlnsAbPICsAXxPK0mHHkKlKAZQAqJZo47ckIAUNHjJMhFl1XQB2eX0jQyNlNQR5eVksAE4jdS1jMwsMbFx8YnIKGjIAEXdJbxExCU8Ao3ksdXUjJPUQ6NVEdIAOLFNMkHR+CDhJSzBywUq-GsQAWn0Yuf1+set8CZ8q-0QQxK12FrbFwPisLubWvrMgA */
      id: "line",

      tsTypes: {} as import("./line.machine.typegen").Typegen0,
      predictableActionArguments: true,

      schema: {
        context: {} as LineMachineContext,
        events: {} as LineMachineEvent,
      },

      context: {
        groupRef: new Group(),
        curveRef: new LineCurve(p0, p1, t, 2),
        lineRef,
        points: {},
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
        createLine: assign(({ curveRef, groupRef }) => {
          const points: Vector2[] = [];

          curveRef.getPoints().forEach((point) => points.push(point));

          const geometry = new BufferGeometry().setFromPoints(points);
          lineRef.geometry = geometry;
          lineRef.material = material;

          groupRef.add(lineRef);

          const startPoint = Point.create({
            parent: groupRef,
          });
          const startPointActor = spawn(
            createPointMachine({
              position: p0,
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
              position: p1,
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
              position: lerp(p0, p1, t / 2),
              zIndex: 10,
              type: "bezier-point",
              t: t / 2,
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
        panBezier: ({ curveRef, points }, { x, y }) => {
          const { vector, t } = curveRef.getPointOnLine(x, y);

          points.bezier.send({
            type: "SET_POSITION",
            position: vector,
            t,
          });
        },
        panStart: ({ curveRef, lineRef, points }, { x, y }) => {
          points.start.send({
            type: "SET_POSITION",
            position: new Vector2(x, y),
          });

          curveRef.p0.set(x, y);

          const bezierContext = points.bezier.getSnapshot()?.context;
          if (bezierContext) {
            const { t } = bezierContext;
            const position = curveRef.getPoint(t);
            points.bezier.send({
              type: "SET_POSITION",
              position,
            });
          }

          lineRef.geometry.setFromPoints(curveRef.getPoints());
          lineRef.geometry.getAttribute("position").needsUpdate = true;
        },
        panEnd: ({ curveRef, lineRef, points }, { x, y }) => {
          points.end.send({
            type: "SET_POSITION",
            position: new Vector2(x, y),
          });

          curveRef.p1.set(x, y);

          const bezierContext = points.bezier.getSnapshot()?.context;
          if (bezierContext) {
            const { t } = bezierContext;
            const position = curveRef.getPoint(t);
            points.bezier.send({
              type: "SET_POSITION",
              position,
            });
          }

          lineRef.geometry.setFromPoints(curveRef.getPoints());
          lineRef.geometry.getAttribute("position").needsUpdate = true;
        },
      },
    }
  );

export type LineService = InterpreterFrom<ReturnType<typeof createLineMachine>>;
