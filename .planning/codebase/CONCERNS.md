# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

### Large Files with High Complexity

- **Issue:** Multiple files exceed 3000 lines, making maintenance and understanding difficult
- **Files:**
  - `src/panel/PathEditor.js` (4989 lines) - SVG path editing with complex table-row UI
  - `src/export/ExportModule.js` (4914 lines) - Export functionality
  - `src/three/ExtrusionBuilder.js` (4034 lines) - 3D extrusion logic
  - `src/three/ThreeModule.js` (3374 lines) - Main 3D module
  - `src/panel/BitsManager.js` (3339 lines) - Bit management
  - `src/editor/ProfileEditor.js` (2896 lines) - Profile editing
- **Impact:** Hard to navigate, understand, and modify safely
- **Fix approach:** Consider splitting into smaller modules by responsibility

### Touch Interaction Routing

- **Issue:** TODO comment indicates touch and mouse interaction routing is not unified
- **Files:** `src/interaction/InteractionManager.js` (line 802)
- **Impact:** Potential inconsistencies between touch and mouse behavior
- **Fix approach:** Unify editor/main interaction routing

### One Failing Test

- **Issue:** Test `contour68 + offset 0.1 should produce 2 clean lines` fails
- **Files:** `tests/offset/contour68-diag.spec.js`
- **Impact:** Offset algorithm produces 5 lines instead of expected 2
- **Fix approach:** Investigate arc-degeneration in П-bridge collapse scenario

## Known Bugs

### Offset Contour Generation

- **Symptoms:** Offset operation on contour68 produces 5 segments instead of 2
- **Files:** `src/operations/CustomOffsetProcessor.js`, `src/operations/ClipperOffsetProcessor.js`
- **Trigger:** Running offset 0.1 on specific contour shape (contour68)
- **Workaround:** None identified - requires algorithmic fix

### Manifold Module Load Failure

- **Symptoms:** CSG operations return null when Manifold fails to load
- **Files:** `src/three/ManifoldCSG.js`
- **Trigger:** WASM module fails to load or initialize
- **Workaround:** Error handling returns null gracefully, but 3D view won't update

## Security Considerations

### Local Application Security

- **Risk:** This is a desktop application with no network requests
- **Files:** N/A
- **Current mitigation:** No external API calls, no user data storage
- **Recommendations:** Consider adding Content Security Policy headers for web deployment

### Input Validation

- **Risk:** Panel dimensions and bit parameters accept user input
- **Files:** `src/panel/PanelManager.js`, `src/panel/BitsManager.js`
- **Current mitigation:** Basic type checking
- **Recommendations:** Add bounds checking for panel size limits

## Performance Bottlenecks

### Continuous Animation Loop

- **Problem:** ThreeModule runs `requestAnimationFrame` continuously when enabled
- **Files:** `src/three/ThreeModule.js` (lines 190-198)
- **Cause:** Always running even when scene hasn't changed
- **Improvement path:** Implement dirty-flag pattern to pause when nothing changes

### Large Geometry Processing

- **Problem:** Manifold CSG operations on complex panels can be slow
- **Files:** `src/three/ManifoldCSG.js`, `src/three/CSGEngine.js`
- **Cause:** Full boolean operations on every update
- **Improvement path:** Signature caching already exists but could be enhanced with incremental updates

### Signature-Based Caching

- **Problem:** CSGEngine uses signature caching but may miss some change scenarios
- **Files:** `src/three/CSGEngine.js` (lines 524-555)
- **Cause:** Signature may not capture all relevant state changes
- **Improvement path:** Audit all state that affects 3D output

## Fragile Areas

### Coordinate System Transformation

- **Files:** `src/canvas/PanelCoordinateHelper.js`, multiple transformation points
- **Why fragile:** Y-down (SVG/Paper.js) vs Y-up (Three.js) conversion is error-prone
- **Safe modification:** Use `PanelCoordinateHelper` for all transformations
- **Test coverage:** Unit tests for coordinate helper exist

### Manifold WASM Module Loading

- **Files:** `src/three/ManifoldCSG.js` (lines 27-41)
- **Why fragile:** Async loading can fail silently, fallback handling is minimal
- **Safe modification:** Ensure all callers check for null returns
- **Test coverage:** Not tested in CI

### Mesh Repair Operations

- **Files:** `src/utils/meshRepair.js`
- **Why fragile:** Repair operations can produce invalid geometry
- **Safe modification:** Check return values, validate geometry before use
- **Test coverage:** Integration tests only

## Scaling Limits

### Desktop-Only Optimized

- **Current capacity:** Designed for single-user desktop workflow
- **Limit:** No multi-panel batch processing
- **Scaling path:** Would need worker thread support for batch operations

### Memory Management

- **Current capacity:** No explicit limits on panel size
- **Limit:** Browser memory constraints (~2GB typical)
- **Scaling path:** Add panel size warnings, implement streaming for large exports

## Dependencies at Risk

### Manifold-3d

- **Risk:** WASM module loading can fail in some browser environments
- **Impact:** 3D CSG operations fail entirely
- **Migration plan:** Fallback to three-bvh-csg for basic operations

### Clipper2-lib-js

- **Risk:** Active development, API changes possible
- **Impact:** Offset operations break
- **Migration plan:** Paper.js offset serves as alternative

### Three.js Version

- **Risk:** Using r182, older version
- **Impact:** Missing newer features, potential security issues
- **Migration plan:** Gradual upgrade path to r190+

## Missing Critical Features

### Comprehensive Error Recovery

- **Problem:** Many operations return null without detailed error information
- **Files:** `src/three/ManifoldCSG.js`, `src/operations/*.js`
- **Blocks:** User understanding of failures, debugging

### Undo/Redo System

- **Problem:** No explicit undo/redo for panel and bit modifications
- **Files:** Missing entirely
- **Blocks:** User workflow when mistakes are made

### Offline Capability

- **Problem:** No service worker for offline use
- **Files:** Missing
- **Blocks:** Use without internet connection

## Test Coverage Gaps

### UI/Interaction Testing

- **What's not tested:** Mouse/touch interactions, drag operations, canvas events
- **Files:** `src/interaction/InteractionManager.js`, `src/canvas/CanvasManager.js`
- **Risk:** Interaction bugs only discovered manually
- **Priority:** High

### 3D Rendering Tests

- **What's not tested:** Three.js scene rendering, material updates, camera controls
- **Files:** `src/three/ThreeModule.js`, `src/three/SceneManager.js`
- **Risk:** Visual regressions undetected
- **Priority:** Medium

### Export Functionality

- **What's not tested:** DXF, STL, GLTF export accuracy
- **Files:** `src/export/ExportModule.js`
- **Risk:** Exported files may have errors
- **Priority:** Medium

### Integration Tests

- **What's not tested:** Full workflow from 2D to 3D to export
- **Files:** N/A
- **Risk:** Cross-module issues undetected
- **Priority:** High

---

_Concerns audit: 2026-03-29_
