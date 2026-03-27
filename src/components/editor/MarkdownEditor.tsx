'use client'
import { useEffect, useRef, useCallback } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import { debounce, type DebouncedFn } from '@/lib/utils/debounce'
import { obsidianKeymap } from '@/lib/editor/keymaps'
import { wikilinksExtension } from './extensions/wikilinks'
import { highlightsExtension } from './extensions/highlights'
import { tasksExtension } from './extensions/tasks'
import { calloutsExtension } from './extensions/callouts'
import { headingsExtension } from './extensions/headings'
import styles from './MarkdownEditor.module.css'

// Module-level registry so toolbar can access current view
let currentEditorView: EditorView | null = null
export function getEditorView() { return currentEditorView }

const themeCompartment = new Compartment()

function createObsidianTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      background: 'var(--background-primary)',
      color: 'var(--text-normal)',
      fontFamily: 'var(--font-text)',
      fontSize: 'var(--editor-font-size)',
    },
    '.cm-content': {
      maxWidth: 'var(--file-line-width)',
      margin: '0 auto',
      padding: 'var(--file-margins)',
      caretColor: 'var(--caret-color)',
      lineHeight: 'var(--editor-line-height)',
      fontFamily: 'var(--font-text)',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-activeLineGutter': {
      display: 'none',
    },
    '.cm-activeLine': {
      background: 'transparent',
    },
    '.cm-selectionBackground, ::selection': {
      background: 'var(--text-selection) !important',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--caret-color)',
    },
    // Markdown syntax highlighting
    '.cm-header': { fontWeight: 'bold', color: 'var(--text-normal)' },
    '.cm-header-1': { fontSize: '2em', lineHeight: '1.3' },
    '.cm-header-2': { fontSize: '1.6em', lineHeight: '1.3' },
    '.cm-header-3': { fontSize: '1.37em' },
    '.cm-strong': { fontWeight: 'var(--bold-weight)' },
    '.cm-em': { fontStyle: 'italic' },
    '.cm-link': { color: 'var(--text-accent)' },
    '.cm-url': { color: 'var(--text-accent)' },
    '.cm-code': {
      fontFamily: 'var(--font-monospace)',
      fontSize: 'var(--code-size)',
      background: 'var(--code-background)',
      color: 'var(--code-color)',
      borderRadius: 'var(--radius-s)',
      padding: '0.1em 0.3em',
    },
    '.cm-blockquote': {
      borderLeft: 'var(--blockquote-border-thickness) solid var(--blockquote-border-color)',
      paddingLeft: '1em',
      color: 'var(--blockquote-color)',
      fontStyle: 'var(--blockquote-font-style)',
    },
  }, { dark: true })
}

interface Props {
  path: string
}

export function MarkdownEditor({ path }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorView | null>(null)
  const debouncedSaveRef = useRef<DebouncedFn<(p: string, content: string) => Promise<void>> | null>(null)
  const { fileContents, saveFile, selectFile } = useVaultStore()
  const content = useVaultStore(s => s.fileContents[path])
  const { updateCursor, updateCounts, setDirty } = useEditorStore()

  const countWords = (text: string) => {
    const trimmed = text.trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Create a fresh cancellable debounce for this file instance
    const debouncedSave = debounce(async (p: string, c: string) => {
      await saveFile(p, c)
      setDirty(p, false)
    }, 1000)
    debouncedSaveRef.current = debouncedSave

    const initialContent = fileContents[path] ?? ''

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        keymap.of([
          ...obsidianKeymap(
            () => window.dispatchEvent(new CustomEvent('open-command-palette')),
            () => window.dispatchEvent(new CustomEvent('open-quick-switcher')),
            () => window.dispatchEvent(new CustomEvent('new-note')),
          ),
          ...defaultKeymap,
          indentWithTab,
        ]),
        themeCompartment.of(createObsidianTheme()),
        EditorView.lineWrapping,
        wikilinksExtension(),
        highlightsExtension(),
        tasksExtension(),
        calloutsExtension(),
        headingsExtension(),
        EditorView.domEventHandlers({
          click(event) {
            const target = event.target as HTMLElement
            if (target.classList.contains('cm-wikilink')) {
              const href = target.dataset.href
              if (href) selectFile(href)
            }
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet) {
            const pos = update.state.selection.main.head
            const line = update.state.doc.lineAt(pos)
            updateCursor(line.number, pos - line.from + 1)
          }
          if (update.docChanged) {
            const text = update.state.doc.toString()
            updateCounts(countWords(text), text.length)
            setDirty(path, true)
            debouncedSaveRef.current?.(path, text)
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    editorRef.current = view
    currentEditorView = view

    // Initial counts
    updateCounts(countWords(initialContent), initialContent.length)

    return () => {
      debouncedSave.cancel()
      view.destroy()
      editorRef.current = null
      if (currentEditorView === view) currentEditorView = null
    }
  }, [path]) // Re-create editor when file changes

  // Update content when file changes externally (e.g. another tab saved)
  useEffect(() => {
    const view = editorRef.current
    if (!view) return
    const storeContent = content ?? ''
    const currentContent = view.state.doc.toString()
    if (currentContent !== storeContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: storeContent }
      })
    }
  }, [content])

  return <div ref={containerRef} className={styles.editor} />
}
