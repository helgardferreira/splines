import { assign, createMachine, interpret } from "xstate";
import {
  fromEvent,
  switchMap,
  from,
  of,
  Observable,
  map,
  EMPTY,
  takeWhile,
  mergeWith,
  startWith,
} from "rxjs";

import { BasicIntersection, Experience } from "../types";
import { mapRaycastIntersects } from "../lib/rxjs";

type LineControlsMachineContext = {
  currentIntersection?: BasicIntersection;
};

type HoverEvent = { type: "HOVER"; intersection: BasicIntersection };
type StartPanEvent = { type: "START_PAN" };
type PanEvent = { type: "PAN" };

type LineControlsMachineEvent = HoverEvent | StartPanEvent | PanEvent;

export const addLineControls = (experience: Experience) => {
  const machine = createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MBhA9ugLgE47KwB0qEyYAxABIDyAagKIBKA2gAwC6ioABxyxU+VHn4gAHogBMANgCcZLgEYArPNUB2WQA51XLvIDMJgDQgAnoh3ayu+ZtUnFevbMWmAvt8tpMXAJiUjIACxwANzBCDCgaCDwwCnRInABrZIDsPCIScgjo2PQoBAw0gGMAQzE8bh56ySERWvRJGQQFZTVnXQMjUwtrRD0AFgdtE1GTUzcPLxNffwwc4PzwqJi4mgBlABUAQTY9gH0ABQOAOUakEGbRcTbbjvlZVQcvPXk+w2MhmwQqj0XDIsgUzkUClkZlGSxA2SCeVCAiq6HQ20SmBSaUyZARuRC5BRaLiZVSOGqrXqN0EwgeEmeiFeymm2lGkPUim0XJMqksAJcsgc4O+XlUo3U2iccPxa2RqPRJRoF2uvCadNa7RGXCFkKB6nUo2m7J0-JG73Uvj8IHQOAgcEksqR8Fu901jIQAFp5GavfIZStEYSKFQwOqWo8tQhRrJfaotGR1DMJbpFK5gbIA4ECetClsSuH6U9QB0Y+92YpK2D+n9-rZRvIHFxedC9HNPP7rU7g8TFVBC+6S4htNoQW89GyDFK3km4x4yBKW64JaoObCrUA */
      id: "lineControls",
      tsTypes: {} as import("./lineControls.machine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        context: {} as LineControlsMachineContext,
        events: {} as LineControlsMachineEvent,
      },
      context: {},
      initial: "idle",
      states: {
        idle: {
          on: {
            HOVER: {
              target: "hovering",
              actions: "hover",
            },
          },

          invoke: {
            src: "waitForHover$",
          },
        },

        hovering: {
          invoke: {
            src: "hover$",
            onDone: {
              target: "idle",
              actions: "exitHover",
            },
          },

          on: {
            START_PAN: {
              target: "panning",
              actions: "startPan",
            },
          },

          entry: "enterHover",
        },

        panning: {
          invoke: {
            src: "pan$",
            onDone: "hovering",
          },

          on: {
            PAN: {
              target: "panning",
              internal: true,
              actions: "pan",
            },
          },
        },
      },
    },
    {
      actions: {
        hover: assign((_, { intersection }) => ({
          currentIntersection: intersection,
        })),
        enterHover: ({ currentIntersection }) => {
          if (currentIntersection) {
            currentIntersection.object.material.color.set(0xff0000);
          }
          document.body.style.cursor = "grab";
        },
        exitHover: ({ currentIntersection }) => {
          if (currentIntersection) {
            currentIntersection.object.material.color.set(0xffffff);
          }
          document.body.style.cursor = "default";
        },
        startPan: () => {},
        pan: () => {},
      },
      services: {
        waitForHover$: (): Observable<HoverEvent> =>
          fromEvent<PointerEvent>(window, "pointermove").pipe(
            mapRaycastIntersects(experience),
            switchMap((intersects) => from(intersects)),
            map(
              (intersection) =>
                ({
                  type: "HOVER",
                  intersection,
                } as HoverEvent)
            )
          ),
        hover$: ({ currentIntersection }): Observable<StartPanEvent> =>
          fromEvent<PointerEvent>(window, "pointermove").pipe(
            mapRaycastIntersects(experience),
            map(
              (intersects) =>
                new IsIntersecting(
                  intersects.some(
                    (intersection) =>
                      intersection.object.name ===
                      currentIntersection?.object.name
                  )
                )
            ),
            mergeWith(
              fromEvent<PointerEvent>(window, "pointerdown").pipe(
                startWith(new IsPointerDown(false)),
                map(
                  (event) =>
                    new IsPointerDown(
                      (event as PointerEvent).type === "pointerdown"
                    )
                )
              )
            ),
            takeWhile(
              (data) => !(data instanceof IsIntersecting && !data.value)
            ),
            switchMap((data) =>
              data instanceof IsPointerDown && data.value
                ? of({
                    type: "START_PAN",
                  } as StartPanEvent)
                : EMPTY
            )
          ),
        pan$: (): Observable<PanEvent> => {
          return EMPTY;
        },
      },
    }
  );

  return interpret(machine).start();
};

class IsIntersecting {
  constructor(public value: boolean) {}
}

class IsPointerDown {
  constructor(public value: boolean) {}
}
