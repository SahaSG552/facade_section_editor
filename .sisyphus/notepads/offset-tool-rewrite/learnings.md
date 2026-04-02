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

