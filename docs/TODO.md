# TODO: Paper.js Migration

## Phase 0: Setup ✅ COMPLETED (2026-01-04)

- [x] Install Paper.js: `npm install paper`
- [x] Create PaperCanvasManager.js
- [x] Add HTML canvas element for Paper.js
- [x] Update view toggle buttons (2D, 2Dp, 3D, 2D/2Dp, 2D/3D)
- [x] Add CSS styles for all view modes
- [x] Create syncSVGtoPaper() function
- [x] Initialize Paper.js in script.js

**Status**: Paper.js canvas работает параллельно с SVG! Можно переключаться между режимами для наблюдения.

---

## Phase 1: Boolean Operations (HIGH PRIORITY) ✅ IN TESTING

**Goal**: Replace maker.js with Paper.js boolean operations

### Tasks
- [x] Create `src/operations/PaperBooleanProcessor.js`
- [x] Implement `paperCalculateResultPolygon(panelData, bitsData)`
- [x] Implement `createPaperPath()` - creates Paper.js paths from SVG
- [x] Implement path extraction for all shape types (rect, circle, polygon, path)
- [x] Implement bit extensions for bits below material
- [x] Implement `unite()` - union all bits
- [x] Implement `subtract()` - subtract bits from panel
- [x] Add toggle button in UI (mkr ⇄ ppr)
- [x] Update `updatePartShape()` to support both engines
- [ ] **Test against current maker.js results** ← CURRENT TASK
- [ ] Performance benchmarks
- [ ] Make Paper.js default
- [ ] Remove `src/utils/makerProcessor.js`
- [ ] Remove maker.js from package.json

**Current Status**: ✅ Implementation complete, ready for testing

**Testing**: See [TESTING_BOOLEAN_ENGINE.md](TESTING_BOOLEAN_ENGINE.md)

**Expected Results**:
- Remove 234 lines of code
- Faster boolean operations
- Better accuracy

**Blockers**: None - ready for user testing

---

## Phase 2: Offset Operations (HIGH PRIORITY) ✅ IN TESTING

**Goal**: Replace OffsetCalculator with Paper.js offset

### Tasks
- [x] Create `src/operations/PaperOffsetProcessor.js`
- [x] Implement `calculateOffset()` using Paper.js `path.offset()`
- [x] Implement `rectToPoints()` helper
- [x] Create `PaperOffsetCalculator` class for API compatibility
- [x] Add toggle flag `usePaperJsOffset` in script.js
- [x] Update `updateOffsetContours()` to use Paper.js when enabled
- [x] Connect toggle button to switch both engines (Boolean + Offset)
- [ ] **Test offset results** ← CURRENT TASK
- [ ] Test V-Carve multi-pass operations
- [ ] Test all operation types (AL, OU, IN, VC)
- [ ] Performance benchmarks
- [ ] Make Paper.js default
- [ ] Remove `src/utils/offsetCalculator.js`

**Current Status**: ✅ Implementation complete, ready for testing

**Testing**: Click **mkr/ppr** button to toggle between legacy and Paper.js engines

**Expected Results**:
- Remove 225 lines of code
- Better handling of self-intersections
- Higher quality offset contours
- Simpler codebase (1 line instead of 225)

**Blockers**: None - ready for user testing

---

## Phase 3: Bit Shapes (MEDIUM PRIORITY)

**Goal**: Migrate bit shape creation to Paper.js

### Tasks
- [ ] Create `src/canvas/PaperBitShapeFactory.js`
- [ ] Implement `createCylindricalBit()`
- [ ] Implement `createConicalBit()`
- [ ] Implement `createBallNoseBit()`
- [ ] Implement `createFilletBit()`
- [ ] Implement `createBullNoseBit()`
- [ ] Update `BitsManager.createBitShapeElement()` to use Paper.js
- [ ] Test all bit types visually
- [ ] Test bit transformations (rotate, scale, translate)

**Expected Results**:
- Simplified bit shape creation
- Ability to use Paper.js transformations
- Better performance

**Blockers**: None (can be done in parallel with Phase 1-2)

---

## Phase 4: Full Canvas Migration (LOW PRIORITY)

**Goal**: Completely replace SVG canvas with Paper.js

### Tasks
- [ ] Migrate all SVG DOM manipulations to Paper.js API
- [ ] Update event handling (click, drag, hover)
- [ ] Migrate zoom/pan logic to Paper.js view
- [ ] Migrate grid rendering to Paper.js
- [ ] Migrate selection/highlighting to Paper.js
- [ ] Update InteractionManager for Paper.js events
- [ ] Update SelectionManager for Paper.js hit testing
- [ ] Remove CanvasManager.js
- [ ] Use only PaperCanvasManager
- [ ] Update all documentation

**Expected Results**:
- Remove all SVG DOM manipulation
- Modern Canvas-based approach
- Simplified architecture
- ~500-700 lines of code removed total

**Blockers**: Depends on Phases 1-3 completion

---

## Testing Tasks

- [ ] Create unit tests for PaperCanvasManager
- [ ] Create unit tests for PaperBooleanProcessor
- [ ] Create integration tests for offset operations
- [ ] Performance benchmarks (SVG vs Paper.js)
- [ ] Visual regression tests
- [ ] Test on different browsers
- [ ] Test on mobile devices

---

## Documentation Tasks

- [x] Create PAPER_JS_MIGRATION_GUIDE.md
- [ ] Update API_REFERENCE.md with Paper.js APIs
- [ ] Update ARCHITECTURE.md with Paper.js integration
- [ ] Create Paper.js examples/tutorials
- [ ] Document performance improvements
- [ ] Create comparison screenshots (SVG vs Paper.js)

---

## Future Enhancements (Post-Migration)

- [ ] Paper.js animation support for bit movements
- [ ] Advanced path simplification
- [ ] Better hit testing for complex shapes
- [ ] Paper.js plugins exploration
- [ ] Export to more formats (PDF, PNG, etc.)

---

## Notes

- **Current Status**: Phase 0 complete, ready to start Phase 1
- **Migration Strategy**: Incremental (keep SVG as fallback during migration)
- **Risk Level**: Medium (requires careful testing of boolean/offset operations)
- **Estimated Time**: 2-3 weeks for full migration
