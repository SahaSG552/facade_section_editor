---
name: csg-threejs
description: "Expert in Three.js CSG operations, mesh boolean operations, and 3D geometry processing. Use for 3D cutting operations, mesh manipulation, and geometric calculations."
---

# Three.js CSG Operations

Expert guide for CSG operations, mesh manipulation, and 3D geometry in Three.js.

## Libraries for CSG

### Primary: manifold-3d + three-bvh-csg

```javascript
// manifold-3d - Best for complex CSG
import { Manifold } from "manifold-3d";

// three-bvh-csg - Three.js integration
import { CSG } from "three-bvh-csg";
```

### Alternative: polytree

Modern Octree-based approach with spatial queries.

```javascript
import { Polytree } from "@jgphilpott/polytree";

// CSG Operations
const result = Polytree.unite(mesh1, mesh2);
const cut = Polytree.subtract(mesh1, mesh2);
const intersection = Polytree.intersect(mesh1, mesh2);
```

## Basic CSG Operations

### Using three-bvh-csg

```javascript
import * as THREE from "three";
import { CSG } from "three-bvh-csg";

// Create meshes with shared material
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const box1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);

const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), material);
box2.position.set(0.25, 0.25, 0);

// CSG operations
const subtractResult = CSG.subtract(box1, box2);
const unionResult = CSG.unite(box1, box2);
const intersectResult = CSG.intersect(box1, box2);

scene.add(subtractResult);
```

### Using manifold-3d

```javascript
import { Manifold } from "manifold-3d";

// Create geometries
const cube1 = new THREE.BoxGeometry(1, 1, 1);
const cube2 = new THREE.BoxGeometry(0.5, 0.5, 0.5);

// Convert to manifold
const m1 = Manifold.fromGeometry(cube1);
const m2 = Manifold.fromGeometry(cube2);

// CSG operations
const result = m1.subtract(m2);

// Convert back to Three.js geometry
const resultGeometry = result.toGeometry();
const resultMesh = new THREE.Mesh(resultGeometry, material);
```

## Signature-Based Caching

Your ThreeModule uses signatures to prevent unnecessary rebuilds:

```javascript
class ThreeModule {
  computeSignature(bit) {
    return [bit.type, bit.diameter, bit.angle, bit.depth, bit.shape].join("|");
  }

  needsRebuild(bit) {
    return this.currentSignature !== this.computeSignature(bit);
  }

  updateBit(newBit) {
    if (this.needsRebuild(newBit)) {
      this.currentSignature = this.computeSignature(newBit);
      this.rebuildGeometry(newBit);
    }
  }
}
```

## Extrusion from 2D Paths

### Using ExtrudeGeometry

```javascript
import * as THREE from "three";
import { ExtrudeGeometry } from "three";

// Create THREE.Shape from Paper.js path
function createExtrudeGeometry(paperPath, depth) {
  const shape = new THREE.Shape();

  // Convert Paper.js Y-down to Three.js Y-up
  paperPath.segments.forEach((seg, i) => {
    const x = seg.point.x;
    const y = -seg.point.y; // Flip Y

    if (i === 0) {
      shape.moveTo(x, y);
    } else if (seg.handleIn.isZero()) {
      shape.lineTo(x, y);
    } else {
      // Bezier curve
      shape.bezierCurveTo(
        x + seg.handleIn.x,
        y - seg.handleIn.y,
        x + seg.handleOut.x,
        y - seg.handleOut.y,
        x,
        y,
      );
    }
  });

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false, // Set true for beveled edges
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}
```

### With Bevel for Clean Edges

```javascript
const extrudeSettings = {
  depth: panelThickness,
  bevelEnabled: true,
  bevelThickness: 0.5, // Depth of bevel
  bevelSize: 0.5, // Size of bevel
  bevelSegments: 3, // Smoothness
};
```

## Bit Profile Extrusion

### Round Bit (Straight Cut)

```javascript
function extrudeForRoundBit(profilePath, depth, bitDiameter) {
  // Offset path by bit radius for finish cut
  const offsetPath = OffsetUtils.offsetPath(profilePath, bitDiameter / 2);

  // Extrude
  return createExtrudeGeometry(offsetPath, depth);
}
```

### V-Bit (Angled Cut)

```javascript
function extrudeForVBit(profilePath, depth, bitAngle) {
  // V-bit creates tapered walls
  // The wider at top, narrower at bottom

  const halfAngle = bitAngle / 2;
  const bottomWidth = depth * Math.tan(halfAngle) * 2;

  // Create tapered extrusion shape
  const shape = new THREE.Shape();

  // Generate profile with taper
  // This is complex - consider using CSG with angled cutter mesh

  return geometry;
}
```

