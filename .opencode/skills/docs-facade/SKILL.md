---
name: docs-facade
description: "Generate or update documentation for facade_section_editor. Use when you need to create or update project documentation."
---

# Docs Facade

Work with documentation in the facade_section_editor project.

## Documentation Location

All documentation is in the `docs/` folder:
- `ARCHITECTURE.md` - System architecture
- `DEVELOPMENT_CHECKLIST.md` - Development standards
- `API_REFERENCE.md` - API documentation
- `CHANGELOG.md` - Version history

## Usage

When updating code, also update relevant documentation:
1. Check `docs/ARCHITECTURE.md` for architectural context
2. Update API docs if changing interfaces
3. Add entry to `CHANGELOG.md` for significant changes

## Documentation Standards
- Use clear headings
- Include code examples
- Document all public APIs with JSDoc
- Keep CHANGELOG up to date