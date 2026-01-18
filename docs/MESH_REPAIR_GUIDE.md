# Mesh Repair System - Comprehensive Guide

## Overview

The mesh repair system provides multi-stage validation and repair for Three.js geometries to ensure high-quality, watertight meshes before CSG operations and STL export. It addresses common mesh problems that cause errors in Rhino, Blender, and other CAD/CAM software.

## Problem Statement

After exporting geometries created in Three.js, common errors appear in validation tools:
- **Extremely short edges** - Edges below tolerance threshold (< 0.1mm)
- **Non-manifold edges** - Edges shared by ≠ 2 faces (naked edges, T-junctions)
- **Degenerate triangles** - Triangles with near-zero area
- **Self-intersecting faces** - Face pairs that penetrate each other
- **Duplicate vertices** - Multiple vertices at same position

These issues cause problems during:
- Boolean CSG operations (union, subtract, intersect)
- STL import into CAD software
- 3D printing slicing
- Mesh analysis and simulation

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                   MeshRepair Utility                     │
│  src/utils/meshRepair.js                                 │
│  - Validation & repair methods                           │
│  - BVH-accelerated topology detection                    │
│  - Telemetry tracking                                    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ExtrusionBuilder│  │ ManifoldCSG  │    │ThreeModule   │
│Post-Extrusion│    │  Pre-CSG     │    │ Pre-Export   │
│  Repair      │    │   Repair     │    │ Validation   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │    AppState      │
                  │Telemetry Tracking│
                  └──────────────────┘
```

### Pipeline Integration Points

The repair system operates at **4 critical stages**:

#### 1. Post-Extrusion Repair (ExtrusionBuilder.js)
**Location:** After `mergeVertices()` in `mergeExtrudeMeshes()`  
**Purpose:** Clean merged segment geometries before scene addition  
**Repair Level:** Standard (configurable)

```javascript
// Applied automatically after edge matching and welding
const finalGeometry = repairInstance.repairAndValidate(weldedGeometry, {
    repairLevel: appConfig.meshRepair.repairLevel,
    stage: 'post-extrusion'
});
```

**What gets repaired:**
- Duplicate vertices from segment boundaries
- Degenerate triangles from tight curves
- Short edges from profile sweeping

#### 2. Pre-CSG Repair (ManifoldCSG.js)
**Location:** Before Manifold conversion in `subtract()`  
**Purpose:** Ensure all cutter geometries are manifold-ready  
**Repair Level:** Standard (forced)

```javascript
// Applied to both panel and cutter meshes
const cleanedGeom = this.prepareGeometryForCSG(
    mesh.geometry,
    mesh.matrixWorld,
    tolerance
);
```

**What gets repaired:**
- Non-manifold edges that break CSG
- Short edges causing numerical instability
- Extra attributes (UV) removed
- World transform baked in

#### 3. Post-CSG Validation (Manifold Internal)
**Location:** Within Manifold's `toManifold()` conversion  
**Purpose:** Manifold's built-in topology repair  
**Repair Level:** Aggressive (Manifold internals)

**Note:** This is implicit - Manifold-3D has robust mesh healing during solid construction.

#### 4. Pre-Export Validation (ThreeModule.js)
**Location:** Before STL file generation in `exportToSTL()`  
**Purpose:** Final quality check with user notification  
**Repair Level:** Aggressive (if issues detected)

```javascript
// Validates all meshes, repairs if needed, shows warnings
this.validateAndRepairForExport(meshesToExport, filename);
```

**User Experience:**
- Silent pass if no issues
- Warning dialog if problems detected (with auto-repair)
- Option to export anyway or cancel

## Configuration

### AppConfig.js Settings

```javascript
this.meshRepair = {
    enabled: true,                      // Master switch
    repairLevel: 'standard',            // 'minimal' | 'standard' | 'aggressive'
    shortEdgeThreshold: 1e-4,          // 0.1mm - collapse edges shorter
    weldTolerance: 1e-3,               // 1mm - merge vertices within
    minTriangleArea: 1e-10,            // Remove triangles below area
    enableIntersectionRepair: false,    // Self-intersection detection (slow)
    logRepairs: true,                   // Log repair statistics
    exportValidation: true,             // Validate before export
};
```

### Repair Levels

| Level | Operations | Use Case |
|-------|-----------|----------|
| **Minimal** | Vertex welding, degenerate removal | Fast operations, simple geometry |
| **Standard** | + Short edge removal | Normal usage (default) |
| **Aggressive** | + Non-manifold repair, validation | Export, complex CSG |

### Performance Characteristics

| Repair Level | Typical Duration | Operations |
|--------------|------------------|------------|
| Minimal | <10ms | Weld + degenerate filter |
| Standard | 10-50ms | + Edge collapse |
| Aggressive | 50-200ms | + Non-manifold detection |
| Aggressive + Intersections | 200-1000ms | + BVH spatial queries |

## API Reference

### MeshRepair Class

#### `repairAndValidate(geometry, options)`
Main entry point for mesh repair.

**Parameters:**
- `geometry` (BufferGeometry) - Geometry to repair
- `options` (Object) - Override config options
  - `repairLevel` - 'minimal' | 'standard' | 'aggressive'
  - `shortEdgeThreshold` - Edge collapse threshold
  - `weldTolerance` - Vertex merge tolerance
  - `minTriangleArea` - Triangle area threshold
  - `logRepairs` - Log statistics (default: true)
  - `stage` - Telemetry stage name

**Returns:** Repaired BufferGeometry

**Example:**
```javascript
import { getRepairInstance } from '../utils/meshRepair.js';

