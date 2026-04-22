# facade_section_editor — AI Context Map

> **Stack:** raw-http | none | unknown | javascript

> 0 routes | 0 models | 0 components | 46 lib files | 1 env vars | 3 middleware | 25 events | 0% test coverage
> **Token savings:** this file is ~4,000 tokens. Without it, AI exploration would cost ~26,800 tokens. **Saves ~22,800 tokens per conversation.**

---

# Libraries

- `src\bits\BitRegistry.js` — class BitRegistry, const bitRegistry
- `src\bits\ExtensionCalculator.js` — class ExtensionCalculator
- `src\bits\PhantomBitCalculator.js` — class PhantomBitCalculator
- `src\canvas\PanelCoordinateHelper.js` — class PanelCoordinateHelper
- `src\canvas\SVGElementFactory.js` — class SVGElementFactory
- `src\canvas\zoomUtils.js`
  - function calculateElementsBBox: (elements) => void
  - function zoomToBBox: (canvasManager, bbox, padding) => void
  - function zoomToElements: (canvasManager, elements, padding) => void
  - function fitAllVisibleElements: (canvasManager, layerNames, padding) => void
  - function fitToBounds: (canvasManager, bounds) => void
  - function zoomToSVGElement: (canvasManager, svgElement, padding) => void
  - _...1 more_
- `src\config\AppConfig.js` — class AppConfig, const appConfig
- `src\core\ManagerFactory.js` — class ManagerFactory
- `src\data\bitsStore.js`
  - function getBits: () => void
  - function setBits: (newBits) => void
  - function getOperationsForGroup: (groupName) => void
  - function addBit: (groupName, bitData) => void
  - function updateBit: (groupName, id, patch) => void
  - function deleteBit: (groupName, id) => void
  - _...4 more_
- `src\editor\geometry\rectGeometry.js`
  - function getRectGeomLocal: (data) => void
  - function getRectClampedRx: (data) => void
  - function getRectCornerPointMap: (geom) => void
  - function getRectCornerInwardMap: (geom) => void
  - function getRectBoundaryPrimitives: (data) => void
  - const RECT_CORNER_KEYS
- `src\editor\tools\ArcTool.js`
  - function circumcenter: (p1, p2, p3) => void
  - function arcCenterFromEndpoints: (pt1, pt2, r, largeArc, sweep) => void
  - function arcFlagsViaPoint: (pt1, pt2, ptThrough, cx, cy) => void
  - function arc2ptData: (pt1, pt2, radius, cursorPos) => void
- `src\editor\tools\shared\copyPreviewUtils.js`
  - function deepClone: (value) => void
  - function collectSegmentSnapshots: (state, segmentIds) => void
  - function materializeCopiedSegments: (state, snapshots, {...}) => void
  - function commitCopiedSnapshots: ({...}, snapshots, historyLabel, keepSourceSelection, sourceIds, preserveGroupLinks, }) => void
  - function commitStagedTransformTarget: ({...}, targetPoint, applyPreview, commit, refreshPreview, finishCommand, }) => void
  - function transitionCopyMode: ({...}, next, onEnterCopy, onExitCopy }) => void
- `src\editor\tools\shared\segmentSanitizer.js` — function sanitizeParsedContourSegments: (segments) => void
- `src\editor\tools\shared\selectionUtils.js`
  - function expandSegIdsToGroupClosure: (seedIds, allSegments, elementGroups) => void
  - function resolveClickSelectionIds: (hitId, allSegments, elementGroups, {...}) => void
  - function computeBoxSelection: (allSegments, start, end, {...}, variableValues, groupSelectionMode, elementGroups) => void
  - function buildSelectionBoxGhost: (start, end, svgNs) => void
- `src\editor\tools\shared\transformGeometry.js`
  - function sumRtAngle: (transforms, vars) => void
  - function withRtAngle: (transforms, nextAngle) => void
  - function rotatePoint: (p, angleDeg) => void
  - function mirrorPoint: (p, A, B) => void
  - function worldFromRaw: (rawPoint, rtAngle) => void
  - function rawFromWorld: (worldPoint, rtAngle) => void
  - _...2 more_
