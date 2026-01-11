---
name: furniture-editor-dev
description: Specialized development assistant for building a furniture facade editor using JavaScript, Paper.js (2D), and Three.js (3D). Use when working on (1) 2D/3D graphics code with Paper.js or Three.js, (2) Mathematical calculations for geometry, transformations, or measurements, (3) Code quality tasks requiring clean architecture, documentation, or testing, (4) Project-specific patterns for furniture design domain. Focuses on maintainable code, comprehensive documentation, and automated testing.
---

# Furniture Editor Development Assistant

Comprehensive development assistance for building a professional furniture facade editor with emphasis on code quality, documentation, and testing.

## Core Development Principles

### Code Quality Standards

**Clean Architecture**
- Separate concerns: UI layer, business logic, geometry engine, rendering
- Use dependency injection for testability
- Keep functions small (<50 lines) and single-purpose
- Prefer composition over inheritance
- Use TypeScript types/JSDoc for all public APIs

**Naming Conventions**
- Classes: `PascalCase` (e.g., `FacadeRenderer`, `GeometryCalculator`)
- Functions/methods: `camelCase` (e.g., `calculateArea`, `renderToCanvas`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_THICKNESS`, `MAX_PANEL_WIDTH`)
- Private members: prefix with `_` (e.g., `_internalState`)
- 2D entities: suffix with `2D` (e.g., `Panel2D`, `Handle2D`)
- 3D entities: suffix with `3D` (e.g., `Panel3D`, `Handle3D`)

**Code Organization**
```
src/
├── core/           # Business logic, domain models
├── geometry/       # Math utils, transformations, calculations
├── rendering/      # Paper.js and Three.js renderers
├── ui/             # User interface components
├── utils/          # Helpers, formatters, validators
└── types/          # TypeScript definitions or JSDoc types
```

### Documentation Requirements

**Every public function/class must have JSDoc:**
```javascript
/**
 * Calculates the area of a furniture panel accounting for cutouts
 * @param {Object} panel - Panel configuration
 * @param {number} panel.width - Width in millimeters
 * @param {number} panel.height - Height in millimeters
 * @param {Array<Object>} panel.cutouts - Array of cutout specifications
 * @returns {number} Net area in square millimeters
 * @example
 * calculatePanelArea({ width: 600, height: 800, cutouts: [] })
 * // Returns: 480000
 */
function calculatePanelArea(panel) { }
```

**Module-level documentation:**
- Each file starts with purpose statement
- List key exports and their roles
- Note dependencies on Paper.js/Three.js features

**README updates:**
- Update immediately when adding major features
- Document new configuration options
- Add examples for complex workflows

### Testing Strategy

**Test Coverage Requirements**
- Unit tests: All geometry calculations, transformations, validators
- Integration tests: 2D↔3D synchronization, file import/export
- Visual regression tests: Rendering accuracy for both Paper.js and Three.js
- Minimum 80% code coverage for core modules

**Test Naming Pattern**
```javascript
describe('GeometryCalculator', () => {
  describe('calculatePanelArea', () => {
    it('should return correct area for simple rectangle', () => {});
    it('should subtract cutout areas from total', () => {});
    it('should handle zero-dimension edge cases', () => {});
  });
});
```

**Critical Test Scenarios**
- Boundary conditions (zero, negative, extremely large values)
- Precision in millimeter calculations (avoid floating-point errors)
- 2D/3D state synchronization
- Undo/redo operations
- File format compatibility

## Paper.js Guidelines

### Project Structure
- Use one Paper.js project per canvas
- Manage layers for organization: backgroundLayer, panelsLayer, annotationsLayer, UILayer
- Clean up items when removing: `item.remove()` to prevent memory leaks

### Best Practices
```javascript
// Good: Store references to frequently accessed items
const panel = new paper.Path.Rectangle({
  point: [x, y],
  size: [width, height],
  data: { id: 'panel-001', type: 'door' } // Use data for metadata
});

// Good: Use transformations instead of recalculating paths
panel.scale(scaleFactor);
panel.rotate(angle);

// Good: Efficient hit testing
const hitResult = paper.project.hitTest(point, {
  segments: true,
  stroke: true,
  fill: true,
  tolerance: 5
});
```

### Performance Optimization
- Use `view.draw()` manually when batch updating
- Simplify paths with `path.simplify()`
- Cache computed bounds: `item.bounds`
- Rasterize complex paths when static

See `references/paperjs-patterns.md` for common Paper.js code patterns.

## Three.js Guidelines

### Scene Organization
```javascript
// Standard setup pattern
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Organize with groups
const furnitureGroup = new THREE.Group();
const panelsGroup = new THREE.Group();
const hardwareGroup = new THREE.Group();
```

### Material Standards
- Use `MeshStandardMaterial` for realistic wood/metal
- Implement PBR workflow: baseColor, roughness, metalness, normalMap
- Cache materials: don't recreate identical materials
- Dispose of materials when removing objects: `material.dispose()`

### Geometry Best Practices
```javascript
// Good: Reuse geometries
const panelGeometry = new THREE.BoxGeometry(width, height, thickness);
const panel1 = new THREE.Mesh(panelGeometry, material1);
const panel2 = new THREE.Mesh(panelGeometry, material2);

// Good: Update existing geometry instead of recreating
geometry.attributes.position.needsUpdate = true;

// Don't forget cleanup
geometry.dispose();
```

### 2D-3D Synchronization
- Maintain single source of truth in core data model
- Update both renderers from same state changes
- Use events/observers for cross-renderer updates
- Validate dimensions match between 2D and 3D

See `references/threejs-patterns.md` for advanced Three.js patterns.

## Mathematical Operations

### Coordinate Systems
- 2D (Paper.js): Origin top-left, Y-axis down, units = pixels
- 3D (Three.js): Origin center, Y-axis up, units = millimeters
- Always document coordinate system in function comments
- Use conversion utilities in `geometry/coordinates.js`

### Precision Handling
```javascript
// Good: Round to avoid floating-point errors
function roundToMM(value) {
  return Math.round(value * 100) / 100;
}

// Good: Use epsilon for comparisons
const EPSILON = 0.001;
function almostEqual(a, b) {
  return Math.abs(a - b) < EPSILON;
}
```

### Common Calculations
- Panel area: `width * height - sum(cutout.area)`
- Edge banding length: `2 * (width + height) + custom edges`
- Material utilization: `used area / sheet area * 100`
- Cut optimization: see `references/cutting-algorithms.md`

See `references/geometry-formulas.md` for comprehensive formula reference.

## Development Workflow

### Before Writing Code
1. Check if similar functionality exists
2. Review relevant patterns in `references/` folder
3. Plan component structure and interfaces
4. Identify testable units

### During Development
1. Write function signature with JSDoc first
2. Write unit test cases
3. Implement functionality
4. Verify tests pass
5. Run linter and fix issues

### After Implementation
1. Update relevant documentation
2. Add integration tests if needed
3. Check code coverage meets threshold
4. Update CHANGELOG.md
5. Commit with descriptive message

### Code Review Checklist
- [ ] JSDoc comments on all public APIs
- [ ] Unit tests for new functionality
- [ ] No magic numbers (use named constants)
- [ ] Error handling for edge cases
- [ ] Memory cleanup (remove listeners, dispose geometries)
- [ ] Consistent naming with project conventions
- [ ] No console.log statements (use logger)

## File Processing

### Import/Export Patterns
- Support common formats: JSON, DXF, SVG
- Validate file structure before processing
- Provide detailed error messages
- Handle large files asynchronously
- Show progress indicators for operations >1s

### Data Serialization
```javascript
// Good: Version your data format
const savedData = {
  version: '2.1.0',
  metadata: { created: Date.now() },
  panels: [...],
  settings: {...}
};

// Good: Validate on load
function loadProject(data) {
  if (!isValidVersion(data.version)) {
    throw new Error(`Unsupported version: ${data.version}`);
  }
  // ...
}
```

## Common Patterns

### State Management
```javascript
// Use immutable updates
const newState = {
  ...currentState,
  panels: currentState.panels.map(p => 
    p.id === panelId ? { ...p, width: newWidth } : p
  )
};
```

### Event Handling
```javascript
// Use event delegation for performance
canvas.addEventListener('click', (e) => {
  if (e.target.closest('.panel')) {
    handlePanelClick(e);
  }
});
```

### Error Boundaries
```javascript
try {
  const result = complexCalculation(input);
  return result;
} catch (error) {
  logger.error('Calculation failed', { input, error });
  notifyUser('Unable to complete calculation');
  return fallbackValue;
}
```

## Resources

- `references/paperjs-patterns.md` - Common Paper.js code patterns and solutions
- `references/threejs-patterns.md` - Three.js scene setup and optimization techniques
- `references/geometry-formulas.md` - Mathematical formulas for furniture calculations
- `references/testing-guidelines.md` - Testing strategies and examples
- `scripts/generate-test-template.js` - Auto-generate test file boilerplate
- `scripts/validate-docs.js` - Check JSDoc coverage and quality
