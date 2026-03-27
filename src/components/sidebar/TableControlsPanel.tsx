'use client'
import React from 'react'
import {
  TableIcon, InsertRowIcon, InsertColumnIcon,
  DeleteRowIcon, DeleteColumnIcon, AlignLeftIcon,
  AlignCenterIcon, AlignRightIcon, SortAscIcon,
  SortDescIcon, TransposeIcon, MoveRowUpIcon,
  MoveRowDownIcon, MoveColumnLeftIcon, MoveColumnRightIcon
} from '@/components/editor/icons/table-icons'
import { getEditorView } from '@/components/editor/MarkdownEditor'
import { applyFormatting } from '@/lib/editor/formatting'
import styles from './TableControlsPanel.module.css'

interface ButtonDef {
  icon: React.ReactNode
  label: string
  action: string
}

const groups: { title: string; buttons: ButtonDef[] }[] = [
  {
    title: 'Create',
    buttons: [
      { icon: <TableIcon size={18} />, label: 'Insert table', action: 'table-insert' },
    ],
  },
  {
    title: 'Alignment',
    buttons: [
      { icon: <AlignLeftIcon size={18} />, label: 'Align left', action: 'table-align-left' },
      { icon: <AlignCenterIcon size={18} />, label: 'Align center', action: 'table-align-center' },
      { icon: <AlignRightIcon size={18} />, label: 'Align right', action: 'table-align-right' },
    ],
  },
  {
    title: 'Move',
    buttons: [
      { icon: <MoveRowUpIcon size={18} />, label: 'Move row up', action: 'table-move-row-up' },
      { icon: <MoveRowDownIcon size={18} />, label: 'Move row down', action: 'table-move-row-down' },
      { icon: <MoveColumnLeftIcon size={18} />, label: 'Move column left', action: 'table-move-col-left' },
      { icon: <MoveColumnRightIcon size={18} />, label: 'Move column right', action: 'table-move-col-right' },
      { icon: <TransposeIcon size={18} />, label: 'Transpose', action: 'table-transpose' },
    ],
  },
  {
    title: 'Edit',
    buttons: [
      { icon: <InsertRowIcon size={18} />, label: 'Insert row', action: 'table-insert-row' },
      { icon: <InsertColumnIcon size={18} />, label: 'Insert column', action: 'table-insert-col' },
      { icon: <DeleteRowIcon size={18} />, label: 'Delete row', action: 'table-delete-row' },
      { icon: <DeleteColumnIcon size={18} />, label: 'Delete column', action: 'table-delete-col' },
    ],
  },
  {
    title: 'Sort',
    buttons: [
      { icon: <SortAscIcon size={18} />, label: 'Sort ascending', action: 'table-sort-asc' },
      { icon: <SortDescIcon size={18} />, label: 'Sort descending', action: 'table-sort-desc' },
    ],
  },
]

export function TableControlsPanel() {
  const handleAction = (action: string) => {
    const view = getEditorView()
    if (view) applyFormatting(view, action)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <TableIcon size={16} />
        <span>Table Controls</span>
      </div>
      {groups.map((group) => (
        <div key={group.title} className={styles.group}>
          <div className={styles.groupTitle}>{group.title}</div>
          <div className={styles.buttons}>
            {group.buttons.map((btn) => (
              <button
                key={btn.action}
                className={styles.controlBtn}
                title={btn.label}
                aria-label={btn.label}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleAction(btn.action)
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
