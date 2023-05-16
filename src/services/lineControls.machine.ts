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
import { Vector2, Vector3 } from "three";
import { LineMesh } from "../core/LineMesh";
import { Point } from "../core/Point";

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
      /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA7MBhA9ugLgE47KwB0qEyYAxABIDyAagKIBKA2gAwC6ioABxyxU+VHn4gAHogBMANgCcZLgEYArPNnqANCACecgBzyy8gOyLzXWefVHzRxV3kBfV3rSZcBYqTIAFjgAbmCEGFA0EHhgFOjBOADWsV7YeEQk5EGh4ehQCBgJAMYAhmJ43DyVkkIi5eiSMggKymqa2nqGCKqKAMxk5grq5iP2js5uHiCpPhn+2WERNADKACoAgmyrAPoACusActVIILWi4g0nTVqqA4ryDroGxsqqlta2Y04u7p4Yab5MmQBCV0OgltFMHEEskyDN0n5yCCwRECvEcKV6pVjoJhOcJFdEFplAAWXp2TpyEm3CxWGx2BzfSZ-bwIoHI8F5Gj7I68Gp4+qNRBGVT9Li9CYdZ7dEZkEnqXqqbS-ab-WaI4GgzmRACquwAIutViwcacBRchQgjDYyIpFLJVI9KVbbup3FN0DgIHBJPDAaR+XULYSEABaeTO8Mqv1zciUaiB-GXUBNEmyZ22LhypzqRRGXMO2SyMnRtVs+YhRZ5ROCkNp10Z9TqMzteTqbSMial1n+pFaiI14MpxAjLMOp3S2xGOUuZXuoA */
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
          if (currentIntersection) {
            currentIntersection.object.material.color.set(0xff0000);
          }
          document.body.style.cursor = "pointer";
        },
        exitHover: ({ currentIntersection }) => {
          if (currentIntersection) {
            currentIntersection.object.material.color.set(0xffffff);
          }
          document.body.style.cursor = "default";
        },
        startPan: ({ panStartRef }, { x, y }) => {
          panStartRef.set(x, y, 0);
        },
        pan: (
          { panStartRef, panRef, panDeltaRef, currentIntersection },
          { x, y }
        ) => {
          panRef.set(x, y, 0);
          panDeltaRef.copy(panRef).sub(panStartRef);
          panStartRef.copy(panRef);

          if (currentIntersection) {
            const line = currentIntersection.object.parent?.children.find(
              (child) => child.name === "line"
            ) as LineMesh | undefined;
            const curve = line?.curve;
            const geometry = line?.geometry;

            if (currentIntersection.object.name.startsWith("point-")) {
              const idx = Number(
                currentIntersection.object.name.replace("point-", "")
              );
              currentIntersection.object.position.add(panDeltaRef);

              if (geometry && curve) {
                if (idx === 0) {
                  curve.p0.add(new Vector2(panDeltaRef.x, panDeltaRef.y));
                } else {
                  curve.p1.add(new Vector2(panDeltaRef.x, panDeltaRef.y));
                }

                currentIntersection.object.parent?.children
                  .filter((point) => point.name === "bezier-point")
                  .forEach((point) => {
                    const { x: pX, y: pY } = curve.getPoint((point as Point).t);
                    point.position.set(pX, pY, 0);
                  });

                geometry.setFromPoints(curve.getPoints());
                geometry.getAttribute("position").needsUpdate = true;
              }
            } else {
              if (geometry && curve) {
                const {
                  vector: { x: pX, y: pY },
                  t,
                } = curve.getPointOnLine(x, y);
                currentIntersection.object.position.set(pX, pY, 0);
                currentIntersection.object.t = t;
              }
            }
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
                      intersection.object.name ===
                      currentIntersection?.object.name
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
