'use client'
import { X, Plus } from 'lucide-react'
import styles from './TabBar.module.css'

interface Tab {
  path: string
  title: string
  dirty?: boolean
}

interface Props {
  tabs: Tab[]
  activeTab: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onNew: () => void
}

export function TabBar({ tabs, activeTab, onSelect, onClose, onNew }: Props) {
  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={`${styles.tab} ${activeTab === tab.path ? styles.active : ''}`}
            onClick={() => onSelect(tab.path)}
          >
            <span className={styles.title}>
              {tab.dirty && <span className={styles.dirty}>●</span>}
              {tab.title.replace(/\.md$/, '')}
            </span>
            <button
              className={styles.close}
              onClick={(e) => { e.stopPropagation(); onClose(tab.path) }}
              aria-label="Close tab"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button className={styles.newTab} onClick={onNew} aria-label="New tab">
        <Plus size={16} strokeWidth={1.75} />
      </button>
    </div>
  )
}
