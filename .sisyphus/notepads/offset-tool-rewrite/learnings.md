# Learnings — Offset Tool Rewrite

## Architectural Patterns

(Subagents will append discoveries here)

## Task 1: Clean Foundation

### Deletions Completed
- `src/operations/ClipperOffsetProcessor.js` ✓
- `src/operations/offset/` (8 stage files) ✓
- `tests/offset/` (26 test files) ✓
- All stale imports cleaned from active code ✓

### Key Findings
1. **Old Stage Architecture**: Fragmented design across normalization, trimming, fallback, metadata, and self-intersection stages
2. **Factory Dependencies**: Used OffsetStageDepsFactory for DI - complex interdependencies
3. **No Active Usage**: ClipperOffsetProcessor was isolated with no active code depending on it
4. **Import Cleanup**: CustomOffsetProcessor and OffsetTool had deep imports from deleted stages

### Files Safely Preserved (For Later Tasks)
- `src/editor/tools/OffsetTool.js` — Will adapt in Task 3
- `src/operations/CustomOffsetProcessor.js` — Will delete in later task (need to read first for API reference)
- `src/operations/PaperBooleanProcessor.js` — Required for trimming logic
- `src/utils/arcApproximation.js` — Required for arc fitting
- `src/utils/offsetSeries.js` — Required for multi-step preview

### Code Pattern Insights
The old implementation had these concerns scattered across 8 files:
- Primitive offset computation → OffsetPrimitiveKernel
- Contour normalization → OffsetNormalizationStage  
- Arc angle normalization → OffsetContourStages
- Trimming acceptance → OffsetTrimAcceptanceStage
- Fallback strategies → OffsetFallbackStage
- Metadata tracking → OffsetContourMetadataStage
- Self-intersection detection → OffsetSelfIntersectionStage

**Simplification Strategy**: Consolidate into unified PaperOffsetProcessor with inline logic for new design.

### Clean State Verified
- `grep` confirms zero stale imports in src/
- All deletions confirmed via file system checks
- Evidence files saved to `.sisyphus/evidence/`

## Task 2: OffsetCurveEvaluator

### Implementation Notes
- Added `src/operations/OffsetCurveEvaluator.js` as pure math kernel.
- Implemented exported functions:
  - `normalize(vec)`
  - `rotate90CCW(vec)`
  - `tangentAtArc(angle, center, sweepFlag)`
  - `offsetLine(segment, distance)`
  - `offsetArc(segment, distance)`
  - `offsetSegment(segment, distance)`
- Arc center parsing supports both shapes for compatibility:
  - `{ arc: { center: { x, y } } }`
  - `{ arc: { centerX, centerY } }`

### Geometry Rules Captured
- Line offset follows OCCT-style formula with normal from tangent:
  - `T = normalize(end - start)`
  - `N = rotate90CCW(T) = (-T.y, T.x)`
  - `P' = P + d * N`
- Arc offset uses concentric radius update:
  - `newRadius = radius + distance * (sweepFlag === 1 ? 1 : -1)`
- Arc center + angles remain unchanged; start/end are recalculated from angles + new radius.

### QA Evidence
- `.sisyphus/evidence/task-2-line-offset-positive.txt`
- `.sisyphus/evidence/task-2-line-offset-negative.txt`
- `.sisyphus/evidence/task-2-arc-offset-ccw-positive.txt`
- `.sisyphus/evidence/task-2-arc-offset-cw-positive.txt`
- `.sisyphus/evidence/task-2-immutability.txt`

### Important Observation
- For a vertical line `(0,0) -> (0,10)`, CCW normal is `(-1,0)`. With distance `-3`, result is `(+3,0) -> (+3,10)` (right side). This is consistent with the implemented formula `P' = P + d*N`.

## Critical Fix After Task 1

### Stale Imports in CustomOffsetProcessor.js
**Issue**: CustomOffsetProcessor.js still imported deleted OffsetStageDepsFactory functions after Task 1 deletion:
- Lines 12-17: Import block referencing deleted module
- Lines 893-908: calculateOffsetFromPathData used createSelfIntersectionStageDeps
- Lines 951-1002: calculateOffsetContoursFromPathData used all 4 factory functions

**Fix Applied**:
1. Removed stale import block completely
2. Removed self-intersection handling from calculateOffsetFromPathData (dependencies deleted)
3. Deprecated calculateOffsetContoursFromPathData - now returns empty array with warning
4. **Build verified clean** - `npm run build` succeeds with no errors

**Commit**: `d7e9b92 fix(offset): remove stale OffsetStageDepsFactory imports from CustomOffsetProcessor`

This file (CustomOffsetProcessor) is marked for deletion in later task - serves as transition point between old and new offset implementations.

## Task 3: OffsetCapper

### Implementation Summary
- Added `src/operations/OffsetCapper.js` with 4 exported functions
- Functions: `capFlat()`, `capRound()`, `capOpenContour()`, `pointsEqual()` (helper)

### Key Design Decisions

1. **Capping Strategy**: 
   - Only processes one-side offset (positive or negative distance)
   - Full capping workflow happens in ContourBuilder (which has access to both sides)
   - Here we add geometric caps at endpoints to close the loop

2. **Flat Cap**: 
   - Simple line segment between endpoints
   - Format: `{type: "line", start: p1, end: p2}`

3. **Round Cap**:
   - Arc centered at endpoint with radius = |offsetDistance|
   - Sweep direction determined by offset sign (positive = CCW, negative = CW)
   - Arc angles computed via Math.atan2 and +/-π adjustments
   - Format: `{type: "arc", start: p1, end: p2, arc: {center, radius, startAngle, endAngle, sweepFlag}}`

4. **Closed Contour Detection**:
   - Uses `pointsEqual()` helper with EPSILON = 1e-9 tolerance
   - If last segment end ≈ first segment start: already closed, return unchanged
   - Immutable: always returns new array

### QA Evidence (.sisyphus/evidence/task-3-flat-cap.txt)
✓ Scenario 1: Flat cap on open contour — 3 segments created, structure correct
✓ Scenario 2: Round cap on open contour — arcs with radius=5, sweepFlag set properly
✓ Scenario 3: Closed contour not capped — 4 segments returned unchanged

### Build Status
- `npm run build` passes ✓
- No new dependencies
- Module standalone and testable

### Integration Notes
- Depends on: OffsetCurveEvaluator segment format (Task 2) ✓
- Blocks: OffsetContourBuilder (Task 5)
- Ready for ContourBuilder integration

