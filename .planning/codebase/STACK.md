# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**

- JavaScript (ES Modules) - All application code

**Secondary:**

- CSS - Styling (`styles/styles.css`)

## Runtime

**Environment:**

- Browser (Vanilla JavaScript, no framework)
- Capacitor 5.x for mobile (Android/iOS)

**Package Manager:**

- npm 10.x+
- Lockfile: `package-lock.json` (not shown but implied)

## Frameworks

**Core:**

- Vanilla JavaScript ES Modules - Application logic
- Capacitor 5 - Mobile wrapper for Android/iOS

**Build/Dev:**

- Vite 7.3.0 - Build tool and dev server
- @vitejs/plugin-basic-ssl - HTTPS for network development

**Testing:**

- Vitest 4.1.0 - Unit testing framework
- happy-dom 20.8.4 - DOM environment for tests

## Key Dependencies

**3D Rendering:**

- `three@0.182.0` - 3D WebGL rendering engine
- `three-bvh-csg@0.0.17` - Constructive Solid Geometry for Three.js
- `three-mesh-bvh@0.9.4` - BVH acceleration for raycasting
- `threejs-slice-geometry@0.2.2` - Slice geometry operations

**Geometric Processing:**

- `manifold-3d@3.3.2` - CSG operations via WASM
- `clipper2-lib-js@0.0.6` - 2D polygon clipping and offsetting
- `earcut@3.0.2` - Polygon triangulation

**2D Rendering:**

- `paper@0.12.18` - Paper.js for 2D vector graphics and path operations

**Testing:**

- `jsdom@27.3.0` - DOM implementation (dev)
- `happy-dom@20.8.4` - Lightweight DOM for tests

**Development:**

- `acorn@8.15.0` - JavaScript parser
- `@types/three@0.182.0` - TypeScript definitions

## CDN Dependencies

The following are loaded via CDN in `index.html`:

| Package           | Version | Purpose                  |
| ----------------- | ------- | ------------------------ |
| `@capacitor/core` | 5.0.0   | Mobile runtime           |
| `math.js`         | 11.8.0  | Mathematical expressions |
| `bezier-js`       | 2.x     | Bezier curve operations  |
| `hammerjs`        | 2.0.8   | Touch gestures           |
| `stats.js`        | 0.17.0  | Performance monitoring   |

## Configuration

**Build Config:** `vite.config.js`

- Custom WASM sourcemap stripping for manifold-3d
- Path aliases for module resolution
- Manual chunks for Three.js and manifold
- WASM asset handling
- HTTPS for network development

**Test Config:** `vitest.config.js`

- happy-dom environment
- Test timeout: 10s
- Coverage via V8 provider

**Mobile Config:** `capacitor.config.json`

- Empty config (initial setup)

## Platform Requirements

**Development:**

- Node.js 18+
- Modern browser with WebGL support

**Production:**

- WebGL-capable browser
- Optional: Android/iOS via Capacitor

---

_Stack analysis: 2026-03-29_
