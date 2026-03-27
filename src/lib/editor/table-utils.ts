// --- Types ---

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

export interface CellLocation {
  row: number   // 0 = header, 1+ = data rows (separator row is skipped)
  col: number
  startOffset: number  // absolute offset in document
  endOffset: number
}

// --- Detection ---

/** Check if a line is part of a markdown table (starts with |) */
export function isTableLine(line: string): boolean {
  return /^\s*\|/.test(line)
}

/** Check if a line is the separator row (| --- | :---: | ---: |) */
export function isSeparatorLine(line: string): boolean {
  return /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line)
}

/**
 * Given a document string and a cursor offset, return the table boundaries
 * or null if the cursor is not inside a table.
 */
export function getTableRange(doc: string, cursorOffset: number): TableRange | null {
  const lines = doc.split('\n')
  let offset = 0
  let cursorLine = -1

  // Find which line the cursor is on
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = offset + lines[i].length
    if (cursorOffset >= offset && cursorOffset <= lineEnd) {
      cursorLine = i
      break
    }
    offset += lines[i].length + 1 // +1 for '\n'
  }

  if (cursorLine === -1) return null
  if (!isTableLine(lines[cursorLine])) return null

  // Walk up to find start
  let startLine = cursorLine
  while (startLine > 0 && isTableLine(lines[startLine - 1])) {
    startLine--
  }

  // Walk down to find end
  let endLine = cursorLine
  while (endLine < lines.length - 1 && isTableLine(lines[endLine + 1])) {
    endLine++
  }

  // Calculate offsets
  let startOffset = 0
  for (let i = 0; i < startLine; i++) {
    startOffset += lines[i].length + 1
  }

  let endOffset = startOffset
  for (let i = startLine; i <= endLine; i++) {
    endOffset += lines[i].length
    if (i < endLine) endOffset += 1 // '\n' between lines, not after last
  }

  return { startLine, endLine, startOffset, endOffset }
}

// --- Parsing ---

function parseAlignmentCell(cell: string): 'left' | 'center' | 'right' | 'none' {
  const trimmed = cell.trim()
  const startsColon = trimmed.startsWith(':')
  const endsColon = trimmed.endsWith(':')
  if (startsColon && endsColon) return 'center'
  if (endsColon) return 'right'
  if (startsColon) return 'left'
  return 'none'
}

function splitCells(line: string): string[] {
  const trimmed = line.trim()
  // Remove leading and trailing pipes if present
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const withoutTrailing = inner.endsWith('|') ? inner.slice(0, -1) : inner
  return withoutTrailing.split('|').map(c => c.trim())
}

/** Parse a markdown table string into structured data */
export function parseTable(tableText: string, range: TableRange): ParsedTable {
  const lines = tableText.split('\n').filter(l => l.trim() !== '')

  if (lines.length < 2) {
    return { headers: [], alignments: [], rows: [], range }
  }

  const headers = splitCells(lines[0])
  const colCount = headers.length

  // Find separator line index
  let sepIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (isSeparatorLine(lines[i])) {
      sepIndex = i
      break
    }
  }

  let alignments: ('left' | 'center' | 'right' | 'none')[]
  let dataStartIndex: number

  if (sepIndex !== -1) {
    const sepCells = splitCells(lines[sepIndex])
    alignments = sepCells.map(parseAlignmentCell)
    // Pad alignments to match header count
    while (alignments.length < colCount) alignments.push('none')
    dataStartIndex = sepIndex + 1
  } else {
    alignments = Array(colCount).fill('none')
    dataStartIndex = 1
  }

  const rows: string[][] = []
  for (let i = dataStartIndex; i < lines.length; i++) {
    const cells = splitCells(lines[i])
    // Normalize row to have exactly colCount cells
    const normalizedRow: string[] = []
    for (let c = 0; c < colCount; c++) {
      normalizedRow.push(cells[c] ?? '')
    }
    rows.push(normalizedRow)
  }

  return { headers, alignments, rows, range }
}

// --- Cell Location ---