- `src\editor\transforms\TransformCommands.js`
  - function parseModLine: (line) => void
  - function evalAngle: (token, vars) => void
  - function modToSvgTransform: (t, vars) => void
  - function modListToSvgTransform: (transforms, vars) => void
- `src\operations\BitDataHelper.js` — class BitDataHelper
- `src\operations\BooleanOperationStrategy.js` — class BooleanOperationStrategy
- `src\operations\CustomOffsetProcessor.js`
  - function calculateOffsetFromPathData: (pathData, offset, options) => void
  - function calculateOffsetFromSVG: (svgElement, offset, options) => void
  - class CustomOffsetCalculator
- `src\operations\OffsetCapper.js`
  - function capFlat: (point1, point2) => void
  - function capRound: (centerPoint, offsetDistance, startPoint, endPoint, sweepFlag) => void
  - function capBothSides: (positiveSegments, negativeSegments, offsetDistance, capType) => void
  - function capOpenContour: (offsetSegments, offsetDistance, capType) => void
- `src\operations\OffsetContourBuilder.js` — function buildOffsetContour: (segments, distance, options) => void
- `src\operations\OffsetCurveEvaluator.js`
  - function rotate90CCW: (vec) => void
  - function rotate90CW: (vec) => void
  - function normalize: (vec) => void
  - function tangentAtArc: (angle, center, sweepFlag) => void
  - function offsetLine: (segment, distance) => void
  - function offsetArc: (segment, distance) => void
  - _...1 more_
- `src\operations\OffsetEngine.js` — function calculateOffsetFromPathData: (pathData, offset, options) => void, class OffsetEngine
- `src\operations\OffsetRules.js`
  - function isLineDegenerated: (segment) => void
  - function isArcDegenerated: (segment) => void
  - function isSegmentDegenerated: (segment) => void
  - function getArcCenter: (segment) => void
  - function preserveArcCenter: (offsetSegment, originalCenter) => void
  - function computeArcDelta: (arc) => void
  - _...7 more_
- `src\operations\OffsetTrimmer.js`
  - function trimSelfIntersections: (segments) => void
  - function segmentsToPathString: (segments) => void
  - function pathStringToSegments: (pathString) => void
- `src\operations\PaperBooleanProcessor.js`
  - function resolveSelfIntersections: (pathData, options) => void
  - function paperCalculateResultPolygon: (panelSection, bitsOnCanvas, phantomBits) => void
  - function paperCalculateResultPolygonDebug: (panelSection, bitsOnCanvas, phantomBits) => void
- `src\operations\UpdatePipeline.js` — class UpdatePipeline
- `src\three\BREPVisualizer.js` — class BREPVisualizer
- `src\three\Edge.js` — class Edge
- `src\three\Face.js` — class Face
- `src\three\FaceIDGenerator.js` — class FaceIDGenerator
- `src\three\MeshAnalysisUtils.js` — class MeshAnalysisUtils
- `src\three\SemanticEdgesGeometry.js` — class SemanticEdgesGeometry
- `src\three\Vertex.js` — class Vertex
- `src\ui\pressEvents.js` — function addUnifiedPressListener: (element, handler, options) => void
- `src\utils\arcApproximation.js` — function segmentsToSVGPath: (segments, invertSweepFlag, options) => void, function approximatePath: (pathData, exportModule, tolerance) => void
- `src\utils\empty-shim.js` — function createRequire
- `src\utils\fillet.js`
  - function getPathOrientation: (points) => void
  - function buildFilletArc: (prev, curr, next, radius) => void
  - function filletPolyline: (points, options) => void
- `src\utils\formulaPolicy.js` — function isFormulaToken: (value) => void, function evaluateTokenWithVars: (token, vars, fallback) => void
- `src\utils\meshRepair.js` — function getRepairInstance: (config) => void, class MeshRepair
- `src\utils\offsetSeries.js` — function buildPartialSeries: (total, steps) => void, function buildOffsetDistanceSeries: (distance, count) => void
- `src\utils\utils.js`
  - function angleToRad: (angle) => void
  - function distancePtToPt: (p1, p2) => void
  - function evaluateMathExpression: (value) => void
  - function weldGeometry: (geometry, tolerance) => void
