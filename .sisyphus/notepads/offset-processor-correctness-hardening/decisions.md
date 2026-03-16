# Decisions — offset-processor-correctness-hardening

*Architectural choices and design decisions made during hardening.*

---

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
