'use client'
import { useRef, useCallback, useEffect } from 'react'
import styles from './ResizablePanel.module.css'

interface Props {
  side: 'left' | 'right'
  width: number
  onResize: (width: number) => void
  open: boolean
  children: React.ReactNode
}

export function ResizablePanel({ side, width, onResize, open, children }: Props) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const delta = side === 'left'
      ? e.clientX - startX.current
      : startX.current - e.clientX
    onResize(startWidth.current + delta)
  }, [side, onResize])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  if (!open) return null

  return (
    <div
      className={`${styles.panel} ${styles[side]}`}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      <div className={styles.content}>{children}</div>
      <div
        className={`${styles.divider} ${styles[`divider-${side}`]}`}
        onMouseDown={onDividerMouseDown}
      />
    </div>
  )
}