const repair = getRepairInstance();
const repaired = repair.repairAndValidate(geometry, {
    repairLevel: 'aggressive',
    stage: 'manual-repair'
});
```

#### `validateTopology(geometry)`
Analyze mesh topology without repair.

**Returns:**
```javascript
{
    valid: boolean,
    vertexCount: number,
    triangleCount: number,
    warnings: string[],
    errors: string[]
}
```

**Example:**
```javascript
const report = repair.validateTopology(geometry);
if (!report.valid) {
    console.error('Mesh issues:', report.errors);
}
```

#### `prepareForCSG(geometry, worldMatrix)`
Comprehensive cleanup for CSG operations.

**Use Case:** Before passing geometry to Manifold or BVH-CSG

**Example:**
```javascript
const prepared = repair.prepareForCSG(mesh.geometry, mesh.matrixWorld);
const manifold = manifoldCSG.toManifold(prepared, identityMatrix);
```

#### `validateForExport(geometry)`
Validate and repair with user-friendly report.

**Returns:**
```javascript
{
    valid: boolean,
    report: {
        original: ValidationReport,
        repaired: ValidationReport,
        wasRepaired: boolean
    },
    geometry: BufferGeometry
}
```

**Example:**
```javascript
const result = repair.validateForExport(geometry);
if (result.valid) {
    exportSTL(result.geometry);
} else {
    showWarning(result.report);
}
```

## Telemetry & Monitoring

### AppState Tracking

```javascript
// Access repair statistics
const stats = appState.getMeshRepairStats();

console.log(stats);
// {
//     totalRepairs: 42,
//     postExtrusionRepairs: 30,
//     preCSGRepairs: 10,
//     exportValidations: 2,
//     lastRepair: {
//         timestamp: 1705605120000,
//         stage: 'post-extrusion',
//         stats: { verticesMerged: 156, trianglesRemoved: 3, ... }
//     },
//     cumulativeStats: {
//         verticesMerged: 4521,
//         trianglesRemoved: 87,
//         shortEdgesRemoved: 23,
//         nonManifoldEdgesFixed: 5
//     }
// }
```

### Event Bus Events

Listen for repair events:

```javascript
import eventBus from '../core/eventBus.js';

// Repair completed
eventBus.on('meshRepair:statsUpdated', (stats) => {
    console.log('Repair stats:', stats);
});

// Export validation completed
eventBus.on('meshRepair:exportValidation', (data) => {
    console.log('Export validation:', data.hadIssues);
});

// Stats reset
eventBus.on('meshRepair:statsReset', () => {
    console.log('Stats reset');
});
```

### Debugging Panel (Future Enhancement)

```javascript
// Reset statistics
appState.resetMeshRepairStats();

