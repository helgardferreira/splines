
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addPosition": "ADD_POSITION";
"createPoint": "ADD_POSITION" | "SET_POSITION" | "xstate.init";
"enterHover": "ENTER_HOVER";
"exitHover": "EXIT_HOVER";
"setPosition": "SET_POSITION";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          
        };
        matchesStates: "HOVERING" | "idle";
        tags: never;
      }
  