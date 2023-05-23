import { Group, LineBasicMaterial, Object3D, Vector2 } from "three";
import { assign, createMachine, spawn } from "xstate";
import { Line } from "../core/Line";
import { PointActor, createPointMachine } from "./point.machine";
import { LineActor, createLineMachine } from "./line.machine";
import { Point } from "../core/Point";
import { lerp } from "../math";

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
type LinesMachineEvent = PanPointEvent;

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

            let previousBezierRef: PointRef | undefined;
            let previousBezierPosition: Vector2 | undefined;
            for (const [_, lineRef] of lineRefs) {
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

                  bezierPointRef.childLines.push(bezierLineRef);
                  previousBezierRef.childLines.push(bezierLineRef);
                }

                previousBezierRef = bezierPointRef;
                previousBezierPosition = bezierPosition;
              }
            }

            parent.add(groupRef);

            return {};
          }
        ),
        panPoint: (
          { lineRefs, pointRefs, bezierPointRefs, bezierLineRefs, t },
          { point, x, y }
        ) => {
          const pointRef = pointRefs.get(point);
          const bezierPointRef = bezierPointRefs.get(point);

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
                      console.log(childLine.points);

                      if (childLine.points[0] === bezierChildRef) {
                        console.log("pan start child line");
                        childLine.ref.send({
                          type: "PAN_START",
                          x: bezierPoint.position.x,
                          y: bezierPoint.position.y,
                        });
                      }
                      if (childLine.points[1] === bezierChildRef) {
                        console.log("pan end child line");
                        childLine.ref.send({
                          type: "PAN_END",
                          x: bezierPoint.position.x,
                          y: bezierPoint.position.y,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        },
      },
    }
  );