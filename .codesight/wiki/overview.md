# facade_section_editor — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**facade_section_editor** is a javascript project built with raw-http.

## Scale

3 middleware layers · 1 environment variables

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src\core\LoggerFactory.js` — imported by **38** files
- `src\editor\EditorStateManager.js` — imported by **18** files
- `src\editor\tools\BaseTool.js` — imported by **15** files
- `src\export\ExportModule.js` — imported by **14** files
- `src\operations\OffsetContourBuilder.js` — imported by **14** files
- `src\operations\OffsetEngine.js` — imported by **13** files

## Required Environment Variables

- `DEV` — `src\three\ManifoldCSG.js`

---
_Back to [index.md](./index.md) · Generated 2026-04-09_