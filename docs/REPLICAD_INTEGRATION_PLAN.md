# Plan: Replicad Integration for BREP-Based 3D Canvas

## Context

Current facade_section_editor uses mesh-based 3D pipeline with significant complexity:
- **ExtrusionBuilder.js** — 4500+ lines handling miter/round extrusion via custom CurvePath parsing
- **ManifoldCSG** — mesh-based boolean operations (fragile, topology issues)
- **BREPVisualizer** — post-hoc faceID assignment to mesh triangles
- **STL only export** — no STEP/IGES support

Goal: Replace with native BREP modeling using Replicad + opencascade.js, gaining:
- True B-Rep geometry (faces, edges, vertices as first-class entities)
- `genericSweep` with `transitionMode: 'round'` (600+ lines → 1 call)
- Native STEP/IGES export
- More robust boolean operations

---

## Phase 1: ReplicadCanvasModule Skeleton

### Goal
Create parallel module `ReplicadCanvasModule` that renders a simple panel in Three.js using Replicad.

### Tasks

1. **Package Installation**
   ```bash
   npm install replicad replicad-opencascadejs
   ```

2. **Module Structure**
   ```
   src/replicad/
   ├── ReplicadCanvasModule.js    # Main module (BaseModule pattern)
   ├── SketchBuilder.js            # SVG path → Replicad sketch
   ├── MeshRenderer.js             # Replicad shape → Three.js BufferGeometry
   └── index.js                     # Module exports
   ```

3. **Initialization Pattern**
   ```javascript
   // ReplicadCanvasModule.js
   import replicad from 'replicad';
   import opencascade from 'replicad-opencascadejs';

   async init() {
       this.oc = await opencascade();
       replicad.setOC(this.oc);
       this.log.info('Replicad initialized');
   }
   ```

4. **Simple Panel Rendering**
   - Parse `part-front` SVG element → Replicad sketch
   - `sketch.extrude(thickness)` → solid
   - Tessellate with `shape.mesh()` → Three.js BufferGeometry
   - Render alongside existing ThreeModule (not replacing yet)

5. **Coordinate System Handling**
   - Paper.js/SVG: Y-down, origin top-left
   - Replicad: follows OCCT — Y-up, origin at panel center
   - Need `paperToOCCT()` transformation utility

### Verification
- [ ] Panel renders in new canvas
- [ ] Panel dimensions match existing ThreeModule
- [ ] No console errors
- [ ] WASM loads without issues

---

## Phase 2: Sketch Translation (SVG → Replicad)

### Goal
Translate all SVG path commands to Replicad Sketcher API.

### SVG → Sketcher Mapping

| SVG Command | Replicad Equivalent |
|-------------|---------------------|
| `M x y` | `.moveTo([x, y])` |
| `L x y` | `.lineTo([x, y])` |
| `H x` | `.hLine(x)` or `.lineTo([x, currentY])` |
| `V y` | `.vLine(y)` or `.lineTo([currentX, y])` |
| `C cx1 cy1, cx2 cy2, x y` | `.bezierCurveTo([cx1, cy1], [cx2, cy2], [x, y])` |
| `Q cx cy, x y` | `.quadraticBezierCurveTo([cx, cy], [x, y])` |
| `A rx ry rot large sweep x y` | `.absArc()`, `.arc()`, `.threePointsArc()` |
| `Z` | `.close()` |
| Multiple subpaths | Multiple `new Sketcher()` or `.add()` |

### Key Reference
- https://github.com/raydeleu/ReplicadManual/wiki/3.-Sketch
- https://github.com/raydeleu/ReplicadManual/wiki/10.-Export-and-import

### Implementation

```javascript
// SketchBuilder.js
class SketchBuilder {
    /**
     * Parse SVG path data to Replicad sketch
     * @param {string} pathData - SVG path d attribute
     * @param {string} plane - 'XZ', 'XY', 'YZ' (which plane to sketch on)
     * @returns {Object} { sketch: Sketcher, profile: Shape }
     */
    buildFromSVGPath(pathData, plane = 'XZ') {
        const sketch = new replicad.Sketcher(plane);
        const commands = this.parseSVGCommands(pathData);

        for (const cmd of commands) {
            switch (cmd.type) {
                case 'M':
                    sketch.moveTo(cmd.x, cmd.y);
                    break;
                case 'L':
                    sketch.lineTo(cmd.x, cmd.y);
                    break;
                case 'C':
                    sketch.bezierCurveTo(
                        [cmd.cx1, cmd.cy1],
                        [cmd.cx2, cmd.cy2],
                        [cmd.x, cmd.y]
                    );
                    break;
                // ... etc
            }
        }

        sketch.close();
        return { sketch, shape: sketch.sketchOnPlane(plane).extrude(1) };
    }
}
```

