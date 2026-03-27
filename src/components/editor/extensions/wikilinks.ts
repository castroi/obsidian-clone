import { ViewPlugin, DecorationSet, Decoration, WidgetType, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

class WikiLinkWidget extends WidgetType {
  constructor(private displayText: string, private target: string) {
    super()
  }
  toDOM(_view: EditorView) {
    const span = document.createElement('span')
    span.className = 'cm-wikilink'
    span.textContent = this.displayText
    span.dataset.href = this.target
    span.style.cssText = `color: var(--text-accent); cursor: pointer; text-decoration: none;`
    return span
  }
  ignoreEvent() { return false }
}

export function wikilinksExtension() {
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
        const cursorPos = view.state.selection.main.head
        const wikiLinkRe = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to)
          let match: RegExpExecArray | null
          wikiLinkRe.lastIndex = 0
          while ((match = wikiLinkRe.exec(text)) !== null) {
            const start = from + match.index
            const end = start + match[0].length
            // Show raw if cursor is inside
            const cursorInside = cursorPos >= start && cursorPos <= end
            if (!cursorInside) {
              const target = match[1]
              const display = match[2] ?? match[1]
              builder.add(start, end, Decoration.replace({
                widget: new WikiLinkWidget(display, target),
              }))
            }
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}
