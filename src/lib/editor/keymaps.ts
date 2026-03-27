import { KeyBinding, EditorView } from '@codemirror/view'
import { applyFormatting } from './formatting'

export function obsidianKeymap(
  onCommandPalette: () => void,
  onQuickSwitcher: () => void,
  onNewNote: () => void,
): KeyBinding[] {
  return [
    {
      key: 'Mod-b',
      run: (view: EditorView) => { applyFormatting(view, 'bold'); return true }
    },
    {
      key: 'Mod-i',
      run: (view: EditorView) => { applyFormatting(view, 'italic'); return true }
    },
    {
      key: 'Mod-k',
      run: (view: EditorView) => { applyFormatting(view, 'link'); return true }
    },
    {
      key: 'Mod-p',
      run: () => { onCommandPalette(); return true }
    },
    {
      key: 'Mod-o',
      run: () => { onQuickSwitcher(); return true }
    },
    {
      key: 'Mod-n',
      run: () => { onNewNote(); return true }
    },
    {
      key: 'Mod-s',
      run: () => true  // Auto-save already handles this; just consume
    },
    {
      key: 'Mod-Shift-d',
      run: () => {
        window.dispatchEvent(new CustomEvent('toggle-table-controls'))
        return true
      }
    },
  ]
}
