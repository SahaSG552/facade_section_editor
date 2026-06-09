# Order Editor Progress

## What is stabilized

- Jspreadsheet is the primary table engine for order rows.
- Footer total for `Q` uses a dynamic range based on current row count.
- Protected columns cannot be removed from context menu actions.
- Keyboard behavior is split:
  - `Delete` removes selected row(s).
  - `Backspace` clears selected cell values only.
- Preview visibility state persists across reopening the same order editor session.
- Admin columns editor is now an overlay opened by a dedicated button.
- Admin column ordering is drag-and-drop with a left drag handle.

## Current architecture notes

- Source of truth for rows in editor state: `gridRows`.
- Source of truth for visible sheet: `orderSheet` (`WorksheetInstance`).
- Column schema persistence key: `om_order_columns_<user>`.
- Preview visibility persistence key: `om_editor_preview_visible`.

## Refactoring and optimization applied

- Reused helper `invalidatePreviewSelection()` instead of ad-hoc direct resets.
- Introduced `clearSelectedCells(selection)` to batch-clear cells using one `setValue` call.
- Hoisted navigation key set to `NAVIGATION_KEYS` constant to avoid recreating sets in events.

## Safety constraints retained

- Fixed/base columns are guarded via `onbeforedeletecolumn`.
- Delete-row shortcut is intercepted in capture phase to prevent mixed default actions.

## Next clean-up candidates

- Split `main.ts` into smaller modules:
  - `order-editor/view.ts`
  - `order-editor/grid.ts`
  - `order-editor/columns-admin.ts`
  - `order-editor/state.ts`
- Add a small integration test for keyboard behavior (`Delete` vs `Backspace`).
- Add user feedback toast when protected column deletion is blocked.