// Get last repair details
const lastRepair = appState.getMeshRepairStats().lastRepair;
console.log('Last repair:', lastRepair.stage, lastRepair.stats);
```

## Repair Algorithms

### 1. Vertex Welding
**Algorithm:** Three.js `mergeVertices()` with spatial hashing  
**Tolerance:** 1mm (configurable)  
**Complexity:** O(n log n)

Merges vertices within tolerance distance into single vertex, updating face indices.

### 2. Degenerate Triangle Removal
**Algorithm:** Area calculation + filtering  
**Threshold:** 1e-10 mm² (configurable)  
**Complexity:** O(n)

```javascript
for each triangle (v1, v2, v3):
    area = Triangle.getArea(v1, v2, v3)
    if area > threshold:
        keep triangle
    else:
        discard triangle
```

### 3. Short Edge Removal
**Algorithm:** Edge collapse + vertex remapping  
**Threshold:** 0.1mm (configurable)  
**Complexity:** O(n + m) where m = collapsed edges

```javascript
1. Build edge map from triangles
2. Find edges with length < threshold
3. Create collapse map: vertex[i] -> vertex[j]
4. Remap all triangle indices
5. Filter triangles collapsed to lines/points
6. Weld to remove unused vertices
```

### 4. Non-Manifold Edge Detection
**Algorithm:** Edge reference counting  
**Manifold:** Each edge shared by exactly 2 faces  
**Complexity:** O(n)

```javascript
edgeMap = new Map()
for each triangle (v1, v2, v3):
    for each edge (a, b):
        edgeMap[a,b].count++

for each edge:
    if count != 2:
        mark as non-manifold
```

**Repair Strategy:** Remove triangles containing non-manifold edges (conservative approach)

### 5. Self-Intersection Detection (Optional)
**Algorithm:** BVH spatial acceleration  
**Library:** three-mesh-bvh  
**Complexity:** O(n log n) average

Uses bounding volume hierarchy to detect triangle-triangle intersections. Expensive operation - only enabled in aggressive mode with `enableIntersectionRepair: true`.

**Note:** Detection only - repair not yet implemented (future enhancement).

## Best Practices

### 1. Configure Tolerances for Your Scale

If your models are in **millimeters**:
```javascript
meshRepair: {
    shortEdgeThreshold: 1e-4,  // 0.1mm
    weldTolerance: 1e-3,       // 1mm
}
```

If your models are in **meters**:
```javascript
meshRepair: {
    shortEdgeThreshold: 1e-7,  // 0.1mm
    weldTolerance: 1e-6,       // 1mm
}
```

### 2. Use Appropriate Repair Level

- **During development:** `'minimal'` for fast iteration
- **Production use:** `'standard'` (default)
- **Before export:** Automatically escalates to `'aggressive'`

### 3. Monitor Telemetry

```javascript
// Check if repairs are happening too often
const stats = appState.getMeshRepairStats();
if (stats.totalRepairs > 100) {
    console.warn('High repair count - check geometry generation');
}

// Check cumulative stats
if (stats.cumulativeStats.nonManifoldEdgesFixed > 0) {
    console.warn('Non-manifold edges detected - investigate extrusion logic');
}
```

### 4. Disable for Simple Geometries

```javascript
// Temporarily disable for performance testing
appConfig.meshRepair.enabled = false;

// Re-enable
appConfig.meshRepair.enabled = true;
```

### 5. Handle Export Failures Gracefully

```javascript
// Listen for export validation events
eventBus.on('meshRepair:exportValidation', (data) => {
    if (data.hadIssues && !data.exported) {
        // User cancelled export due to issues
        showNotification('Export cancelled. Check mesh quality.');
    }
});
```

## Troubleshooting

### Issue: "Mesh has 21 extremely short edges"

**Cause:** Tight curves in bit profiles or panel edges  
**Solution:**
1. Increase `shortEdgeThreshold` to 1e-3 (1mm)
2. Use `'aggressive'` repair level
3. Reduce profile curve complexity

### Issue: "Mesh has 4 non manifold edges"

**Cause:** Segment boundaries not properly welded  
**Solution:**
1. Check edge matching tolerance in `MeshEdgeMatcher`
2. Increase `weldTolerance` to 2e-3 (2mm)
3. Enable aggressive pre-CSG repair

### Issue: "177 pairs of faces that intersect"

**Cause:** Self-intersecting extrusions on sharp corners  
**Solution:**
1. Enable intersection detection: `enableIntersectionRepair: true`
2. Simplify bit paths before extrusion
3. Use Manifold round-trip repair (see below)

### Issue: Export validation shows errors but repair fails

**Fallback:** Use Manifold round-trip solidification

```javascript
import ManifoldCSG from './three/ManifoldCSG.js';

