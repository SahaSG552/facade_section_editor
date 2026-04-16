# Facade Section Editor - Claude Code

## Overview
This is a 3D modeling application for furniture facade design using router bits and CNC operations.

## Quick Reference
- **Stack**: Vanilla JS, Vite, Three.js, Paper.js
- **Build**: `npm run dev`, `npm run build`, `npm run test`
- **Docs**: See `docs/ARCHITECTURE.md` for full details

## Key Principles
1. **Modular Architecture**: BaseModule with dependency injection, Event Bus for communication
2. **Signature-Based CSG**: ThreeModule uses bit signatures to prevent unnecessary rebuilds
3. **2D/3D Sync**: Real-time coordinate transformation between SVG (Y-down) and Three.js (Y-up)

## Critical Gotchas
- **NEVER modify ThreeModule signatures without updating bit parameters**
- **ALWAYS transform coordinates between 2D and 3D systems**
- **Test in both 2D and 3D views before committing**

## Testing Checklist
- [ ] Add/move/delete bits with proper visualization
- [ ] V-Carve operations with phantom bit calculations
- [ ] View synchronization between 2D and 3D
- [ ] DXF export with proper offset handling

## Important Files
- `src/app/main.js` — Module registration
- `src/core/LoggerFactory.js` — Logging (use for all new code)
- `src/three/ThreeModule.js` — 3D visualization & CSG
- `docs/ARCHITECTURE.md` — Detailed architecture reference

## Reading AGENTS.md
For comprehensive project information, also read `AGENTS.md` in the project root.
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
