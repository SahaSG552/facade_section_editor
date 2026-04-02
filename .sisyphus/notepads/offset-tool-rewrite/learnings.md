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

## Task 4: OffsetTrimmer

### Implementation Summary
- Added `src/operations/OffsetTrimmer.js` (404 lines) as Paper.js Boolean Wrapper
- Three exported functions: `trimSelfIntersections()`, `segmentsToPathString()`, `pathStringToSegments()`

### Core Design Decisions

1. **Thin Wrapper Pattern**: 
   - Delegates ALL boolean operations to `PaperBooleanProcessor.resolveSelfIntersections()`
   - No intersection detection logic in OffsetTrimmer itself
   - Focus: data format conversion and error handling

2. **SVG Path Serialization** (`segmentsToPathString`):
   - Converts segment array → SVG path string (d attribute)
   - Handles all segment types: line (L), arc (A), bezier (C)
   - Arc parsing supports both formats: `{arc: {center: {x,y}}}` and `{arc: {centerX, centerY}}`
   - Auto-closes path when first.start ≈ last.end (EPSILON = 0.001)

3. **SVG Path Parsing** (`pathStringToSegments`):
   - Lightweight parser for absolute SVG commands
   - Reconstructs segments from path data
   - Suitable for round-trip: segments → SVG → segments
   - Note: For complex relative commands (r, l, h, v, s, t), use ExportModule.dxfExporter.parseSVGPathSegments()

4. **Immutability & Error Handling**:
   - Always returns new array objects (never mutates input)
   - Returns empty array on error (no throws)
   - Comprehensive logging at debug/warn/error levels
   - Gracefully handles degenerate segments

### Segment Format Support (Tasks 2-3 Compatibility)

Supports both arc center formats for maximum compatibility:
```javascript
// Modern format
{type: "arc", start: {x,y}, end: {x,y}, arc: {center: {x,y}, radius, ...}}

// Legacy format  
{type: "arc", start: {x,y}, end: {x,y}, arc: {centerX, centerY, radius, ...}}
```

### QA Evidence
✓ Scenario 1: Trim self-intersecting contour → clean output
✓ Scenario 2: Pass-through non-intersecting contour → unchanged
✓ Round-trip fidelity: segments → SVG → segments preserves structure

Files:
- `.sisyphus/evidence/task-4-trim-self-intersecting.txt`
- `.sisyphus/evidence/task-4-trim-passthrough.txt`

### Build Verification
✓ `npm run build` passes with zero errors
✓ No LSP diagnostics on OffsetTrimmer.js
✓ Successfully imports resolveSelfIntersections from PaperBooleanProcessor

### Integration Readiness
- Blocks: Task 5 (OffsetContourBuilder will use OffsetTrimmer for self-intersection handling)
- Depends on: Task 2 (OffsetCurveEvaluator segment format), Task 3 (OffsetCapper patterns)
- Ready for ContourBuilder integration in Task 5

### Code Pattern Insights
- SVG arc command format: `A rx ry x-axis-rotation large-arc-flag sweep-flag x y`
- Paper.js uses pathData with same SVG syntax internally
- Round-trip conversion allows seamless integration with Paper.js boolean operations
- Lightweight parser suitable for post-processing offset segments

## Task 5: OffsetContourBuilder

### Implementation Summary
- Added `src/operations/OffsetContourBuilder.js` (244 lines) — contour orchestration
- Two exported functions: `buildOffsetContour()` + helpers
- Depends on Tasks 2, 3, 4

### Core Design Decisions

1. **Pipeline Architecture**:
   - Phase 1: Offset each segment using OffsetCurveEvaluator
   - Phase 2: Detect corner types (convex/concave) via cross product
   - Phase 3: Apply appropriate join (Sharp or Round)
   - Phase 4: Cap open contours (flat or round)
   - Phase 5: Return segments (may have self-intersections for trimming)

