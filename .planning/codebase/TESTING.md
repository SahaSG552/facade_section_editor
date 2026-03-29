# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.js`

**Environment:**
- happy-dom (DOM simulation for Node.js)
- WebAPIs: document, window, HTMLCanvasElement (mocked)

**Assertion Library:**
- Built-in Vitest assertions (`expect`, `describe`, `it`)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode for development
```

## Test File Organization

**Location:**
- Tests co-located in `tests/` directory (separate from source)
- Source files can also contain tests: `src/**/*.spec.js`

**Naming:**
- Pattern: `*.spec.js` for all test files
- Example: `offset-contours.spec.js`, `arc-center.spec.js`, `smoke.spec.js`

**Structure:**
```
tests/
├── offset/                    # Offset operation tests
│   ├── offset-contours.spec.js
│   ├── arc-center.spec.js
│   ├── determinism.spec.js
│   ├── clipper-offset.spec.js
│   └── e2e/
│       └── canonical.spec.js
├── smoke.spec.js             # Basic harness verification
└── setup.js                 # Test environment setup
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach } from "vitest";

// Main test suite
describe("Module Name - Feature", () => {
    // Individual test
    it("should do something specific", () => {
        // Arrange
        const input = ...;
        
        // Act
        const result = functionUnderTest(input);
        
        // Assert
        expect(result).toBe(expectedValue);
    });
    
    // Test with setup
    describe("nested feature", () => {
        beforeEach(() => {
            // Setup before each test
        });
        
        it("handles edge case", () => { ... });
    });
});
```

**Patterns:**
- `describe()` blocks for grouping related tests
- `it()` or `test()` for individual test cases
- `beforeEach()` for setup before each test
- Nested `describe()` for sub-features

## Mocking

**Framework:** Vitest built-in `vi` (from "vitest")

**Canvas/Mocking Pattern (from `tests/setup.js`):**
```javascript
import { vi } from "vitest";

// Mock HTMLCanvasElement.getContext for Paper.js
if (typeof HTMLCanvasElement !== "undefined") {
    HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
        if (contextType === "2d") {
            return {
                canvas: { width: 300, height: 150 },
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 1,
                // ... full 2D context mock
                fillRect: vi.fn(),
                clearRect: vi.fn(),
                // ... other context methods
            };
        }
        return null;
    });
}

// Mock window dimensions
if (typeof window !== "undefined") {
    Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: 1,
    });
}
```

**What to Mock:**
- HTMLCanvasElement.getContext (required for Paper.js)
- Browser APIs not available in Node.js
- External services (if any)

**What NOT to Mock:**
- Pure JavaScript functions
- Core business logic (offset calculations, geometry)
- Internal module imports (test actual implementations)

## Fixtures and Factories

**Test Data:**
Defined inline within test files as constants:

```javascript
// From tests/offset/determinism.spec.js
const CANONICAL_PATH = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";
const SIMPLE_LINE_PATH = "M 0 0 L 10 0 L 10 10 L 0 10 Z";
const SIMPLE_ARC_PATH = "M 10 0 A 10 10 0 0 1 0 10 A 10 10 0 0 1 -10 0 ...";
```

**Location:**
- Inline fixtures at top of test files
- Helper functions defined within test files

**Module Fixtures:**
```javascript
// From tests/offset/offset-contours.spec.js
import ExportModule from "../../src/export/ExportModule.js";

const exportModule = new ExportModule();

// Then used in tests
const contours = calculateOffsetContoursFromPathData(input, -1, {
    exportModule,
    offsetSignMode: "direct",
    trimSelfIntersections: true,
});
```

## Coverage

**Requirements:** None explicitly enforced

**View Coverage:**
```bash
npm run test -- --coverage
```

**Coverage Configuration (from vitest.config.js):**
```javascript
coverage: {
    provider: "v8",
    reporter: ["text", "json"],
    exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "**/*.spec.js",
    ],
}
```

## Test Types

**Unit Tests:**
- Test individual functions: `calculateOffsetFromPathData()`
- Test pure geometry functions
- Test validation utilities

**Integration Tests:**
- Test module interactions: offset processor with export module
- Test full pipeline: path input → offset → output

**E2E Tests:**
- Located in `tests/offset/e2e/canonical.spec.js`
- Test complete offset workflows
- Verify output matches expected canonical forms

**Smoke Tests:**
- From `tests/smoke.spec.js`
- Verify test harness works
- Verify DOM environment available
- Basic geometry helper tests

## Common Patterns

**Async Testing:**
```javascript
it("should handle async operations", async () => {
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
});
```

**Error Testing:**
```javascript
it("should throw ValidationError for invalid input", () => {
    expect(() => validateBitDiameter(-5)).toThrow();
    expect(() => validateBitDiameter(-5)).toThrow(ValidationError);
});
```

**Floating-Point Comparisons:**
```javascript
// Use toBeCloseTo for floating-point equality
expect(offsetArc.arc.radius).toBeCloseTo(8, 5);

// Use epsilon for custom comparisons
const EPSILON = 1e-6;
expect(Math.abs(result - expected)).toBeLessThan(EPSILON);
```

**Testing Invariants:**
```javascript
// From tests/offset/arc-center.spec.js
function assertArcCenterPreserved(arcBefore, arcAfter) {
    expect(arcAfter).toBeDefined();
    expect(arcAfter.arc).toBeDefined();
    expect(arcAfter.arc.centerX).toBeDefined();
    expect(arcAfter.arc.centerY).toBeDefined();
    
    const centerXDiff = Math.abs(arcAfter.arc.centerX - arcBefore.arc.centerX);
    const centerYDiff = Math.abs(arcAfter.arc.centerY - arcBefore.arc.centerY);
    
    expect(centerXDiff).toBeLessThan(EPSILON * 10);
    expect(centerYDiff).toBeLessThan(EPSILON * 10);
}
```

**Determinism Testing:**
```javascript
// Run same operation multiple times, verify same result
const hashes = new Set();
for (let i = 0; i < 30; i++) {
    const result = calculateOffsetFromPathData(pathData, offset, { exportModule });
    const serialized = JSON.stringify(result);
    const hash = simpleHash(serialized);
    hashes.add(hash);
}
expect(hashes.size).toBe(1); // All 30 runs produced same hash
```

**Timeout Configuration:**
```javascript
// From vitest.config.js
testTimeout: 10000  // 10 seconds
```

---

*Testing analysis: 2026-03-29*
