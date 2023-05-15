
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.springMachine.playing:invocation[0]": { type: "done.invoke.springMachine.playing:invocation[0]"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "update$": "done.invoke.springMachine.playing:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "pause": "PAUSE";
"play": "PLAY";
"resume": "PLAY";
"rewind": "REWIND";
"stop": "STOP" | "done.invoke.springMachine.playing:invocation[0]";
"update": "UPDATE";
"updateConfig": "UPDATE_CONFIG";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "update$": "PLAY" | "REWIND" | "UPDATE";
        };
        matchesStates: "idle" | "paused" | "playing";
        tags: never;
      }
  