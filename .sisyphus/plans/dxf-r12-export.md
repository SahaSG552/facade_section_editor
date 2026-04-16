# DXF R12 Export Refactor

## TL;DR

> **Quick Summary**: Rewrite DXF exporter from AC1018 (AutoCAD 2004) to AC1009 (R12) format for ArtCam 2018 compatibility. Replace LWPOLYLINE with POLYLINE+VERTEX+SEQEND, replace SPLINE with arc/line approximation, strip CLASSES/OBJECTS sections, fix handle management and XDATA placement.
> 
> **Deliverables**:
> - Rewritten DXFExporter class producing valid AC1009 (R12) DXF files
> - POLYLINE+VERTEX+SEQEND entities with bulge values for arcs
> - Bezier → arc conversion with line-segment fallback
> - Proper R12 structure: HEADER + TABLES + BLOCKS + ENTITIES + EOF
> - Fixed handle management, Layer "0", XDATA placement
> - Vitest test suite for DXF output validation
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (R12 writer) → Task 4 (POLYLINE writer) → Task 7 (entity mapping) → Task 9 (integration) → Task 10 (tests) → Final Verification

---

## Context

### Original Request
User's DXF export opens in Rhino and ABViewer but ArtCam 2018 fails with "Failed to import Data". Need to refactor DXF exporter for maximum CAM compatibility.

### Interview Summary
**Key Discussions**:
- **Format choice**: User confirmed Full R12 (AC1009) rewrite — not dual-mode
- **Bezier handling**: Approximate remaining beziers as line segments (after arc conversion)
- **Metadata**: Keep layer naming (bit_name_depthMM_operation) + XDATA for extended info
- **No LWPOLYLINE/SPLINE**: Must use POLYLINE+VERTEX+SEQEND for R12 compatibility

**Research Findings**:
- R12 (AC1009) is the gold standard for CAM compatibility — supported by ArtCam, laser cutters, waterjet CNC
- LWPOLYLINE introduced in R14 — NOT supported by ArtCam
- SPLINE introduced in R13 — NOT supported by ArtCam
- R12 structure: HEADER + TABLES + ENTITIES + EOF (no CLASSES, no OBJECTS)
- POLYLINE+VERTEX+SEQEND with bulge values is the correct R12 entity for polylines with arcs
- Handles optional in R12 but recommended
- Layer "0" is mandatory in DXF

### Self-Review (Metis timeout — manual gap analysis)
**Identified Gaps** (addressed):
- R12 $HANDLING variable: Will set to 1 in HEADER to enable handles
- BLOCKS section in R12: Still needed for MODEL_SPACE/PAPER_SPACE but simpler structure
- $INSUNITS: Keep as 4 (millimeters) for CAM
- $DWGCODEPAGE: Change from ANSI_1251 to ANSI_1252 for international compatibility
- Coordinate system: Keep current Y-flip (convertY = y => -y) — confirmed working in Rhino
- CIRCLE entities: Keep as-is — fully R12 compatible
- ARC entities: Keep as-is — fully R12 compatible

---

## Work Objectives

### Core Objective
Produce valid AC1009 (R12) DXF files that open correctly in ArtCam 2018, Rhino, ABViewer, and all other CAM/CAD software.

### Concrete Deliverables
- `src/export/ExportModule.js` — Rewritten DXFExporter class
- `tests/export-r12.spec.js` — Vitest test suite for R12 DXF output
- Verified DXF file that opens in ArtCam 2018

### Definition of Done
- [ ] Generated DXF file has $ACADVER = AC1009
- [ ] No LWPOLYLINE entities in output
- [ ] No SPLINE entities in output
- [ ] No CLASSES section in output
- [ ] No OBJECTS section in output
- [ ] All polylines use POLYLINE+VERTEX+SEQEND structure
- [ ] Arc segments use bulge values in VERTEX entities
- [ ] Layer "0" exists in LAYER table
- [ ] File opens in ArtCam 2018 without errors
- [ ] File still opens correctly in Rhino and ABViewer
- [ ] All existing offset contours export correctly
- [ ] Bit shape geometry preserved accurately (tolerance < 0.15mm RMS)

### Must Have
- AC1009 (R12) DXF format output
- POLYLINE+VERTEX+SEQEND entities (no LWPOLYLINE)
- Arc approximation via bulge values in VERTEX
- Line segment approximation for non-arc beziers
- Layer "0" in LAYER table
- Proper XDATA inside entities (not standalone)
- Correct handle management (no collisions)
- CRLF line endings

