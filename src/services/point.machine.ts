import { ActorRefFrom, InterpreterFrom, assign, createMachine } from "xstate";
import { Vector2 } from "three";
import { Point } from "../core/Point";
import { sendParent } from "xstate/lib/actions";

type PointMachineContext = {
  point: Point;
  t: number;
};

type EnterHoverEvent = { type: "ENTER_HOVER" };
type ExitHoverEvent = { type: "EXIT_HOVER" };
type SetPositionEvent = { type: "SET_POSITION"; position: Vector2; t?: number };
export type PanEvent = { type: "PAN"; x: number; y: number };

type PointMachineEvent =
  | EnterHoverEvent
  | ExitHoverEvent
  | SetPositionEvent
  | PanEvent;

type PointMachineArgs = {
  point: Point;
  t?: number;
  position?: Vector2;
  zIndex?: number;
  type?: "point" | "bezier-point";
};

export const createPointMachine = ({
  point,
  t = 1,
  position = new Vector2(),
  zIndex = 0,
}: PointMachineArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QAcD2BLAdgFwMQGUBRAFQH0AFAeXwElibKA5AbQAYBdRFVWdbdVJi4gAHogCMANlYA6AKwB2VgGZxAJjkAaEAE8JrABwyALHNUaAvhe1os2GeggAbMLkKNihAEqkAEpQA1bzZOJBA0Xn5BYTEEcWU5eW09BGM1NRkDOQBOZQU5KxsMHBkAC1QANzAAJywoNwANOj9A4I5hCL4BITDY8TlxTJy8rV1EZTVJE1ZJS2tw4vtyqtrMevIAQRZ2sM6ontBYieMZVlYFA3VRlOVjBRllAzVLufnMVAg4DsXvyO6YxAAWnEyQk2UG2RmcyKdgczjAvy60V6iDuoNSjxkGkmrGMUkkBMkCkKC1hyxqdUR+wBCGUMxM0ly+XRxmMRgMCSZBSsFiAA */
      id: "point",

      tsTypes: {} as import("./point.machine.typegen").Typegen0,
      predictableActionArguments: true,

      schema: {
        context: {} as PointMachineContext,
        events: {} as PointMachineEvent,
      },

      context: {
        point,
        t,
      },

      initial: "idle",

      states: {
        idle: {
          on: {
            ENTER_HOVER: {
              target: "hovering",
              actions: ["enterHover"],
            },
          },
        },

        hovering: {
          on: {
            EXIT_HOVER: {
              target: "idle",
              actions: "exitHover",
            },

            PAN: {
              target: "hovering",
              actions: "pan",
              internal: true,
            },
          },
        },
      },

      on: {
        SET_POSITION: {
          actions: "setPosition",
        },
      },

      entry: "createPoint",
    },
    {
      actions: {
        createPoint: ({ point }) => {
          point.position.set(position.x, position.y, zIndex);
        },
        enterHover: ({ point }) => {
          point.material.color.set(0xff0000);
        },
        exitHover: ({ point }) => {
          point.material.color.set(0xffffff);
        },
        setPosition: assign(({ point }, { position, t }) => {
          point.position.set(position.x, position.y, zIndex);

          if (t !== undefined) {
            return { t };
          }

          return {};
        }),
        pan: sendParent(({ point }, { x, y }) => {
          return {
            type: "PAN_POINT",
            x,
            y,
            point,
          };
        }),
      },
    }
  );

export type PointService = InterpreterFrom<
  ReturnType<typeof createPointMachine>
>;
export type PointActor = ActorRefFrom<ReturnType<typeof createPointMachine>>;
