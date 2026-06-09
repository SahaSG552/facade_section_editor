# jspreadsheet

Use this skill when implementing spreadsheet/table UX with Jspreadsheet CE.

## Scope
- Column drag/reorder (`columnDrag: true`)
- Column insert/delete/rename (`allowInsertColumn`, `allowDeleteColumn`, `allowRenameColumn`)
- Row operations (`insertRow`, `deleteRow`)
- Selections (`getSelection`, `getSelectedRows`, `onselection`)
- Footers (`footers`) including formulas such as `=SUM(B1:B99999)`
- Runtime updates (`insertColumn`, `deleteColumn`, `moveColumn`, `setHeader`)

## Implementation Checklist
1. Always import styles:
- `jspreadsheet-ce/dist/jspreadsheet.css`
- `jsuites/dist/jsuites.css`
2. Define worksheet `columns` with stable `name` IDs for persistence and mapping.
3. Enable required features explicitly in worksheet config.
4. Persist user-specific column config (order/title/type/width/custom columns).
5. Reapply header tooltips after grid initialization and column changes.
6. For multi-row actions, derive row range from `getSelection()` first.
7. Use `footers` for in-grid summary rows rather than external div summaries.

## Known API Notes (v5 CE)
- Initialization: `jspreadsheet(element, { worksheets: [ ... ] })`
- Column move callback: `onmovecolumn(instance, oldPosition, newPosition, quantity)`
- Header rename callback: `onchangeheader(instance, colIndex, newValue, oldValue)`
- Insert/delete callbacks: `oninsertcolumn`, `ondeletecolumn`
- Footer init: `footers: string[][]`

## Recommended Defaults
- `columnDrag: true`
- `tableOverflow: true`, `tableWidth: '100%'`
- `allowInsertColumn/allowDeleteColumn/allowRenameColumn`: role-based (admin on, client off)
- `allowManualInsertColumn`: on for admin if context-menu/manual insert is needed

## Pitfalls
- Avoid browser `prompt()` for workflows; use in-page forms/modals.
- Keep data-model mapping independent from display order by using column IDs.
- After structural column changes, sync persisted schema before save.
- Keep footer formula column letter updated when the quantity column index changes.
