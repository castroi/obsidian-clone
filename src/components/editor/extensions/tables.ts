import { keymap, EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import {
  getTableRange,
  getCellAtOffset,
  getNextCellOffset,
  getPrevCellOffset,
  getNextRowCellOffset,
  parseTable,
  formatTable,
  insertRow,
} from '@/lib/editor/table-utils'

function formatTableInView(view: EditorView): boolean {
  const doc = view.state.doc.toString()
  const offset = view.state.selection.main.head
  const range = getTableRange(doc, offset)
  if (!range) return false

  const tableText = doc.slice(range.startOffset, range.endOffset)
  const table = parseTable(tableText, range)
  const formatted = formatTable(table)

  if (formatted !== tableText) {
    view.dispatch({
      changes: { from: range.startOffset, to: range.endOffset, insert: formatted },
    })
  }
  return true
}

export function tablesExtension() {
  return Prec.highest(
    keymap.of([
      {
        key: 'Tab',
        run: (view: EditorView) => {
          const doc = view.state.doc.toString()
          const offset = view.state.selection.main.head
          const range = getTableRange(doc, offset)
          if (!range) return false

          // Format the table first
          formatTableInView(view)

          // Re-read after potential format change
          const docAfterFormat = view.state.doc.toString()
          const offsetAfterFormat = view.state.selection.main.head

          const nextOffset = getNextCellOffset(docAfterFormat, offsetAfterFormat)

          if (nextOffset !== null) {
            view.dispatch({
              selection: { anchor: nextOffset, head: nextOffset },
            })
          } else {
            // At last cell — insert a new row
            const rangeAfter = getTableRange(docAfterFormat, offsetAfterFormat)
            if (!rangeAfter) return true

            const tableText = docAfterFormat.slice(rangeAfter.startOffset, rangeAfter.endOffset)
            const table = parseTable(tableText, rangeAfter)
            const newTable = insertRow(table, table.rows.length)

            view.dispatch({
              changes: { from: rangeAfter.startOffset, to: rangeAfter.endOffset, insert: newTable },
            })

            // Move cursor to first cell of new last row
            const docFinal = view.state.doc.toString()
            const newLines = newTable.split('\n')
            const lastLine = newLines[newLines.length - 1]
            // Find position of first cell content in the new last line
            const lastLineStart = rangeAfter.startOffset + newTable.lastIndexOf('\n') + 1
            const pipePos = lastLine.indexOf('|')
            const cellStart = lastLineStart + pipePos + 2 // skip "| "
            view.dispatch({
              selection: { anchor: cellStart, head: cellStart },
            })
          }

          return true
        },
      },
      {
        key: 'Shift-Tab',
        run: (view: EditorView) => {
          const doc = view.state.doc.toString()
          const offset = view.state.selection.main.head
          const range = getTableRange(doc, offset)
          if (!range) return false

          formatTableInView(view)

          const docAfterFormat = view.state.doc.toString()
          const offsetAfterFormat = view.state.selection.main.head

          const prevOffset = getPrevCellOffset(docAfterFormat, offsetAfterFormat)

          if (prevOffset !== null) {
            view.dispatch({
              selection: { anchor: prevOffset, head: prevOffset },
            })
          }
          // If null, we're at the first cell — do nothing but consume the event
          return true
        },
      },
      {
        key: 'Enter',
        run: (view: EditorView) => {
          const doc = view.state.doc.toString()
          const offset = view.state.selection.main.head
          const range = getTableRange(doc, offset)
          if (!range) return false

          formatTableInView(view)

          const docAfterFormat = view.state.doc.toString()
          const offsetAfterFormat = view.state.selection.main.head

          const nextRowOffset = getNextRowCellOffset(docAfterFormat, offsetAfterFormat)

          if (nextRowOffset !== null) {
            view.dispatch({
              selection: { anchor: nextRowOffset, head: nextRowOffset },
            })
          } else {
            // At last row — insert new row
            const rangeAfter = getTableRange(docAfterFormat, offsetAfterFormat)
            if (!rangeAfter) return true

            const cellAfter = getCellAtOffset(docAfterFormat, offsetAfterFormat)
            const col = cellAfter?.col ?? 0

            const tableText = docAfterFormat.slice(rangeAfter.startOffset, rangeAfter.endOffset)
            const table = parseTable(tableText, rangeAfter)
            const newTable = insertRow(table, table.rows.length)

            view.dispatch({
              changes: { from: rangeAfter.startOffset, to: rangeAfter.endOffset, insert: newTable },
            })

            // Move cursor to same column in new last row
            const newLines = newTable.split('\n')
            const lastLine = newLines[newLines.length - 1]
            const lastLineStart = rangeAfter.startOffset + newTable.lastIndexOf('\n') + 1

            // Find the nth cell start
            const trimmed = lastLine.trim()
            let pos = lastLine.indexOf(trimmed[0])
            if (trimmed.startsWith('|')) pos++

            let currentCol = 0
            let cellStart = lastLineStart + pos
            while (pos < lastLine.length) {
              const pipePos = lastLine.indexOf('|', pos)
              const cellContent = lastLine.slice(pos, pipePos === -1 ? lastLine.length : pipePos)
              const leadingSpaces = cellContent.length - cellContent.trimStart().length
              if (currentCol === col) {
                cellStart = lastLineStart + pos + leadingSpaces
                break
              }
              currentCol++
              if (pipePos === -1) break
              pos = pipePos + 1
            }

            view.dispatch({
              selection: { anchor: cellStart, head: cellStart },
            })
          }

          return true
        },
      },
    ])
  )
}
