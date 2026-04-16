# Draft: DXF Export Refactoring

## Problem Statement
Exported DXF files open correctly in Rhino and ABViewer, but **ArtCam 2018** fails to import with error: "Failed to import Data"

## Codebase Analysis (ExportModule.js — 4914 lines)

### Current DXF Structure
- Version: **AC1018** (AutoCAD 2004)
- Sections: HEADER → CLASSES → TABLES → BLOCKS → ENTITIES → OBJECTS → EOF
- CRLF line endings

### Identified Weaknesses & Suspected Issues

#### 🔴 CRITICAL — Likely ArtCam Incompatibility Causes

1. **LWPOLYLINE entity** (lines 4350-4535)
   - ArtCam 2018 is a CAM program from ~2005 era
   - LWPOLYLINE was introduced in AutoCAD 2000 (AC1015) but many older programs don't support it
   - **ArtCam likely requires POLYLINE + VERTEX entities instead**
   - Current code uses LWPOLYLINE exclusively for closed contours and polylines

2. **SPLINE entity** (lines 4259-4345, 4734-4788)
   - SPLINE (NURBS curves) were introduced in AutoCAD R13
   - Many CAM programs do NOT support SPLINE entities
   - ArtCam probably can't parse SPLINE at all
   - Current code writes bezier curves as SPLINE entities
   - **Should approximate beziers as POLYLINE with arc segments (bulge) instead**

3. **AC1018 version** (line 151)
   - AC1018 = AutoCAD 2004 format
   - This is newer than what ArtCam 2018 was designed for
   - **Should use AC1015 (AutoCAD 2000) or even AC1012 (R13) for max compatibility**
   - The CLASSES and OBJECTS sections are AC1015+ features that may confuse simple importers

4. **CLASSES section** (lines 522-620)
   - Contains IMAGE, IMAGEDEF, WIPEOUT, WIPEOUTVARIABLES, MPOLYGON classes
   - **NONE of these are actually used in the exported drawing**
   - Referencing classes that aren't used can confuse strict parsers
   - ArtCam may try to load these class definitions and fail

5. **OBJECTS section** (lines 2436-2788)
   - Very complex with DICTIONARY, WIPEOUTVARIABLES, MLINESTYLE, LAYOUT, RASTERVARIABLES, XRECORD
   - Contains hardcoded handle references (10079, 1007A, etc.)
   - LAYOUT object references handle "1F" for BLOCK_RECORD — but handle linkage may be broken
   - **Missing or incorrect owner handle (group 330) on root DICTIONARY**
   - ArtCam may fail parsing this section

#### 🟡 MEDIUM — Structural Issues

6. **Handle management is chaotic**
   - `handleCounter` starts at 0x100 (line 80)
   - But BLOCK_RECORD uses hardcoded handles "1F", "1B", "10004", "10025"
   - BLOCK section uses hardcoded handles "10073", "10074", "10075", "10076"
   - OBJECTS uses hardcoded handles "10079"-"10084"
   - **Risk: handle collisions between auto-generated and hardcoded handles**
   - Auto-generated handles may overlap with hardcoded ones

7. **BLOCK_RECORD linkage is broken**
   - BLOCK_RECORD table has entries with handles "1F", "1B"
   - BLOCK section has entries with handles "10073", "10075"
   - **These handles DON'T MATCH** — each BLOCK should reference its BLOCK_RECORD handle
   - The BLOCK entities need `330` (owner handle) pointing to their BLOCK_RECORD

8. **Missing Layer "0"**
   - Line 653: Layer 0 is commented out: `// this.writeLayer("0", 7, 0, 0, 0);`
   - **Layer "0" is MANDATORY in DXF** — every entity on default layer references it
   - BLOCKS use layer "0" but it's not defined in the LAYER table

9. **Duplicate layer definitions**
   - Lines 693-697: All bits get written to layer "Default"
   - Lines 656: "Default" layer is already created once
   - This creates duplicate LAYER entries with same name "Default"

10. **$DWGCODEPAGE = ANSI_1251** (line 157)
    - This is Cyrillic codepage — may cause issues on non-Russian systems
    - Should be ANSI_1252 or just leave default

11. **Hardcoded EXTMIN/EXTMAX values** (lines 370-381)
    - These are specific to one drawing, not dynamically calculated
    - ArtCam may reject files with wrong extents

12. **XDATA appended without entity** (lines 1847-1859)
    - `addBitXDATA` pushes XDATA group codes directly into dxfContent
    - But XDATA must be part of an entity, not standalone
    - The XDATA appears after the last entity in writeBitShape, but it's NOT properly nested
    - This creates malformed DXF — XDATA group codes between entities

#### 🟢 MINOR — Code Quality

