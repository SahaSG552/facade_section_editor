## 2026-04-17

- Applied `--facade-scene-background` to both `scene.background` and `renderer.setClearColor(...)` to keep scene clear behavior aligned across renderers.
- Used a single `watchTheme` subscription in `SceneManager` and `ViewCubeGizmo` to update colors at runtime without reinitializing the 3D scene.
- Replaced hardcoded ViewCube colors with CSS-token mapping (`--facade-gizmo-bg`, `--facade-scene-grid`, `--facade-gizmo-text`) and regenerate face text textures on theme switch for readable labels.
