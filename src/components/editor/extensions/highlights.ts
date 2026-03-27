import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

export function highlightsExtension() {
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
        const re = /==([^=]+)==/g

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to)
          let match: RegExpExecArray | null
          re.lastIndex = 0
          while ((match = re.exec(text)) !== null) {
            const start = from + match.index
            const end = start + match[0].length
            const cursorInside = cursorPos >= start && cursorPos <= end
            if (!cursorInside) {
              // Hide ==markers==, apply highlight mark to inner text
              builder.add(start, start + 2, Decoration.replace({}))
              builder.add(start + 2, end - 2, Decoration.mark({ class: 'cm-highlight' }))
              builder.add(end - 2, end, Decoration.replace({}))
            }
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}