13. **Massive push() call repetition**
    - 4914 lines, most are `this.dxfContent.push("code"); this.dxfContent.push("value");`
    - Should use helper methods like `writePair(code, value)`

14. **Unnecessary ABViewer-specific blocks**
    - _CLOSEDFILLED block (lines 1626-1729) with SOLID + LINE entities
    - ABViewer_RedLine block (lines 1731-1765)
    - These are ABViewer artifacts, not part of our data
    - **Including them bloats the file and may confuse other programs**

15. **No dynamic extent calculation**
    - $EXTMIN/$EXTMAX are hardcoded
    - Should be calculated from actual geometry

## Research Findings

### From Librarian (DXF format spec) ✅ COMPLETE

**CRITICAL FINDING: ArtCam 2018 needs AC1009 (R12) format**

1. **DXF Version**: Use AC1009 (R12, 1992) for maximum CAM compatibility
   - R12 is the LAST version before major structural changes in R13
   - No CLASSES section, no OBJECTS section, optional handles
   - ArtCam forums confirm: "Save as R12 DXF to convert LWPOLYLINE to POLYLINE"

2. **LWPOLYLINE → POLYLINE+VERTEX+SEQEND**: Mandatory for ArtCam
   - LWPOLYLINE introduced in R14, NOT supported by ArtCam
   - Must use old-style: POLYLINE(flag 66=1) → VERTEX entries → SEQEND
   - Bulge values still work in VERTEX subentities

3. **SPLINE → POLYLINE**: ArtCam has LIMITED/NO SPLINE support
   - SPLINE introduced in R13, not in R12
   - CAM quote: "Don't use splines. CNC equipment likes 'clearly definable geometry'. Read: lines and arcs."
   - Convert bezier curves to POLYLINE with arc segments (bulge)

4. **Simple entity types only**: LINE, ARC, CIRCLE, POLYLINE
   - Avoid: SPLINE, ELLIPSE, LWPOLYLINE, MTEXT

5. **R12 structure**: HEADER + TABLES + ENTITIES + EOF
   - No CLASSES section
   - No OBJECTS section
   - BLOCKS section optional

6. **Handle management**: Optional in R12 (set $HANDLING=1 if used)

### From Explorer (codebase context) ✅ COMPLETE

**Export call chain:**
- UI button "export-dxf-btn" → `script.js:exportToDXF()` → `app.getModule("export").exportToDXF(bitsOnCanvas, partPath, partFront, offsetContours, panelThickness)`

**Constants:**
- `ARC_APPROX_TOLERANCE = 0.15` (mm RMS tolerance for Bezier → arc)
- `ARC_RADIUS_TOLERANCE = 0.01` (mm tolerance for radius vs chord checks)

**SVG path generation:**
- `updateOffsetContours()` in script.js builds offsetContours array
- Uses `CustomOffsetCalculator` (CustomOffsetProcessor.js) with `useArcApproximation: true`
- Each entry: `{ element, bitIndex, offsetDistance, operation, pass, pathData, depth, isWorkOffset, for3D, isPOMain, isPOPhantom }`
- BitsManager.createBitShapeElement creates SVG bit shapes (.bit-shape class)
- PhantomBitCalculator generates phantom shapes for VC/PO

**Tests:**
- tests/offset-rule1-arc-serialization.spec.js — arc auto-correct and tolerance behavior
- tests/__diag_app_path.spec.js, tests/_debug_offset.spec.js, etc.
- No dedicated DXF export tests found

## Decisions (CONFIRMED)

1. **Подход**: Полный R12 (AC1009) — переписать экспортёр с нуля под R12 формат
2. **Кривые Безье**: Аппроксимировать отрезками (LINE сегменты с заданной точностью)
3. **Метаданные**: Имена слоёв (bit_name_depthMM_operation) + XDATA для расширенной информации
4. **Структура DXF**: HEADER + TABLES + ENTITIES + EOF (без CLASSES/OBJECTS)
5. **Entity типы**: LINE, ARC, CIRCLE, POLYLINE+VERTEX+SEQEND (никаких LWPOLYLINE/SPLINE)
6. **Дуги в POLYLINE**: Использовать bulge values в VERTEX для дуговых сегментов

## Scope Boundaries
- INCLUDE: Rewrite DXF exporter to R12 format, POLYLINE+VERTEX entities, arc bulge support, line approximation for beziers, layer naming, XDATA, proper handle management
- EXCLUDE: Changing the 2D canvas/rendering pipeline, changing bit operation logic, changing offset calculation

## Test Strategy Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES (tests-after) — add tests for the new exporter
- **Framework**: Vitest
- **Agent-Executed QA**: ALWAYS (mandatory)