2. **Convex/Concave Detection**:
   - Uses cross product of incoming and outgoing tangent vectors
   - For Y-down: cross > 0 = convex (gap needing join)
   - For Y-down: cross < 0 = concave (overlap - no join needed)
   - Formula: `cross = inTangent.x * outTangent.y - inTangent.y * outTangent.x`

3. **Sharp Join (Miter)**:
   - Computes line-line intersection of extended offset segments
   - Trims segments at intersection point
   - Miter limit check: `dist <= |offset| * 4` (default OCCT value)
   - If miter limit exceeded: fallback to Round join

4. **Round Join**:
   - Creates arc centered at original corner point
   - Arc radius = |offset|
   - Sweep direction: positive offset = CCW (sweep=1), negative offset = CW (sweep=0)
   - Arc angles computed via Math.atan2 from corner to endpoints

5. **Corner Joining Strategy**:
   - For closed contours: process all corners in cycle
   - For open contours: skip joins at boundaries (caps handle those)
   - Only join convex corners (concave left for trimming)

### QA Evidence
✓ Scenario 1: Closed rectangle, Sharp join
  - Input: 4-segment 100x100 rectangle
  - Output: 4 segments (all trimmed at miter intersections)
  - File: `.sisyphus/evidence/task-5-rectangle-sharp.txt`

✓ Scenario 2: Closed rectangle, Round join
  - Input: 4-segment rectangle
  - Output: 8 segments (4 lines + 4 arc joins)
  - Arc radius = 10 (matches offset distance)
  - File: `.sisyphus/evidence/task-5-rectangle-round.txt`

### Build Status
✓ `npm run build` passes with zero errors
✓ Production build succeeds (no errors/warnings about module)
✓ Ready for Task 6 integration

### Integration Readiness
- Blocks: Task 6 (OffsetEngine will orchestrate the full pipeline)
- Depends on: Tasks 2, 3, 4 (all imported successfully)
- Uses: buildOffsetContour() + getTangent, computeJoinType, lineLineIntersection helpers

### Key Implementation Details

**Tangent Calculation**:
- Lines: simple direction normalization
- Arcs: perpendicular to radius, direction depends on sweepFlag
  - CCW (sweep=1): tangent = 90° CCW rotation of radius
  - CW (sweep=0): tangent = 90° CW rotation of radius

**Line-Line Intersection**:
- Solves: p1 + t1*d1 = p2 + t2*d2
- Uses determinant method (2D cross product)
- Returns null if parallel or coincident
- Robust for edge cases (near-parallel lines)

**Segment Cloning**:
- Deep clones all segments with arc data
- Supports both arc.center format and arc.centerX/Y legacy format
- Preserves immutability (no mutation of input segments)

### Next Task (Task 6)
OffsetEngine will wrap buildOffsetContour and coordinate:
1. SVG path parsing (ExportModule)
2. Contour splitting
3. Per-contour offset via buildOffsetContour
4. Self-intersection trimming via OffsetTrimmer
5. SVG path reassembly
6. Return result to OffsetTool

## Task 6: OffsetEngine

- Implemented new facade module src/operations/OffsetEngine.js with async processPath/processSegments and compatibility export calculateOffsetFromPathData(pathData, offset, options).
- Parsing uses ExportModule.dxfExporter.parseSVGPathSegments via bound exporter call to preserve internal this context.
- Orchestration pipeline: parse -> split contours by continuity -> buildOffsetContour(joinType/capType) -> trimSelfIntersections -> stitch/close output -> segmentsToSVGPath.
- Added minimal metadata aggregation (contour counts, bbox, signed area sum).
- Implemented graceful failure policy: invalid input or exceptions return { pathData: '', contours: [], metadata: {} } with warnings/errors logged.
- QA scenarios were executed with Vitest harness (PaperBooleanProcessor mocked to identity for deterministic Node execution), evidence saved in task-6-engine-*.txt.

