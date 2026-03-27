import { ViewPlugin, DecorationSet, Decoration, WidgetType, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

type TaskState = ' ' | 'x' | '/' | '-'

class CheckboxWidget extends WidgetType {
  constructor(readonly state: TaskState, private pos: number) {
    super()
  }
  toDOM(view: EditorView) {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = this.state === 'x'
    checkbox.indeterminate = this.state === '/'
    checkbox.className = 'cm-task-checkbox'
    checkbox.style.cssText = `
      width: var(--checkbox-size, 15px);
      height: var(--checkbox-size, 15px);
      margin-right: 4px;
      cursor: pointer;
      accent-color: var(--interactive-accent);
      vertical-align: middle;
    `
    checkbox.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const newState = this.state === 'x' ? ' ' : 'x'
      const pos = this.pos
      view.dispatch({
        changes: { from: pos, to: pos + 1, insert: newState }
      })
    })
    return checkbox
  }
  ignoreEvent() { return false }
  eq(other: WidgetType) { return other instanceof CheckboxWidget && other.state === this.state }
}

export function tasksExtension() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }
      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const taskRe = /^(\s*[-*+] )(\[( |x|\/|-)\])/gm

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to)
          let match: RegExpExecArray | null
          taskRe.lastIndex = 0
          while ((match = taskRe.exec(text)) !== null) {
            const checkboxStart = from + match.index + match[1].length
            const checkboxEnd = checkboxStart + match[2].length
            const state = match[3] as TaskState
            // Replace "[ ]" / "[x]" with interactive checkbox widget
            builder.add(checkboxStart, checkboxEnd, Decoration.replace({
              widget: new CheckboxWidget(state, checkboxStart + 1),
            }))
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}