### Must NOT Have (Guardrails)
- NO LWPOLYLINE entities — ArtCam can't read them
- NO SPLINE entities — ArtCam can't read them
- NO CLASSES section — not part of R12 spec
- NO OBJECTS section — not part of R12 spec
- NO ABViewer-specific blocks (_CLOSEDFILLED, ABViewer_RedLine)
- NO hardcoded extents ($EXTMIN/$EXTMAX) — must be calculated
- NO duplicate layer definitions
- NO standalone XDATA (must be inside entity)
- DO NOT change offset calculation logic (CustomOffsetProcessor, OffsetEngine)
- DO NOT change SVG parsing in BitsManager or PanelManager
- DO NOT change the 2D canvas rendering pipeline
- DO NOT modify how offsetContours or bitsOnCanvas are built

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES (tests-after)
- **Framework**: Vitest
- **If TDD**: Each task includes test cases as acceptance criteria

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **DXF output**: Use Bash — generate DXF, parse structure, validate group codes
- **Entity validation**: Use Bash — grep for forbidden entities (LWPOLYLINE, SPLINE)
- **R12 structure**: Use Bash — validate section order, missing sections
- **ArtCam compatibility**: Use Bash — validate no AC1015+ features present

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - R12 foundation):
├── Task 1: DXFWriter helper class + R12 HEADER [quick]
├── Task 2: R12 TABLES section (LAYER, LTYPE, STYLE, APPID) [unspecified-high]
├── Task 3: R12 BLOCKS section (MODEL_SPACE, PAPER_SPACE) [quick]
└── Task 4: POLYLINE+VERTEX+SEQEND writer with bulge [deep]

Wave 2 (After Wave 1 - entity writers):
├── Task 5: LINE, ARC, CIRCLE entity writers [quick]
├── Task 6: SVG segment → R12 entity mapper (replaces writePathAsPolyline) [unspecified-high]
├── Task 7: Main exportToDXF orchestrator (R12 flow) [unspecified-high]
└── Task 8: XDATA + color/layer support for R12 [quick]

