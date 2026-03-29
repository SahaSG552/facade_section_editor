# Offset Engine Refactor Plan

## Product Decisions

- Bezier input may be processed through fitted arcs and lines with explicit tolerance control.
- The engine must be able to return all valid offset contours, not only one preferred contour.
- A hybrid topology fallback is allowed when it improves stability and output quality.

## Current Problems

- `CustomOffsetProcessor` mixes primitive offsetting, join resolution, topology repair, and SVG serialization in one module.
- `OffsetTool` has been compensating for processor sign ambiguity by trying both offset signs and selecting a mirrored candidate in the UI layer.
- Sign semantics are inconsistent across the codebase. The engine is migrating toward direct semantics where `offsetDistance = offset`.
- The current architecture is local-join heavy and only partially staged, which makes degeneracy and collapse cases hard to reason about.

## Target Architecture

### 1. Input Normalization

- Parse SVG/editor input into a contour model made of line segments, circular arcs, and optional fitted curve surrogates.
- Normalize orientation and contour closure explicitly.
- Preserve contour metadata needed by the editor and 3D pipeline.

### 2. Primitive Offset Kernel

- Compute exact offsets for lines and circular arcs.
- Convert Beziers into fitted arc and line chains with tolerance-bounded error.
- Keep this stage free of contour stitching and contour selection logic.

### 3. Join And Intersection Resolver

- Resolve line-line, line-arc, and arc-arc joins through deterministic trimming and split events.
- Represent degeneracy explicitly instead of letting it leak into ad hoc bridge behavior.
- Emit split primitives and connectivity metadata for the topology stage.

### 4. Topology Reconstruction

- Slice at self-intersections.
- Build all valid offset contour candidates.
- Reject invalid slices through geometric predicates and source-distance checks.
- Return all valid contours with stable ordering.

### 5. Serialization And Adapters

- Convert contour results back to SVG path data.
- Provide editor-ready segments and debug payloads.
- Keep 2D editor and 3D extrusion consumers on the same engine contract.

### 6. Hybrid Fallback

- For pathological topology cases, allow a polygonal fallback stage.
- Use fallback strictly as a topology repair backend, not as the primary geometric representation.
- Refit repaired results back into arcs and lines when possible.

## Migration Strategy

### Phase 1: Contract Cleanup

- Introduce explicit sign semantics in the processor.
- Remove mirrored sign probing from `OffsetTool`.
- Add tests for direct-sign behavior in collapse and degeneracy cases.

Acceptance criteria:

- Editor preview uses a single requested sign path.
- Regression tests cover direct-sign collapse behavior.
- Legacy callers remain functional until migrated.

### Phase 2: Processor Decomposition

- Extract primitive offset functions behind a kernel API.
- Extract join resolution into a separate stage module.
- Extract topology reconstruction into a contour graph module.

Acceptance criteria:

- `CustomOffsetProcessor` becomes an orchestrator rather than a monolith.
- Primitive offset logic can be tested independently from topology repair.

### Phase 3: Multi-Contour Output

- Change the engine contract to return structured contour results.
- Add ordered contour collections with orientation and containment metadata.
- Keep a compatibility adapter for single-path consumers.

Acceptance criteria:

- The engine can return multiple valid contours from one request.
- Single-path adapters remain available for legacy callers.

### Phase 4: Hybrid Fallback

- Integrate topology fallback for pathological self-intersections and near-collapses.
- Add line and arc refit after fallback repair.
- Gate fallback through explicit heuristics and diagnostics.

Acceptance criteria:

- Fallback activates only for unstable cases.
- Result quality remains line and arc first whenever possible.

### Phase 5: Downstream Migration

- Migrate `ThreeModule` and `ExtrusionBuilder` to the new direct-sign and multi-contour contract.
- Remove sign-flip fallback call patterns once downstream consumers are aligned.
- Update diagnostics and developer docs.

Acceptance criteria:

- 2D editor and 3D pipeline share the same offset semantics.
- No consumer relies on mirrored sign retries.

## Immediate Next Targets

1. Migrate additional processor tests from implicit legacy sign behavior to explicit direct-sign coverage.
2. Introduce a structured result type for contour collections while preserving current string-return compatibility.
3. Expand structured contour metadata with orientation, containment, and stable deterministic ordering.

## Progress Notes

- Completed: `joinOffsetSegments` responsibilities were split into two stages in `OffsetContourStages`:
	- `resolveOffsetSegmentJoints` for neighbor join resolution.
	- `finalizeOffsetTopology` for sanitize/gap-seal/degeneracy cleanup.
- Added focused test coverage in `tests/offset/contour-stages.spec.js` and validated full `tests/offset` regression suite.
- Completed: structured contour output now includes orientation, signed/absolute area, bounding box, containment depth, and deterministic ordering.
- Completed: structured API now supports gated hybrid fallback for self-intersecting contour outputs via `enableHybridFallback` + `trimSelfIntersections`, with optional diagnostic reasons.
- Completed: hybrid fallback logic was extracted into dedicated stage module `src/operations/offset/OffsetFallbackStage.js` and covered with focused unit tests.
- Completed: contour metadata and deterministic ordering logic were extracted into dedicated stage module `src/operations/offset/OffsetContourMetadataStage.js` and covered with focused unit tests.
- Completed: repaired-path acceptance policy (`shouldAcceptTrimmedPath`) and sampling helpers were extracted into dedicated stage module `src/operations/offset/OffsetTrimAcceptanceStage.js` and covered with focused unit tests.
- Completed: self-intersection detection logic (`pathHasSelfIntersections` and segment-intersection predicates) was extracted into dedicated stage module `src/operations/offset/OffsetSelfIntersectionStage.js` and reused by both string and structured flows.
- Completed: stage dependency assembly was centralized in `src/operations/offset/OffsetStageDepsFactory.js`, reducing duplication in `CustomOffsetProcessor` orchestration.

## Post-Refactor Next Step (Approved)

- After completing the current offset refactor phases, add a second editor tool named `Clipper Offset` next to the existing offset tool.
- `Clipper Offset` must follow the same UX and operation principles as the current offset tool, but use a Clipper2-based engine backend.
- Keep both tools available so users can choose between the current geometric engine and Clipper engine behavior.
