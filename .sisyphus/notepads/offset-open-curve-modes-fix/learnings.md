# Learnings - Offset Open-Curve Modes Fix

This file tracks conventions, patterns, and best practices discovered during implementation.

---

## Wave 1 - RED Tests: Single-Line Topology Invariants

### Test File Created
**File**: `tests/offset-topology.spec.js` (122 lines)
- Uses Vitest framework (describe/it/expect)
- Follows existing test patterns from `task-6-offsetengine-qa.spec.js`
- Mocks `PaperBooleanProcessor.resolveSelfIntersections` to isolate offset behavior

### Test Cases (6 total: 3 RED, 3 GREEN)

#### RED (Failures) - Proving Root Cause
1. **"single-line offset should produce open contour, not closed"** (FAIL)
   - Input: `M 0 0 V 10` with offset=1
   - Expected: `contour.closed === false`
   - Actual: `contour.closed === true`
   - Evidence: Contour has 4 segments but incorrectly marked as closed

2. **"single-line round-cap offset should produce proper topology"** (FAIL)
   - Input: `M 0 0 V 10` with offset=2, round caps
   - Expected: Open contour (closed=false)
   - Actual: Open path treated as closed
   - Evidence: 4 segments, closed=true (wrong)

3. **"multi-segment open path should maintain proper topology"** (FAIL)
   - Input: `M 0 0 L 10 0 L 10 10` (3-segment open path)
   - Expected: Open contour (closed=false)
   - Actual: Incorrectly closed
   - Evidence: 6 segments, closed=true (wrong)

#### GREEN (Passes) - Sanity Checks
1. **"should produce 1 open contour for single-line one-sided mode"** ✓
   - Contour count = 1 (correct)

2. **"single-line offset should NOT produce 12-segment parasitic loop"** ✓
   - Segment count = 4, not 12 (no obvious parasitic loop yet)
   - May need deeper investigation with different offset values

3. **"single-line offset pathData should not have unnecessary Z"** ✓
   - (Conditional check, not triggered due to closed bug)

### Key Discoveries

#### OffsetEngine Behavior (Current Broken State)
- `OffsetEngine.processPath()` for open contours (like `M 0 0 V 10`):
  1. Computes positive offset (distance=1, left side)
  2. Computes negative offset (distance=-1, right side)
  3. Calls `capBothSides()` to cap ends
  4. **BUG**: Result marked as `closed: true` even though input is open

#### Segment Count Pattern (Flat Caps)
- Single-line input (`M 0 0 V 10`) → 4 segments in result
- Multi-segment open path (`M 0 0 L 10 0 L 10 10`) → 6 segments
- Pattern suggests: caps + offset line segments, but topology flag wrong

#### Root Cause Markers
- `contour.closed` field set incorrectly when offset processes open paths
- Likely in `OffsetEngine._processSegmentsSync()` or contour finalization
- Not the "12-segment parasitic loop" at this stage—that's different issue

#### Test Patterns Learned
- Use `vi.mock()` to stub `PaperBooleanProcessor` (it has Paper.js deps)
- Import `ExportModule` for engine initialization
- `OffsetEngine.processPath()` returns: `{ pathData, contours, metadata }`
- Each contour has: `segments`, `pathData`, `closed`, `orientation`, `area`, `bbox`
- Use `console.log(JSON.stringify(result, null, 2))` for detailed inspection

### Next Steps (Wave 2+)
1. **Locate the closed-flag setter**: Search `OffsetEngine`, `OffsetContourBuilder`, `OffsetTrimmer`
2. **Trace open-path branching**: Why is open path treated as closed after `capBothSides`?
3. **Fix topology flag**: Should be `closed: false` for capped-but-open contours
4. **Validate parasitic loop**: Confirm 12-segment behavior under different caps/distances

### Evidence Files
- Test output: `.sisyphus/evidence/task-1-red-topology.txt` (3 failures, 3 passes)

---

## Wave 2 - RED Tests: Mode Routing Contracts

### Test File Created
**File**: `tests/offset-modes.spec.js` (392 lines)
- 15 test cases covering 6 offset modes
- Tests organized by contour type: open (4 modes) and closed (2 modes)
- Mock setup matches topology test patterns

### Mode Test Cases

#### Open Contour Modes (4 tests per mode)
1. **one-sided mode**: 2 tests
   - Expected: 1 open contour (offset to cursor side only)
   - Actual: 1 closed contour (mode routing not yet implemented)
   
