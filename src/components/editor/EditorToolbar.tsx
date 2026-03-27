'use client'
import {
  Bold, Italic, Strikethrough, Code, Link, Heading1,
  List, ListOrdered, CheckSquare, Quote, Minus, Eye, Edit3
} from 'lucide-react'
import { useEditorStore, EditorMode } from '@/stores/editor'
import {
  TableIcon, InsertRowIcon, InsertColumnIcon,
  DeleteRowIcon, DeleteColumnIcon, AlignLeftIcon,
  AlignCenterIcon, AlignRightIcon, SortAscIcon,
  SortDescIcon, TransposeIcon, MoveRowUpIcon,
  MoveRowDownIcon, MoveColumnLeftIcon, MoveColumnRightIcon
} from './icons/table-icons'
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

  const tableTools: ToolbarAction[] = [
    { icon: <TableIcon size={15} />, label: 'Insert table', action: 'table-insert' },
    { icon: <InsertRowIcon size={15} />, label: 'Insert row below', action: 'table-insert-row' },
    { icon: <DeleteRowIcon size={15} />, label: 'Delete row', action: 'table-delete-row' },
    { icon: <InsertColumnIcon size={15} />, label: 'Insert column right', action: 'table-insert-col' },
    { icon: <DeleteColumnIcon size={15} />, label: 'Delete column', action: 'table-delete-col' },
    { icon: <MoveRowUpIcon size={15} />, label: 'Move row up', action: 'table-move-row-up' },
    { icon: <MoveRowDownIcon size={15} />, label: 'Move row down', action: 'table-move-row-down' },
    { icon: <MoveColumnLeftIcon size={15} />, label: 'Move column left', action: 'table-move-col-left' },
    { icon: <MoveColumnRightIcon size={15} />, label: 'Move column right', action: 'table-move-col-right' },
    { icon: <AlignLeftIcon size={15} />, label: 'Align left', action: 'table-align-left' },
    { icon: <AlignCenterIcon size={15} />, label: 'Align center', action: 'table-align-center' },
    { icon: <AlignRightIcon size={15} />, label: 'Align right', action: 'table-align-right' },
    { icon: <SortAscIcon size={15} />, label: 'Sort ascending', action: 'table-sort-asc' },
    { icon: <SortDescIcon size={15} />, label: 'Sort descending', action: 'table-sort-desc' },
    { icon: <TransposeIcon size={15} />, label: 'Transpose table', action: 'table-transpose' },
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
        <div className={styles.separator} />
        {tableTools.map((tool) => (
          <button
            key={tool.action}
            className={styles.toolBtn}
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(e) => {
              e.preventDefault()
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
