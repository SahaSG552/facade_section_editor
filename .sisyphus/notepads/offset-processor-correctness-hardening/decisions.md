# Decisions — offset-processor-correctness-hardening

_Architectural choices and design decisions made during hardening._

---

## 2026-03-16T11:34:11+03:00 — Task 4 deterministic intersection ranking policy

- Defined deterministic ranking policy for `applyMiterJoin` candidate selection across line-line, line-arc, and arc-arc cases.
- Locked fallback order to: **geometric intersection -> tangent miter -> bridge**.
- Explicitly enforced acceptance-before-ranking gate: reject over-limit movement and reject arc-angle-expanding candidates via `isValidEndTrim` / `isValidStartTrim` before any tie-break.
- Chosen deterministic total-order ranking tuple for accepted candidates:
  `(d1+d2, max(d1,d2), |d1-d2|, qx, qy, id)` with fixed quantization for `qx/qy`.
- Rationale: closest-to-source prioritization (CavalierContours-style) plus replay-stable tie-break independent of candidate enumeration order.
- QA evidence generated:
  - `.sisyphus/evidence/task-4-ranking-policy.txt`
  - `.sisyphus/evidence/task-4-tiebreak-replay.txt`
  - `.sisyphus/evidence/task-4-no-arc-expand-filter.txt`

## Task 5: Test Harness Bootstrap (2026-03-16T08:33:19Z)

### Decision: Vitest + happy-dom for Geometry Module Testing

**Context:**

- No automated tests existed for geometry modules (CustomOffsetProcessor, OffsetTool)
- Need DOM environment for path operations and coordinate calculations
- Required setup for all Wave 1 foundation tasks

**Choice: Vitest with happy-dom**

**Rationale:**

1. **Vitest Benefits**: Fast, native ESM support, Vite integration, great DX for ES modules
2. **happy-dom Over jsdom**: Lighter weight, faster initialization (365ms vs typical jsdom overhead)
3. **Configuration Strategy**: Merged with existing vite.config.js to avoid duplication
4. **Global Setup**: Enabled globals in vitest.config.js for cleaner test syntax

**Implementation Details:**

```javascript
// vitest.config.js configuration
test: {
  environment: "happy-dom",      // DOM-compliant for path operations
  globals: true,                 // Match test expectations
  include: ["tests/**/*.spec.js", "src/**/*.spec.js"],
  testTimeout: 10000,
}
```

**Test Structure Created:**

- `tests/smoke.spec.js`: 10 smoke tests covering:
  - Harness initialization (4 tests)
  - Geometry helpers with DOM (3 tests)
  - DOM capabilities (canvas, SVG, queries) (3 tests)

**Results:**

- ✓ All 10 tests pass
- ✓ Exit code 0 (stable harness)
- ✓ Performance: 748ms (acceptable)
- ✓ No DOM errors ("document is undefined" resolved)

**Scripts Added:**

- `npm run test` — Single test run
- `npm run test:watch` — Development watch mode

**Evidence Created:**

- `.sisyphus/evidence/task-5-harness-smoke.txt` — Smoke test verification
- `.sisyphus/evidence/task-5-dom-env.txt` — DOM environment validation

**Next Steps (Wave 2):**

- Tasks T6-T10 can now use `npm run test` for geometry module validation
- DOM-dependent helpers (offsets, paths) ready for testing
- Container can be expanded with unit tests for each module

**Blockers Resolved:**

- No test infrastructure existed
- DOM environment requirement unclear
- Build system integration needed

**Dependencies Satisfied:**

- Vitest ^4.1.0 installed
- happy-dom ^20.8.4 installed
- All ESM imports functional

## 2026-03-16T12:55:00+03:00 — Task 2: Tolerance Model Definition & Policy

**Context:**

- CustomOffsetProcessor uses THREE tolerance thresholds inconsistently
- No formal tolerance policy existed
- Hardcoded numeric values (1e-6, 0.001, 0.5) scattered across codebase
- Risk: future changes could introduce conflicting tolerance strategies

**Decision: Define Three Distinct Tolerance Classes with Clear Semantics**

**Tolerance Model:**

1. **GEOM_EPSILON (1e-6)**
   - Scope: Geometric validity checks (vector normalization, length tests, intersection math)
   - Usage: Guards against floating-point precision limits
   - Justification: IEEE 754 standard epsilon for double-precision
   - Occurrences: 34+ uses across geometric operations

2. **JOIN_TOLERANCE (0.001)**
   - Scope: Gap detection for miter join operations
   - Usage: Determines bridge line insertion in applyMiterJoin()
   - Justification: User-visible threshold, balance precision vs. robustness
   - Occurrences: 4 uses (lines 116, 627, 668, 693, 820)

3. **STITCH_TOLERANCE (0.5, user-configurable)**
   - Scope: Final segment stitching after offset calculations
   - Usage: Snaps distant endpoints in stitchSegments()
   - Justification: Large gap acceptable for final cleanup (topology already correct)
   - Occurrences: 2 uses with option override (lines 974, 1016)

**Usage Policy (Deterministic Precedence):**

- Order of application: GEOM_EPSILON → JOIN_TOLERANCE → STITCH_TOLERANCE
- No overlapping contexts within same operation class
- Execution sequence prevents conflicts (offset → join → stitch → quantize)

**Ambiguity Analysis Result: SAFE**

- Different semantic purposes (math vs. gap detection vs. cleanup)
- applyMiterJoin safely uses both GEOM_EPSILON and JOIN_TOLERANCE
- No conflicting reuse detected
- Policy is deterministic and unambiguous

**Evidence Generated:**

- `.sisyphus/evidence/task-2-tolerance-table.txt` — Policy table with operation mapping
- `.sisyphus/evidence/task-2-tolerance-guard.txt` — Ambiguity guard analysis

**Next Steps (Wave 2 - Code Hardening):**

- Extract named constants to src/config/constants.js:
  ```javascript
  const GEOM_EPSILON = 1e-6;
  const JOIN_TOLERANCE = 0.001;
  const STITCH_TOLERANCE = 0.5;
  ```
- Remove hardcoded numeric magic numbers from functions
- Document tolerance selection in function JSDoc
- Consider adaptive epsilon for scaled geometries (future enhancement)

**Impact Assessment:**

- No code changes required for Task 2 (documentation only)
- Policy provides foundation for Task 3+ code refactoring
- Enables future tolerance tuning without ambiguity
- Supports deterministic testing across platforms