2. **two-sides-no-close mode**: 2 tests
   - Expected: 2 separate open contours (left + right, not stitched)
   - Actual: 1 closed contour (mode routing not yet implemented)
   
3. **two-sides-round-caps mode**: 2 tests
   - Expected: 1 closed contour with round arcs at endpoints (>8 segments)
   - Actual: 1 closed contour with only 4 segments (no round cap arcs)
   
4. **two-sides-flat-caps mode**: 2 tests
   - Expected: 1 closed contour with flat caps (>4 segments)
   - Actual: 1 closed contour with only 4 segments (identical to round caps)

#### Closed Contour Modes (2 tests per mode)
1. **one-sided mode**: 2 tests
   - Expected: 1 closed contour (inward offset only)
   - Actual: 1 closed contour (but mode parameter ignored)
   
2. **two-sides-no-close mode**: 2 tests
   - Expected: 2 separate closed contours (outer + inner concentric rings)
   - Actual: 1 closed contour (mode routing not yet implemented)

#### Mode Routing Contracts (3 tests)
1. **Parameter acceptance**: Mode parameter in processPath options
2. **Open-path mode differentiation**: One-sided vs two-sides should differ
3. **Cap-type differentiation**: Round-caps vs flat-caps should differ

### RED Test Results Summary

**Total**: 15 tests
- **FAILED**: 10 tests (RED ✓)
- **PASSED**: 5 tests (baseline sanity checks)

#### Key Failures
1. Open contours marked as `closed: true` (same bug as Wave 1)
2. Mode parameter ignored—all modes produce same 1-contour result
3. `two-sides-no-close` produces 1 contour instead of 2
4. Round-cap and flat-cap modes produce identical output (no differentiation)
5. Segment count doesn't increase with round caps (expected >8, got 4)

### Evidence Artifacts
- Test output: `.sisyphus/evidence/task-2-red-modes.txt` (279 lines)
- Red failures clearly show:
  - `expected true to be false` (closed flag error)
  - `expected 1 to have length of 2` (no two-side separation)
  - `expected 4 to be greater than 8` (no round cap segmentation)
  - `expected 1 to not deeply equal 1` (modes not differentiated)

### Test Architecture Patterns

#### Mode Parameter Passing
```javascript
const result = await engine.processPath(pathData, offsetDistance, { mode: "one-sided" });
```
- Tests expect optional third parameter with `mode` property
- Current implementation ignores mode parameter entirely

#### Contour Verification Structure
```javascript
expect(result.contours).toHaveLength(expectedCount);
expect(result.contours[0].closed).toBe(expectedClosed);
expect(result.contours[0].segments.length).toBeGreaterThan(minSegments);
expect(result.contours[0].area).not.toEqual(otherContourArea);
```

### Pre-Conditions for Wave 2 Implementation
1. **Mode routing entry point**: Add `mode` parameter to `OffsetEngine.processPath()`
2. **Mode dispatch logic**: Route to different offset algorithms based on mode
3. **Contour stitching**: For `two-sides-*` modes, either merge or separate contours
4. **Cap generation**: For `two-sides-*-caps` modes, generate proper cap segments
5. **Closure handling**: For `no-close` modes, keep contours open; for cap modes, close with caps

### Next Steps (Wave 2)
1. Implement mode routing in `OffsetEngine._processSegmentsSync()`
2. Add branching logic for:
   - `one-sided`: Single offset (negative for open, inward for closed)
   - `two-sides-no-close`: Two separate contours (both offsets, not stitched)
   - `two-sides-round-caps`: Both offsets + round end caps, closed
   - `two-sides-flat-caps`: Both offsets + flat end caps, closed
3. Cap generation functions (round vs flat)
4. Two-contour separation/stitching logic
5. Re-run tests—should all go GREEN

## Wave 1.5 - RED Tests: Cursor-Side One-Sided Contract

### Test File Created
**File**: `tests/offset-cursor-side.spec.js` (79 lines)
- Uses Vitest with `vi.mock()` for `PaperBooleanProcessor.resolveSelfIntersections`
- Initializes `OffsetEngine` with `ExportModule` like existing offset tests
- Encodes nearest-segment-normal contract with fixed cursor coordinates

### Cursor-Side Contract Encoded
For `offsetMode: "one-sided"` + `sideResolution: "nearest-segment-normal"`:
1. Find nearest segment to cursor
2. Build segment normal
3. Compute `dot((cursor - midpoint), normal)`
4. `dot > 0` => positive side, `dot < 0` => negative side

