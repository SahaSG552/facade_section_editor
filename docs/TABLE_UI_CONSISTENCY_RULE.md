# Table UI Consistency Rule

This rule defines a single, repeatable table UX pattern for all admin menus that are migrated to JSpreadsheet.

## 1) Header Layout
- Use one top header row with `header-actions` and `justify-content: space-between`.
- Left side: section title (`h2`).
- Right side: action buttons.
- Do not place primary action buttons on the left in one menu and on the right in another.

## 2) Standard Action Order (Right Side)
- `Редактор колонок` (secondary)
- `Добавить строку` (secondary, when menu supports row creation)
- `Сохранить` (primary)

## 3) Table Defaults
- Use JSpreadsheet (`order-grid` wrapper).
- Use a shared table constructor/helper for all menus (single pipeline), not ad-hoc per-table setup.
- Enable `filters: true`.
- Enable `columnDrag: true`.
- Use fixed table viewport (`tableOverflow: true`, full width, fixed height).
- Use auto column width based on actual content on first open (before user customizations are saved).

## 4) Per-User Column Persistence
- Column order/title/width should be persisted per user in localStorage.
- Use a dedicated key per menu and user id/username.
- Restore config on render; merge with base columns to keep compatibility.
- Persist table view state per user: active sort, active filters, and resized column widths.

## 5) Column Editor (Admin)
- Mandatory convention: every newly created table menu must include a column editor.
- Open as overlay modal above table (`editor-columns-overlay`, `editor-columns-dialog`).
- Close methods:
  - Close button
  - Backdrop click
  - Auto-close after saving column config
- Must support:
  - Drag-and-drop reordering
  - Edit title and width
  - Add custom columns
  - Delete custom columns

## 6) Save Behavior
- `Сохранить` applies to the whole table, not only selected row.
- Validate all rows before submit; show row-specific validation errors.
- Persist row updates in one save cycle.

## 7) Rollout Guidance
For each new menu migrated to a table:
1. Implement base columns + per-user config key.
2. Implement table init with filters and draggable columns.
3. Implement standard header with right-aligned actions.
4. Implement overlay column editor with add/delete/reorder and save.
5. Implement whole-table save handler.
6. Persist and restore per-user table view state (sort/filter/resize).
7. Verify behavior parity with order table UX.