- `src\utils\validation.js`
  - function validateCoordinates: (x, y) => void
  - function validatePanelDimensions: (width, height, thickness) => void
  - function validateBitDiameter: (diameter) => void
  - function validateVCarveAngle: (angle) => void
  - function validateRadius: (radius) => void
  - function validateZoomLevel: (zoomLevel) => void
  - _...4 more_
- `src\utils\variableTokens.js`
  - function isValidVariableName: (name) => void
  - const VARIABLE_NAME_PATTERN
  - const VARIABLE_NAME_RE
  - const VARIABLE_TOKEN_RE_GLOBAL
  - const VARIABLE_TOKEN_TEST_RE
- `src\utils\yPolicy.js`
  - function isShapeYAttr: (attrKey) => void
  - function shapeYSign: (shapeSpace) => void
  - function shapeStoredToUiNumber: (attrKey, storedValue, shapeSpace) => void
  - function shapeUiToStoredNumber: (attrKey, uiValue, shapeSpace) => void
  - function shapeUiToStoredToken: (attrKey, uiToken, shapeSpace) => void
  - function isPathYArg: (cmd, argIndex) => void
  - _...2 more_
- `tests\helpers\topology-helpers.js`
  - function assertContinuity: (segments) => void
  - function assertNoZeroLength: (segments) => void
  - function assertContourCount: (result, expected) => void
  - const EPS

---

# Config

## Environment Variables

- `DEV` **required** — src\three\ManifoldCSG.js

## Config Files

- `vite.config.js`

---

# Middleware

## custom