### Tasks

1. **SVG Command Parser**
   - Parse `d="M L C Q A Z"` into normalized command objects
   - Handle relative vs absolute coordinates
   - Handle implicit command repetition (e.g., `M x y L x y L x y`)

2. **Sketcher API Coverage**
   - Line operations: `moveTo`, `lineTo`, `hLine`, `vLine`
   - Arc operations: `absArc`, `arc`, `threePointsArc`, `halfEllipse`
   - Curve operations: `bezierCurveTo`, `quadraticBezierCurveTo`
   - Closure: `close`, `closeWithMirror`

3. **Multi-Contour Handling**
   - Current pipeline uses `offsetContours` for multiple passes
   - Replicad: create compound or multiple sketches

### Verification
- [ ] All SVG paths from `part-front` parse correctly
- [ ] Round-trip: SVG → Sketch → blobSTEP → importSTEP → same shape
- [ ] Arc approximation matches existing `arcDivisionCoefficient`

---

## Phase 3: Bit Profile Extrusion (Round/Miter Sweep)

### Goal
Replace `ExtrusionBuilder._extrudeMiter()` and `._extrudeRound()` (1000+ lines combined) with `genericSweep()`.

### Current Complexity Being Replaced

**`_extrudeRound` pattern:**
1. Create half-profile (bottom half of bit shape)
2. Extrude along path
3. Detect corner junctions
4. Create lathe geometry for each corner
5. Merge all parts
6. ~600 lines of mesh manipulation

**Replicad equivalent:**
```javascript
// Single call!
const cutter = pathSketch.genericSweep(
    bitProfile,           // Full bit profile as Shape
    pathSketch,           // The path to sweep along
    { transitionMode: 'round' },  // Automatic round corners
    false
);
```

### Tasks

1. **Bit Profile Parsing**
   - Current: `bit.bitData.profileSvg` or `bit.bitData.profilePath`
   - Replicad: Create Shape from profile SVG using `SVGPath.createShapes()`
   - Map `THREE.Shape` → Replicad `Shape`

2. **`genericSweep` Integration**
   ```javascript
   const main = (exports) => {
       const { Sketcher } = exports;

       // Path (from offset contour)
       const path = new Sketcher('XZ').importSVG(contourPathData);

       // Profile (from bit profile SVG)
       const profileShape = buildProfileShape(bit.bitData);

       // Sweep with round corners
       const swept = path.genericSweep(
           profileShape,
           path,
           { transitionMode: 'round' },
           false
       );

       return swept;
   };
   ```

3. **Miter vs Round Mode**
   - VC operations → `transitionMode: 'miter'` (sharp corners)
   - PO/Profile → `transitionMode: 'round'` (smooth corners)

4. **Coordinate Transform for Extrusion**
   - Need to handle `side: 'top'` vs `side: 'bottom'`
   - Z-axis direction flipping for bottom side

### Verification
- [ ] Round corners on PO bits match current lathe-based implementation
- [ ] Miter corners on VC bits are truly sharp
- [ ] No geometric differences beyond tolerance
- [ ] Performance is acceptable (< 1s per bit)

---

## Phase 4: Boolean Operations

### Goal
Replace `ManifoldCSG` with Replicad's `.cut()`, `.fuse()`, `.intersect()`.

### Current Pipeline

```
Panel (ExtrudeGeometry from SVG)
    ↓
ManifoldCSG.subtract({ cutters: bitMeshes })
    ↓
Result mesh with faceID via FaceIDGenerator
```

### Replicad Pipeline

```
Panel (B-Rep solid from sketch.extrude())
    ↓
bitShape.cut(panel) for each bit
    ↓
result.fillet() if needed
    ↓
shape.blobSTEP() or shape.mesh() for rendering
```

### Tasks

1. **Panel as B-Rep Solid**
   ```javascript
   const panelSketch = buildFromSVGPath(partFrontPathData);
   const panel = panelSketch.extrude(panelThickness);
   ```

2. **Cumulative Boolean**
   ```javascript
   let result = panel;
   for (const bit of bits) {
       const cutter = buildBitCutter(bit);
       result = result.cut(cutter);
   }
   ```

3. **Union Before Subtract Option**
   - Current code has `useUnionBeforeSubtract` option
   - Replicad: `shape.fuse(cutter)` for union, then `.cut()` for difference

### Verification
- [ ] CSG result matches existing ManifoldCSG output
- [ ] No topology errors ("non-manifold edge" warnings)
- [ ] Boolean operations complete in reasonable time

---

