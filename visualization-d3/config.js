var require = {
    "baseUrl":  ".",
    "config":  {
        "scalejs.statechart-scion":  {
            "logStatesEnteredAndExited":  true
        }
    },
    "paths":  {
        "bindings":  "Scripts/scalejs.mvvm.bindings",
        "css":  "Scripts/css",
        "css-builder":  "Scripts/css-builder",
        "d3":  "Scripts/d3.v3",
        "d3.colorbrewer":  "Scripts/d3.colorbrewer",
        "hammer":  "Scripts/hammer",
        "jasmine":  "Scripts/jasmine",
        "jasmine-html":  "Scripts/jasmine-html",
        "knockout":  "Scripts/knockout-3.0.0.debug",
        "knockout.mapping":  "Scripts/knockout.mapping-latest.debug",
        "linqjs":  "Scripts/linq.min",
        "normalize":  "Scripts/normalize",
        "sandbox":  "Scripts/scalejs.sandbox",
        "scalejs":  "Scripts/scalejs-0.3.3",
        "scalejs.canvas":  "Scripts/scalejs.canvas-0.1.0.74",
        "scalejs.functional":  "Scripts/scalejs.functional-0.2.9.8",
        "scalejs.linq-linqjs":  "Scripts/scalejs.linq-linqjs-3.0.3.1",
        "scalejs.mvvm":  "Scripts/scalejs.mvvm-0.3.4.4",
        "scalejs.statechart-scion":  "Scripts/scalejs.statechart-scion-0.3.0.0",
        "scalejs.visualization-d3":  "Scripts/scalejs.visualization-d3-0.1.5.774",
        "scion":  "Scripts/scion",
        "styles":  "Scripts/scalejs.styles",
        "text":  "Scripts/text",
        "views":  "Scripts/scalejs.mvvm.views"
    },
    "scalejs":  {
        "extensions":  [
            "scalejs.canvas",
            "scalejs.functional",
            "scalejs.linq-linqjs",
            "scalejs.mvvm",
            "scalejs.statechart-scion",
            "scalejs.visualization-d3"
        ]
    },
    "shim":  {
        "jasmine":  {
            "exports":  "jasmine"
        },
        "jasmine-html":  {
            "deps":  [
                "jasmine"
            ]
        },
        "scalejs.statechart-scion":  {
            "deps":  [
                "scalejs.linq-linqjs",
                "scalejs.functional"
            ]
        }
    }
};
