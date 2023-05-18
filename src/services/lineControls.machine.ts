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
import { Vector3 } from "three";

type LineControlsMachineContext = {
  currentIntersection?: PointIntersection;
  panStartRef: Vector3;
  panRef: Vector3;
  panDeltaRef: Vector3;
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
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MBhA9ugLgE47KwB0qEyYAxABIDyAagKIBKA2gAwC6ioABxyxU+VHn4gAHogBMANgCcZLgEYArPPUBmNQBZ5ADi7qANCACeiVQHYbZGwvWrFim3pvy7egL4-zaJi4BMSkZAAWOABuYIQYUDQQeGAU6FE4ANYpgdh4RCTkkTFx6FAIGOkAxgCGYnjcPA2SQiJ16JIyCArKapo6+kYm5lYIhnoONtrahmOy6oZK8tp+ARi5IQUR0bHxNADKACoAgmwHAPoACkcAck1IIC2i4u33nfKyqg6KSuqysoauQw2MyWazGMh-LQGLTyDSqVTLfwgHLBfJhATVdDoXZJTCpdJZMgovKhcgYrHxcppHA1NoNO6CYRPCSvRDvZR6bTA7SuJaKMbyYbWbSyBxOHmqPSKPQKWSI1ZBEmbcnY0o0K63XjNJltDqIYyixQfaVab5Gv5C0afKWuSZ2aVGmZ+JHoHAQOCSYkbUja1rPPUIAC0gtBQfkK2Ra1RpIoVDAvuZL1AnRlltUsLIOnknJsinhskmTqRXrRhW2JSgCd1rIQMs+6i4jZtenUii4shbaYMDi42lUXFmhk0NjGEZLMZV8Sr-prdi4ENUQJmMt0alkacMopbfa4Xkl2gbvmdQA */
      id: "lineControls",
      tsTypes: {} as import("./lineControls.machine.typegen").Typegen0,
      predictableActionArguments: true,
      schema: {
        context: {} as LineControlsMachineContext,
        events: {} as LineControlsMachineEvent,
      },
      context: {
        panStartRef: new Vector3(),
        panRef: new Vector3(),
        panDeltaRef: new Vector3(),
      },
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
        startPan: ({ panStartRef }, { x, y }) => {
          panStartRef.set(x, y, 0);
        },
        pan: (
          { panStartRef, panRef, panDeltaRef, currentIntersection },
          { x, y }
        ) => {
          // TODO: remove or re-locate panRef, panDeltaRef, and panStartRef
          panRef.set(x, y, 0);
          panDeltaRef.copy(panRef).sub(panStartRef);
          panStartRef.copy(panRef);

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
