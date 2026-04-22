# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**

- PascalCase for classes: `BitsManager.js`, `CanvasManager.js`, `ThreeModule.js`
- camelCase for utilities and helpers: `zoomUtils.js`, `variableTokens.js`
- camelCase for config files: `AppConfig.js`

**Functions:**

- PascalCase for classes and constructor functions
- camelCase for methods and standalone functions
- Verb-noun pattern: `createBitGroups()`, `calculateOffsetContoursFromPathData()`

**Variables:**

- camelCase: `canvasManager`, `bitGroups`, `currentPath`
- UPPER_SNAKE_CASE for constants: `LogLevels`, `svgNS`
- Prefix with underscore for private methods: `_formatMessage()`, `_shouldLog()`

**Types:**

- PascalCase: `ModuleLogger`, `BitLogger`, `ValidationError`
- Custom types defined in JSDoc: `@param {BitData} bit`

## Code Style

**Formatting:**

- No explicit formatter configured (no Prettier or ESLint found)
- Uses 4 spaces for indentation
- Single quotes for strings
- Semicolons at end of statements

**Linting:**

- Not configured - no .eslintrc or similar found

**General Style:**

- ES Modules (`import`/`export default`)
- Async/await for asynchronous operations
- Destructuring for object properties

## Import Organization

**Order:**

1. External libraries: `import { vi } from "vitest";`
2. Internal modules: `import BaseModule from "../core/BaseModule.js";`
3. Relative modules: `import { app } from "../app/main.js";`
4. Local utilities: `import { evaluateMathExpression } from "../utils/utils.js";`

**Path Aliases:**

- None configured (relative paths used throughout)
- Module resolution via relative paths: `../core/BaseModule.js`

## Error Handling

**Custom Error Classes:**

```javascript
// From src/utils/validation.js
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
```

**Pattern - Throw on Invalid Input:**

- Validation functions throw `ValidationError` for invalid data
- Example: `validateCoordinates()`, `validateBitDiameter()`, `validateVCarveAngle()`

**Pattern - Try/Catch with Silent Failure:**

```javascript
try {
  const result = evaluateMathExpression(expression);
  if (!isNaN(result) && isFinite(result)) {
    return result;
  }
} catch (e) {
  // Evaluation failed - return null
}
return null;
```

**Pattern - Defensive Returns:**

- Early returns for null/undefined checks
- Validate parameters before processing

## Logging

**Framework:** Custom `LoggerFactory` (from `src/core/LoggerFactory.js`)

**Pattern:**

```javascript
import LoggerFactory from "../core/LoggerFactory.js";
const log = LoggerFactory.createLogger("ModuleName");

log.debug("Debug info");
log.info("General operation");
log.warn("Warning message", errorObject);
log.error("Critical error", errorObject);
```

**Log Levels:**

- DEBUG: Detailed debugging info
- INFO: General operations
- WARN: Potential issues
- ERROR: Critical errors

**Specialized Loggers:**

- `BitLogger`: Specialized for bit operations (tracks creation, modifications, collisions)

## Comments

**When to Comment:**

- Complex geometric algorithms
- Coordinate system transformations
- Workarounds or known limitations
- Public API methods (required)

**JSDoc:**
Required for all public methods. Examples from codebase:

```javascript
/**
 * Validate bit diameter
 * @param {number} diameter - Bit diameter in mm
 * @throws {ValidationError} If diameter is invalid
 */
export function validateBitDiameter(diameter) { ... }

/**
 * Get the BitsManager instance
 * @returns {BitsManager} BitsManager instance
 */
getBitsManager() { ... }
```

**Required JSDoc Fields:**

- `@param {type} name - description`
- `@returns {type} description`
- `@throws {ErrorType} when/why` (if applicable)

## Function Design

**Size:**

- Prefer single-responsibility functions
- Helper functions extracted for complex logic
- Large files (500+ lines) exist but should be refactored when possible

**Parameters:**

- Explicit parameters preferred over options object (unless 3+ params)
- Destructuring for complex parameter objects

**Return Values:**

- Return null/undefined for invalid inputs
- Return empty arrays `[]` for empty collections
- Return empty strings `""` for invalid paths

## Module Design

**Exports:**

- Default export for main module classes: `export default BitsManager;`
- Named exports for utilities: `export function validateCoordinates(...)`

**Barrel Files:**

- `src/core/index.js` exports all core components
- Module files export single default class

**Class Structure:**

```javascript
class BitsManager {
    constructor(canvasManager) { ... }
    // Public methods
    async createBitGroups() { ... }
    // Private methods (prefixed with _)
    _validateBitParams() { ... }
}
```

---

_Convention analysis: 2026-03-29_
