'use client'
import { useEffect, useRef } from 'react'
import styles from './ContextMenu.module.css'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  separator?: never
}

export interface ContextMenuSeparator {
  separator: true
  label?: never
  icon?: never
  onClick?: never
  danger?: never
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

interface Props {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position to stay in viewport
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 30 - 20),
  }

  return (
    <div ref={menuRef} className={styles.menu} style={style} role="menu">
      {items.map((item, i) =>
        'separator' in item && item.separator ? (
          <div key={i} className={styles.separator} />
        ) : (
          <button
            key={i}
            className={`${styles.item} ${(item as ContextMenuItem).danger ? styles.danger : ''}`}
            role="menuitem"
            onClick={() => {
              (item as ContextMenuItem).onClick()
              onClose()
            }}
          >
            {(item as ContextMenuItem).icon && (
              <span className={styles.icon}>{(item as ContextMenuItem).icon}</span>
            )}
            {(item as ContextMenuItem).label}
          </button>
        )
      )}
    </div>
  )
}
