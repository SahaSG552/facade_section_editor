---
name: cad-geometry
description: "Expert in parametric CAD systems, geometric algorithms, path operations, and computational geometry. Use for offset curves, boolean operations, path processing, and 2D/3D geometry."
---

# CAD Geometry Master

Deep expertise in computational geometry, parametric CAD systems, and path operations for JavaScript/TypeScript.

## Core Concepts

### 1. Path Representations

- **Bezier curves** - Cubic and quadratic Bezier curves
- **Arc** - Circular arcs (start, end, radius)
- **Line** - Straight line segments
- **Polygon** - Closed shapes from segments

### 2. Key Algorithms

#### Offset/Parallel Curves

Offsetting is **mathematically complex** for Bezier curves.

**Methods:**

- Hoschek's least squares method
- Subdivision at inflection points
- Adaptive offset approximation

```javascript
// Paper.js approach
import { OffsetUtils } from "./offset.js";
const outerPath = OffsetUtils.offsetPath(path, distance);
```

**Libraries for offset:**

- `paperjs-offset` - Paper.js offset extension
- `paper-clipper` - Clipper WASM integration
- `bezier.js` - Mathematical Bezier operations

#### Boolean Operations

- **Union** - Combine shapes
- **Subtraction** - Cut shapes
- **Intersection** - Overlapping region
- **XOR** - Non-overlapping

```javascript
// Paper.js built-in
const result = path1.unite(path2);
const cut = path1.subtract(path2);
```

**Performance libraries:**

- `paper-clipper` - Clipper WASM (faster than Paper.js native)
- `polytree` - Modern Octree-based CSG for 3D

### 3. Coordinate Systems

| System   | Y-axis | Origin      |
| -------- | ------ | ----------- |
| SVG      | Down   | Top-left    |
| Paper.js | Down   | Top-left    |
| Three.js | Up     | Center      |
| Math     | Up     | Bottom-left |

**Always transform coordinates when converting!**

## Best Libraries for JavaScript Geometry

### 2D Geometry

| Library             | Best For                     | npm               |
| ------------------- | ---------------------------- | ----------------- |
| `paper`             | Path operations, boolean ops | paper             |
| `geometric`         | Point/line/polygon math      | geometric         |
| `2d-geometry`       | Typescript, performance      | 2d-geometry       |
| `cga.js`            | Convex hull, triangulation   | cga               |
| `robust-predicates` | Floating-point safe math     | robust-predicates |
| `paperjs-offset`    | Bezier offsetting            | paperjs-offset    |
| `paper-clipper`     | Fast polygon boolean ops     | paper-clipper     |
| `clipper-lib`       | Polygon offset, WASM         | js-angusj-clipper |

### 3D Geometry

| Library         | Best For                     | npm                  |
| --------------- | ---------------------------- | -------------------- |
| `three`         | 3D rendering                 | three                |
| `manifold-3d`   | CSG, mesh processing         | manifold-3d          |
| `three-bvh-csg` | Three.js CSG                 | three-bvh-csg        |
| `polytree`      | Octree CSG + spatial queries | @jgphilpott/polytree |

### Predicates (Floating-Point Safe)

```javascript
import { orient2d, incircle } from "robust-predicates";

// Orientation test - positive = counter-clockwise
const ccw = orient2d(ax, ay, bx, by, cx, cy) > 0;

// Point in circle test
const inside = incircle(ax, ay, bx, by, cx, cy, dx, dy) < 0;
```

## Paper.js Specific Patterns

### Path Creation

```javascript
// From SVG path data
const path = new paper.Path("M0 0 L100 100");

// From points
const path = new paper.Path();
path.add(new paper.Point(0, 0));
path.lineTo(new paper.Point(100, 100));

// Bezier curve
const curve = new paper.Path();
curve.moveTo(p1);
curve.cubicCurveTo(handle1, handle2, end);
```

### Path Operations

```javascript
// Offsetting (requires paperjs-offset)
PaperOffset.offset(path, 10, { join: "round" });

// Boolean operations
const united = path1.unite(path2);
const subtracted = path1.subtract(path2);
const intersected = path1.intersect(path2);

// Simplify to reduce points
path.simplify(tolerance);

// Flatten curves to segments
path.flatten(maxDistance);
```