const manifoldCSG = new ManifoldCSG(logger);
const repaired = await repair.ensureManifoldSolid(geometry, manifoldCSG);
```

This leverages Manifold's powerful mesh healing algorithms.

### Issue: Repair is too slow (>500ms)

**Optimization:**
1. Reduce repair level to `'standard'`
2. Disable intersection repair
3. Apply repair less frequently (only on export)
4. Reduce geometry complexity before repair

## Performance Optimization

### Lazy Repair Strategy

Only repair when necessary:

```javascript
// Disable automatic post-extrusion repair
appConfig.meshRepair.enabled = false;

// Manually repair before CSG (if needed)
if (geometryIsComplex) {
    const repair = getRepairInstance();
    geometry = repair.prepareForCSG(geometry);
}

// Always validate on export
appConfig.meshRepair.exportValidation = true;
```

### Batch Repair

Repair multiple meshes efficiently:

```javascript
const repair = getRepairInstance({ logRepairs: false });

const repairedMeshes = meshes.map(mesh => {
    const repaired = repair.repairAndValidate(mesh.geometry, {
        repairLevel: 'minimal'
    });
    return new THREE.Mesh(repaired, mesh.material);
});
```

## Future Enhancements

### Planned Features

1. **Self-Intersection Repair**  
   Currently detects but doesn't fix. Planned: triangle splitting at intersection points.

2. **Hole Filling**  
   Detect and fill small holes in geometry (useful for STL export).

3. **Mesh Simplification**  
   Reduce triangle count while preserving shape (using edge collapse decimation).

4. **Real-time Validation UI**  
   Dashboard showing repair statistics and mesh quality indicators.

5. **Worker Thread Repair**  
   Offload expensive repairs to Web Workers for non-blocking operation.

6. **Rhino-style Mesh Analysis**  
   Detailed mesh quality report matching Rhino's `_Check` command output.

## Comparison with External Tools

| Feature | MeshRepair.js | PyMeshLab | Blender | Manifold-3D |
|---------|---------------|-----------|---------|-------------|
| **Runtime** | Browser | Python | Python | Browser WASM |
| **Non-manifold repair** | ✅ | ✅ | ✅ | ✅ (implicit) |
| **Short edge removal** | ✅ | ✅ | ✅ | ❌ |
| **Hole filling** | ❌ | ✅ | ✅ | ❌ |
| **Simplification** | ❌ | ✅ | ✅ | ✅ |
| **Self-intersection repair** | ⚠️ (detect only) | ✅ | ✅ | ❌ |
| **Performance** | Fast | Medium | Slow | Fast |
| **Integration** | Native | CLI/API | CLI/API | Native |

**Recommendation:** Use MeshRepair.js for real-time validation and lightweight repair. For complex repairs (large holes, major topology issues), export → repair in PyMeshLab/Blender → re-import.

## References

### Academic Papers
- [Polygon Mesh Processing](https://www.pmp-book.org/) - Botsch et al.
- [Robust Boolean Operations on Triangle Meshes](https://www.graphics.rwth-aachen.de/media/papers/boolean.pdf)

### Libraries
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) - Spatial acceleration
- [manifold-3d](https://github.com/elalish/manifold) - Robust CSG operations
- [PyMeshLab](https://github.com/cnr-isti-vclab/PyMeshLab) - Professional mesh repair

### Tools
- [Rhino _Check command](https://docs.mcneel.com/rhino/7/help/en-us/commands/check.htm)
- [Blender 3D Print Toolbox](https://docs.blender.org/manual/en/latest/addons/mesh/3d_print_toolbox.html)
- [MeshLab](https://www.meshlab.net/) - Open source mesh processing

## Support

For issues or questions:
1. Check console logs for repair statistics
2. Review telemetry in AppState
3. Test with different repair levels
4. Enable detailed logging: `appConfig.meshRepair.logRepairs = true`

---

**Version:** 1.0.0  
**Last Updated:** January 18, 2026  
**Status:** Production Ready
