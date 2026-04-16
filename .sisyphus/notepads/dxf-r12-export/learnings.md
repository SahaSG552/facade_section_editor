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

## Task 4: POLYLINE+VERTEX+SEQEND writer with bulge

### Implementation Details
- Updated `writePolyline_R12(vertices, bulges, layerName, isClosed)` to write via `this.writer.writePair` only.
- Enforced R12 sequence:
  - POLYLINE: `0/POLYLINE/5/handle/8/layer/66/1/70/flag/10/0/20/0/30/0`
  - VERTEX (per vertex): `0/VERTEX/5/handle/8/layer/[42/bulge]/10/x/20/y/30/0`
  - SEQEND: `0/SEQEND/5/handle/8/layer`
- Added handle allocation with `getNextHandle()` for POLYLINE, every VERTEX, and SEQEND.
- Kept bulge writing before vertex coordinates and only when bulge is non-zero.
- Added `this.writer.dxfContent = this.dxfContent` sync at method start to keep writer output bound to current export buffer.

### Verification
- LSP diagnostics (errors) for `src/export/ExportModule.js`: clean.
- Test run: `npm run test -- tests/export-polyline-r12.spec.js` (3/3 passing).
- Build run: `npm run build` passing.


## Task 2: writeTables_R12() Implementation - COMPLETED

### Implementation Details
- **Location**: ExportModule.js, after writeHeader_R12 method (line 230)
- **Method**: \writeTables_R12(bitsOnCanvas, partFront, offsetContours, panelThickness)\
- **Structure**: SECTION/TABLES → LAYER → LTYPE → STYLE → APPID → VPORT → VIEW → UCS → ENDSEC

### R12 Tables Implemented

1. **LAYER Table**:
   - Layer \
0\ (MANDATORY) with color 7, CONTINUOUS linetype
   - \Default\ layer for result polygon
   - \CUT_{panelThickness}MM_OU\ layer for part front
   - Bit operation layers: \{bitName}_{depthValue}MM_{operation}\
   - Fractional depth naming: \_5_5\ format (extra _ before value, . replaced with _)
   - All layers use CONTINUOUS linetype only

2. **LTYPE Table**:
   - CONTINUOUS linetype only (R12 simplification)
   - No BYLAYER, BYBLOCK, CENTER, etc.
   - Group codes: 2/name, 70/flags, 3/description, 72/alignment, 73/elements, 40/length

3. **STYLE Table**:
   - \Standard\ text style only
   - Group codes: 2/name, 70/flags, 40/height, 41/width factor, 50/oblique, 71/generation, 42/last height, 3/font, 4/bigfont

4. **APPID Table**:
   - \ACAD\ application only (R12 minimal)
   - No Rhino, CSTINVENTORY, PE_URL, AcDbAttr

5. **VPORT Table**:
   - \*ACTIVE\ viewport with full configuration
   - View center: 400x295 (matching A4 landscape)
   - All required group codes for R12 viewport

6. **VIEW Table**:
   - Empty but present (70=0 for no views)
   - Required for R12 structure

7. **UCS Table**:
   - Empty but present (70=0 for no UCS definitions)
   - Required for R12 structure

### Key R12 Compliance Features
- ✅ No \100\ group codes (AcDb classes are R13+)
- ✅ No BLOCK_RECORD table (R13+ only)
- ✅ No DIMSTYLE table
- ✅ All handles via getNextHandle() - no hardcoded values
- ✅ Layer \0\ always present with color 7
- ✅ CONTINUOUS linetype only (simplification)
- ✅ Proper depth value formatting for fractional values

### Test Results
- Test file: tests/export-r12-tables.spec.js
- Tests: 16 passed (100%)
- All R12 compliance checks pass

### Verification Checklist
- ✓ Layer \0\ present with color 7
- ✓ No BLOCK_RECORD table
- ✓ No DIMSTYLE table
- ✓ All handles from getNextHandle()
- ✓ No duplicate layer names
- ✓ LTYPE has CONTINUOUS only
- ✓ All required tables present (LAYER, LTYPE, STYLE, APPID, VPORT, VIEW, UCS)
- ✓ No 100 group codes (R13+ feature)

### Evidence
- File: tests/export-r12-tables.spec.js
- Method: ExportModule.js, writeTables_R12() after line 228
