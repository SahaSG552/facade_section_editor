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
