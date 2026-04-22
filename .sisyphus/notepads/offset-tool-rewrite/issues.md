# Issues — Offset Tool Rewrite

## Problems Encountered

(Subagents will append issues here)

## Task 6: OffsetEngine

- Direct Node REPL execution failed because Paper.js requires real canvas 2D context (paper-full + HTMLCanvasElement.getContext).
- Mitigation: used Vitest happy-dom harness with module mock for PaperBooleanProcessor.resolveSelfIntersections to validate orchestration/API behavior and scenario outputs.
- Parser call initially failed due to lost method context (unbound parseSVGPathSegments). Fixed by invoking through dxfExporter instance.
- Open-curve output from current OffsetCapper is degenerate; engine now stitches contour continuity and enforces closure to satisfy tool-level contract.
