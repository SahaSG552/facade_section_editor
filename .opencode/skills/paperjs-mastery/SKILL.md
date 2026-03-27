---
name: paperjs-mastery
description: "Master Paper.js for path operations, boolean operations, curve manipulation, and SVG path processing. Use for 2D graphics, path editing, and vector operations."
---

# Paper.js Mastery

Expert guide for Paper.js path operations, boolean operations, and vector graphics.

## Overview

Paper.js is a vector graphics scripting library that excels at:
- Path creation and manipulation
- Boolean operations (unite, subtract, intersect, exclude)
- Curve fitting and smoothing
- SVG path import/export
- Geometric calculations

## Core Classes

### Point
```javascript
const point = new paper.Point(x, y);

// Properties
point.x, point.y
point.length      // Distance from origin
point.angle       // Angle in degrees

// Methods
point.add(other)
point.subtract(other)
point.multiply(scalar)
point.normalize(length?)
point.rotate(angle, center?)
```

### Size
```javascript
const size = new paper.Size(width, height);
```

### Segment
```javascript
const segment = new paper.Segment(point, handleIn, handleOut);

// Access via path
path.segments[0].point
path.segments[0].handleIn
path.segments[0].handleOut
```

### Curve
```javascript
const curve = path.curves[0];

curve.point1, curve.point2           // Endpoints
curve.handle1, curve.handle2         // Control points
curve.length                          // Curve length
curve.getPointAt(t)                   // Point at t (0-1)
curve.getTangentAt(t)                 // Tangent at t
curve.getCurvatureAt(t)               // Curvature at t
```

### Path
```javascript
const path = new paper.Path();

// From SVG
const path = new paper.Path('M0 0 L100 100');

// Rectangle
const rect = new paper.Path.Rectangle(point, size);

// Circle
const circle = new paper.Path.Circle(center, radius);

// Arc
const arc = new paper.Path.Arc(from, through, to);

// Regular polygon
const hex = new paper.Path.RegularPolygon(center, 6, radius);
```

## Path Operations

### Boolean Operations
```javascript
// Union - combine shapes
const united = path1.unite(path2);

// Subtraction - cut out
const subtracted = path1.subtract(path2);

// Intersection - overlapping region
const intersected = path1.intersect(path2);

// Exclusion - non-overlapping
const excluded = path1.exclude(path2);

// Divide - split at intersections
const divided = path1.divide(path2);
```

### Path Modification
```javascript
// Simplify - reduce points while keeping shape
path.simplify(tolerance);  // default: 2.5

// Smooth - apply curve smoothing
path.smooth({ type: 'catmull-rom' });
path.smooth({ type: 'geometric' });

// Flatten - convert curves to lines
path.flatten(maxDistance);

// Reverse winding
path.reverse();

// Close/open path
path.closePath();
path.openPath();
```

### Offset/Expansion (Requires paperjs-offset)
```javascript
import { PaperOffset } from 'paperjs-offset';

// Offset outward
const outer = PaperOffset.offset(path, distance, { 
  join: 'round'  // 'miter' | 'bevel'
});

// Offset inward (negative distance)
const inner = PaperOffset.offset(path, -distance);

// Variable width stroke
const stroked = PaperOffset.offsetStroke(path, strokeWidth);
```

### Path Analysis
```javascript
// Bounds
const bounds = path.bounds;
const boundingBox = path.getBoundingBox();

// Point queries
const point = path.getPointAt(length);
const nearest = path.getNearestPoint(searchPoint);

// Intersections
const intersections = path.getIntersections(otherPath);

// Contains point
const inside = path.contains(testPoint);

// Interior point (guaranteed inside)
const interior = path.interiorPoint;
```

## Path Data (SVG)

### Import
```javascript
// From SVG path data string
const path = new paper.Path('M0 0 C10 20 30 20 50 0...');

// From SVG element
const svg = document.getElementById('myPath');
const path = new paper.Path(svg.pathData);
```

### Export
```javascript
const pathData = path.pathData;  // SVG path data string

// Export to SVG element
const svg = path.exportSVG({ 
  bounds: 'content'  // or 'stroke' 
});
```

## Compound Paths

