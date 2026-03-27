'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { Toggle } from '../ui/Toggle'
import styles from './SettingsModal.module.css'

type Category = 'appearance' | 'editor' | 'files'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [category, setCategory] = useState<Category>('appearance')
  const { theme, setTheme } = useUIStore()

  // Editor settings (persisted in localStorage)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof localStorage === 'undefined') return 16
    return Number(localStorage.getItem('setting-font-size') ?? 16)
  })
  const [lineWidth, setLineWidth] = useState(() => {
    if (typeof localStorage === 'undefined') return 700
    return Number(localStorage.getItem('setting-line-width') ?? 700)
  })
  const [spellcheck, setSpellcheck] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('setting-spellcheck') === 'true'
  })
  const [lineNumbers, setLineNumbers] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('setting-line-numbers') === 'true'
  })

  // Apply CSS variable changes immediately
  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`)
    localStorage.setItem('setting-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--file-line-width', `${lineWidth}px`)
    localStorage.setItem('setting-line-width', String(lineWidth))
  }, [lineWidth])

  useEffect(() => {
    localStorage.setItem('setting-spellcheck', String(spellcheck))
  }, [spellcheck])

  useEffect(() => {
    localStorage.setItem('setting-line-numbers', String(lineNumbers))
  }, [lineNumbers])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const categories: { id: Category; label: string }[] = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'editor', label: 'Editor' },
    { id: 'files', label: 'Files & Links' },
  ]

  const renderContent = () => {
    switch (category) {
      case 'appearance':
        return (
          <div className={styles.content}>
            <h3 className={styles.sectionTitle}>Theme</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Base theme</div>
                <div className={styles.settingDesc}>Choose between dark and light interface</div>
              </div>
              <div className={styles.themeButtons}>
                <button
                  className={`${styles.themeBtn} ${theme === 'dark' ? styles.activeTheme : ''}`}
                  onClick={() => setTheme('dark')}
                >Dark</button>
                <button
                  className={`${styles.themeBtn} ${theme === 'light' ? styles.activeTheme : ''}`}
                  onClick={() => setTheme('light')}
                >Light</button>
              </div>
            </div>
            <h3 className={styles.sectionTitle}>Accent color</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Accent color</div>
                <div className={styles.settingDesc}>Color used for links, active states, and highlights</div>
              </div>
              <input
                type="color"
                defaultValue="#7c3aed"
                onChange={e => document.documentElement.style.setProperty('--interactive-accent', e.target.value)}
                className={styles.colorPicker}
              />
            </div>
          </div>
        )
      case 'editor':
        return (
          <div className={styles.content}>
            <h3 className={styles.sectionTitle}>Display</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Font size</div>
                <div className={styles.settingDesc}>Base font size for the editor ({fontSize}px)</div>
              </div>
              <input
                type="range" min={12} max={24} value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Readable line length</div>
                <div className={styles.settingDesc}>Limit line width to improve readability ({lineWidth}px)</div>
              </div>
              <input
                type="range" min={400} max={1200} step={50} value={lineWidth}
                onChange={e => setLineWidth(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Spell check</div>
                <div className={styles.settingDesc}>Underline misspelled words in the editor</div>
              </div>
              <Toggle checked={spellcheck} onChange={setSpellcheck} />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Show line numbers</div>
                <div className={styles.settingDesc}>Display line numbers in the editor gutter</div>
              </div>
              <Toggle checked={lineNumbers} onChange={setLineNumbers} />
            </div>
          </div>
        )
      case 'files':
        return (
          <div className={styles.content}>
            <h3 className={styles.sectionTitle}>Files</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Default location for new notes</div>
                <div className={styles.settingDesc}>Where newly created notes are placed</div>
              </div>
              <select className={styles.select}>
                <option>Vault folder</option>
                <option>Same folder as current file</option>
              </select>
            </div>
            <h3 className={styles.sectionTitle}>Links</h3>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Use [[Wikilinks]]</div>
                <div className={styles.settingDesc}>Use Obsidian-style wikilinks for internal links</div>
              </div>
              <Toggle checked={true} onChange={() => {}} />
            </div>
          </div>
        )
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className={styles.body}>
          <nav className={styles.nav}>
            {categories.map(c => (
              <button
                key={c.id}
                className={`${styles.navItem} ${category === c.id ? styles.activeNav : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </nav>
          <div className={styles.panel}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
