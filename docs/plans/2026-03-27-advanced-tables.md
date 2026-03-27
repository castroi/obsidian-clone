# Advanced Table Editing

> **Status:** Draft
> **Created:** 2026-03-27
> **Feature:** Add advanced table editing capabilities inspired by [tgrosinger/advanced-tables-obsidian](https://github.com/tgrosinger/advanced-tables-obsidian)

## Overview

Add full markdown table editing support to the Obsidian clone, including: toolbar buttons for table operations, keyboard-driven cell navigation, auto-formatting/alignment, row/column manipulation, and proper table rendering in both source and reading views.

## Architecture Decisions

- **No external table library** -- implement table parsing/manipulation directly in TypeScript to avoid adding a heavy dependency (`@tgrosinger/md-advanced-tables` is tightly coupled to the Obsidian API)
- **CodeMirror 6 extension** -- table-aware keybindings (Tab/Shift+Tab/Enter) implemented as a CM6 `keymap` with `Prec.highest` so they only fire when the cursor is inside a table
- **Toolbar integration** -- add a table section separator + table buttons to the existing `EditorToolbar.tsx` using inline SVG components (sourced from the reference repo's `src/icons.ts`)
- **Table controls sidebar** -- add a "Table Controls" panel to the right sidebar, toggled via `Ctrl+Shift+D` or a ribbon icon
- **Reading view** -- already works via `remark-gfm` + existing CSS in `ReadingView.module.css` (lines 122-141); no changes needed for basic rendering

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/editor/icons/table-icons.tsx` | **Create** | SVG icon components for all table operations |
| `src/lib/editor/table-utils.ts` | **Create** | Core table parsing, manipulation, and formatting logic |
| `src/components/editor/extensions/tables.ts` | **Create** | CodeMirror 6 extension for table cell navigation and auto-format |
| `src/components/editor/EditorToolbar.tsx` | **Modify** | Add table operation buttons with separator |
| `src/components/editor/EditorToolbar.module.css` | **Modify** | Add separator and table dropdown styles |
| `src/lib/editor/formatting.ts` | **Modify** | Add table action cases to `applyFormatting()` |
| `src/lib/editor/keymaps.ts` | **Modify** | Add `Ctrl+Shift+D` keybinding for table controls sidebar |
| `src/components/editor/MarkdownEditor.tsx` | **Modify** | Register the new table extension |
| `src/components/editor/EditorPane.tsx` | **Modify** | Handle new table toolbar actions |
| `src/components/sidebar/TableControlsPanel.tsx` | **Create** | Right sidebar panel with organized table operation buttons |
| `src/components/sidebar/TableControlsPanel.module.css` | **Create** | Styles for the table controls panel |
| `src/components/sidebar/RightSidebar.tsx` | **Modify** | Add "Table Controls" tab |
| `src/stores/ui.ts` | **Modify** | Add table controls panel to right sidebar panel types |

---

## Tasks

### Task 1: Core Table Utilities

**Create `src/lib/editor/table-utils.ts`**

This is the foundation -- all table parsing, detection, manipulation, and formatting logic.

**Steps:**

1. Create the file with the following exported functions:

```typescript
// --- Detection ---

/** Check if a line is part of a markdown table (starts with |) */
export function isTableLine(line: string): boolean

/** Check if a line is the separator row (| --- | --- |) */
export function isSeparatorLine(line: string): boolean

/**
 * Given a document string and a cursor offset, return the table boundaries
 * { startLine, endLine, startOffset, endOffset } or null if cursor is not in a table.
 */
export function getTableRange(doc: string, cursorOffset: number): TableRange | null

// --- Parsing ---

export interface TableRange {
  startLine: number
  endLine: number
  startOffset: number
  endOffset: number
}

export interface ParsedTable {
  headers: string[]
  alignments: ('left' | 'center' | 'right' | 'none')[]
  rows: string[][]
  range: TableRange
}

/** Parse a markdown table string into structured data */
export function parseTable(tableText: string, range: TableRange): ParsedTable

// --- Cell Location ---

export interface CellLocation {
  row: number    // 0 = header, 1 = separator (skipped), 2+ = data rows
  col: number
  startOffset: number  // absolute offset in document
  endOffset: number
}

/** Find which cell the cursor is in */
export function getCellAtOffset(doc: string, offset: number): CellLocation | null

/** Get the offset of the next cell (for Tab navigation) */
export function getNextCellOffset(doc: string, offset: number): number | null

/** Get the offset of the previous cell (for Shift+Tab navigation) */
export function getPrevCellOffset(doc: string, offset: number): number | null

/** Get the offset of the cell in the next row (for Enter navigation) */
export function getNextRowCellOffset(doc: string, offset: number): number | null

// --- Formatting ---

/** Auto-align a table: pad cells so columns line up, respecting alignment markers */
export function formatTable(table: ParsedTable): string

// --- Manipulation ---

/** Insert a new row after the given row index. Returns the new table markdown. */
export function insertRow(table: ParsedTable, afterRow: number): string

/** Delete a row by index. Returns the new table markdown. */
export function deleteRow(table: ParsedTable, rowIndex: number): string

/** Insert a column after the given column index. Returns the new table markdown. */
export function insertColumn(table: ParsedTable, afterCol: number): string

/** Delete a column by index. Returns the new table markdown. */
export function deleteColumn(table: ParsedTable, colIndex: number): string

/** Move a row up or down. Returns the new table markdown. */
export function moveRow(table: ParsedTable, rowIndex: number, direction: 'up' | 'down'): string

/** Move a column left or right. Returns the new table markdown. */
export function moveColumn(table: ParsedTable, colIndex: number, direction: 'left' | 'right'): string

/** Set column alignment. Returns the new table markdown. */
export function setColumnAlignment(table: ParsedTable, colIndex: number, alignment: 'left' | 'center' | 'right'): string

/** Sort rows by a column. Returns the new table markdown. */
export function sortByColumn(table: ParsedTable, colIndex: number, direction: 'asc' | 'desc'): string

/** Transpose the table (swap rows and columns). Returns the new table markdown. */
export function transposeTable(table: ParsedTable): string

// --- Creation ---

/** Generate a new empty table with the given dimensions */
export function createTable(rows: number, cols: number): string
```

2. Implementation notes:
   - Table lines are identified by starting with `|` (after optional whitespace)
   - Separator line matches pattern: `| ---: | :---: | --- |` (with optional alignment markers `:`)
   - `getTableRange` walks up/down from cursor line to find contiguous table lines
   - `parseTable` splits each row by `|`, trims cells, extracts alignment from separator
   - `formatTable` pads each cell to the max width of its column, respects alignment
   - `createTable(3, 3)` produces:
     ```
     | Header 1 | Header 2 | Header 3 |
     | -------- | -------- | -------- |
     |          |          |          |
     |          |          |          |
     |          |          |          |
     ```
   - All manipulation functions return the formatted table string (already aligned)
   - Row indices in manipulation functions use 0-based indexing where 0 is the first data row (not header, not separator)

**Verification:**
- `npx tsc --noEmit` passes
- Unit logic is self-consistent (will be tested in Task 8)

**Dependencies:** None

---

### Task 2: SVG Table Icon Components

**Create `src/components/editor/icons/table-icons.tsx`**

SVG icons for table operations, sourced from the [advanced-tables-obsidian icons](https://github.com/tgrosinger/advanced-tables-obsidian/blob/main/src/icons.ts).

**Steps:**

1. Create the icons directory: `src/components/editor/icons/`
2. Create `table-icons.tsx` with React SVG components for each icon:

```typescript
import React from 'react'

interface IconProps {
  size?: number
  className?: string
}

// Each icon is a functional component returning an <svg> element
// All use currentColor for theme compatibility
// Default size: 15 (matches existing Lucide icons in the toolbar)

export function TableIcon({ size = 15, className }: IconProps) { /* spreadsheet grid icon */ }
export function InsertRowIcon({ size = 15, className }: IconProps) { /* row with plus */ }
export function InsertColumnIcon({ size = 15, className }: IconProps) { /* column with plus */ }
export function DeleteRowIcon({ size = 15, className }: IconProps) { /* row with minus */ }
export function DeleteColumnIcon({ size = 15, className }: IconProps) { /* column with minus */ }
export function MoveRowUpIcon({ size = 15, className }: IconProps) { /* row with up arrow */ }
export function MoveRowDownIcon({ size = 15, className }: IconProps) { /* row with down arrow */ }
export function MoveColumnLeftIcon({ size = 15, className }: IconProps) { /* column with left arrow */ }
export function MoveColumnRightIcon({ size = 15, className }: IconProps) { /* column with right arrow */ }
export function AlignLeftIcon({ size = 15, className }: IconProps) { /* lines aligned left */ }
export function AlignCenterIcon({ size = 15, className }: IconProps) { /* lines centered */ }
export function AlignRightIcon({ size = 15, className }: IconProps) { /* lines aligned right */ }
export function SortAscIcon({ size = 15, className }: IconProps) { /* AZ with down arrow */ }
export function SortDescIcon({ size = 15, className }: IconProps) { /* ZA with down arrow */ }
export function TransposeIcon({ size = 15, className }: IconProps) { /* two perpendicular rectangles */ }
```

3. SVG source: adapt the SVG paths from [src/icons.ts](https://github.com/tgrosinger/advanced-tables-obsidian/blob/main/src/icons.ts). Convert from raw SVG strings to JSX:
   - `class` -> `className`
   - `stroke-width` -> `strokeWidth`
   - `fill-rule` -> `fillRule`
   - `clip-rule` -> `clipRule`
   - Use `width={size} height={size}` props
   - Use `fill="none" stroke="currentColor"` for theme compatibility
   - Normalize viewBox to match original (most use `0 0 24 24`)

**Verification:**
- `npx tsc --noEmit` passes
- Icons render at correct size when imported

**Dependencies:** None

---

### Task 3: CodeMirror Table Extension

**Create `src/components/editor/extensions/tables.ts`**

CodeMirror 6 extension that provides:
- Tab/Shift+Tab cell navigation
- Enter for next-row navigation
- Auto-format on navigation

**Steps:**

1. Create the extension file following the pattern from `extensions/tasks.ts`:

```typescript
import { keymap, EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import {
  getTableRange, getCellAtOffset, getNextCellOffset,
  getPrevCellOffset, getNextRowCellOffset, parseTable, formatTable
} from '@/lib/editor/table-utils'

export function tablesExtension() {
  return Prec.highest(keymap.of([
    {
      key: 'Tab',
      run: (view: EditorView) => {
        // Only handle if cursor is inside a table
        // Navigate to next cell, auto-format table
        // If at last cell, add a new row
        // Return true to consume the event, false to pass through
      }
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => {
        // Navigate to previous cell
        // Return false if not in a table
      }
    },
    {
      key: 'Enter',
      run: (view: EditorView) => {
        // Move to same column in next row
        // If at last row, insert new row first
        // Return false if not in a table
      }
    },
  ]))
}
```

2. Navigation logic:
   - On **Tab**: find current cell, format the table, move cursor to the content start of the next cell. If at the last cell of the last row, insert a new row first.
   - On **Shift+Tab**: find current cell, format the table, move cursor to the content start of the previous cell.
   - On **Enter**: find current cell, format the table, move cursor to the same column in the next row. If at the last row, insert a new row.
   - Each navigation action auto-formats the table first (dispatch the format change, then compute new cursor position)

3. Auto-format on navigation:
   - Before moving cursor, replace the entire table range with the formatted version
   - Compute new cursor position after formatting (cell positions may shift due to padding)

**Verification:**
- `npx tsc --noEmit` passes
- Tab in a table cell moves to the next cell
- Shift+Tab moves to the previous cell
- Enter moves to the next row
- Tab/Enter outside a table behave normally (indent/newline)

**Dependencies:** Task 1 (table-utils)

---

### Task 4: Toolbar Integration

**Modify `src/components/editor/EditorToolbar.tsx` and `EditorToolbar.module.css`**

Add table operation buttons to the toolbar with a visual separator from existing tools.

**Steps:**

1. In `EditorToolbar.tsx`, import the table icons:
```typescript
import {
  TableIcon, InsertRowIcon, InsertColumnIcon,
  DeleteRowIcon, DeleteColumnIcon, AlignLeftIcon,
  AlignCenterIcon, AlignRightIcon, SortAscIcon,
  SortDescIcon, TransposeIcon, MoveRowUpIcon,
  MoveRowDownIcon, MoveColumnLeftIcon, MoveColumnRightIcon
} from './icons/table-icons'
```

2. Add a table tools array after the existing `tools` array:
```typescript
const tableTools: ToolbarAction[] = [
  { icon: <TableIcon size={15} />, label: 'Insert table', action: 'table-insert' },
  { icon: <InsertRowIcon size={15} />, label: 'Insert row below', action: 'table-insert-row' },
  { icon: <DeleteRowIcon size={15} />, label: 'Delete row', action: 'table-delete-row' },
  { icon: <InsertColumnIcon size={15} />, label: 'Insert column right', action: 'table-insert-col' },
  { icon: <DeleteColumnIcon size={15} />, label: 'Delete column', action: 'table-delete-col' },
  { icon: <MoveRowUpIcon size={15} />, label: 'Move row up', action: 'table-move-row-up' },
  { icon: <MoveRowDownIcon size={15} />, label: 'Move row down', action: 'table-move-row-down' },
  { icon: <MoveColumnLeftIcon size={15} />, label: 'Move column left', action: 'table-move-col-left' },
  { icon: <MoveColumnRightIcon size={15} />, label: 'Move column right', action: 'table-move-col-right' },
  { icon: <AlignLeftIcon size={15} />, label: 'Align left', action: 'table-align-left' },
  { icon: <AlignCenterIcon size={15} />, label: 'Align center', action: 'table-align-center' },
  { icon: <AlignRightIcon size={15} />, label: 'Align right', action: 'table-align-right' },
  { icon: <SortAscIcon size={15} />, label: 'Sort ascending', action: 'table-sort-asc' },
  { icon: <SortDescIcon size={15} />, label: 'Sort descending', action: 'table-sort-desc' },
  { icon: <TransposeIcon size={15} />, label: 'Transpose table', action: 'table-transpose' },
]
```

3. Update the JSX to render both tool groups with a separator:
```tsx
<div className={styles.tools}>
  {tools.map((tool) => (
    <button key={tool.action} className={styles.toolBtn} title={tool.label} aria-label={tool.label}
      onMouseDown={(e) => { e.preventDefault(); onAction(tool.action) }}>
      {tool.icon}
    </button>
  ))}
  <div className={styles.separator} />
  {tableTools.map((tool) => (
    <button key={tool.action} className={styles.toolBtn} title={tool.label} aria-label={tool.label}
      onMouseDown={(e) => { e.preventDefault(); onAction(tool.action) }}>
      {tool.icon}
    </button>
  ))}
</div>
```

4. In `EditorToolbar.module.css`, add the separator style:
```css
.separator {
  width: 1px;
  height: 16px;
  background: var(--background-modifier-border);
  margin: 0 4px;
  flex-shrink: 0;
}
```

**Verification:**
- `npm run build` succeeds
- Toolbar renders with table buttons after a vertical separator
- All buttons have proper tooltips and aria-labels
- Buttons don't blur the editor (mousedown `preventDefault`)

**Dependencies:** Task 2 (icons)

---

### Task 5: Table Formatting Actions

**Modify `src/lib/editor/formatting.ts`**

Add cases to `applyFormatting()` for all table actions.

**Steps:**

1. Import table utilities at the top:
```typescript
import {
  getTableRange, parseTable, createTable, insertRow, deleteRow,
  insertColumn, deleteColumn, moveRow, moveColumn,
  setColumnAlignment, sortByColumn, transposeTable, getCellAtOffset, formatTable
} from './table-utils'
```

2. Add a helper to apply a table transformation:
```typescript
function applyTableTransform(
  view: EditorView,
  transform: (table: ParsedTable, cell: CellLocation) => string
) {
  const doc = view.state.doc.toString()
  const offset = view.state.selection.main.head
  const range = getTableRange(doc, offset)
  if (!range) return  // cursor not in a table

  const tableText = doc.slice(range.startOffset, range.endOffset)
  const table = parseTable(tableText, range)
  const cell = getCellAtOffset(doc, offset)
  if (!cell) return

  const newTable = transform(table, cell)
  view.dispatch({
    changes: { from: range.startOffset, to: range.endOffset, insert: newTable }
  })
  view.focus()
}
```

3. Add cases to the `switch` in `applyFormatting()`:
```typescript
case 'table-insert': {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const table = createTable(3, 3)
  view.dispatch({
    changes: { from: line.to, insert: '\n\n' + table + '\n' },
    selection: EditorSelection.cursor(line.to + 2 + '| '.length)
  })
  view.focus()
  break
}
case 'table-insert-row':
  applyTableTransform(view, (table, cell) => insertRow(table, cell.row))
  break
case 'table-delete-row':
  applyTableTransform(view, (table, cell) => deleteRow(table, cell.row))
  break
case 'table-insert-col':
  applyTableTransform(view, (table, cell) => insertColumn(table, cell.col))
  break
case 'table-delete-col':
  applyTableTransform(view, (table, cell) => deleteColumn(table, cell.col))
  break
case 'table-move-row-up':
  applyTableTransform(view, (table, cell) => moveRow(table, cell.row, 'up'))
  break
case 'table-move-row-down':
  applyTableTransform(view, (table, cell) => moveRow(table, cell.row, 'down'))
  break
case 'table-move-col-left':
  applyTableTransform(view, (table, cell) => moveColumn(table, cell.col, 'left'))
  break
case 'table-move-col-right':
  applyTableTransform(view, (table, cell) => moveColumn(table, cell.col, 'right'))
  break
case 'table-align-left':
  applyTableTransform(view, (table, cell) => setColumnAlignment(table, cell.col, 'left'))
  break
case 'table-align-center':
  applyTableTransform(view, (table, cell) => setColumnAlignment(table, cell.col, 'center'))
  break
case 'table-align-right':
  applyTableTransform(view, (table, cell) => setColumnAlignment(table, cell.col, 'right'))
  break
case 'table-sort-asc':
  applyTableTransform(view, (table, cell) => sortByColumn(table, cell.col, 'asc'))
  break
case 'table-sort-desc':
  applyTableTransform(view, (table, cell) => sortByColumn(table, cell.col, 'desc'))
  break
case 'table-transpose':
  applyTableTransform(view, (table) => transposeTable(table))
  break
```

**Verification:**
- `npx tsc --noEmit` passes
- "Insert table" creates a 3x3 markdown table at cursor
- Row/column operations modify the correct table in the document

**Dependencies:** Task 1 (table-utils)

---

### Task 6: Register Table Extension in Editor

**Modify `src/components/editor/MarkdownEditor.tsx`**

**Steps:**

1. Import the table extension:
```typescript
import { tablesExtension } from './extensions/tables'
```

2. Add it to the extensions array (after existing extensions, before the update listener):
```typescript
// Inside EditorState.create({ extensions: [...] })
tablesExtension(),
```

Place it after `headingsExtension()` and before `EditorView.domEventHandlers(...)`.

**Verification:**
- `npm run build` succeeds
- Tab/Shift+Tab/Enter navigation works inside tables
- Tab/Enter still work normally outside tables (indent, newline)

**Dependencies:** Task 3 (tables extension)

---

### Task 7: Table Controls Sidebar Panel

**Create `src/components/sidebar/TableControlsPanel.tsx` and `TableControlsPanel.module.css`**

A dedicated panel in the right sidebar with organized table manipulation buttons.

**Steps:**

1. Create `TableControlsPanel.tsx`:
```typescript
'use client'
import {
  TableIcon, InsertRowIcon, InsertColumnIcon,
  DeleteRowIcon, DeleteColumnIcon, AlignLeftIcon,
  AlignCenterIcon, AlignRightIcon, SortAscIcon,
  SortDescIcon, TransposeIcon, MoveRowUpIcon,
  MoveRowDownIcon, MoveColumnLeftIcon, MoveColumnRightIcon
} from '@/components/editor/icons/table-icons'
import { getEditorView } from '@/components/editor/MarkdownEditor'
import { applyFormatting } from '@/lib/editor/formatting'
import styles from './TableControlsPanel.module.css'

interface ButtonDef {
  icon: React.ReactNode
  label: string
  action: string
}

const groups: { title: string; buttons: ButtonDef[] }[] = [
  {
    title: 'Create',
    buttons: [
      { icon: <TableIcon size={18} />, label: 'Insert table', action: 'table-insert' },
    ]
  },
  {
    title: 'Alignment',
    buttons: [
      { icon: <AlignLeftIcon size={18} />, label: 'Align left', action: 'table-align-left' },
      { icon: <AlignCenterIcon size={18} />, label: 'Align center', action: 'table-align-center' },
      { icon: <AlignRightIcon size={18} />, label: 'Align right', action: 'table-align-right' },
    ]
  },
  {
    title: 'Move',
    buttons: [
      { icon: <MoveRowUpIcon size={18} />, label: 'Move row up', action: 'table-move-row-up' },
      { icon: <MoveRowDownIcon size={18} />, label: 'Move row down', action: 'table-move-row-down' },
      { icon: <MoveColumnLeftIcon size={18} />, label: 'Move column left', action: 'table-move-col-left' },
      { icon: <MoveColumnRightIcon size={18} />, label: 'Move column right', action: 'table-move-col-right' },
      { icon: <TransposeIcon size={18} />, label: 'Transpose', action: 'table-transpose' },
    ]
  },
  {
    title: 'Edit',
    buttons: [
      { icon: <InsertRowIcon size={18} />, label: 'Insert row', action: 'table-insert-row' },
      { icon: <InsertColumnIcon size={18} />, label: 'Insert column', action: 'table-insert-col' },
      { icon: <DeleteRowIcon size={18} />, label: 'Delete row', action: 'table-delete-row' },
      { icon: <DeleteColumnIcon size={18} />, label: 'Delete column', action: 'table-delete-col' },
    ]
  },
  {
    title: 'Sort',
    buttons: [
      { icon: <SortAscIcon size={18} />, label: 'Sort ascending', action: 'table-sort-asc' },
      { icon: <SortDescIcon size={18} />, label: 'Sort descending', action: 'table-sort-desc' },
    ]
  },
]

export function TableControlsPanel() {
  const handleAction = (action: string) => {
    const view = getEditorView()
    if (view) applyFormatting(view, action)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <TableIcon size={16} />
        <span>Table Controls</span>
      </div>
      {groups.map((group) => (
        <div key={group.title} className={styles.group}>
          <div className={styles.groupTitle}>{group.title}</div>
          <div className={styles.buttons}>
            {group.buttons.map((btn) => (
              <button
                key={btn.action}
                className={styles.controlBtn}
                title={btn.label}
                aria-label={btn.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleAction(btn.action)
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

2. Create `TableControlsPanel.module.css`:
```css
.panel {
  padding: 8px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  font-size: var(--font-ui-small);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.group {
  margin-bottom: 12px;
}

.groupTitle {
  font-size: var(--font-smallest);
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 8px;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0 4px;
}

.controlBtn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-s);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 80ms ease, color 80ms ease;
}

.controlBtn:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}
```

3. Modify `src/components/sidebar/RightSidebar.tsx`:
   - Import `TableControlsPanel` and the `TableIcon`
   - Add `{ id: 'table-controls', icon: TableIcon, label: 'Table Controls' }` to the panels array
   - Add a case in `renderPanel()` for `'table-controls'` that renders `<TableControlsPanel />`

4. Modify `src/stores/ui.ts`:
   - Add `'table-controls'` to the right sidebar panel type union

5. Modify `src/lib/editor/keymaps.ts`:
   - Add a `Ctrl+Shift+D` keybinding that dispatches a `CustomEvent('toggle-table-controls')` (same pattern as command palette)
   - In `RightSidebar.tsx` or `AppShell.tsx`, listen for this event and switch the right panel to `'table-controls'`

**Verification:**
- `npm run build` succeeds
- Table controls panel appears in right sidebar
- Clicking buttons executes table operations on the editor
- Ctrl+Shift+D toggles the table controls panel

**Dependencies:** Task 2 (icons), Task 5 (formatting actions)

---

### Task 8: Table Styling in Source View

**Modify CodeMirror theme in `src/components/editor/MarkdownEditor.tsx`**

Add styling for markdown table syntax in the source editor.

**Steps:**

1. Add table-related styles to `createObsidianTheme()`:
```typescript
// Inside the theme object:
'.cm-table-separator': {
  color: 'var(--text-faint)',
},
// GFM table pipe characters
'.cm-tableDelimiter': {
  color: 'var(--text-faint)',
},
```

These styles make the pipe `|` and separator `---` characters more subtle, matching Obsidian's source view behavior.

**Verification:**
- Table markdown renders with subtle pipe/separator styling
- Headers and cell content remain at normal text color

**Dependencies:** Task 6 (extension registered)

---

## Dependency Graph

```
Task 1 (table-utils)     Task 2 (icons)
    |     \                  |
    |      \                 |
    v       v                v
Task 3    Task 5          Task 4
(extension) (formatting)  (toolbar)
    |         |              |
    v         v              |
  Task 6    Task 7 <--------+
  (register) (sidebar)
    |
    v
  Task 8
  (source styling)
```

**Parallel groups:**
- **Group A** (no deps): Task 1, Task 2
- **Group B** (after Group A): Task 3, Task 4, Task 5
- **Group C** (after Group B): Task 6, Task 7
- **Group D** (after Group C): Task 8

## Keyboard Shortcuts Summary

| Shortcut | Context | Action |
|----------|---------|--------|
| `Tab` | Inside table cell | Navigate to next cell (auto-format) |
| `Shift+Tab` | Inside table cell | Navigate to previous cell (auto-format) |
| `Enter` | Inside table cell | Navigate to next row, same column (auto-format) |
| `Ctrl+Shift+D` | Anywhere | Toggle table controls sidebar |

## Edge Cases to Handle

1. **Single-column tables** -- Tab should still navigate rows
2. **Empty cells** -- cursor should land at the content position (after `| `)
3. **Cursor at table boundary** -- Tab on last cell creates new row; Shift+Tab on first cell does nothing
4. **Tables with inconsistent column counts** -- normalize during format (pad missing cells)
5. **Nested formatting in cells** -- `| **bold** | _italic_ |` should preserve inline formatting
6. **Multiple tables** -- operations should only affect the table the cursor is in
7. **Delete last row/column** -- should preserve at minimum 1 header row + separator + 1 data row / 1 column
8. **Sort with mixed types** -- treat all cell content as strings; numeric-aware sort is a future enhancement