### Creating
```javascript
// Multiple subpaths
const compound = new paper.CompoundPath();
compound.addChild(path1);
compound.addChildChild(path2);

// Boolean operations create compound paths
const result = path1.unite(path2);  // May be compound
```

### Accessing Children
```javascript
if (result instanceof paper.CompoundPath) {
  result.children.forEach(child => {
    // Process each subpath
  });
}
```

## Transform Operations

```javascript
// Translate
path.translate(delta);

// Scale
path.scale(sx, sy, center);

// Rotate
path.rotate(angle, center);

// Matrix transform
path.transform(matrix);

// Apply matrix
path.transform(matrix, true);  // true = concate to existing
```

## Geometric Utilities

### Distance
```javascript
const dist = point1.getDistance(point2);

// Closest point on path
const closest = path.getNearestPoint(point);
```

### Intersections
```javascript
const intersections = path1.getIntersections(path2);

intersections.forEach(isect => {
  const point = isect.point;
  const tangent1 = isect.tangent1;
  const tangent2 = isect.tangent2;
});
```

### Offset Curves (Advanced)

For offset operations, use **paperjs-offset** library:

```javascript
// Install: npm install paperjs-offset

import { PaperOffset } from 'paperjs-offset';

// Basic offset
const offsetPath = PaperOffset.offset(path, 10);

// With options
const offsetPath = PaperOffset.offset(path, 10, {
  join: 'round',      // 'miter' | 'bevel'
  limit: 5,           // Miter limit
  insert: false       // Don't add to canvas
});
```

## Performance Tips

### Optimize Large Paths
```javascript
// 1. Simplify early
path.simplify();

// 2. Flatten curves if straight segments ok
path.flatten(1);  // Max distance per segment

// 3. Use compound paths efficiently
// 4. Hide unused paths instead of removing
path.visible = false;
```

### Use Web Workers
```javascript
// Heavy computation off main thread
const worker = new Worker('geometry-worker.js');

worker.postMessage({ 
  type: 'offset', 
  pathData: path.pathData,
  distance: 10 
});

worker.onmessage = (e) => {
  const result = new paper.Path(e.data.result);
};
```

## Common Patterns

### Create Rectangle with Corner Radius
```javascript
const rect = new paper.Path.Rectangle({
  point: [0, 0],
  size: [100, 50],
  radius: 5
});
```

### Rounded Panel Shape
```javascript
function createRoundedPanel(width, height, radius) {
  const rect = new paper.Path.Rectangle({
    point: [0, 0],
    size: [width, height],
    radius: radius
  });
  return rect;
}
```

### Offset Path for Bit Diameter
```javascript
import { PaperOffset } from 'paperjs-offset';

function offsetForBit(profilePath, bitDiameter) {
  return PaperOffset.offset(profilePath, bitDiameter / 2, {
    join: 'round',
    insert: false
  });
}
```

### Merge Adjacent Panels
```javascript
function mergePanels(panels) {
  let result = panels[0];
  for (let i = 1; i < panels.length; i++) {
    result = result.unite(panels[i]);
  }
  return result;
}
```

## Coordinate Conversion

### Paper.js to SVG
```javascript
// Paper.js is already SVG-compatible
const svgElement = path.exportSVG();
```

### Paper.js to Three.js
```javascript
function paperPathToThreeShape(paperPath, flipY = true) {
  const shape = new THREE.Shape();
  
  paperPath.segments.forEach((seg, i) => {
    const x = seg.point.x;
    const y = flipY ? -seg.point.y : seg.point.y;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else if (seg.handleIn.isZero()) {
      shape.lineTo(x, y);
    } else {
      // Cubic bezier
      const h1 = seg.handleIn;
      const h2 = seg.handleOut;
      shape.bezierCurveTo(
        x + h1.x, flipY ? -(y + h1.y) : y + h1.y,
        x + h2.x, flipY ? -(y + h2.y) : y + h2.y,
        x, y
      );
    }
  });
  
  return shape;
}
```

## Official Resources

- [Paper.js Reference](http://paperjs.org/reference/)
- [Paper.js Tutorials](http://paperjs.org/tutorials/)
- [Offset Implementation](https://gist.github.com/lehni/a665d6f9d95dd055b0ff901f8e313780)
- [paper-clipper](https://github.com/northamerican/paper-clipper) - Clipper WASM integration