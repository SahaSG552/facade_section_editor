# DXF R12 Export - Notepad

## Inherited Wisdom
- ARC_APPROX_TOLERANCE = 0.15 (mm RMS tolerance)
- ARC_RADIUS_TOLERANCE = 0.01 (mm tolerance for radius checks)
- Call signature: exportToDXF(bitsOnCanvas, partPathElement, partFront, offsetContours, panelThickness)
- offsetContours structure: { element, bitIndex, offsetDistance, operation, pass, pathData, depth, isWorkOffset, for3D, isPOMain, isPOPhantom }

## Key Code Patterns to PRESERVE
- parseSVGPathSegments() - SVG parsing logic
- svgArcToDXFArc() - Arc conversion
- bezierToArc() - Bezier to arc conversion
- optimizeSegmentsToArcs() - Convert beziers to arcs where possible
- approximateCubicBezier() - Fallback line segment approximation
- calculateBulge() - Bulge value calculation for VERTEX entities
- colorToDXFIndex() - Color conversion
- rgbToACI() - RGB to ACI conversion

## Key Code Patterns to REPLACE
- writeHeader() (old AC1018) → writeHeader_R12()
- writeClasses() → DELETE (not in R12)
- writeObjects() → DELETE (not in R12)
- writePolylineWithBulge() (LWPOLYLINE) → writePolyline_R12() (POLYLINE+VERTEX)
- writeGroupedBeziers(), writeMultiSegmentSpline() → DELETE (SPLINE not in R12)
- addBLOCKRECORDTable() → DELETE (R13+ feature)

## Decisions Made
- Full R12 (AC1009) rewrite - not dual-mode
- Bezier handling: Approximate as line segments if arc conversion fails
- Metadata: Layer naming + XDATA for extended info

## Task 2: writeBlocks_R12() Implementation

### Implementation Details
- **Location**: ExportModule.js, lines 1544-1607
- **Method**: `writeBlocks_R12()`
- **Structure**: SECTION/BLOCKS → *MODEL_SPACE block → *PAPER_SPACE block → ENDSEC

### Key Simplifications for R12
1. **Removed ABViewer-specific blocks**:
   - _CLOSEDFILLED block (with SOLID and LINE entities)
   - ABViewer_RedLine block
   
2. **Removed R13+ features**:
   - 100/AcDbEntity and 100/AcDbBlockBegin group codes (R12 doesn't use these)
   - 67 (paper space flag) - R12 doesn't support this in BLOCK
   - 3 (block name) and 1 (xref path) fields - R12 doesn't use these
   
3. **Simplified BLOCK structure for R12**:
   - BLOCK: 0/BLOCK, 5/handle, 8/layer, 2/name, 70/flags, 10/x, 20/y, 30/z
   - ENDBLK: 0/ENDBLK, 5/handle, 8/layer
   - No entities inside blocks (entities go in ENTITIES section)

### Handle Management
- All handles generated via `getNextHandle()` - no hardcoded values
- Ensures sequential handle allocation across entire DXF file
- Prevents handle collisions

### Verification Checklist
- ✅ Only *MODEL_SPACE and *PAPER_SPACE blocks present
- ✅ No _CLOSEDFILLED block
- ✅ No ABViewer_RedLine block
- ✅ All handles from getNextHandle()
- ✅ R12-compatible structure (no 100 group codes, no 67 flag)
- ✅ No entities inside blocks

## Current Work
Wave 1: T1-T2 complete, T3-T4 pending

## Task 3: POLYLINE/VERTEX/SEQEND Writer with Bulge

### Implementation Details
- Added `writePolyline_R12(vertices, bulges, layerName, isClosed)` in `ExportModule.js`.
- R12 structure implemented exactly as required:
  - `0/POLYLINE/5/handle/8/layer/66/1/70/flag/10/0/20/0/30/0`
  - Per-vertex `0/VERTEX/8/layer/[42/bulge if non-zero]/10/x/20/y/30/0`
  - Terminator `0/SEQEND/8/layer`
- Reused existing `calculateBulge(arc)` directly (no new bulge math).

### Integration Notes
- `writePolylineWithBulge()` keeps existing segment iteration + vertex/bulge collection, then delegates writing to `writePolyline_R12()`.
- `writePolylineGroup()` now also delegates to `writePolyline_R12()`.
- Added guard for degenerate filtering result: if all segments filtered out, return early.
- Updated log text from LWPOLYLINE to R12 POLYLINE where applicable.

### Validation
- Added tests: `tests/export-polyline-r12.spec.js`
  - closed polyline with arcs (expects non-zero `42` bulge)
  - closed polyline lines-only (no `42`)
  - open polyline (expects `70=0`)
- Tests also assert presence of `POLYLINE/VERTEX/SEQEND` and absence of `LWPOLYLINE`.

## Task 1: DXFWriter Helper Class + R12 HEADER Section - COMPLETED

### Implementation Summary
- **DXFWriter class**: Lines 77-133 in ExportModule.js
  - `writePair(code, value)` - Write group code + value pair
  - `writeSectionStart(name)` - Write 0/SECTION/2/name
  - `writeSectionEnd()` - Write 0/ENDSEC
  - `writeEntityStart(type, handle, layer)` - Write entity header
  - `getNextHandle()` - Increment and return hex handle

- **writeHeader_R12() method**: Lines 154-232 in ExportModule.js
  - R12-compliant HEADER section (AC1009)
  - Minimal variables for CAM compatibility
  - No AC1015+ variables present
  - $HANDLING = 1 (enable handles)
  - $DWGCODEPAGE = ANSI_1252 (international)
  - $INSUNITS = 4 (millimeters)
  - A4 landscape defaults ($LIMMAX = 420x297)

### Handle Management
- Start at 0x10 (16) for R12 compatibility
- Sequential allocation via getNextHandle()
- Prevents handle collisions across entire DXF file

### Test Results
- Test file: tests/export-r12-header.spec.js
- Tests: 6 passed (100%)
- All tests validate R12 compliance

### Verification
- ✓ AC1009 version string present
- ✓ No AC1015+ variables ($CELWEIGHT, $LWDISPLAY, $DIMASSOC, etc.)
- ✓ $HANDLING = 1 for handle support
- ✓ $DWGCODEPAGE = ANSI_1252
- ✓ $INSUNITS = 4 (millimeters)
- ✓ HEADER section structure correct

### Evidence
- File: .sisyphus/evidence/task-1-r12-header-validation.txt
