'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVaultStore } from '@/stores/vault'
import { fuzzyMatch, highlightMatch } from '@/lib/utils/fuzzyMatch'
import type { VaultFile } from '@/lib/fs/fileSystem'
import styles from './QuickSwitcher.module.css'

interface Props {
  onClose: () => void
}

export function QuickSwitcher({ onClose }: Props) {
  const allFiles = useVaultStore(s => s.allFiles)
  const selectFile = useVaultStore(s => s.selectFile)
  const activeFilePath = useVaultStore(s => s.activeFilePath)

  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Build scored results — memoized so fuzzy matching only runs when inputs change
  const results = useMemo(() => {
    const mdFiles = allFiles.filter(f => f.name.endsWith('.md'))
    if (!query) {
      return mdFiles
        .slice()
        .sort((a, b) => {
          if (a.path === activeFilePath) return -1
          if (b.path === activeFilePath) return 1
          return b.lastModified - a.lastModified
        })
        .slice(0, 20)
        .map(f => ({ file: f, indices: [] as number[] }))
    }
    return mdFiles
      .map(f => {
        const r = fuzzyMatch(query, f.name)
        if (!r) return null
        return { file: f, indices: r.indices, score: r.score }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score ?? 0) - (a!.score ?? 0))
      .slice(0, 20) as { file: VaultFile; indices: number[]; score: number }[]
  }, [allFiles, query, activeFilePath])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const openFile = useCallback((path: string) => {
    selectFile(path)
    onClose()
  }, [selectFile, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIdx]) openFile(results[selectedIdx].file.path)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Find or create a note..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {results.length > 0 ? (
          <ul ref={listRef} className={styles.list}>
            {results.map((r, i) => (
              <li
                key={r.file.path}
                className={`${styles.item} ${i === selectedIdx ? styles.selected : ''}`}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => openFile(r.file.path)}
              >
                <span className={styles.name}>
                  {query ? highlightMatch(r.file.name, r.indices) : r.file.name}
                </span>
                <span className={styles.path}>
                  {r.file.path.includes('/') ? r.file.path.split('/').slice(0, -1).join('/') : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            {query ? `No files matching "${query}"` : 'No files in vault'}
          </div>
        )}
      </div>
    </div>
  )
}
