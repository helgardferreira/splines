import { Group, LineBasicMaterial, Object3D, Vector2 } from "three";
import { assign, createMachine, spawn } from "xstate";
import { Line } from "../core/Line";
import { PointActor, createPointMachine } from "./point.machine";
import { LineActor, createLineMachine } from "./line.machine";
import { Point } from "../core/Point";

type PointRef = {
  ref: PointActor;
  lines: Line[];
};

type LineRef = {
  ref: LineActor;
  points: PointRef[];
};

type LinesMachineContext = {
  groupRef: Group;
  lineRefs: Map<Line, LineRef>;
  pointRefs: Map<Point, PointRef>;
};

type PanPointEvent = { type: "PAN_POINT"; x: number; y: number; point: Point };
type ScrubBezierEvent = { type: "SCRUB_BEZIER"; t: number };
type LinesMachineEvent = PanPointEvent | ScrubBezierEvent;

type LinesArgs = {
  points: Vector2[];
  zIndex?: number;
  parent: Object3D;
};

export const createLinesMachine = ({ points, zIndex, parent }: LinesArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7OA6VFlgGIAFAQQDkB9IgeQEkyAVAbQAYBdRUABwHtZUALqh7pOIAB6IA7ABYsUhQGYZiqQFYANCACeiABwBGLGoC+Zreh4Q4YtJnhIQvfkJFjJCALQGturwDZzEDtsXHwxZ0FhUUcPGSlfRAM9ACYsAE41RQMU0zMTIA */
      id: "lines",
      tsTypes: {} as import("./lines.machine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        context: {} as LinesMachineContext,
        events: {} as LinesMachineEvent,
      },
      context: {
        groupRef: new Group(),
        lineRefs: new Map(),
        pointRefs: new Map(),
      },
      initial: "idle",
      states: {
        idle: {
          entry: "createLines",

          on: {
            PAN_POINT: {
              target: "idle",
              internal: true,
              actions: "panPoint",
            },

            SCRUB_BEZIER: {
              target: "idle",
              internal: true,
              actions: "scrubBezier",
            },
          },
        },
      },
    },
    {
      actions: {
        createLines: assign(({ groupRef, pointRefs, lineRefs }) => {
          const pointsLength = points.length;

          if (pointsLength < 2) return {};

          let previousLine: Line | undefined;
          for (let pIdx = 0; pIdx < pointsLength; pIdx += 1) {
            let line: Line | undefined;
            if (pIdx + 1 < pointsLength) {
              line = Line.create({
                parent: groupRef,
                material: new LineBasicMaterial({
                  color: 0xffffff,
                }),
              });
              const lineActor = spawn(
                createLineMachine({
                  line,
                  points: [points[pIdx], points[pIdx + 1]],
                  // Might want to use something else as parent
                  parent: groupRef,
                  zIndex,
                })
              );
              line.setMachine(lineActor);

              lineRefs.set(line, {
                points: [],
                ref: lineActor,
              });
            }

            const position = points[pIdx];

            // TODO: CHANGE FOR TREE DATA STRUCTURE
            if (line || previousLine) {
              const point = Point.create({
                parent: groupRef,
              });
              const pointActor = spawn(
                createPointMachine({
                  position,
                  zIndex,
                  point,
                })
              );
              point.setMachine(pointActor);
              const pointRef = {
                lines: [] as Line[],
                ref: pointActor,
              };
              if (line) {
                lineRefs.get(line)?.points.push(pointRef);
                pointRef.lines.push(line);
              }
              if (previousLine && previousLine !== line) {
                lineRefs.get(previousLine)?.points.push(pointRef);
                pointRef.lines.push(previousLine);
              }
              pointRefs.set(point, pointRef);
              previousLine = line;
            }
          }

          parent.add(groupRef);

          return {};
        }),
        panPoint: ({ pointRefs, lineRefs }, { point, x, y }) => {
          const pointRef = pointRefs.get(point);

          if (pointRef) {
            pointRef.ref.send({
              type: "SET_POSITION",
              position: new Vector2(x, y),
            });

            for (const line of pointRef.lines) {
              const lineRef = lineRefs.get(line);
              if (lineRef) {
                if (lineRef.points[0] === pointRef) {
                  lineRef.ref.send({
                    type: "PAN_START",
                    x,
                    y,
                  });
                }
                if (lineRef.points[1] === pointRef) {
                  lineRef.ref.send({
                    type: "PAN_END",
                    x,
                    y,
                  });
                }
              }
            }
          }
        },
        scrubBezier: ({ lineRefs }, { t }) => {
          lineRefs.forEach(({ ref }) => {
            ref.send({
              type: "SCRUB_BEZIER",
              t,
            });
          });
        },
      },
    }
  );
