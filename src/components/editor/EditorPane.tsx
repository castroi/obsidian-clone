'use client'
import { useEditorStore } from '@/stores/editor'
import { useVaultStore } from '@/stores/vault'
import { MarkdownEditor, getEditorView } from './MarkdownEditor'
import { EditorToolbar } from './EditorToolbar'
import { ReadingView } from './ReadingView'
import { applyFormatting } from '@/lib/editor/formatting'
import styles from './EditorPane.module.css'

interface Props {
  path: string
}

export function EditorPane({ path }: Props) {
  const { mode } = useEditorStore()
  const { fileContents, selectFile } = useVaultStore()
  const title = path.split('/').pop()?.replace(/\.md$/, '') ?? ''
  const content = fileContents[path] ?? ''

  const handleToolbarAction = (action: string) => {
    const view = getEditorView()
    if (view) applyFormatting(view, action)
  }

  const handleNavigate = (href: string) => {
    // Find file by name and navigate to it
    selectFile(href.endsWith('.md') ? href : `${href}.md`)
  }

  return (
    <div className={styles.pane}>
      <EditorToolbar onAction={handleToolbarAction} />
      {mode === 'reading' ? (
        <ReadingView content={content} onNavigate={handleNavigate} />
      ) : (
        <>
          <div className={styles.inlineTitle}>{title}</div>
          <MarkdownEditor path={path} />
        </>
      )}
    </div>
  )
}
