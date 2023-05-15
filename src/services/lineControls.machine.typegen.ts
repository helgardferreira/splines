
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "done.invoke.lineControls.hovering:invocation[0]": { type: "done.invoke.lineControls.hovering:invocation[0]"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"done.invoke.lineControls.panning:invocation[0]": { type: "done.invoke.lineControls.panning:invocation[0]"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "hover$": "done.invoke.lineControls.hovering:invocation[0]";
"pan$": "done.invoke.lineControls.panning:invocation[0]";
"waitForHover$": "done.invoke.lineControls.idle:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "enterHover": "HOVER" | "done.invoke.lineControls.panning:invocation[0]";
"exitHover": "done.invoke.lineControls.hovering:invocation[0]";
"hover": "HOVER";
"pan": "PAN";
"startPan": "START_PAN";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "hover$": "HOVER" | "done.invoke.lineControls.panning:invocation[0]";
"pan$": "PAN" | "START_PAN";
"waitForHover$": "done.invoke.lineControls.hovering:invocation[0]" | "xstate.init";
        };
        matchesStates: "hovering" | "idle" | "panning";
        tags: never;
      }
  