'use client'
import { List } from 'lucide-react'
import { useVaultStore } from '@/stores/vault'
import styles from './OutlinePanel.module.css'

interface HeadingEntry {
  level: number
  text: string
  lineNumber: number
}

function extractHeadings(content: string): HeadingEntry[] {
  const headings: HeadingEntry[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6}) (.+)/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineNumber: i + 1,
      })
    }
  }
  return headings
}

export function OutlinePanel() {
  const { activeFilePath, fileContents } = useVaultStore()

  if (!activeFilePath) {
    return <div className={styles.empty}>No file open</div>
  }

  const content = fileContents[activeFilePath] ?? ''
  const headings = extractHeadings(content)

  if (headings.length === 0) {
    return <div className={styles.empty}>No headings found</div>
  }

  const minLevel = Math.min(...headings.map(h => h.level))

  const handleClick = (heading: HeadingEntry) => {
    // Scroll the editor to the heading by dispatching a custom event
    window.dispatchEvent(new CustomEvent('outline-navigate', {
      detail: { lineNumber: heading.lineNumber }
    }))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <List size={14} strokeWidth={1.75} />
        <span>Outline</span>
      </div>
      <div className={styles.list}>
        {headings.map((h, i) => (
          <button
            key={i}
            className={styles.heading}
            style={{ paddingLeft: `${8 + (h.level - minLevel) * 12}px` }}
            onClick={() => handleClick(h)}
            title={h.text}
          >
            <span className={styles.level}>H{h.level}</span>
            <span className={styles.text}>{h.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