/** Find which cell the cursor is in */
export function getCellAtOffset(doc: string, offset: number): CellLocation | null {
  const range = getTableRange(doc, offset)
  if (!range) return null

  const lines = doc.split('\n')
  let lineOffset = 0
  for (let i = 0; i < range.startLine; i++) {
    lineOffset += lines[i].length + 1
  }

  // Figure out which line within the table we're on
  let tableLineIndex = -1
  let currentOffset = lineOffset
  for (let i = range.startLine; i <= range.endLine; i++) {
    const lineEnd = currentOffset + lines[i].length
    if (offset >= currentOffset && offset <= lineEnd) {
      tableLineIndex = i - range.startLine
      break
    }
    currentOffset += lines[i].length + 1
  }

  if (tableLineIndex === -1) return null

  // Skip separator lines from row counting
  const tableLines = lines.slice(range.startLine, range.endLine + 1)

  // Find separator line index
  let sepLineIndex = -1
  for (let i = 0; i < tableLines.length; i++) {
    if (isSeparatorLine(tableLines[i])) {
      sepLineIndex = i
      break
    }
  }

  // If cursor is on separator line, return null
  if (tableLineIndex === sepLineIndex) return null

  // Calculate row: 0 = header, separator is skipped, 1+ = data rows
  let row: number
  if (tableLineIndex === 0) {
    row = 0
  } else if (sepLineIndex !== -1 && tableLineIndex > sepLineIndex) {
    row = tableLineIndex - sepLineIndex // accounts for skipped sep line, so row >= 1
  } else {
    row = tableLineIndex
  }

  // Find which cell within the line
  const line = tableLines[tableLineIndex]
  let lineStart = lineOffset
  for (let i = 0; i < tableLineIndex; i++) {
    lineStart += tableLines[i].length + 1
  }

  const relativeOffset = offset - lineStart
  // Parse cells and find which one the cursor is in
  const trimmed = line.trim()
  const leadingWhitespace = line.indexOf(trimmed[0])

  let pos = leadingWhitespace
  if (trimmed.startsWith('|')) pos++ // skip leading pipe

  let col = 0
  while (pos < line.length) {
    // Find next pipe
    const pipePos = line.indexOf('|', pos)
    const cellStart = pos
    const cellEnd = pipePos === -1 ? line.length : pipePos

    if (relativeOffset >= cellStart && relativeOffset <= cellEnd) {
      // Cursor is in this cell
      const absStart = lineStart + cellStart
      const absEnd = lineStart + cellEnd
      return { row, col, startOffset: absStart, endOffset: absEnd }
    }

    col++
    if (pipePos === -1) break
    pos = pipePos + 1
  }

  return null
}

/** Get the absolute offset to position cursor at the content start of a cell */
function getCellContentStart(doc: string, tableLineStart: number, line: string, col: number): number {
  const trimmed = line.trim()
  let pos = line.indexOf(trimmed[0])
  if (trimmed.startsWith('|')) pos++

  let currentCol = 0
  while (pos < line.length) {
    const pipePos = line.indexOf('|', pos)
    if (currentCol === col) {
      // Move to start of cell content (after leading space)
      const cellContent = line.slice(pos, pipePos === -1 ? line.length : pipePos)
      const leadingSpaces = cellContent.length - cellContent.trimStart().length
      return tableLineStart + pos + leadingSpaces
    }
    currentCol++
    if (pipePos === -1) break
    pos = pipePos + 1
  }
  return tableLineStart + line.length
}

/** Get the offset of the next cell (for Tab navigation). Returns null if not in a table. */
export function getNextCellOffset(doc: string, offset: number): number | null {
  const range = getTableRange(doc, offset)
  if (!range) return null

  const cell = getCellAtOffset(doc, offset)
  if (!cell) return null

  const tableLines = doc.slice(range.startOffset, range.endOffset).split('\n')

  // Find separator line
  let sepLineIndex = -1
  for (let i = 0; i < tableLines.length; i++) {
    if (isSeparatorLine(tableLines[i])) {
      sepLineIndex = i
      break
    }
  }

  // Build list of navigable lines (exclude separator)
  const navigableLines: { lineIndex: number; line: string }[] = []
  for (let i = 0; i < tableLines.length; i++) {
    if (i !== sepLineIndex && tableLines[i].trim() !== '') {
      navigableLines.push({ lineIndex: i, line: tableLines[i] })
    }
  }

  // Find current navigable line
  const cursorLineInTable = getCursorTableLine(doc, offset, range)
  const navIdx = navigableLines.findIndex(nl => nl.lineIndex === cursorLineInTable)
  if (navIdx === -1) return null

  const colCount = splitCells(navigableLines[navIdx].line).length

  if (cell.col + 1 < colCount) {
    // Move to next cell in same line
    const lineStartOffset = getLineStartOffset(doc, range.startLine + cursorLineInTable)
    return getCellContentStart(doc, lineStartOffset, navigableLines[navIdx].line, cell.col + 1)
  } else if (navIdx + 1 < navigableLines.length) {
    // Move to first cell of next navigable line
    const nextNav = navigableLines[navIdx + 1]
    const lineStartOffset = getLineStartOffset(doc, range.startLine + nextNav.lineIndex)
    return getCellContentStart(doc, lineStartOffset, nextNav.line, 0)
  }

  // At last cell of last row — signal for new row insertion
  return null
}

