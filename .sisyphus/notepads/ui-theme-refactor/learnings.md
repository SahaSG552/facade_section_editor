## 2026-04-17

- Scene/renderer initialization is in `src/three/SceneManager.js` (`new WebGLRenderer` fallback + dynamic `WebGPURenderer` path).
- Theme-safe Three.js colors now come from `src/utils/theme.js` (`getCssVar`, `cssVarToThreeColor`, `watchTheme`) instead of direct `getComputedStyle` calls.
- `GridHelper` can be re-themed by mutating both material color entries (`material` is array-like in this setup).
