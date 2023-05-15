import { InterpreterFrom, StateValueFrom, assign, createMachine } from "xstate";
import { Spring, type PartialSpringConfig } from "wobble";
import { Observable, map } from "rxjs";

import { fromSpring } from "../lib/rxjs/fromSpring";

export type SpringMachineContext = {
  config: PartialSpringConfig;
  springRef: Spring;
  currentValue: number;
  currentVelocity: number;
};

type PlayEvent = { type: "PLAY"; config?: PartialSpringConfig };
type PauseEvent = { type: "PAUSE" };
type RewindEvent = { type: "REWIND"; config?: PartialSpringConfig };
type StopEvent = { type: "STOP" };
type UpdateEvent = { type: "UPDATE"; value: number; velocity: number };
type UpdateConfigEvent = {
  type: "UPDATE_CONFIG";
  config: PartialSpringConfig;
};

export type SpringMachineEvent =
  | RewindEvent
  | PlayEvent
  | PauseEvent
  | StopEvent
  | UpdateEvent
  | UpdateConfigEvent;

export const createSpringMachine = (config: PartialSpringConfig) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5SwA4CcCWA7KBZAhgMYAW2YAxAKoAKAIgIIAqAogPoDCA8gHIBiAkgHEA2gAYAuolAoA9rAwAXDDKxSQAD0QBmUQFYAdADYAHAHYALMYBMxrVuOGrWgDQgAnogCMVgL4-XqJg4BCRk+hgQADYUAErMAOr83LRikkggsvJKKmqaCJ66BgCcJSWGnsa6OlamLu6INcb65qKOun4B6Nh4RKRYYOFRFNQAMvQAmqlqmYrKqul5BcWlReWV1bWuHghaFvpaukW77f4ggd0hfQMokfhu3eQQKgPYAG4yANYD58G9YTd3boIN4yQj4bJYVJTdIzCG5LyFfQrVYVKqiGp1bbmUyifbeE6dII9UL9fQA+44Kh0JjMaHSOSzHILbSHfSmYxFPQOdbozb1fJHJFWVZmXSicUSrQdM5dX4k663ClQcgAZUYnGodIyDLhzIQVk8uN05hMpk8qI2mK81maVXx0p+xKuZMVD2o9EoKtpEmmOrm8IQugK+laVnMKJ5NS22lMpiMRRqolsdhTuwdsqd-3wAFdYJByKMJlrYf69UGDKHw2s0VH+TZPGytEVdMnU3ZTH5TlgZBA4GpHZcyL6sqXQHkALSeaMIIrmJF2qwEmVEwekiLRYeM+ZjxDY6cGwxs4WmpcDv6k8ndTe6nc7GohgqOc2RvnbYVz4zWYz205n+VknM8wga9Rw0RBDHsNkKjNXRDEMWMw0MactE8LQQ3DbEik8OCcI7TsgA */
      id: "springMachine",

      tsTypes: {} as import("./spring.machine.typegen").Typegen0,

      schema: {
        context: {} as SpringMachineContext,
        events: {} as SpringMachineEvent,
      },

      context: {
        config,
        springRef: new Spring(config),
        currentValue: config.fromValue ?? 0,
        currentVelocity: 0,
      },

      predictableActionArguments: true,
      initial: "idle",

      states: {
        idle: {
          on: {
            REWIND: {
              target: "playing",
              actions: "rewind",
            },

            PLAY: {
              target: "playing",
              actions: "play",
            },
          },
        },

        playing: {
          on: {
            UPDATE: {
              target: "playing",
              internal: true,
              actions: "update",
            },

            STOP: {
              target: "idle",
              actions: "stop",
            },

            PAUSE: {
              target: "paused",
              actions: "pause",
            },
          },

          invoke: {
            src: "update$",

            onDone: {
              target: "idle",
              actions: "stop",
            },
          },
        },

        paused: {
          on: {
            PLAY: {
              target: "playing",
              actions: "resume",
            },
          },
        },
      },

      on: {
        UPDATE_CONFIG: {
          actions: "updateConfig",
        },
      },
    },
    {
      actions: {
        play: assign(({ config, springRef }, { config: newConfig }) => {
          const fromValue = newConfig?.fromValue ?? config.fromValue ?? 0;
          const toValue = newConfig?.toValue ?? config.toValue ?? 1;
          springRef.updateConfig({
            ...config,
            ...newConfig,
            fromValue,
            toValue,
          });
          springRef.start();

          return {
            currentVelocity: 0,
            currentValue: fromValue,
          };
        }),
        resume: (
          { springRef, config, currentValue, currentVelocity },
          { config: newConfig }
        ) => {
          springRef.updateConfig({
            ...config,
            fromValue: currentValue,
            toValue: config.toValue,
            initialVelocity: currentVelocity,
            ...newConfig,
          });
          springRef.start();
        },
        rewind: (
          { config, springRef, currentValue },
          { config: newConfig }
        ) => {
          springRef.updateConfig({
            ...config,
            ...newConfig,
            fromValue: currentValue,
            toValue: config.fromValue,
          });
          springRef.start();

          return {};
        },
        pause: ({ springRef }) => {
          springRef.stop();
        },
        update: assign((_, { value, velocity }) => ({
          currentValue: value,
          currentVelocity: velocity,
        })),
        updateConfig: assign(
          ({ config: currentConfig, springRef, currentValue }, { config }) => {
            const newConfig = {
              ...currentConfig,
              ...config,
            };

            springRef.updateConfig(newConfig);

            return {
              config: newConfig,
              currentValue: config.fromValue ?? currentValue,
            };
          }
        ),
        stop: ({ springRef }) => {
          springRef.stop();
          springRef.removeAllListeners();
        },
      },
      services: {
        update$: ({ springRef }): Observable<UpdateEvent> =>
          fromSpring(springRef).pipe(
            map(
              ({ currentValue, currentVelocity }) =>
                ({
                  type: "UPDATE",
                  value: currentValue,
                  velocity: currentVelocity,
                } as UpdateEvent)
            )
          ),
      },
    }
  );

export type SpringService = InterpreterFrom<
  ReturnType<typeof createSpringMachine>
>;
export type SpringMachineState = StateValueFrom<
  ReturnType<typeof createSpringMachine>
>;