## Phase 5: V-Carve Multi-Pass

### Goal
Implement V-Carve with multiple depth passes using Replicad.

### Current V-Carve Logic (ThreeModule.js ~800 lines)

```javascript
// Calculate passes based on bit angle
const angle = bit.bitData.angle || 90;
const bitHeight = (hypotenuse / 2) * (1 / Math.tan(angle * Math.PI / 180 / 2));
const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

// For each pass:
// 1. Calculate depth (cumulative)
// 2. Calculate contour offset (outward for each pass)
// 3. Create extrusion with miter
// 4. Mark as phantom (semi-transparent)
```

### Replicad V-Carve

```javascript
const main = (exports) => {
    const { Sketcher } = exports;

    let result = panel;

    for (let pass = 0; pass < passes; pass++) {
        const depth = depths[pass];
        const offset = contourOffsets[pass];

        // Offset contour path
        const pathData = getVCContour(bit, pass);
        const pathSketch = new Sketcher('XZ').importSVG(pathData);

        // V-bit profile (triangle shape)
        const vProfile = new Sketcher()
            .moveTo([-bitRadius, 0])
            .lineTo([0, -depth])
            .lineTo([bitRadius, 0])
            .close();

        // Extrude along path with miter
        const cutter = pathSketch.genericSweep(
            vProfile,
            pathSketch,
            { transitionMode: 'miter' },
            false
        );

        result = result.cut(cutter);
    }

    return result;
};
```

### Tasks

1. **Pass Calculation Logic**
   - Preserve existing V-Carve math (angle, depth, offset)
   - Reuse `UpdatePipeline` or `OffsetContourBuilder` for contour generation

2. **Phantom Bit Visualization**
   - Current: semi-transparent mesh
   - Replicad: `.opacity()` on material or separate rendering

3. **Cutter Combination**
   - All VC passes cut from same panel
   - Order doesn't matter for final result (mathematically)

### Verification
- [ ] VC grooves match existing implementation
- [ ] Pass depths and offsets are identical
- [ ] Phantom visualization renders correctly

---

## Phase 6: Pocketing (PO) Operations

### Goal
Implement PO (pocketing) with main bit + phantom bit + pocket filler.

### Current PO Logic

```
1. Main contour (left edge of bit path)
2. Phantom contour (right edge, offset by pocketOffset)
3. Main bit extrusion (round)
4. Phantom bit extrusion (semi-transparent)
5. Pocket filler: boolean of main minus phantom
6. Extension: cylinder above main bit
```

### Replicad PO

```javascript
const main = (exports) => {
    const { Sketcher, localGC } = exports;

    let result = panel;

    // Main cutter
    const mainPath = new Sketcher('XZ').importSVG(mainContourPathData);
    const mainCutter = mainPath.genericSweep(bitProfile, mainPath,
        { transitionMode: 'round' }, false);

    // Pocket offset: cut inner region if needed
    if (pocketOffset > 0) {
        const phantomPath = new Sketcher('XZ').importSVG(phantomContourPathData);
        const phantomCutter = phantomPath.genericSweep(bitProfile, phantomPath,
            { transitionMode: 'round' }, false);

        // Pocket = mainCutter - phantomCutter
        const pocket = mainCutter.cut(phantomCutter);
        result = result.cut(pocket);
    } else {
        result = result.cut(mainCutter);
    }

    return result;
};
```

### Tasks

1. **Main/Phantom Contour Handling**
   - Both come from `offsetContours` array
   - Already calculated in existing pipeline

2. **Pocket Filler**
   - Replace `createPOPocketFiller()` with direct `.cut()` chain

3. **Extension (Shank)**
   - Current: separate cylinder extrusion
   - Replicad: `makeCylinder()` or simple sketch + extrude

### Verification
- [ ] PO result matches existing implementation
- [ ] Pocket width matches (diameter + pocketOffset)
- [ ] Extension renders correctly

---

## Phase 7: Fillet/Chamfer

### Goal
Add fillet/chamfer support (currently missing in BrepVisualizer).

### Replicad API

```javascript
const filleted = shape.fillet(radius, (edge) => {
    return edge.inPlane('XY').atCorner();
});

const chamfered = shape.chamfer(distance, (edge) => {
    return edge.inPlane('XY').atCorner();
});
```

### Tasks

1. **Edge Selection Criteria**
   - Current bits create specific edge patterns
   - Map `bit.operation` to appropriate edge filters

2. **Radius Determination**
   - From `bit.bitData.filletRadius` or default

### Verification
- [ ] Fillet renders smoothly
- [ ] No topology errors on sharp→round conversion

---

## Phase 8: Shell/Thicken

