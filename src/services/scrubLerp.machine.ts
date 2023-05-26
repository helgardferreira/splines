import { assign, createMachine, spawn } from "xstate";
import { Group, LineBasicMaterial, Vector2 } from "three";

import { Experience } from "../types";
import { PointActor, createPointMachine } from "./point.machine";
import { Point } from "../core/Point";
import { LineActor, createLineMachine } from "./line.machine";
import { Line } from "../core/Line";
import { getPointOnLine } from "../math/getPointOnLine";
import { LinesService } from "./lines.machine";

export type ExperienceWithLines = Experience & { linesService: LinesService };

const lineMaterial = new LineBasicMaterial({
  color: 0xffffff,
});

type PointRef = {
  ref: PointActor;
  point: Point;
};

type LineRef = {
  ref: LineActor;
  line: Line;
};

type ScrubLerpMachineContext = {
  groupRef: Group;
  pointRef?: PointRef;
  lineRef?: LineRef;
  p0: Vector2;
  p1: Vector2;
};

type PanPointEvent = { type: "PAN_POINT"; x: number; y: number };

type ScrubLerpMachineEvent = PanPointEvent;

export const createScrubLerpMachine = ({
  scene,
  linesService,
}: ExperienceWithLines) => {
  const padding = 40;
  const x = -window.innerWidth / 2 + padding;
  const y = window.innerHeight / 2 - padding;

  return createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5SwMYCcCuAjAMmNADgHQCWEANmAMQAKAggHID6NA8gJIMAqA2gAwBdRKAIB7WCQAuJUQDthIAB6I+AGhABPFQF9d62aIhwFqTLnwEFYidLkLlCALQAWABzqtT1wHYiAVj0QU2w8QlIKMCtxKRl5JCVENyIATj8AZgBGPmSMgCZvb2dsjIA2D0QM11yU9L4q5Ozc1z4M511dIA */
      id: "scrubLerp",
      tsTypes: {} as import("./scrubLerp.machine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        context: {} as ScrubLerpMachineContext,
        events: {} as ScrubLerpMachineEvent,
      },
      context: {
        groupRef: new Group(),
        p0: new Vector2(x, y),
        p1: new Vector2(x + 150, y),
      },
      initial: "idle",
      states: {
        idle: {
          on: {
            PAN_POINT: {
              target: "idle",
              actions: "panPoint",
              internal: true,
            },
          },

          entry: "createLerpScrubber",
        },
      },
    },
    {
      actions: {
        createLerpScrubber: assign(({ groupRef, p0, p1 }) => {
          scene.add(groupRef);

          const point = Point.create({
            parent: groupRef,
          });
          const pointActor = spawn(
            createPointMachine({
              point,
              position: p0.clone().add(new Vector2(75, 0)),
            }),
            { sync: true }
          );
          point.setMachine(pointActor);
          const pointRef: PointRef = {
            point,
            ref: pointActor,
          };

          const line = Line.create({
            parent: groupRef,
            material: lineMaterial,
          });
          const lineActor = spawn(
            createLineMachine({
              line,
              points: [p0, p1],
              parent: groupRef,
            }),
            {
              sync: true,
            }
          );
          line.setMachine(lineActor);

          const lineRef = {
            ref: lineActor,
            line,
          };

          return {
            pointRef,
            lineRef,
          };
        }),
        panPoint: ({ pointRef, p0, p1 }, { x, y }) => {
          if (!pointRef) return;

          const p = new Vector2(x, y);
          const { vector, t } = getPointOnLine(p0, p1, p);

          pointRef.ref.send({ type: "SET_POSITION", position: vector });

          linesService.send({
            type: "SCRUB_BEZIERS",
            t,
          });
        },
      },
    }
  );
};
