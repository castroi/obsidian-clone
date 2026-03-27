'use client'
import { FileText, Search, Bookmark, Tag } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { FileExplorer } from './FileExplorer'
import { SearchPanel } from './SearchPanel'
import { TagsPanel } from './TagsPanel'
import styles from './Sidebar.module.css'

const panels = [
  { id: 'files', icon: FileText, label: 'Files' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { id: 'tags', icon: Tag, label: 'Tags' },
] as const

export function LeftSidebar() {
  const { activeLeftPanel, setActiveLeftPanel } = useUIStore()

  const renderPanel = () => {
    switch (activeLeftPanel) {
      case 'files':
        return <FileExplorer />
      case 'search':
        return <SearchPanel />
      case 'tags':
        return <TagsPanel />
      default:
        return (
          <div className={styles.placeholder}>
            {panels.find(p => p.id === activeLeftPanel)?.label} — coming soon
          </div>
        )
    }
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.tabs}>
        {panels.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeLeftPanel === id ? styles.activeTab : ''}`}
            title={label}
            aria-label={label}
            onClick={() => setActiveLeftPanel(id)}
          >
            <Icon size={16} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {renderPanel()}
      </div>
    </div>
  )
}
