'use client'
import { useEffect } from 'react'
import { Link, List, FileText } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { BacklinksPanel } from './BacklinksPanel'
import { OutlinePanel } from './OutlinePanel'
import { PropertiesPanel } from './PropertiesPanel'
import { TableControlsPanel } from './TableControlsPanel'
import { TableIcon } from '@/components/editor/icons/table-icons'
import styles from './Sidebar.module.css'

const panels = [
  { id: 'backlinks', icon: Link, label: 'Backlinks', isLucide: true },
  { id: 'outline', icon: List, label: 'Outline', isLucide: true },
  { id: 'properties', icon: FileText, label: 'Properties', isLucide: true },
  { id: 'table-controls', icon: TableIcon, label: 'Table Controls', isLucide: false },
] as const

export function RightSidebar() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore()

  useEffect(() => {
    const handler = () => {
      setActiveRightPanel('table-controls')
    }
    window.addEventListener('toggle-table-controls', handler)
    return () => window.removeEventListener('toggle-table-controls', handler)
  }, [setActiveRightPanel])

  const renderPanel = () => {
    switch (activeRightPanel) {
      case 'backlinks': return <BacklinksPanel />
      case 'outline':   return <OutlinePanel />
      case 'properties': return <PropertiesPanel />
      case 'table-controls': return <TableControlsPanel />
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
        {panels.map(({ id, icon: Icon, label, isLucide }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeRightPanel === id ? styles.activeTab : ''}`}
            title={label}
            aria-label={label}
            onClick={() => setActiveRightPanel(id)}
          >
            {isLucide
              ? <Icon size={16} strokeWidth={1.75} />
              : <Icon size={16} />
            }
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {renderPanel()}
      </div>
    </div>
  )
}
