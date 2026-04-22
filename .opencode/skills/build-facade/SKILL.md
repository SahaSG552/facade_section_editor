---
name: build-facade
description: "Build the facade_section_editor project for production. Use when you need to create a production build or test the build process."
---

# Build Facade

Build the facade_section_editor project for production.

## Usage

```bash
npm run build    # Production build
npm run preview  # Preview production build
npm run dev      # Development server
```

## Notes

- Uses Vite 7.3 for bundling
- Output goes to `dist/` folder
- Capacitor integration for mobile builds:
  - `npm run cap:sync` - Sync Capacitor
  - `npm run cap:build:android` - Build Android
  - `npm run cap:build:ios` - Build iOS