Wave 3 (After Wave 2 - integration + tests):
├── Task 9: Integration: wire new DXFExporter into ExportModule [quick]
├── Task 10: Vitest test suite for R12 DXF output [unspecified-high]
└── Task 11: Dynamic extent calculation + validation [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA — generate DXF, validate structure (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 6 → Task 7 → Task 9 → Task 10 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 2,3,4,5,6,7,8 | 1 |
| 2 | 1 | 7,9 | 1 |
| 3 | 1 | 7,9 | 1 |
| 4 | 1 | 6,7 | 1 |
| 5 | 1 | 6 | 2 |
| 6 | 4,5 | 7 | 2 |
| 7 | 2,3,6,8 | 9 | 2 |
| 8 | 1 | 7 | 2 |
| 9 | 7 | 10,11 | 3 |
| 10 | 9 | F1-F4 | 3 |
| 11 | 9 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1→`quick`, T2→`unspecified-high`, T3→`quick`, T4→`deep`
- **Wave 2**: 4 tasks — T5→`quick`, T6→`unspecified-high`, T7→`unspecified-high`, T8→`quick`
- **Wave 3**: 3 tasks — T9→`quick`, T10→`unspecified-high`, T11→`quick`
- **FINAL**: 4 tasks — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [ ] 1. DXFWriter Helper Class + R12 HEADER Section

  **What to do**:
  - Create a `DXFWriter` helper class inside ExportModule.js (or as separate internal class) with utility methods:
    - `writePair(code, value)` — write a single group code + value pair
    - `writeSectionStart(name)` — write `0/SECTION/2/name`
    - `writeSectionEnd()` — write `0/ENDSEC`
    - `writeEntityStart(type, handle, layer)` — write `0/type/5/handle/8/layer`
    - `getNextHandle()` — increment and return next hex handle
  - Replace all `this.dxfContent.push("code"); this.dxfContent.push("value");` patterns with `writePair()` calls throughout the new R12 code
  - Implement R12-compliant HEADER section:
    - `$ACADVER` = `AC1009`
    - `$INSUNITS` = `4` (millimeters)
    - `$EXTMIN` / `$EXTMAX` — placeholder zeros (will be calculated in Task 11)
    - `$LIMMIN` / `$LIMMAX` — standard A4/panel defaults
    - `$HANDLING` = `1` (enable handles)
    - `$DWGCODEPAGE` = `ANSI_1252` (international, not Cyrillic ANSI_1251)
    - Minimal dimension variables (keep only essential ones)
  - Remove ALL AC1015+ header variables ($CELWEIGHT, $LWDISPLAY, $DIMASSOC, $XCLIPFRAME, etc.)

  **Must NOT do**:
  - Do NOT keep any AC1015+ specific header variables
  - Do NOT write $HANDSEED with a fixed value — calculate from max handle at end
  - Do NOT include $FILLMODE, $TILEMODE, $ATTMODE, $PDMODE, $PDSIZE, $UCSORG, $UCSXDIR, $UCSYDIR — these are optional and bloat the file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical refactoring with clear spec, no complex logic
  - **Skills**: [`vitest`]
    - `vitest`: Need to verify test setup
  - **Skills Evaluated but Omitted**:
    - `cad-geometry`: No geometry computation needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/export/ExportModule.js:77-136` — Current DXFExporter constructor and exportToDXF flow
  - `src/export/ExportModule.js:141-517` — Current writeHeader() for reference on group code patterns

  **API/Type References** (contracts to implement against):
  - `src/config/constants.js` — ARC_APPROX_TOLERANCE, ARC_RADIUS_TOLERANCE values

  **External References** (R12 spec):
  - R12 HEADER: $ACADVER=AC1009, $INSUNITS, $EXTMIN/$EXTMAX, $HANDLING are the only mandatory variables

  **WHY Each Reference Matters**:
  - Current writeHeader shows the push() pattern to replace with writePair()
  - Constants needed for tolerance values used in arc decisions

  **Acceptance Criteria**:
  - [ ] DXFWriter class with writePair, writeSectionStart, writeSectionEnd, writeEntityStart, getNextHandle methods
  - [ ] writeHeader() produces valid R12 HEADER with $ACADVER=AC1009
  - [ ] No AC1015+ header variables present
  - [ ] $HANDLING = 1 present
  - [ ] $DWGCODEPAGE = ANSI_1252

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: R12 Header validation
    Tool: Bash
    Preconditions: DXF export triggered with sample data
    Steps:
      1. Run the DXF export function with minimal test data
      2. Parse output string, split by CRLF
      3. Search for "AC1009" after "$ACADVER" group code
      4. Verify no "LWPOLYLINE", "SPLINE", "AC1015", "AC1018" strings exist in header section
      5. Verify "$HANDLING" exists with value "1"
      6. Verify "$DWGCODEPAGE" exists with value "ANSI_1252"
    Expected Result: All assertions pass
    Failure Indicators: AC1009 not found, or forbidden strings found in header
    Evidence: .sisyphus/evidence/task-1-r12-header-validation.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add DXFWriter helper and R12 header`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 2. R12 TABLES Section Writer

  **What to do**:
  - Implement `writeTables_R12(bitsOnCanvas, partFront, offsetContours, panelThickness)`:
    - LAYER table with Layer "0" (MANDATORY, white color 7, CONTINUOUS), Default layer, CUT layer, bit operation layers
    - LTYPE table with CONTINUOUS, BYLAYER, BYBLOCK linetypes only
    - STYLE table with "Standard" text style
    - APPID table with "ACAD" application only
    - VPORT table with *ACTIVE viewport (minimal)
    - VIEW table (empty)
    - UCS table (empty)
  - Each table entry gets unique handle via getNextHandle()
  - Layer "0" must ALWAYS be present (it was commented out in old code — this is a critical fix)
  - Layer naming: `bit.name_depthValueMM_bit.operation` for offset contours, "Default" for result polygon, `CUT_{panelThickness}MM_OU` for part front
  - Remove BLOCK_RECORD table (R13+ feature, not in R12)
  - Remove DIMSTYLE table (not needed for 2D CAM export)
  - Remove ISO linetypes (not needed for CAM)

  **Must NOT do**:
  - Do NOT include BLOCK_RECORD table (R13+ only)
  - Do NOT include DIMSTYLE table
  - Do NOT include ISO linetypes
  - Do NOT create duplicate layer definitions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple table definitions with specific DXF group codes, needs attention to detail
  - **Skills**: [`vitest`]
    - `vitest`: Test validation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Task 1 (needs DXFWriter helper)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:625-714` — Current writeTables() with layer calculation
  - `src/export/ExportModule.js:719-769` — Current writeLayer() for color handling pattern
  - `src/export/ExportModule.js:774-1118` — Current addLTYPETable() for LTYPE structure
  - `src/export/ExportModule.js:1123-1167` — Current addSTYLETable() for STYLE structure

  **API/Type References**:
  - `src/export/ExportModule.js:4818-4850` — colorToDXFIndex() for color conversion
  - `src/export/ExportModule.js:4860-4892` — rgbToACI() for RGB to ACI color index

  **WHY Each Reference Matters**:
  - Current layer naming logic should be preserved but simplified
  - Color conversion functions should be reused as-is
  - R12 LAYER table uses simpler structure (no 290/370/390 group codes)

  **Acceptance Criteria**:
  - [ ] LAYER table includes Layer "0" with color 7
  - [ ] No BLOCK_RECORD table in output
  - [ ] No DIMSTYLE table in output
  - [ ] No duplicate layer names
  - [ ] All layer names match naming convention
  - [ ] LTYPE table has CONTINUOUS only
  - [ ] APPID table has ACAD only

  **QA Scenarios:**

  ```
  Scenario: R12 TABLES validation
    Tool: Bash
    Preconditions: DXF export with 2 bits and 1 offset contour
    Steps:
      1. Run DXF export with sample data
      2. Parse TABLES section from output
      3. Verify LAYER table exists and contains "0" layer
      4. Verify no "BLOCK_RECORD" string in TABLES section
      5. Verify no "DIMSTYLE" string in TABLES section
      6. Count LAYER entries — should be 2 (0, Default) + 1 (CUT) + N (offset) with no duplicates
    Expected Result: Layer "0" present, no BLOCK_RECORD/DIMSTYLE, no duplicate layers
    Evidence: .sisyphus/evidence/task-2-r12-tables-validation.txt

  Scenario: No duplicate layers
    Tool: Bash
    Preconditions: DXF export with multiple bits
    Steps:
      1. Run DXF export with 3 bits on same layer
      2. Extract all LAYER entries (lines after group code "2" following "LAYER" entity)
      3. Check for duplicate layer names
    Expected Result: Zero duplicate layer names
    Failure Indicators: Same layer name appears more than once
    Evidence: .sisyphus/evidence/task-2-no-duplicate-layers.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add R12 TABLES section writer`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 3. R12 BLOCKS Section Writer

  **What to do**:
  - Implement `writeBlocks_R12()`:
    - *MODEL_SPACE block (required even in R12)
    - *PAPER_SPACE block (required even in R12)
    - Each BLOCK uses: `0/BLOCK/5/handle/8/0/2/name/70/0/10/0/20/0/30/0`
    - Each ENDBLK uses: `0/ENDBLK/5/handle/8/0`
    - Handles from getNextHandle() — no hardcoded handles
  - Remove _CLOSEDFILLED block (ABViewer-specific, not our data)
  - Remove ABViewer_RedLine block (ABViewer-specific, not our data)
  - Remove SOLID and LINE entities inside blocks (were part of _CLOSEDFILLED)

  **Must NOT do**:
  - Do NOT include ABViewer-specific blocks
  - Do NOT use hardcoded handles for blocks
  - Do NOT include entities inside *MODEL_SPACE block (entities go in ENTITIES section)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple, well-defined structure with few entries
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Task 1 (needs DXFWriter helper)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:1544-1769` — Current writeBlocks() with all blocks including ABViewer artifacts

  **WHY Each Reference Matters**:
  - Shows current BLOCK/ENDBLK structure to simplify for R12
  - Identifies which blocks to remove (ABViewer-specific)

  **Acceptance Criteria**:
  - [ ] Only *MODEL_SPACE and *PAPER_SPACE blocks present
  - [ ] No _CLOSEDFILLED block
  - [ ] No ABViewer_RedLine block
  - [ ] All handles from getNextHandle(), no hardcoded values

  **QA Scenarios:**

  ```
  Scenario: R12 BLOCKS validation
    Tool: Bash
    Steps:
      1. Run DXF export
      2. Parse BLOCKS section
      3. Verify only *MODEL_SPACE and *PAPER_SPACE blocks exist
      4. Verify no "_CLOSEDFILLED" or "ABViewer_RedLine" strings
    Expected Result: Exactly 2 blocks, no ABViewer artifacts
    Evidence: .sisyphus/evidence/task-3-r12-blocks-validation.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add R12 BLOCKS section writer`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 4. POLYLINE+VERTEX+SEQEND Writer with Bulge

  **What to do**:
  - Implement `writePolyline_R12(vertices, bulges, layerName, isClosed)`:
    - Write POLYLINE entity: `0/POLYLINE/5/handle/8/layer/66/1/70/flag/10/0/20/0/30/0`
      - Flag 66=1 means "vertices follow"
      - Flag 70=1 for closed, 0 for open
    - For each vertex: `0/VERTEX/8/layer/10/x/20/y/30/0`
      - If bulge[i] != 0: add `42/bulge` before the vertex
    - End with: `0/SEQEND/8/layer`
  - Bulge value calculation: reuse existing `calculateBulge(arc)` method
  - Handle vertex Z=0 for all vertices (2D export)
  - Test with: closed polyline with arcs (from offset contours), closed polyline with lines only, open polyline

  **Must NOT do**:
  - Do NOT use LWPOLYLINE entity
  - Do NOT use group codes not valid in R12 (no 38 elevation, no 90 vertex count, no 370 lineweight)
  - Do NOT write SPLINE entities

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core of the R12 compatibility — POLYLINE+VERTEX structure must be exactly right for ArtCam
  - **Skills**: [`cad-geometry`]
    - `cad-geometry`: Bulge calculation is geometric, this skill covers arc/angle math

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1 (needs DXFWriter helper)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:4350-4535` — Current writePolylineWithBulge() using LWPOLYLINE
  - `src/export/ExportModule.js:4714-4727` — Current calculateBulge() method
  - `src/export/ExportModule.js:4226-4254` — Current writeGroupedBeziers() for segment iteration pattern

  **API/Type References**:
  - Segment format: `{ type: 'line'|'arc'|'bezier', start: {x,y}, end: {x,y}, arc?: {centerX,centerY,radius,startAngle,endAngle,sweepFlag} }`

  **WHY Each Reference Matters**:
  - Current LWPOLYLINE code shows vertex/bulge collection logic that must be adapted for POLYLINE+VERTEX
  - calculateBulge() can be reused directly
  - Segment format determines how to iterate and extract vertices+bulges

  **Acceptance Criteria**:
  - [ ] writePolyline_R12 produces POLYLINE entity with 66=1 flag
  - [ ] Each vertex is a separate VERTEX subentity
  - [ ] Arc segments have non-zero bulge values (group code 42)
  - [ ] SEQEND terminates the polyline
  - [ ] No LWPOLYLINE entity in output
  - [ ] Closed polylines have flag 70=1

  **QA Scenarios:**

  ```
  Scenario: POLYLINE+VERTEX structure validation
    Tool: Bash
    Steps:
      1. Call writePolyline_R12 with 4 vertices (rectangle), all bulges=0, closed=true
      2. Parse output, verify: POLYLINE entity present with 66=1, 70=1
      3. Verify exactly 4 VERTEX subentities
      4. Verify SEQEND present after last VERTEX
      5. Verify no "LWPOLYLINE" string
    Expected Result: POLYLINE+4xVERTEX+SEQEND structure correct
    Evidence: .sisyphus/evidence/task-4-polyline-structure.txt

  Scenario: Arc bulge in POLYLINE
    Tool: Bash
    Steps:
      1. Call writePolyline_R12 with arc segment (bulge != 0)
      2. Verify VERTEX has group code 42 with non-zero value
      3. Verify bulge sign: positive=CCW, negative=CW
    Expected Result: Bulge value present and correctly signed
    Failure Indicators: No group code 42, or wrong sign
    Evidence: .sisyphus/evidence/task-4-arc-bulge.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add POLYLINE+VERTEX writer with bulge`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 5. LINE, ARC, CIRCLE Entity Writers for R12

  **What to do**:
  - Implement R12-compliant entity writers:
    - `writeLine_R12(start, end, layerName)`: `0/LINE/5/handle/8/layer/10/x1/20/y1/30/0/11/x2/21/y2/31/0`
    - `writeArc_R12(arc, layerName)`: `0/ARC/5/handle/8/layer/10/cx/20/cy/30/0/40/radius/50/startAngle/51/endAngle`
    - `writeCircle_R12(cx, cy, radius, layerName)`: `0/CIRCLE/5/handle/8/layer/10/cx/20/cy/30/0/40/radius`
  - No subclass markers (100/AcDbEntity etc.) — R12 doesn't use them
  - No group codes 370 (lineweight), 6 (linetype) — simplify for R12
  - Angles in ARC always in degrees (as current code does)

  **Must NOT do**:
  - Do NOT include subclass markers (100/AcDbEntity, AcDbCircle etc.) — R12 doesn't use them
  - Do NOT include group code 370 (lineweight) — R13+ only
  - Do NOT include group code 6 (linetype) in every entity — can omit or use only when non-default

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple, well-defined entity format
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (needs DXFWriter helper)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:4540-4569` — Current writeLine() for LINE structure
  - `src/export/ExportModule.js:4574-4605` — Current writeArc() for ARC structure
  - `src/export/ExportModule.js:2373-2404` — Current writeSVGCircle() for CIRCLE structure

  **WHY Each Reference Matters**:
  - Current writers show the correct group codes, just need to strip R13+ additions

  **Acceptance Criteria**:
  - [ ] LINE entity has 0/LINE/5/handle/8/layer/10/20/30/11/21/31 structure
  - [ ] ARC entity has 0/ARC/5/handle/8/layer/10/20/30/40/50/51 structure
  - [ ] CIRCLE entity has 0/CIRCLE/5/handle/8/layer/10/20/30/40 structure
  - [ ] No subclass markers (100/AcDbEntity) in any entity
  - [ ] No group code 370 in any entity

  **QA Scenarios:**

  ```
  Scenario: R12 LINE entity structure
    Tool: Bash
    Steps:
      1. Call writeLine_R12 with start(0,0), end(100,50), layer "0"
      2. Parse output lines
      3. Verify structure: "0/LINE" then "5/{handle}" then "8/0" then "10/0" "20/0" "30/0" "11/100" "21/50" "31/0"
      4. Verify no "100" group code (no subclass markers)
      5. Verify no "370" group code
    Expected Result: Clean R12 LINE entity
    Evidence: .sisyphus/evidence/task-5-r12-line-entity.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add LINE/ARC/CIRCLE entity writers`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 6. SVG Segment → R12 Entity Mapper

  **What to do**:
  - Implement `writeSegmentsAsR12(segments, layerName)` — replaces `writePathAsPolyline`:
    - If ALL segments are line+arc (no bezier): use POLYLINE+VERTEX+SEQEND with bulge (call writePolyline_R12)
    - If ANY bezier segments exist:
      1. First run `optimizeSegmentsToArcs()` (existing method) to convert beziers → arcs where possible
      2. For remaining beziers: call `approximateCubicBezier()` (existing method, increase segments to 16-32 for precision)
      3. Result: all line+arc segments → single POLYLINE+VERTEX+SEQEND with bulge
    - Never produce SPLINE entities
  - Also implement `writeSVGPolygon_R12()`, `writeSVGRect_R12()`, `writeSVGCircle_R12()`:
    - Rect → POLYLINE+VERTEX+SEQEND (4 vertices, closed)
    - Polygon → POLYLINE+VERTEX+SEQEND (N vertices, closed)
    - Circle → CIRCLE entity (keep as-is, R12 compatible)
  - Key decision: **Always produce POLYLINE+VERTEX for paths, never LWPOLYLINE or SPLINE**

  **Must NOT do**:
  - Do NOT produce SPLINE entities under any circumstances
  - Do NOT produce LWPOLYLINE entities under any circumstances
  - Do NOT change optimizeSegmentsToArcs() logic — use as-is
  - Do NOT change approximateCubicBezier() logic — use as-is with more segments

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Central mapping logic, needs careful handling of segment types
  - **Skills**: [`cad-geometry`]
    - `cad-geometry`: Bezier approximation precision tuning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 4, 5 (needs POLYLINE writer and entity writers)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:4170-4221` — Current writePathAsPolyline() with bezier detection
  - `src/export/ExportModule.js:4226-4254` — Current writeGroupedBeziers() (REPLACE this — no more SPLINE)
  - `src/export/ExportModule.js:3999-4076` — optimizeSegmentsToArcs() — KEEP AND REUSE
  - `src/export/ExportModule.js:4091-4124` — approximateCubicBezier() — KEEP AND REUSE

  **API/Type References**:
  - Segment format: `{ type: 'line'|'arc'|'bezier', start: {x,y}, end: {x,y}, arc?: {...}, cp1?: {x,y}, cp2?: {x,y} }`

  **WHY Each Reference Matters**:
  - writePathAsPolyline shows the bezier detection pattern to adapt
  - optimizeSegmentsToArcs and approximateCubicBezier are the two key conversion functions to call
  - writeGroupedBeziers is the SPLINE path that must be ELIMINATED

  **Acceptance Criteria**:
  - [ ] No SPLINE entities produced for any input
  - [ ] No LWPOLYLINE entities produced for any input
  - [ ] All paths produce POLYLINE+VERTEX+SEQEND
  - [ ] Bezier curves approximated as line+arc segments within 0.15mm RMS
  - [ ] Circles exported as CIRCLE entities (not POLYLINE approximation)
  - [ ] Rects and polygons exported as closed POLYLINE

  **QA Scenarios:**

  ```
  Scenario: Bezier curve → no SPLINE
    Tool: Bash
    Steps:
      1. Call writeSegmentsAsR12 with a single bezier segment
      2. Parse output string
      3. Verify "SPLINE" does NOT appear in output
      4. Verify "POLYLINE" appears in output with VERTEX subentities
      5. Verify vertex count is reasonable (> 4, < 100)
    Expected Result: Bezier converted to POLYLINE with line/arc segments, no SPLINE
    Failure Indicators: "SPLINE" found, or zero/one VERTEX entries
    Evidence: .sisyphus/evidence/task-6-bezier-to-polyline.txt

  Scenario: Mixed line+arc → single POLYLINE with bulge
    Tool: Bash
    Steps:
      1. Call writeSegmentsAsR12 with [line, arc, line] segments
      2. Verify single POLYLINE entity with VERTEX entries
      3. Verify the VERTEX before the arc endpoint has group code 42 with non-zero bulge
    Expected Result: Single POLYLINE with correct bulge at arc vertex
    Evidence: .sisyphus/evidence/task-6-mixed-segments.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): add SVG→R12 entity mapper`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 7. Main exportToDXF_R12 Orchestrator

  **What to do**:
  - Implement `exportToDXF_R12(bitsOnCanvas, partPathElement, partFront, offsetContours, panelThickness)`:
    1. Reset state (dxfContent = [], handleCounter = 0x10)
    2. Call writeHeader_R12()
    3. Call writeTables_R12(...)
    4. Call writeBlocks_R12()
    5. Write ENTITIES section:
       - Write partFront contour (if present) → POLYLINE on CUT layer
       - Write offset contours → POLYLINE on bit-specific layers
       - Write result polygon from partPathElement → POLYLINE on Default layer
       - Write bit shapes → POLYLINE/LINE/ARC on Default layer
    6. Call writeEOF()
    7. Join with CRLF and return
  - Keep the existing `exportToDXF()` method renamed as `exportToDXF_AC1018()` for fallback
  - The main `exportToDXF()` now delegates to `exportToDXF_R12()`
  - Remove writeObjects() entirely (not needed in R12)
  - Remove writeClasses() entirely (not needed in R12)
  - Remove addBLOCKRECORDTable() (R13+ feature)

  **Must NOT do**:
  - Do NOT include CLASSES section
  - Do NOT include OBJECTS section
  - Do NOT call any writeObjects/writeClasses methods
  - Do NOT break the existing public API (exportToDXF, downloadDXF, parseSVGElement)
  - Do NOT change the call signature of exportToDXF

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Orchestrator ties everything together, needs careful integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 3, 6, 8 (needs all section writers and entity mapper)

  **References**:

  **Pattern References**:
  - `src/export/ExportModule.js:93-136` — Current exportToDXF() flow: HEADER→CLASSES→TABLES→BLOCKS→ENTITIES→OBJECTS→EOF
  - `src/export/ExportModule.js:1774-1808` — Current writeEntities() for entity ordering

  **WHY Each Reference Matters**:
  - Shows the section order and entity ordering to simplify
  - Entity ordering: partFront first, then offsets, then result, then bits

  **Acceptance Criteria**:
  - [ ] DXF output has sections in order: HEADER, TABLES, BLOCKS, ENTITIES, EOF
  - [ ] No CLASSES section in output
  - [ ] No OBJECTS section in output
  - [ ] All entities use R12-compatible types (LINE, ARC, CIRCLE, POLYLINE)
  - [ ] Public API unchanged (exportToDXF, downloadDXF, parseSVGElement)
  - [ ] CRLF line endings in output

  **QA Scenarios:**

  ```
  Scenario: R12 section order
    Tool: Bash
    Steps:
      1. Call exportToDXF_R12 with sample data
      2. Split output by CRLF
      3. Find section names after "2" group code
      4. Verify order: HEADER, TABLES, BLOCKS, ENTITIES, EOF
      5. Verify no "CLASSES" or "OBJECTS" section names
    Expected Result: Exact section order, no forbidden sections
    Evidence: .sisyphus/evidence/task-7-r12-section-order.txt

  Scenario: No AC1015+ features
    Tool: Bash
    Steps:
      1. Run full DXF export
      2. Search for: "LWPOLYLINE", "SPLINE", "CLASSES", "OBJECTS", "AcDbEntity", "10004", "10073"
      3. All searches should return zero matches
    Expected Result: No R13+ features found in output
    Failure Indicators: Any forbidden string found
    Evidence: .sisyphus/evidence/task-7-no-modern-features.txt
  ```

  **Commit**: YES
  - Message: `refactor(export): implement R12 exportToDXF orchestrator`
  - Files: `src/export/ExportModule.js`
  - Pre-commit: `npm run test`

- [ ] 8. XDATA + Color/Layer Support for R12

  **What to do**:
  - Fix XDATA placement: XDATA must be written INSIDE an entity, NOT as standalone group codes
  - Implement `writeEntityWithXDATA(entityType, handle, layer, xdataApp, xdataPairs, entityBodyFn)`:
    - Write entity header (0/entityType/5/handle/8/layer)
    - Write entity-specific body (via entityBodyFn callback)
    - Write XDATA at end of entity: `1001/appName/1002/{/1000/key/1000/value/1002/}`
  - Keep layer naming convention: `bit.name_depthValueMM_bit.operation`
  - Keep XDATA format for "ACAD" application (not "Rhino" — use standard ACAD app)
  - Color support: Use ACI color index (group code 62) only — no RGB true color (420) in R12
  - Remove rgbToACI() complexity — just use basic 1-9 ACI colors

  **Must NOT do**:
  - Do NOT write XDATA as standalone between entities (current bug)
  - Do NOT use group code 420 (RGB true color) — R12 doesn't support it
  - Do NOT write XDATA for "Rhino" application — use "ACAD" instead

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - **Skills**: []

  **Acceptance Criteria**:
  - [ ] XDATA written inside entity (after entity body, before next entity)
  - [ ] No standalone XDATA group codes between entities
  - [ ] Colors use group code 62 (ACI index) only

  **Commit**: YES

- [ ] 9. Integration: Wire New DXFExporter into ExportModule

  **What to do**:
  - Replace `ExportModule.exportToDXF()` to call `exportToDXF_R12()` instead of the old method
  - Remove old AC1018 methods from DXFExporter that are no longer called
  - KEEP: parseSVGPathSegments, arc calculation methods, calculateBulge, downloadDXF
  - Verify script.js still calls exportToDXF correctly

  **Must NOT do**:
  - Do NOT change the ExportModule public API
  - Do NOT modify script.js call site

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-facade`]

  **Acceptance Criteria**:
  - [ ] ExportModule.exportToDXF() produces R12 DXF
  - [ ] `npm run build` succeeds
  - [ ] `npm run test` passes

  **Commit**: YES