### Path Analysis

```javascript
// Get bounds
const bounds = path.bounds;

// Point on path
const point = path.getPointAt(length * 0.5);

// Tangent at point
const tangent = path.getTangentAt(length * 0.5);

// Intersection with line
const intersections = path.getIntersections(line);
```

## CAD-Specific Patterns

### Parametric Design

```javascript
class ParametricPanel {
  constructor(width, height, thickness) {
    this.width = width;
    this.height = height;
    this.thickness = thickness;
  }

  // Regenerate geometry when parameters change
  regenerate() {
    this.path = this._createPanelPath();
    this._applyBitOperations();
  }

  _createPanelPath() {
    // Create panel outline
  }

  _applyBitOperations() {
    // Apply router bit profiles
  }
}
```

### Toolpath Generation

```javascript
// Generate offset for bit diameter
function generateToolpath(profile, bitDiameter) {
  const offset = bitDiameter / 2;
  const offsetPath = OffsetUtils.offsetPath(profile, offset);
  return offsetPath;
}

// V-Carve simulation
function vCarve(path, bitAngle, depth) {
  const width = 2 * depth * Math.tan(bitAngle / 2);
  // Generate V-shaped cut profile
}
```

### Nesting/Packing

```javascript
// Simple bounding box packing
function packPanels(panels) {
  // Sort by area descending
  const sorted = panels.sort((a, b) => b.area - a.area);

  // Place first panel at origin
  // For each remaining panel:
  // - Try positions in row
  // - Move to next row when full
  // - Check collisions

  return placements;
}
```

## Floating-Point Robustness

**Problem:** Standard floating-point causes geometric errors.

**Solution:** Robust predicates

```javascript
import { orient2d, orient2dFast } from "robust-predicates";

// Instead of: (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0
// Use:
orient2d(a.x, a.y, b.x, b.y, c.x, c.y) > 0;
```

**Tolerance strategy:**

```javascript
const EPSILON = 1e-10;
const CLOSE = (a, b) => Math.abs(a - b) < EPSILON;
const POINTS_EQUAL = (p1, p2) => CLOSE(p1.x, p2.x) && CLOSE(p1.y, p2.y);
```

## Performance Tips

### For Large Paths

1. **Simplify early** - Reduce point count
2. **Use spatial index** - rbush, kdbush for collision
3. **Clipper for booleans** - Much faster than Paper.js
4. **Web Workers** - Heavy computation off main thread

### Memory Management

```javascript
// Dispose when done
path.remove();
path = null;

// Or keep for reuse
path.visible = false;
```

## Common Patterns for Your Project

### Offset for Router Bits

```javascript
import { clipperOffset } from "paper-clipper";

async function offsetForBit(path, bitRadius, tolerance = 0.25) {
  const offsetPaths = await clipperOffset(clipper)(path, {
    offset: bitRadius,
    simplify: true,
    tolerance: tolerance,
  });
  return offsetPaths;
}
```

### 2D to 3D Path Conversion

```javascript
function pathTo3D(paperPath, depth, thickness) {
  const shape = new THREE.Shape();

  // Paper.js uses Y-down, Three.js uses Y-up
  paperPath.segments.forEach((seg) => {
    shape.lineTo(seg.point.x, -seg.point.y);
  });

  // Extrude for thickness
  const extrudeSettings = { depth, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  return geometry;
}
```

## When to Use What

| Task                  | Library/Approach             |
| --------------------- | ---------------------------- |
| Path editing          | Paper.js                     |
| Fast polygon booleans | paper-clipper (Clipper WASM) |
| Bezier offsetting     | paperjs-offset               |
| Robust math           | robust-predicates            |
| 3D CSG                | manifold-3d or three-bvh-csg |
| Spatial queries       | polytree (Octree)            |
| Simple geometry math  | geometric                    |
| TypeScript 2D         | 2d-geometry                  |

## Key References

- [Paper.js Offset Gist](https://gist.github.com/lehni/a665d6f9d95dd055b0ff901f8e313780) - Official offset implementation
- [Bezier Primer](https://pomax.github.io/bezierinfo/) - Comprehensive Bezier guide
- [Computational Geometry in C](http://geomalgorithms.com/) - Classic algorithms
