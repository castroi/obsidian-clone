'use client'
import { useState, useEffect, useRef } from 'react'
import { fuzzyMatch, highlightMatch } from '@/lib/utils/fuzzyMatch'
import { useUIStore } from '@/stores/ui'
import { useEditorStore } from '@/stores/editor'
import { useVaultStore } from '@/stores/vault'
import styles from './CommandPalette.module.css'

export interface Command {
  id: string
  name: string
  shortcut?: string
  run: () => void
}

interface Props {
  onClose: () => void
}

export function CommandPalette({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Use getState() in run callbacks to always read current state, avoiding stale closures
  const commands: Command[] = [
    {
      id: 'toggle-theme',
      name: 'Toggle dark/light theme',
      run: () => useUIStore.getState().toggleTheme(),
    },
    {
      id: 'toggle-left-sidebar',
      name: 'Toggle left sidebar',
      shortcut: 'Ctrl+\\',
      run: () => {
        const { leftSidebarOpen, setLeftSidebarOpen } = useUIStore.getState()
        setLeftSidebarOpen(!leftSidebarOpen)
      },
    },
    {
      id: 'toggle-right-sidebar',
      name: 'Toggle right sidebar',
      run: () => {
        const { rightSidebarOpen, setRightSidebarOpen } = useUIStore.getState()
        setRightSidebarOpen(!rightSidebarOpen)
      },
    },
    {
      id: 'new-note',
      name: 'New note',
      shortcut: 'Ctrl+N',
      run: () => useVaultStore.getState().createNote('', 'Untitled').catch(console.error),
    },
    {
      id: 'mode-source',
      name: 'Switch to source mode',
      run: () => useEditorStore.getState().setMode('source'),
    },
    {
      id: 'mode-preview',
      name: 'Switch to live preview mode',
      run: () => useEditorStore.getState().setMode('preview'),
    },
    {
      id: 'mode-reading',
      name: 'Switch to reading mode',
      shortcut: 'Ctrl+E',
      run: () => useEditorStore.getState().setMode('reading'),
    },
    {
      id: 'open-files',
      name: 'Open: Files panel',
      run: () => useUIStore.getState().setActiveLeftPanel('files'),
    },
    {
      id: 'open-search',
      name: 'Open: Search panel',
      shortcut: 'Ctrl+Shift+F',
      run: () => useUIStore.getState().setActiveLeftPanel('search'),
    },
    {
      id: 'open-bookmarks',
      name: 'Open: Bookmarks panel',
      run: () => useUIStore.getState().setActiveLeftPanel('bookmarks'),
    },
    {
      id: 'open-tags',
      name: 'Open: Tags panel',
      run: () => useUIStore.getState().setActiveLeftPanel('tags'),
    },
    {
      id: 'open-backlinks',
      name: 'Open: Backlinks panel',
      run: () => useUIStore.getState().setActiveRightPanel('backlinks'),
    },
    {
      id: 'open-outline',
      name: 'Open: Outline panel',
      run: () => useUIStore.getState().setActiveRightPanel('outline'),
    },
    {
      id: 'open-graph',
      name: 'Open graph view',
      run: () => window.dispatchEvent(new CustomEvent('open-graph-view')),
    },
    {
      id: 'open-settings',
      name: 'Open settings',
      shortcut: 'Ctrl+,',
      run: () => window.dispatchEvent(new CustomEvent('open-settings')),
    },
  ]

  const filtered = query
    ? commands
        .map(cmd => ({ cmd, result: fuzzyMatch(query, cmd.name) }))
        .filter(({ result }) => result !== null)
        .sort((a, b) => b.result!.score - a.result!.score)
        .map(({ cmd, result }) => ({ cmd, indices: result!.indices }))
    : commands.map(cmd => ({ cmd, indices: [] }))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIdx]) {
        filtered[selectedIdx].cmd.run()
        onClose()
      }
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.palette}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Type a command…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div ref={listRef} className={styles.list}>
          {filtered.map(({ cmd, indices }, i) => (
            <button
              key={cmd.id}
              className={`${styles.item} ${i === selectedIdx ? styles.selected : ''}`}
              onMouseEnter={() => setSelectedIdx(i)}
              onMouseDown={e => {
                e.preventDefault()
                cmd.run()
                onClose()
              }}
            >
              <span className={styles.name}>{highlightMatch(cmd.name, indices)}</span>
              {cmd.shortcut && <span className={styles.shortcut}>{cmd.shortcut}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>No commands found</div>
          )}
        </div>
      </div>
    </div>
  )
}