### RED Cases Added (3/3 failing)
1. **Open vertical line, cursor left (`{-1,5}`) => negative side**
   - Input: `M 0 0 V 10`, distance=1
   - Expected bbox entirely on left (`maxX <= 0`)
   - Actual: `maxX = 1` (failed)

2. **Open vertical line, cursor right (`{1,5}`) => positive side**
   - Input: `M 0 0 V 10`, distance=1
   - Expected bbox on/right of source (`minX >= 0`)
   - Actual: `minX = -1` (failed)

3. **Closed rectangle, inside cursor (`{5,5}`) => inward offset**
   - Input: `M 0 0 L 10 0 L 10 10 L 0 10 Z`, distance=1
   - Expected inset bbox (`min>0`, `max<10`)
   - Actual: `minX = -1` (failed)

### Key Discovery
- `OffsetEngine.processPath()` currently ignores cursor-based side hints (`offsetMode`, `sideResolution`, `cursorPoint`) and uses static sign behavior.
- This confirms the sign-resolution hook is missing (expected pre-Wave-2 state).

### Evidence
- RED run captured in: `.sisyphus/evidence/task-3-red-cursor-side.txt`

---

## Wave 4 - RED Tests: Continuity & Degenerate Invariants

### Test File Created
**File**: `tests/offset-invariants.spec.js` (404 lines)
- Tests segment-level invariants: no zero-length, stitched continuity, no parasitic closure
- 10 total tests covering single-line, multi-segment, closed contours
- Focus: Check both segment validity AND contour topology flags

### RED Results

**Total**: 10 tests
- **FAILED**: 1 test (RED ✓)
- **PASSED**: 9 tests (continuity/degenerate checks pass)

#### Key Failure
**"single-line offset should have no zero-length segments"** ✗
- Input: `M 0 0 V 10` with offset=1
- Expected: `contour.closed === false` (open path)
- Actual: `contour.closed === true` (KNOWN BUG from Task 1)
- Segments: All 4 segments valid (no zero-length, stitched)
- Result: 4-segment closed loop marking

### Critical Discovery

**Segment Validity ≠ Topology Correctness**
- Segments themselves are properly constructed: no degenerates, stitched
- BUT: The contour's `closed` flag is incorrectly set
- This is the root cause bug: wrong topology classification prevents proper mode routing

#### Segment Structure (Correct)
```
Segment 0: start=(-1,0)   → end=(-1,10)  ✓ valid
Segment 1: start=(-1,10)  → end=(1,10)   ✓ stitched
Segment 2: start=(1,10)   → end=(1,0)    ✓ stitched
Segment 3: start=(1,0)    → end=(-1,0)   ✓ stitched & closed loop
```

#### Topology Bug
- Loop ends at loop start: OK for closed
- BUT: Input is open (`M 0 0 V 10`), not `M 0 0 V 10 Z`
- Closure imposed by capping logic, then not undone
- Flag should be: `closed: false`

### Test Architecture

#### Invariant Checkers
```javascript
// epsilon-based equality for floating-point safety
pointsEqual(p1, p2, EPS=1e-6)

// check segment validity
isZeroLengthSegment(segment, epsilon)
areSegmentsStitched(seg1, seg2, epsilon)
```

#### Test Sections
1. **No Zero-Length Segments** (3 tests)
   - Single-line, multi-segment, closed contours
   - Result: All pass (segments valid)

2. **Stitched Continuity** (3 tests)
   - Check end[i] == start[i+1]
   - Result: All pass (stitching works)

3. **No Implicit Extra Closure** (3 tests)
   - Check for parasitic closure segments
   - Result: All pass (no degenerates detected)

4. **Composite Invariants** (1 test)
   - All three checks combined
   - Result: Passes (segments OK)

### Evidence Files
- Test output: `.sisyphus/evidence/task-4-red-invariants.txt`
- Shows 1 failure on closed flag, 9 passes on segment structure

### Next Steps (Wave 2.5)
1. **Fix closed-flag setter**: In `OffsetEngine` or `OffsetContourBuilder`
2. **Locate flag assignment**: Search for `closed: true/false` assignments
3. **Add open-path detection**: If input is open and capped, mark `closed: false`
4. **Validation**: Re-run test—should go GREEN
5. **Note**: Don't need stitching fix—it already works. Just topology flag.

### Key Insight
The offset engine's segment generation is SOLID. The problem is purely at the CONTOUR CLASSIFICATION LEVEL. Once the `closed` flag is fixed, mode routing in Wave 2 should work correctly.