/** Get the offset of the previous cell (for Shift+Tab navigation). */
export function getPrevCellOffset(doc: string, offset: number): number | null {
  const range = getTableRange(doc, offset)
  if (!range) return null

  const cell = getCellAtOffset(doc, offset)
  if (!cell) return null

  const tableLines = doc.slice(range.startOffset, range.endOffset).split('\n')

  let sepLineIndex = -1
  for (let i = 0; i < tableLines.length; i++) {
    if (isSeparatorLine(tableLines[i])) {
      sepLineIndex = i
      break
    }
  }

  const navigableLines: { lineIndex: number; line: string }[] = []
  for (let i = 0; i < tableLines.length; i++) {
    if (i !== sepLineIndex && tableLines[i].trim() !== '') {
      navigableLines.push({ lineIndex: i, line: tableLines[i] })
    }
  }

  const cursorLineInTable = getCursorTableLine(doc, offset, range)
  const navIdx = navigableLines.findIndex(nl => nl.lineIndex === cursorLineInTable)
  if (navIdx === -1) return null

  if (cell.col > 0) {
    // Move to previous cell in same line
    const lineStartOffset = getLineStartOffset(doc, range.startLine + cursorLineInTable)
    return getCellContentStart(doc, lineStartOffset, navigableLines[navIdx].line, cell.col - 1)
  } else if (navIdx > 0) {
    // Move to last cell of previous navigable line
    const prevNav = navigableLines[navIdx - 1]
    const prevColCount = splitCells(prevNav.line).length
    const lineStartOffset = getLineStartOffset(doc, range.startLine + prevNav.lineIndex)
    return getCellContentStart(doc, lineStartOffset, prevNav.line, prevColCount - 1)
  }

  // At first cell of first row — don't move
  return null
}

/** Get the offset of the cell in the next row (for Enter navigation). */
export function getNextRowCellOffset(doc: string, offset: number): number | null {
  const range = getTableRange(doc, offset)
  if (!range) return null

  const cell = getCellAtOffset(doc, offset)
  if (!cell) return null

  const tableLines = doc.slice(range.startOffset, range.endOffset).split('\n')

  let sepLineIndex = -1
  for (let i = 0; i < tableLines.length; i++) {
    if (isSeparatorLine(tableLines[i])) {
      sepLineIndex = i
      break
    }
  }

  // Data rows only (not header, not separator)
  const dataLines: { lineIndex: number; line: string }[] = []
  for (let i = 0; i < tableLines.length; i++) {
    if (i !== 0 && i !== sepLineIndex && tableLines[i].trim() !== '') {
      dataLines.push({ lineIndex: i, line: tableLines[i] })
    }
  }

  const cursorLineInTable = getCursorTableLine(doc, offset, range)
  const dataIdx = dataLines.findIndex(dl => dl.lineIndex === cursorLineInTable)

  if (dataIdx === -1) {
    // Cursor is in header — move to first data row
    if (dataLines.length > 0) {
      const firstData = dataLines[0]
      const lineStartOffset = getLineStartOffset(doc, range.startLine + firstData.lineIndex)
      return getCellContentStart(doc, lineStartOffset, firstData.line, cell.col)
    }
    return null
  }

  if (dataIdx + 1 < dataLines.length) {
    // Move to same column in next data row
    const nextData = dataLines[dataIdx + 1]
    const lineStartOffset = getLineStartOffset(doc, range.startLine + nextData.lineIndex)
    const colCount = splitCells(nextData.line).length
    const targetCol = Math.min(cell.col, colCount - 1)
    return getCellContentStart(doc, lineStartOffset, nextData.line, targetCol)
  }

  // At last data row — signal for new row insertion
  return null
}

// --- Helpers ---

function getCursorTableLine(doc: string, offset: number, range: TableRange): number {
  const lines = doc.split('\n')
  let currentOffset = 0
  for (let i = 0; i < range.startLine; i++) {
    currentOffset += lines[i].length + 1
  }
  for (let i = range.startLine; i <= range.endLine; i++) {
    const lineEnd = currentOffset + lines[i].length
    if (offset >= currentOffset && offset <= lineEnd) {
      return i - range.startLine
    }
    currentOffset += lines[i].length + 1
  }
  return 0
}

