import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  getTableRange, parseTable, createTable, insertRow, deleteRow,
  insertColumn, deleteColumn, moveRow, moveColumn,
  setColumnAlignment, sortByColumn, transposeTable, getCellAtOffset,
  type ParsedTable, type CellLocation,
} from './table-utils'

function wrapSelection(view: EditorView, before: string, after: string) {
  const { state } = view
  const changes = state.changeByRange((range) => {
    if (range.empty) {
      // No selection — insert markers and place cursor between them
      return {
        changes: [
          { from: range.from, insert: before + after }
        ],
        range: EditorSelection.cursor(range.from + before.length)
      }
    }
    const selectedText = state.sliceDoc(range.from, range.to)
    // Toggle: if already wrapped, remove; otherwise add
    if (selectedText.startsWith(before) && selectedText.endsWith(after)) {
      return {
        changes: [
          { from: range.from, to: range.to, insert: selectedText.slice(before.length, -after.length || undefined) }
        ],
        range: EditorSelection.range(range.from, range.to - before.length - after.length)
      }
    }
    return {
      changes: [
        { from: range.from, insert: before },
        { from: range.to, insert: after }
      ],
      range: EditorSelection.range(range.from, range.to + before.length + after.length)
    }
  })
  view.dispatch(changes)
  view.focus()
}

function prependToLine(view: EditorView, prefix: string) {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    if (line.text.startsWith(prefix)) {
      // Toggle off
      return {
        changes: { from: line.from, to: line.from + prefix.length, insert: '' },
        range: EditorSelection.range(range.from - prefix.length, range.to - prefix.length)
      }
    }
    return {
      changes: { from: line.from, insert: prefix },
      range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length)
    }
  })
  view.dispatch(changes)
  view.focus()
}

function applyTableTransform(
  view: EditorView,
  transform: (table: ParsedTable, cell: CellLocation) => string
) {
  const doc = view.state.doc.toString()
  const offset = view.state.selection.main.head
  const range = getTableRange(doc, offset)
  if (!range) return

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

export function applyFormatting(view: EditorView, action: string) {
  switch (action) {
    case 'bold':          return wrapSelection(view, '**', '**')
    case 'italic':        return wrapSelection(view, '_', '_')
    case 'strikethrough': return wrapSelection(view, '~~', '~~')
    case 'code':          return wrapSelection(view, '`', '`')
    case 'highlight':     return wrapSelection(view, '==', '==')
    case 'link': {
      const sel = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)
      if (sel) {
        wrapSelection(view, '[', '](url)')
      } else {
        const { from } = view.state.selection.main
        view.dispatch({ changes: { from, insert: '[link text](url)' }, selection: EditorSelection.cursor(from + 16) })
        view.focus()
      }
      break
    }
    case 'heading':       return prependToLine(view, '## ')
    case 'bullet':        return prependToLine(view, '- ')
    case 'ordered':       return prependToLine(view, '1. ')
    case 'checklist':     return prependToLine(view, '- [ ] ')
    case 'quote':         return prependToLine(view, '> ')
    case 'hr': {
      const { from } = view.state.selection.main
      const line = view.state.doc.lineAt(from)
      view.dispatch({
        changes: { from: line.to, insert: '\n\n---\n\n' },
        selection: EditorSelection.cursor(line.to + 7)
      })
      view.focus()
      break
    }
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
  }
}
