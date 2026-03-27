import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const HEADING_SIZES: Record<number, string> = {
  1: '2em', 2: '1.6em', 3: '1.37em', 4: '1.25em', 5: '1.12em', 6: '1em',
}
const HEADING_WEIGHTS: Record<number, string> = {
  1: '700', 2: '600', 3: '600', 4: '600', 5: '600', 6: '600',
}

export function headingsExtension() {
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
        const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number

        for (const { from, to } of view.visibleRanges) {
          let pos = from
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos)
            const match = line.text.match(/^(#{1,6}) /)
            if (match && line.number !== cursorLine) {
              const level = match[1].length
              builder.add(line.from, line.from, Decoration.line({
                attributes: {
                  style: `font-size: ${HEADING_SIZES[level]}; font-weight: ${HEADING_WEIGHTS[level]}; line-height: 1.3; color: var(--h${level}-color)`,
                }
              }))
              // Hide the # symbols
              builder.add(line.from, line.from + match[1].length + 1, Decoration.replace({}))
            }
            pos = line.to + 1
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}