function getLineStartOffset(doc: string, lineNumber: number): number {
  const lines = doc.split('\n')
  let offset = 0
  for (let i = 0; i < lineNumber; i++) {
    offset += lines[i].length + 1
  }
  return offset
}

// --- Formatting ---

function alignmentSeparator(alignment: 'left' | 'center' | 'right' | 'none', width: number): string {
  const dashes = '-'.repeat(Math.max(3, width))
  switch (alignment) {
    case 'left':   return ':' + dashes.slice(1)
    case 'right':  return dashes.slice(0, -1) + ':'
    case 'center': return ':' + dashes.slice(1, -1) + ':'
    default:       return dashes
  }
}

/** Auto-align a table: pad cells so columns line up, respecting alignment markers */
export function formatTable(table: ParsedTable): string {
  const colCount = table.headers.length
  const colWidths: number[] = Array(colCount).fill(0)

  // Calculate max width per column
  for (let c = 0; c < colCount; c++) {
    colWidths[c] = Math.max(colWidths[c], table.headers[c].length)
    // Width of separator: at least 3
    const sepWidth = alignmentSeparator(table.alignments[c] ?? 'none', 3).length
    colWidths[c] = Math.max(colWidths[c], sepWidth)
    for (const row of table.rows) {
      colWidths[c] = Math.max(colWidths[c], (row[c] ?? '').length)
    }
    // Ensure minimum width of 1 for readability
    colWidths[c] = Math.max(colWidths[c], 1)
  }

  function padCell(content: string, width: number): string {
    return content + ' '.repeat(width - content.length)
  }

  const headerLine = '| ' + table.headers.map((h, c) => padCell(h, colWidths[c])).join(' | ') + ' |'
  const sepLine = '| ' + table.alignments.map((a, c) => alignmentSeparator(a ?? 'none', colWidths[c])).join(' | ') + ' |'
  const dataLines = table.rows.map(row =>
    '| ' + row.map((cell, c) => padCell(cell ?? '', colWidths[c])).join(' | ') + ' |'
  )

  return [headerLine, sepLine, ...dataLines].join('\n')
}

// --- Manipulation ---

/** Insert a new row after the given row index (0 = after first data row). Returns formatted table. */
export function insertRow(table: ParsedTable, afterRow: number): string {
  const emptyRow = Array(table.headers.length).fill('')
  const newRows = [...table.rows]
  // afterRow is 0-based data row index; row 0 in CellLocation = header
  // When called from toolbar, cell.row is 0 for header, 1+ for data
  const insertAt = afterRow >= 1 ? afterRow : 0
  newRows.splice(insertAt, 0, emptyRow)
  return formatTable({ ...table, rows: newRows })
}

/** Delete a row by index. Preserves at least one data row. Returns formatted table. */
export function deleteRow(table: ParsedTable, rowIndex: number): string {
  if (table.rows.length <= 1) return formatTable(table)
  const dataRowIndex = rowIndex >= 1 ? rowIndex - 1 : 0
  const newRows = table.rows.filter((_, i) => i !== dataRowIndex)
  return formatTable({ ...table, rows: newRows })
}

/** Insert a column after the given column index. Returns formatted table. */
export function insertColumn(table: ParsedTable, afterCol: number): string {
  const insertAt = afterCol + 1
  const newHeaders = [...table.headers]
  newHeaders.splice(insertAt, 0, '')
  const newAlignments = [...table.alignments]
  newAlignments.splice(insertAt, 0, 'none')
  const newRows = table.rows.map(row => {
    const newRow = [...row]
    newRow.splice(insertAt, 0, '')
    return newRow
  })
  return formatTable({ ...table, headers: newHeaders, alignments: newAlignments, rows: newRows })
}

/** Delete a column by index. Preserves at least one column. Returns formatted table. */
export function deleteColumn(table: ParsedTable, colIndex: number): string {
  if (table.headers.length <= 1) return formatTable(table)
  const newHeaders = table.headers.filter((_, i) => i !== colIndex)
  const newAlignments = table.alignments.filter((_, i) => i !== colIndex)
  const newRows = table.rows.map(row => row.filter((_, i) => i !== colIndex))
  return formatTable({ ...table, headers: newHeaders, alignments: newAlignments, rows: newRows })
}

