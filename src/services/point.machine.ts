import { InterpreterFrom, assign, createMachine } from "xstate";
import { Vector2, Vector3 } from "three";
import { Point } from "../core/Point";
import { LineMesh } from "../core/LineMesh";

type PointMachineContext = {
  label: string;
  meshRef: Point;
  t: number;
  siblings?: (Point | LineMesh)[];
  line?: LineMesh;
  id?: number;
};

type EnterHoverEvent = { type: "ENTER_HOVER" };
type ExitHoverEvent = { type: "EXIT_HOVER" };
type SetPositionEvent = { type: "SET_POSITION"; position: Vector2; t?: number };
type AddPositionEvent = { type: "ADD_POSITION"; delta: Vector3 };

type PointMachineEvent =
  | EnterHoverEvent
  | ExitHoverEvent
  | SetPositionEvent
  | AddPositionEvent;

type PointMachineArgs = {
  meshRef: Point;
  t?: number;
  position?: Vector2;
  zIndex?: number;
  id?: number;
  label?: string;
};

export const createPointMachine = ({
  meshRef,
  t = 1,
  position = new Vector2(),
  zIndex = 0,
  id,
  label = "point",
}: PointMachineArgs) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QAcD2BLAdgFwHTogBswBiAUQDkAVMgJQH0AJAeQDU6BtABgF1EVUsdNnSpM-EAA9EARgDMAVlwKANCACeiACwAmHbgAcCgJxyA7AoC+ltWix4W7WgEkKAcXIANZ1SZtOvBJoQiJiEtIIMgoyhibmqhqIcjoAbLhaXCk6VjYgdjgkAMpkvgAKzIU+zswU3HxIeYLCouINETIpXMpmXHIy2WqakVwG6Qp92da2GAUAggAi8-TllVTVtYENwc1hbbIKo9HG4-0JQ-3WuZioEHBBM9j3IS3hiAC0MoOyxjHGmZO5fJ4AjEJ47VqgCJaMxfBCKJRaFIpGRaA5ydEYsxTRr2XCOOiuNxg0IQqRJTLpTqmCywxRmXDGJEotEY9FYy5AA */
      id: "point",

      tsTypes: {} as import("./point.machine.typegen").Typegen0,
      predictableActionArguments: true,

      schema: {
        context: {} as PointMachineContext,
        events: {} as PointMachineEvent,
      },

      context: {
        meshRef,
        t,
        label: `${label}${id !== undefined ? `-${id}` : ""}`,
        id,
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
          },
        },
      },

      on: {
        SET_POSITION: {
          target: "#point",
          internal: true,
          actions: "setPosition",
        },

        ADD_POSITION: {
          target: "#point",
          internal: true,
          actions: "addPosition",
        },
      },

      entry: "createPoint",
    },
    {
      actions: {
        createPoint: assign(({ meshRef }) => {
          meshRef.position.set(position.x, position.y, zIndex);
          const siblings = meshRef.parent?.children as (Point | LineMesh)[];
          const line = siblings?.find((child) => child.name === "line") as
            | LineMesh
            | undefined;

          return { line, siblings };
        }),
        enterHover: ({ meshRef }) => {
          meshRef.material.color.set(0xff0000);
        },
        exitHover: ({ meshRef }) => {
          meshRef.material.color.set(0xffffff);
        },
        setPosition: assign(({ meshRef }, { position, t }) => {
          meshRef.position.set(position.x, position.y, zIndex);

          if (t !== undefined) {
            return { t };
          }

          return {};
        }),
        addPosition: ({ meshRef }, { delta }) => {
          meshRef.position.add(delta);
        },
      },
    }
  );

export type PointService = InterpreterFrom<
  ReturnType<typeof createPointMachine>
>;
