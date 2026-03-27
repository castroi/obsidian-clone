'use client'
import { useEffect, useState, useRef } from 'react'
import { markdownToHtml } from '@/lib/markdown/parser'
import styles from './ReadingView.module.css'

interface Props {
  content: string
  onNavigate?: (href: string) => void
}

export function ReadingView({ content, onNavigate }: Props) {
  const [html, setHtml] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    markdownToHtml(content).then(setHtml)
  }, [content])

  // Handle internal link clicks
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      if (target.classList.contains('internal-link')) {
        e.preventDefault()
        const href = target.dataset.href
        if (href && onNavigate) onNavigate(href)
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [html, onNavigate])

  return (
    <div className={styles.readingView}>
      <div
        ref={containerRef}
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