- [ ] 10. Vitest Test Suite for R12 DXF Output

  **What to do**:
  - Create `tests/export-r12.spec.js` with tests for: header, tables, blocks, entities, section order, handles
  - Create helper to parse DXF string into structured object
  - Use actual SVG path data for realistic test cases

  **Must NOT do**:
  - Do NOT test internal implementation details — test DXF output structure

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`vitest`]

  **Acceptance Criteria**:
  - [ ] Test file created
  - [ ] All tests pass with `npm run test`

  **Commit**: YES

- [ ] 11. Dynamic Extent Calculation + Validation

  **What to do**:
  - Replace hardcoded $EXTMIN/$EXTMAX with dynamically calculated values from actual geometry
  - Calculate extents from all entity coordinates
  - Add validation: if no entities, use default extent (0,0)-(100,100)

  **Must NOT do**:
  - Do NOT use hardcoded extent values from old code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Acceptance Criteria**:
  - [ ] $EXTMIN/$EXTMAX reflect actual geometry bounds

  **Commit**: YES

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ build-facade skill)
  Start from clean state. Build project, trigger DXF export, parse output file. Verify: R12 version string, no LWPOLYLINE/SPLINE, correct POLYLINE+VERTEX structure, Layer "0" exists, CRLF endings. Test in Rhino if possible. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `refactor(export): add DXFWriter helper and R12 header` - DXFWriter.js, ExportModule.js
