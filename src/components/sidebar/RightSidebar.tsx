'use client'
import { Link, List, FileText } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { BacklinksPanel } from './BacklinksPanel'
import { OutlinePanel } from './OutlinePanel'
import { PropertiesPanel } from './PropertiesPanel'
import styles from './Sidebar.module.css'

const panels = [
  { id: 'backlinks', icon: Link, label: 'Backlinks' },
  { id: 'outline', icon: List, label: 'Outline' },
  { id: 'properties', icon: FileText, label: 'Properties' },
] as const

export function RightSidebar() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore()

  const renderPanel = () => {
    switch (activeRightPanel) {
      case 'backlinks': return <BacklinksPanel />
      case 'outline':   return <OutlinePanel />
      case 'properties': return <PropertiesPanel />
      default:
        return (
          <div className={styles.placeholder}>
            {panels.find(p => p.id === activeRightPanel)?.label} — coming soon
          </div>
        )
    }
  }

  return (
    <div className={`${styles.sidebar} ${styles.right}`}>
      <div className={styles.tabs}>
        {panels.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeRightPanel === id ? styles.activeTab : ''}`}
            title={label}
            aria-label={label}
            onClick={() => setActiveRightPanel(id)}
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
