'use client'
import { Files, Search, Bookmark, GitBranch, PanelLeft } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import styles from './BottomNav.module.css'

export function BottomNav() {
  const { activeLeftPanel, setActiveLeftPanel, leftSidebarOpen, setLeftSidebarOpen } = useUIStore()

  const items = [
    { id: 'files' as const, icon: Files, label: 'Files' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'bookmarks' as const, icon: Bookmark, label: 'Bookmarks' },
    { id: 'tags' as const, icon: PanelLeft, label: 'Tags' },
  ]

  const handleItem = (id: typeof items[number]['id']) => {
    if (activeLeftPanel === id && leftSidebarOpen) {
      setLeftSidebarOpen(false)
    } else {
      setActiveLeftPanel(id)
      setLeftSidebarOpen(true)
    }
  }

  return (
    <nav className={`${styles.bottomNav} bottom-nav`}>
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`${styles.item} ${activeLeftPanel === id && leftSidebarOpen ? styles.active : ''}`}
          onClick={() => handleItem(id)}
          aria-label={label}
        >
          <Icon size={22} />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
      <button
        className={styles.item}
        onClick={() => window.dispatchEvent(new CustomEvent('open-graph-view'))}
        aria-label="Graph"
      >
        <GitBranch size={22} />
        <span className={styles.label}>Graph</span>
      </button>
    </nav>
  )
}
