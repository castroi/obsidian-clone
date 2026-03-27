'use client'
import { FileText, Search, Bookmark, GitBranch, Settings, HelpCircle, PanelLeft } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import styles from './Ribbon.module.css'

const topIcons = [
  { icon: PanelLeft, id: 'toggle-left', label: 'Toggle left sidebar' },
  { icon: FileText, id: 'files', label: 'Files', panel: 'files' as const },
  { icon: Search, id: 'search', label: 'Search', panel: 'search' as const },
  { icon: Bookmark, id: 'bookmarks', label: 'Bookmarks', panel: 'bookmarks' as const },
  { icon: GitBranch, id: 'graph', label: 'Graph view' },
]

export function Ribbon() {
  const { activeLeftPanel, setActiveLeftPanel, leftSidebarOpen, setLeftSidebarOpen } = useUIStore()

  const handleClick = (id: string, panel?: string) => {
    if (id === 'toggle-left') {
      setLeftSidebarOpen(!leftSidebarOpen)
      return
    }
    if (id === 'graph') {
      window.dispatchEvent(new CustomEvent('open-graph-view'))
      return
    }
    if (panel) {
      if (activeLeftPanel === panel && leftSidebarOpen) {
        setLeftSidebarOpen(false)
      } else {
        setActiveLeftPanel(panel as 'files' | 'search' | 'bookmarks' | 'tags')
      }
    }
  }

  return (
    <div className={styles.ribbon}>
      <div className={styles.top}>
        {topIcons.map(({ icon: Icon, id, label, panel }) => (
          <button
            key={id}
            className={`${styles.iconBtn} ${panel && activeLeftPanel === panel && leftSidebarOpen ? styles.active : ''}`}
            title={label}
            aria-label={label}
            onClick={() => handleClick(id, panel)}
          >
            <Icon size={18} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <div className={styles.bottom}>
        <button className={styles.iconBtn} title="Help" aria-label="Help">
          <HelpCircle size={18} strokeWidth={1.75} />
        </button>
        <button
          className={styles.iconBtn}
          title="Settings"
          aria-label="Settings"
          onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
        >
          <Settings size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
