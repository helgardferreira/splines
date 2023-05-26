import { Group, LineBasicMaterial, Object3D, Vector2 } from "three";
import { InterpreterFrom, assign, createMachine, spawn } from "xstate";
import { Line } from "../core/Line";
import { PointActor, createPointMachine } from "./point.machine";
import { LineActor, createLineMachine } from "./line.machine";
import { Point } from "../core/Point";
import { lerp } from "../math";

const lineMaterial = new LineBasicMaterial({
  color: 0xffffff,
});

type LineRef = {
  ref: LineActor;
  points: PointRef[];
};

type PointRef = {
  ref: PointActor;
  parentLine?: LineRef;
  childLines: LineRef[];
};

type LinesMachineContext = {
  groupRef: Group;
  lineRefs: Map<Line, LineRef>;
  bezierLineRefs: Map<Line, LineRef>;
  pointRefs: Map<Point, PointRef>;
  bezierPointRefs: Map<Point, PointRef>;
  t: number;
};

type PanPointEvent = { type: "PAN_POINT"; x: number; y: number; point: Point };
type ScrubBeziersEvent = { type: "SCRUB_BEZIERS"; t: number };
type LinesMachineEvent = PanPointEvent | ScrubBeziersEvent;

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
        bezierLineRefs: new Map(),
        pointRefs: new Map(),
        bezierPointRefs: new Map(),
        t: 0.5,
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
            SCRUB_BEZIERS: {
              target: "idle",
              internal: true,
              actions: "scrubBeziers",
            },
          },
        },
      },
    },
    {
      actions: {
        createLines: assign(
          ({
            groupRef,
            pointRefs,
            lineRefs,
            bezierPointRefs,
            bezierLineRefs,
            t,
          }) => {
            const pointsLength = points.length;

            if (pointsLength < 2) return {};

            let previousLine: Line | undefined;
            for (let pIdx = 0; pIdx < pointsLength; pIdx += 1) {
              let line: Line | undefined;
              if (pIdx + 1 < pointsLength) {
                const p0 = points[pIdx];
                const p1 = points[pIdx + 1];

                line = Line.create({
                  parent: groupRef,
                  material: lineMaterial,
                });
                const lineActor = spawn(
                  createLineMachine({
                    line,
                    points: [p0, p1],
                    // Might want to use something else as parent
                    parent: groupRef,
                    zIndex,
                  }),
                  {
                    sync: true,
                  }
                );
                line.setMachine(lineActor);

                lineRefs.set(line, {
                  points: [],
                  ref: lineActor,
                });
              }

              const position = points[pIdx];

              // TODO: change for tree data structure
              if (line || previousLine) {
                const point = Point.create({
                  parent: groupRef,
                });
                const pointActor = spawn(
                  createPointMachine({
                    position,
                    zIndex,
                    point,
                  }),
                  { sync: true }
                );
                point.setMachine(pointActor);
                const pointRef = {
                  childLines: [] as LineRef[],
                  ref: pointActor,
                };
                if (line) {
                  const lineRef = lineRefs.get(line);
                  if (lineRef) {
                    lineRef.points.push(pointRef);
                    pointRef.childLines.push(lineRef);
                  }
                }
                if (previousLine && previousLine !== line) {
                  const lineRef = lineRefs.get(previousLine);
                  if (lineRef) {
                    lineRef.points.push(pointRef);
                    pointRef.childLines.push(lineRef);
                  }
                }
                pointRefs.set(point, pointRef);
                previousLine = line;
              }
            }

            const createRecursiveBezier = (lineRefs: Iterable<LineRef>) => {
              let previousBezierRef: PointRef | undefined;
              let previousBezierPosition: Vector2 | undefined;

              const nestedLineRefs: LineRef[] = [];

              for (const lineRef of lineRefs) {
                const lineContext = lineRef.ref.getSnapshot()?.context;
                if (lineContext) {
                  const { p0, p1 } = lineContext;

                  const bezierPoint = Point.create({
                    parent: groupRef,
                  });
                  const bezierPosition = lerp(p0, p1, t);
                  const bezierPointActor = spawn(
                    createPointMachine({
                      position: bezierPosition,
                      zIndex: 10,
                      t,
                      point: bezierPoint,
                    }),
                    { sync: true }
                  );
                  bezierPoint.setMachine(bezierPointActor);
                  const bezierPointRef = {
                    ref: bezierPointActor,
                    parentLine: lineRef,
                    childLines: [] as LineRef[],
                  };
                  bezierPointRefs.set(bezierPoint, bezierPointRef);

                  if (previousBezierRef && previousBezierPosition) {
                    const line = Line.create({
                      parent: groupRef,
                      material: lineMaterial,
                    });
                    const lineActor = spawn(
                      createLineMachine({
                        line,
                        points: [previousBezierPosition, bezierPosition],
                        // Might want to use something else as parent
                        parent: groupRef,
                        zIndex,
                      }),
                      {
                        sync: true,
                      }
                    );
                    line.setMachine(lineActor);

                    const bezierLineRef = {
                      points: [previousBezierRef, bezierPointRef],
                      ref: lineActor,
                    };
                    bezierLineRefs.set(line, bezierLineRef);
                    nestedLineRefs.push(bezierLineRef);

                    bezierPointRef.childLines.push(bezierLineRef);
                    previousBezierRef.childLines.push(bezierLineRef);
                  }

                  previousBezierRef = bezierPointRef;
                  previousBezierPosition = bezierPosition;
                }
              }

              if (nestedLineRefs.length > 0)
                createRecursiveBezier(nestedLineRefs);
            };

            createRecursiveBezier(lineRefs.values());

            parent.add(groupRef);

            return {};
          }
        ),
        panPoint: ({ pointRefs, bezierPointRefs, t }, { point, x, y }) => {
          const pointRef = pointRefs.get(point);

          if (pointRef) {
            pointRef.ref.send({
              type: "SET_POSITION",
              position: new Vector2(x, y),
            });

            for (const lineRef of pointRef.childLines) {
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

              const walkBezierTree = (lineRef: LineRef) => {
                for (const [bezierPoint, bezierChildRef] of bezierPointRefs) {
                  if (bezierChildRef.parentLine === lineRef) {
                    const lineContext = lineRef.ref.getSnapshot()?.context;

                    if (lineContext) {
                      const { p0, p1 } = lineContext;
                      const position = lerp(p0, p1, t);

                      bezierChildRef.ref.send({
                        type: "SET_POSITION",
                        position,
                      });

                      for (const childLine of bezierChildRef.childLines) {
                        bezierChildRef.ref;

                        if (childLine.points[0] === bezierChildRef) {
                          childLine.ref.send({
                            type: "PAN_START",
                            x: bezierPoint.position.x,
                            y: bezierPoint.position.y,
                          });
                          walkBezierTree(childLine);
                        }
                        if (childLine.points[1] === bezierChildRef) {
                          childLine.ref.send({
                            type: "PAN_END",
                            x: bezierPoint.position.x,
                            y: bezierPoint.position.y,
                          });
                          walkBezierTree(childLine);
                        }
                      }
                    }
                  }
                }
              };

              walkBezierTree(lineRef);
            }
          }
        },
        scrubBeziers: assign(({ bezierPointRefs }, { t }) => {
          for (const [_, bezierChildRef] of bezierPointRefs) {
            const bezierParentLine = bezierChildRef.parentLine;
            if (bezierParentLine) {
              const [p0, p1] = bezierParentLine.points.map(
                (pointRef) =>
                  pointRef.ref.getSnapshot()?.context?.point?.position
              );
              if (p0 && p1) {
                const position = lerp(
                  new Vector2(p0.x, p0.y),
                  new Vector2(p1.x, p1.y),
                  t
                );
                bezierChildRef.ref.send({
                  type: "SET_POSITION",
                  position,
                  t,
                });

                for (const lineRef of bezierChildRef.childLines) {
                  if (lineRef.points[0] === bezierChildRef) {
                    lineRef.ref.send({
                      type: "PAN_START",
                      x: position.x,
                      y: position.y,
                    });
                  }
                  if (lineRef.points[1] === bezierChildRef) {
                    lineRef.ref.send({
                      type: "PAN_END",
                      x: position.x,
                      y: position.y,
                    });
                  }
                }
              }
            }
          }

          return {
            t,
          };
        }),
      },
    }
  );

export type LinesService = InterpreterFrom<
  ReturnType<typeof createLinesMachine>
>;
