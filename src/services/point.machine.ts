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
      /** @xstate-layout N4IgpgJg5mDOIC5QAcD2BLAdgFwMQGUBRAFQH0AFAeXwElibKA5AbQAYBdRFVWdbdVJi4gAHogCMANlYA6AKwB2VgGZxAJjkAaEAE8JrABwyALHNUaAvhe1oseAIIARRxWp0GLDsLS9+g4WII4nJGcuIAnGbqWroSalY2GDgy6BAANmC4hIzEhABKpAASlABq+WycSCA+fAJCVYHiynLy2noIxmpqMgZy4coKcgnVSdgyxWV5NIwA4lkAGnRFpeVeVTV+9aCNYT19AzHtymqSJqySltYjduMrU7O45Paeldy+dQGIx8YyrKwKBmibS+xgUMmUBjUgMuV0wqAgcG8oyR738DUQAFpxMCguFxDJwudLokbqkMijamjtohQTjjBCZBoTqxjFJJOzJAphrZkhN8tMZhTNp8EMpziZpP1BnTjEYDM0pUMrBYgA */
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
              target: "HOVERING",
              actions: ["enterHover"],
            },
          },
        },

        HOVERING: {
          on: {
            EXIT_HOVER: {
              target: "idle",
              actions: "exitHover",
            },

            PAN: {
              target: "HOVERING",
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
