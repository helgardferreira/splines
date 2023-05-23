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
  takeUntil,
  shareReplay,
} from "rxjs";

import { PointIntersection, Experience } from "../types";
import { mapRaycastIntersects } from "../lib/rxjs";

type LineControlsMachineContext = {
  currentIntersection?: PointIntersection;
};

type HoverEvent = { type: "HOVER"; intersection: PointIntersection };
type StartPanEvent = { type: "START_PAN"; x: number; y: number };
type PanEvent = { type: "PAN"; x: number; y: number };

type LineControlsMachineEvent = HoverEvent | StartPanEvent | PanEvent;

export const addLineControls = (experience: Experience) => {
  const pointerMove$ = fromEvent<PointerEvent>(window, "pointermove").pipe(
    shareReplay(1)
  );

  const machine = createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MBhA9ugLgE47KwB0qEyYAxABIDyAagKIBKA2gAwC6ioABxyxU+VHn4gAHogBMANgCcZLlwDsADgCMAZllaArPIOKALKYA0IAJ6ItatWUVrjR2acWy1pgwF9fVmiYuATEpGQAFjgAbmCEGFA0EHhgFOjROADWqUHYeEQk5FGx8ehQCBgZAMYAhmJ43DyNkkIi9eiSMggKyqqauvpGJuZWtggapmQGsjqmOhpKOjoGy34BILkhBeHFcQk0AMoAKgCCbEcA+gAKJwByzUggraLiHY9d8vpkDrOqXDpcGajOwaLhkUwuFbzeTqLRaCb+QIYPKhQpkAQ1dDofbJTBpDLZMibfJhcgYrEJCrpHC1dqNB6CYQvCTvRCfZSmLScvQ6eRaLgGLSKYEIAZOSEKWSKZxcDRqWSIjbIrak9GY7FlGg3e68FpM9qdRCg2RkDQLNRcRSggHaEXacHSq3TJSmYzyfzrdA4CBwSTE1GkPVtV6GhAAWnkIojiv923IlGoQeZb1AXVMshFWk+Kl5c3sRg0Bg0zhjypJaN2pSgSYNrIQ6a04ImvMU9m00zUmYhZFk-y0UoHFq48g0peC5fC5I11cez1rqcQDjB8LUgtMoLm5gMmY0JsUK35shWCwFeg9viAA */
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

          entry: "enterHover",

          on: {
            START_PAN: {
              target: "panning",
              actions: "pan",
            },
          },
        },

        panning: {
          invoke: [
            {
              src: "pan$",
              onDone: "hovering",
            },
          ],

          on: {
            PAN: {
              target: "panning",
              actions: "pan",
              internal: true,
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
          if (currentIntersection)
            currentIntersection.object.machine?.send({ type: "ENTER_HOVER" });
          document.body.style.cursor = "pointer";
        },
        exitHover: ({ currentIntersection }) => {
          if (currentIntersection)
            currentIntersection.object.machine?.send({ type: "EXIT_HOVER" });
          document.body.style.cursor = "default";
        },
        pan: ({ currentIntersection }, { x, y }) => {
          if (currentIntersection) {
            currentIntersection.object.machine?.send({
              type: "PAN",
              x,
              y,
            });
          }
        },
      },
      services: {
        waitForHover$: (): Observable<HoverEvent> =>
          pointerMove$.pipe(
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
          pointerMove$.pipe(
            mapRaycastIntersects(experience),
            map(
              (intersects) =>
                new IsIntersecting(
                  intersects.some(
                    (intersection) =>
                      intersection.object === currentIntersection?.object
                  )
                )
            ),
            mergeWith(
              fromEvent<PointerEvent>(window, "pointerdown").pipe(
                startWith(new IsPointerDown(false)),
                map((event) => new IsPointerDown(event))
              )
            ),
            takeWhile(
              (payload) =>
                !(payload instanceof IsIntersecting && !payload.value)
            ),
            switchMap((payload) =>
              payload instanceof IsPointerDown && payload.value
                ? of({
                    type: "START_PAN",
                    x: (payload.data?.clientX ?? 0) - window.innerWidth / 2,
                    y: -(payload.data?.clientY ?? 0) + window.innerHeight / 2,
                  } as StartPanEvent)
                : EMPTY
            )
          ),
        pan$: (): Observable<PanEvent> =>
          pointerMove$.pipe(
            takeUntil(fromEvent<PointerEvent>(window, "pointerup")),
            map(
              (event) =>
                ({
                  type: "PAN",
                  x: event.clientX - window.innerWidth / 2,
                  y: -event.clientY + window.innerHeight / 2,
                } as PanEvent)
            )
          ),
      },
    }
  );

  return interpret(machine).start();
};

class IsIntersecting {
  constructor(public value: boolean) {}
}

class IsPointerDown {
  value: boolean;
  data?: PointerEvent;

  constructor(payload: IsPointerDown | PointerEvent | boolean) {
    if (payload instanceof IsPointerDown || typeof payload === "boolean") {
      this.value = false;
    } else {
      this.value = true;
      this.data = payload;
    }
  }
}
