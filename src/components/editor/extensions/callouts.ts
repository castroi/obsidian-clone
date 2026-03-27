import { ViewPlugin, DecorationSet, Decoration, WidgetType, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const CALLOUT_COLORS: Record<string, string> = {
  note: '#448aff', seealso: '#448aff',
  abstract: '#00b0ff', summary: '#00b0ff', tldr: '#00b0ff',
  info: '#00b0ff',
  todo: '#448aff',
  tip: '#00bcd4', hint: '#00bcd4', important: '#00bcd4',
  success: '#00c853', check: '#00c853', done: '#00c853',
  question: '#64dd17', help: '#64dd17', faq: '#64dd17',
  warning: '#ff9100', caution: '#ff9100', attention: '#ff9100',
  failure: '#ff5252', fail: '#ff5252', missing: '#ff5252',
  danger: '#ff1744', error: '#ff1744',
  bug: '#f50057',
  example: '#7c4dff',
  quote: '#9e9e9e', cite: '#9e9e9e',
}

class CalloutTitleWidget extends WidgetType {
  constructor(private type: string, private title: string, private color: string) {
    super()
  }
  toDOM(_view: EditorView) {
    const div = document.createElement('div')
    div.className = 'cm-callout-title'
    div.style.cssText = `
      color: ${this.color};
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    `
    div.textContent = this.title || this.type.charAt(0).toUpperCase() + this.type.slice(1)
    return div
  }
  ignoreEvent() { return true }
}

export function calloutsExtension() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }
      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const calloutRe = /^> \[!(\w+)\](?: (.+))?$/gm

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to)
          let match: RegExpExecArray | null
          calloutRe.lastIndex = 0
          while ((match = calloutRe.exec(text)) !== null) {
            const lineStart = from + match.index
            const lineEnd = lineStart + match[0].length
            const type = match[1].toLowerCase()
            const title = match[2] ?? ''
            const color = CALLOUT_COLORS[type] ?? '#448aff'
            builder.add(lineStart, lineEnd, Decoration.replace({
              widget: new CalloutTitleWidget(type, title, color),
            }))
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}
