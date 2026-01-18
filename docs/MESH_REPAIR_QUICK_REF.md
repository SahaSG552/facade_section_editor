# Mesh Repair System - Quick Reference

## Configuration (AppConfig.js)

```javascript
appConfig.meshRepair = {
    enabled: true,                    // Enable/disable system
    repairLevel: 'standard',          // minimal | standard | aggressive
    shortEdgeThreshold: 1e-4,        // 0.1mm edge collapse
    weldTolerance: 1e-3,             // 1mm vertex merge
    minTriangleArea: 1e-10,          // Triangle removal threshold
    enableIntersectionRepair: false,  // Self-intersection detection
    logRepairs: true,                 // Console logging
    exportValidation: true,           // Pre-export check
};
```

## Quick Usage

### Manual Repair
```javascript
import { getRepairInstance } from '../utils/meshRepair.js';

const repair = getRepairInstance();
const repaired = repair.repairAndValidate(geometry, {
    repairLevel: 'aggressive'
});
```

### Validate Topology
```javascript
const report = repair.validateTopology(geometry);
console.log(report.valid ? 'OK' : report.errors);
```

### Prepare for CSG
```javascript
const prepared = repair.prepareForCSG(geometry, worldMatrix);
```

## Repair Levels

| Level | Speed | Operations |
|-------|-------|-----------|
| minimal | ~10ms | Weld + degenerate removal |
| standard | ~30ms | + Short edge removal |
| aggressive | ~100ms | + Non-manifold repair |

## Integration Points

1. **Post-Extrusion** (ExtrusionBuilder.js:3578)  
   → Repairs merged segment geometries

2. **Pre-CSG** (ManifoldCSG.js:78)  
   → Cleans cutters before boolean ops

3. **Pre-Export** (ThreeModule.js:2421)  
   → Validates before STL generation

## Telemetry

```javascript
// Get stats
const stats = appState.getMeshRepairStats();

// Listen for events
eventBus.on('meshRepair:statsUpdated', (stats) => {
    console.log('Repairs:', stats.totalRepairs);
});

// Reset
appState.resetMeshRepairStats();
```

## Common Issues

### "Extremely short edges"
```javascript
appConfig.meshRepair.shortEdgeThreshold = 1e-3; // Increase to 1mm
appConfig.meshRepair.repairLevel = 'aggressive';
```

### "Non-manifold edges"
```javascript
appConfig.meshRepair.weldTolerance = 2e-3; // Increase to 2mm
```

### "Self-intersecting faces"
```javascript
appConfig.meshRepair.enableIntersectionRepair = true;
appConfig.meshRepair.repairLevel = 'aggressive';
```

### Disable for Performance
```javascript
appConfig.meshRepair.enabled = false; // Skip all repairs
```

## API Methods

```javascript
const repair = getRepairInstance();

// Main repair
repair.repairAndValidate(geometry, options)

// Validation only
repair.validateTopology(geometry)

// CSG preparation
repair.prepareForCSG(geometry, worldMatrix)

// Export validation
repair.validateForExport(geometry)

// Manifold round-trip (strongest repair)
await repair.ensureManifoldSolid(geometry, manifoldCSG)
```

## Events

- `meshRepair:statsUpdated` - Repair completed
- `meshRepair:exportValidation` - Export validation result
- `meshRepair:statsReset` - Statistics cleared

## Performance Tips

1. Use `'minimal'` during development
2. Only enable `enableIntersectionRepair` for export
3. Disable logging: `logRepairs: false`
4. Batch repairs with shared instance

## Documentation

Full guide: `docs/MESH_REPAIR_GUIDE.md`
