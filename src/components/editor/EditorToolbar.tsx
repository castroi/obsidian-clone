'use client'
import {
  Bold, Italic, Strikethrough, Code, Link, Heading1,
  List, ListOrdered, CheckSquare, Quote, Minus, Eye, Edit3
} from 'lucide-react'
import { useEditorStore, EditorMode } from '@/stores/editor'
import styles from './EditorToolbar.module.css'

interface ToolbarAction {
  icon: React.ReactNode
  label: string
  action: string
}

interface Props {
  onAction: (action: string) => void
}

export function EditorToolbar({ onAction }: Props) {
  const { mode, setMode } = useEditorStore()

  const tools: ToolbarAction[] = [
    { icon: <Bold size={15} strokeWidth={2} />, label: 'Bold (Ctrl+B)', action: 'bold' },
    { icon: <Italic size={15} strokeWidth={2} />, label: 'Italic (Ctrl+I)', action: 'italic' },
    { icon: <Strikethrough size={15} strokeWidth={2} />, label: 'Strikethrough', action: 'strikethrough' },
    { icon: <Code size={15} strokeWidth={2} />, label: 'Inline code', action: 'code' },
    { icon: <Link size={15} strokeWidth={2} />, label: 'Link (Ctrl+K)', action: 'link' },
    { icon: <Heading1 size={15} strokeWidth={2} />, label: 'Heading', action: 'heading' },
    { icon: <List size={15} strokeWidth={2} />, label: 'Bullet list', action: 'bullet' },
    { icon: <ListOrdered size={15} strokeWidth={2} />, label: 'Numbered list', action: 'ordered' },
    { icon: <CheckSquare size={15} strokeWidth={2} />, label: 'Checklist', action: 'checklist' },
    { icon: <Quote size={15} strokeWidth={2} />, label: 'Blockquote', action: 'quote' },
    { icon: <Minus size={15} strokeWidth={2} />, label: 'Horizontal rule', action: 'hr' },
  ]

  const modes: { id: EditorMode; label: string; icon: React.ReactNode }[] = [
    { id: 'source', label: 'Source', icon: <Edit3 size={13} strokeWidth={2} /> },
    { id: 'preview', label: 'Live Preview', icon: <Edit3 size={13} strokeWidth={2} /> },
    { id: 'reading', label: 'Reading', icon: <Eye size={13} strokeWidth={2} /> },
  ]

  return (
    <div className={styles.toolbar}>
      <div className={styles.tools}>
        {tools.map((tool) => (
          <button
            key={tool.action}
            className={styles.toolBtn}
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(e) => {
              e.preventDefault() // Don't blur editor
              onAction(tool.action)
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <div className={styles.modes}>
        {modes.map((m) => (
          <button
            key={m.id}
            className={`${styles.modeBtn} ${mode === m.id ? styles.activeMode : ''}`}
            onClick={() => setMode(m.id)}
            title={m.label}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
