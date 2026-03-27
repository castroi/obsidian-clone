import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

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
  }
}