## Coordinate Transformation

### Critical: 2D to 3D

```javascript
// Paper.js/SVG: Y-down, origin top-left
// Three.js: Y-up, origin can be anywhere

class CoordinateTransformer {
  constructor(panelCenter, panelWidth, panelHeight) {
    this.center = panelCenter;
    this.width = panelWidth;
    this.height = panelHeight;
  }

  // Paper.js point to Three.js world coordinates
  paperToWorld(paperPoint, z = 0) {
    return {
      x: paperPoint.x - this.width / 2,
      y: this.height / 2 - paperPoint.y, // Flip Y
      z: z,
    };
  }

  // World coordinates back to Paper.js
  worldToPaper(worldPoint) {
    return {
      x: worldPoint.x + this.width / 2,
      y: this.height / 2 - worldPoint.y,
    };
  }
}
```

## Phantom Bit Visualization

Show where material will be removed:

```javascript
class PhantomBitManager {
  constructor(scene) {
    this.phantoms = [];
    this.scene = scene;
    this.phantomMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  }

  // Show phantom bit at position
  showPhantom(position, bitProfile, depth) {
    const phantomMesh = this.createPhantomMesh(bitProfile, depth);
    phantomMesh.position.copy(position);
    phantomMesh.material = this.phantomMaterial;

    this.scene.add(phantomMesh);
    this.phantoms.push(phantomMesh);
  }

  clearPhantoms() {
    this.phantoms.forEach((p) => {
      this.scene.remove(p);
      p.geometry.dispose();
    });
    this.phantoms = [];
  }
}
```

## Mesh Disposal (Critical!)

Always dispose of geometries and materials:

```javascript
function disposeMesh(mesh) {
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }

  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => mat.dispose());
    } else {
      mesh.material.dispose();
    }
  }

  mesh.scene?.remove(mesh);
}

// Before replacing geometry
function updateMesh(mesh, newGeometry) {
  // Dispose old
  mesh.geometry.dispose();

  // Assign new
  mesh.geometry = newGeometry;

  // Mark for update
  mesh.geometry.computeVertexNormals();
}
```

## Performance Optimization

### Object Pooling for Bits

```javascript
class BitMeshPool {
  constructor(createFn, initialSize = 10) {
    this.createFn = createFn;
    this.pool = [];
    this.active = new Set();

    // Pre-populate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire() {
    const mesh = this.pool.pop() || this.createFn();
    this.active.add(mesh);
    return mesh;
  }

  release(mesh) {
    this.active.delete(mesh);
    mesh.visible = false;
    this.pool.push(mesh);
  }
}
```

### Frustum Culling

```javascript
// Enable automatic culling
mesh.frustumCulled = true; // Default

// Custom bounding sphere for better culling
mesh.geometry.computeBoundingSphere();
```

## Signature Update Pattern

Always update signatures when parameters change:

```javascript
class ThreeModule {
  // When adding/modifying a bit
  addBit(bit) {
    // ... add bit geometry ...

    // CRITICAL: Update signature
    this.bitSignature = this.computeBitSignature(bit);
  }

  // When bit parameters change
  updateBitParameters(bitId, newParams) {
    const bit = this.bits.get(bitId);
    const oldSignature = this.computeBitSignature(bit);

    // Apply new parameters
    Object.assign(bit, newParams);

    const newSignature = this.computeBitSignature(bit);

    // Only rebuild if signature changed
    if (oldSignature !== newSignature) {
      this.rebuildBitGeometry(bitId);
    }
  }
}
```

## Testing 3D Operations

Manual verification in browser:

1. Add a test bit
2. Check phantom visualization
3. Verify in 3D view
4. Export to DXF and verify dimensions

## Libraries Summary

| Library             | Purpose              | Install              |
| ------------------- | -------------------- | -------------------- |
| `manifold-3d`       | CSG core             | manifold-3d          |
| `three-bvh-csg`     | Three.js CSG         | three-bvh-csg        |
| `polytree`          | Octree CSG + queries | @jgphilpott/polytree |
| `robust-predicates` | Safe math            | robust-predicates    |

## Resources

- [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg)
- [manifold-3d](https://github.com/elalish/manifold)
- [polytree](https://github.com/jgphilpott/polytree)
- [robust-predicates](https://github.com/mourner/robust-predicates)