/** Move a row up or down. Returns formatted table. */
export function moveRow(table: ParsedTable, rowIndex: number, direction: 'up' | 'down'): string {
  const dataRowIndex = rowIndex >= 1 ? rowIndex - 1 : 0
  const newRows = [...table.rows]
  if (direction === 'up' && dataRowIndex > 0) {
    ;[newRows[dataRowIndex - 1], newRows[dataRowIndex]] = [newRows[dataRowIndex], newRows[dataRowIndex - 1]]
  } else if (direction === 'down' && dataRowIndex < newRows.length - 1) {
    ;[newRows[dataRowIndex], newRows[dataRowIndex + 1]] = [newRows[dataRowIndex + 1], newRows[dataRowIndex]]
  }
  return formatTable({ ...table, rows: newRows })
}

/** Move a column left or right. Returns formatted table. */
export function moveColumn(table: ParsedTable, colIndex: number, direction: 'left' | 'right'): string {
  const newHeaders = [...table.headers]
  const newAlignments = [...table.alignments]
  const newRows = table.rows.map(row => [...row])

  if (direction === 'left' && colIndex > 0) {
    ;[newHeaders[colIndex - 1], newHeaders[colIndex]] = [newHeaders[colIndex], newHeaders[colIndex - 1]]
    ;[newAlignments[colIndex - 1], newAlignments[colIndex]] = [newAlignments[colIndex], newAlignments[colIndex - 1]]
    newRows.forEach(row => {
      ;[row[colIndex - 1], row[colIndex]] = [row[colIndex], row[colIndex - 1]]
    })
  } else if (direction === 'right' && colIndex < newHeaders.length - 1) {
    ;[newHeaders[colIndex], newHeaders[colIndex + 1]] = [newHeaders[colIndex + 1], newHeaders[colIndex]]
    ;[newAlignments[colIndex], newAlignments[colIndex + 1]] = [newAlignments[colIndex + 1], newAlignments[colIndex]]
    newRows.forEach(row => {
      ;[row[colIndex], row[colIndex + 1]] = [row[colIndex + 1], row[colIndex]]
    })
  }

  return formatTable({ ...table, headers: newHeaders, alignments: newAlignments, rows: newRows })
}

/** Set column alignment. Returns formatted table. */
export function setColumnAlignment(
  table: ParsedTable,
  colIndex: number,
  alignment: 'left' | 'center' | 'right'
): string {
  const newAlignments = [...table.alignments]
  newAlignments[colIndex] = alignment
  return formatTable({ ...table, alignments: newAlignments })
}

/** Sort rows by a column. Returns formatted table. */
export function sortByColumn(table: ParsedTable, colIndex: number, direction: 'asc' | 'desc'): string {
  const newRows = [...table.rows].sort((a, b) => {
    const aVal = (a[colIndex] ?? '').trim()
    const bVal = (b[colIndex] ?? '').trim()

    // Try numeric sort
    const aNum = parseFloat(aVal)
    const bNum = parseFloat(bVal)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum
    }

    // String sort
    const cmp = aVal.localeCompare(bVal)
    return direction === 'asc' ? cmp : -cmp
  })
  return formatTable({ ...table, rows: newRows })
}

/** Transpose the table (swap rows and columns). Returns formatted table. */
export function transposeTable(table: ParsedTable): string {
  const colCount = table.headers.length
  const rowCount = table.rows.length

  // New headers = old first column
  const newHeaders = [table.headers[0], ...table.rows.map(row => row[0] ?? '')]

  // New rows = old columns (starting from col 1)
  const newRows: string[][] = []
  for (let c = 1; c < colCount; c++) {
    const newRow = [table.headers[c]]
    for (let r = 0; r < rowCount; r++) {
      newRow.push(table.rows[r][c] ?? '')
    }
    newRows.push(newRow)
  }

  const newAlignments: ('left' | 'center' | 'right' | 'none')[] = Array(newHeaders.length).fill('none')

  return formatTable({ headers: newHeaders, alignments: newAlignments, rows: newRows, range: table.range })
}

// --- Creation ---

/** Generate a new empty table with the given dimensions */
export function createTable(rows: number, cols: number): string {
  const headers = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`)
  const alignments: ('left' | 'center' | 'right' | 'none')[] = Array(cols).fill('none')
  const dataRows = Array.from({ length: rows }, () => Array(cols).fill(''))

  const fakeRange: TableRange = { startLine: 0, endLine: 0, startOffset: 0, endOffset: 0 }
  return formatTable({ headers, alignments, rows: dataRows, range: fakeRange })
}