### Goal
Support thin-walled panels (shell operation).

### Replicad API

```javascript
const shelled = shape.shell(thickness, (face) => {
    return face.inPlane('XY');
});
```

### Tasks

1. **Face Selection**
   - Which face to remove (typically bottom or specific face)

2. **Thickness**
   - Uniform or variable shell thickness

### Verification
- [ ] Shell matches expected wall thickness
- [ ] No failed geometry warnings

---

## Phase 9: STEP/IGES Export

### Goal
Add native STEP and IGES export (currently only STL).

### Replicad API

```javascript
// STEP export (AP214)
const stepBlob = shape.blobSTEP();

// IGES export
const igesBlob = shape.blobIGES();
```

### Implementation

```javascript
async exportSTEP(shape) {
    const blob = shape.blobSTEP();
    const url = URL.createObjectURL(blob);
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facade.step';
    a.click();
    URL.revokeObjectURL(url);
}

async exportIGES(shape) {
    const blob = shape.blobIGES();
    // Same pattern
}
```

### Tasks

1. **UI Integration**
   - Add export buttons to material controls
   - Match existing STL export UI

2. **STEP Format Options**
   - AP214 (automotive) vs AP203 (aerospace)
   - `STEPControl_AsIs` should suffice

### Verification
- [ ] Exported STEP opens in FreeCAD/Blender
- [ ] Geometry is exact (not tessellated)
- [ ] Multiple bodies export correctly

---

## Phase 10: Integration & Switchover

### Goal
Replace or allow switching between old ThreeModule and new ReplicadCanvasModule.

### Tasks

1. **Parallel Rendering**
   - Render both canvases in "both" mode
   - Verify visual parity

2. **State Synchronization**
   - Share `bitsOnCanvas`, `offsetContours`, `panelDimensions`
   - Both modules respond to same state changes

3. **Performance Comparison**
   - Measure render time for both
   - Measure boolean operation time
   - Measure memory usage

4. **Gradual Switchover**
   - Option to enable ReplicadCanvasModule via feature flag
   - "Use new 3D engine" toggle

5. **Legacy Cleanup** (after verification)
   - Remove `ExtrusionBuilder`
   - Remove `ManifoldCSG`
   - Remove `three-bvh-csg` dependency
   - Remove custom `BREPVisualizer` (replaced by native B-Rep)

### Verification
- [ ] ReplicadCanvasModule passes all existing tests
- [ ] No regression in existing functionality
- [ ] Performance is acceptable

---

## Technical Notes

### Memory Management

Replicad uses opencascade.js WASM. Must handle memory carefully:

```javascript
// Use localGC() for temporary allocations
const main = (exports) => {
    const { Sketcher, localGC } = exports;
    const [result, gc] = localGC();

    // ... operations ...

    gc(); // Clean up intermediate shapes
    return result;
};
```

### Web Worker

For production, run Replicad in Web Worker to avoid blocking UI:

```javascript
// cad.worker.ts
import * as Comlink from 'comlink';
import replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';

const oc = await opencascade();
replicad.setOC(oc);

Comlink.expose({
    async buildPanel(svgPathData, thickness) {
        const sketch = new replicad.Sketcher('XZ').importSVG(svgPathData);
        return sketch.extrude(thickness);
    },
    async cut(panel, cutter) {
        return panel.cut(cutter);
    }
});
```

### Coordinate Transform Utility

```javascript
// Paper.js (Y-down) → OCCT (Y-up)
function paperToOCCT(point, panelCenter, panelHeight) {
    return {
        x: point.x - panelCenter.x,
        y: panelCenter.y - point.y,  // Flip Y
        z: 0
    };
}

// Or for Sketcher:
const sketch = new Sketcher('XZ')
    .importSVG(svgPathData, { x: -panelWidth/2, y: panelHeight/2 });
```

### Dependency Versions

```json
{
    "replicad": "^0.19.0",
    "replicad-opencascadejs": "^0.19.0"
}
```

Check compatibility with Vite 7.3 and ES modules.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Replicad `importSVG` doesn't parse complex paths | Medium | High | Build custom parser → Sketcher API |
| WASM memory leaks | Low | High | Use `localGC()` pattern |
| Performance regression | Medium | Medium | Benchmark early, optimize hotspots |
| STEP export incompatibility | Low | Low | Test with FreeCAD/Blender |
| `genericSweep` corner behavior differs | Medium | Medium | Match `transitionMode` settings |

---

## Future Enhancements (Out of Scope)

- Parametric dimensions (sliders for panel size)
- Assembly mode (multiple panels)
- Direct modeling (face edit)
- Rendering improvements (PBR materials)