- BooleanOperationStrategy — `src\operations\BooleanOperationStrategy.js`
- offset-arc-degenerate-contour.spec — `tests\offset-arc-degenerate-contour.spec.js`
- offset-arc-degenerate-radius3.spec — `tests\offset-arc-degenerate-radius3.spec.js`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src\core\LoggerFactory.js` — imported by **38** files
- `src\editor\EditorStateManager.js` — imported by **18** files
- `src\editor\tools\BaseTool.js` — imported by **15** files
- `src\export\ExportModule.js` — imported by **14** files
- `src\operations\OffsetContourBuilder.js` — imported by **14** files
- `src\operations\OffsetEngine.js` — imported by **13** files
- `src\utils\utils.js` — imported by **9** files
- `src\core\eventBus.js` — imported by **9** files
- `src\canvas\CanvasManager.js` — imported by **8** files
- `src\editor\tools\ArcTool.js` — imported by **8** files
- `src\editor\geometry\rectGeometry.js` — imported by **7** files
- `src\operations\OffsetRules.js` — imported by **7** files
- `src\editor\tools\shared\selectionUtils.js` — imported by **7** files
- `src\core\BaseModule.js` — imported by **6** files
- `src\utils\formulaPolicy.js` — imported by **6** files
- `src\editor\EditorCanvas.js` — imported by **6** files
- `src\utils\variableTokens.js` — imported by **6** files
- `src\panel\PathEditor.js` — imported by **6** files
- `src\editor\EditorVisualConfig.js` — imported by **5** files
- `src\editor\transforms\TransformCommands.js` — imported by **5** files

## Import Map (who imports what)

- `src\core\LoggerFactory.js` ← `src\editor\EditorCanvas.js`, `src\editor\EditorStateManager.js`, `src\editor\EditorToolbar.js`, `src\editor\ProfileEditor.js`, `src\editor\tools\ArcTool.js` +33 more
- `src\editor\EditorStateManager.js` ← `src\editor\EditorCanvas.js`, `src\editor\EditorCanvas.js`, `src\editor\EditorCanvas.js`, `src\editor\EditorCanvas.js`, `src\editor\EditorCanvas.js` +13 more
- `src\editor\tools\BaseTool.js` ← `src\editor\ProfileEditor.js`, `src\editor\ProfileEditor.js`, `src\editor\ProfileEditor.js`, `src\editor\tools\ArcTool.js`, `src\editor\tools\CircleTool.js` +10 more
- `src\export\ExportModule.js` ← `src\app\main.js`, `src\app\main.js`, `src\script.js`, `tests\offset-ccw-cw-contours.spec.js`, `tests\offset-cursor-direction-invariance.spec.js` +9 more
- `src\operations\OffsetContourBuilder.js` ← `src\operations\OffsetEngine.js`, `tests\f3-functional-qa.spec.js`, `tests\offset-arc-center-stability.spec.js`, `tests\offset-arc-degenerate-contour.spec.js`, `tests\offset-arc-degenerate-radius3.spec.js` +9 more
- `src\operations\OffsetEngine.js` ← `src\editor\tools\OffsetTool.js`, `src\operations\CustomOffsetProcessor.js`, `tests\offset-ccw-cw-contours.spec.js`, `tests\offset-cursor-direction-invariance.spec.js`, `tests\offset-cursor-side.spec.js` +8 more
- `src\utils\utils.js` ← `src\bits\PhantomBitCalculator.js`, `src\editor\ProfileEditor.js`, `src\editor\tools\FilletTool.js`, `src\editor\tools\RectTool.js`, `src\editor\transforms\TransformCommands.js` +4 more
- `src\core\eventBus.js` ← `src\core\app.js`, `src\core\BaseModule.js`, `src\core\index.js`, `src\interaction\InteractionManager.js`, `src\scheduling\CSGScheduler.js` +4 more
- `src\canvas\CanvasManager.js` ← `src\canvas\CanvasModule.js`, `src\core\ManagerFactory.js`, `src\editor\EditorCanvas.js`, `src\editor\EditorCanvas.js`, `src\editor\ProfileEditor.js` +3 more
- `src\editor\tools\ArcTool.js` ← `src\editor\EditorCanvas.js`, `src\editor\EditorStateManager.js`, `src\editor\ProfileEditor.js`, `src\editor\tools\CircleTool.js`, `src\editor\tools\CursorTool.js` +3 more

---

# Events & Queues

- `canvas:ready` [event] — `src/bits/BitsModule.js`
- `bits:add` [event] — `src/bits/BitsModule.js`
- `app:initialized` [event] — `src/canvas/CanvasModule.js`
- `app:started` [event] — `src/core/app.js`
- `app:shutdown` [event] — `src/core/app.js`
- `module:${this.name}:initialized` [event] — `src/core/BaseModule.js`
- `module:${this.name}:shutdown` [event] — `src/core/BaseModule.js`
- `csg:cancelled` [event] — `src/scheduling/CSGScheduler.js`
- `csg:scheduled` [event] — `src/scheduling/CSGScheduler.js`
- `csg:applied` [event] — `src/scheduling/CSGScheduler.js`
- `Auto-loaded ${restoredCount} saved bit positions` [event] — `src/script.js`
- `Failed to auto-load saved positions` [event] — `src/script.js`
- `DXF export completed successfully` [event] — `src/script.js`
- `Failed to export DXF: ` [event] — `src/script.js`
- `Saved ${payload.bits.length} bit positions` [event] — `src/script.js`
- `Exported ${payload.bits.length} bit positions to JSON file` [event] — `src/script.js`
- `Loaded ${restoredCount} bit positions from JSON file` [event] — `src/script.js`
- `Failed to load positions: invalid JSON format` [event] — `src/script.js`
- `Cleared ${bitCount} bits from canvas` [event] — `src/script.js`
- `state:${key}Changed` [event] — `src/state/AppState.js`
- `mode:changed` [event] — `src/state/AppState.js`
- `meshRepair:statsUpdated` [event] — `src/state/AppState.js`
- `meshRepair:statsReset` [event] — `src/state/AppState.js`
- `meshRepair:exportValidation` [event] — `src/three/ThreeModule.js`
- `canvas:resized` [event] — `src/ui/UIModule.js`

---

# Test Coverage

> **0%** of routes and models are covered by tests
> 28 test files found

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_