- **2**: `refactor(export): add R12 TABLES section writer` - ExportModule.js
- **3**: `refactor(export): add R12 BLOCKS section writer` - ExportModule.js
- **4**: `refactor(export): add POLYLINE+VERTEX writer with bulge` - ExportModule.js
- **5**: `refactor(export): add LINE/ARC/CIRCLE entity writers` - ExportModule.js
- **6**: `refactor(export): add SVG→R12 entity mapper` - ExportModule.js
- **7**: `refactor(export): implement R12 exportToDXF orchestrator` - ExportModule.js
- **8**: `refactor(export): add XDATA and color/layer R12 support` - ExportModule.js
- **9**: `refactor(export): wire new DXFExporter into ExportModule` - ExportModule.js, script.js
- **10**: `test(export): add Vitest test suite for R12 DXF output` - tests/export-r12.spec.js
- **11**: `refactor(export): add dynamic extent calculation` - ExportModule.js

---

## Success Criteria

### Verification Commands
```bash
npm run test                                    # Expected: all tests pass
npm run build                                   # Expected: successful build
# Generate DXF and validate structure:
node -e "const fs=require('fs'); const d=fs.readFileSync('test_output.dxf','utf8'); console.log(d.includes('AC1009'), !d.includes('LWPOLYLINE'), !d.includes('SPLINE'), !d.includes('CLASSES'))"  # Expected: true true true true
```

### Final Checklist
- [ ] $ACADVER = AC1009 in generated DXF
- [ ] No LWPOLYLINE entities in output
- [ ] No SPLINE entities in output
- [ ] No CLASSES section
- [ ] No OBJECTS section
- [ ] POLYLINE+VERTEX+SEQEND structure present
- [ ] Bulge values in VERTEX for arc segments
- [ ] Layer "0" exists in LAYER table
- [ ] File opens in ArtCam 2018
- [ ] File opens in Rhino
- [ ] All "Must NOT Have" absent
