'use client'
import { useState, useCallback } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { useVaultStore } from '@/stores/vault'
import { parseFrontmatter, updateFrontmatterField } from '@/lib/markdown/frontmatter'
import styles from './PropertiesPanel.module.css'

export function PropertiesPanel() {
  const { activeFilePath, fileContents, saveFile } = useVaultStore()
  const [collapsed, setCollapsed] = useState(false)

  if (!activeFilePath) {
    return <div className={styles.empty}>No file open</div>
  }

  const content = fileContents[activeFilePath] ?? ''
  const { data } = parseFrontmatter(content)
  const fields = Object.entries(data)

  const updateField = useCallback(
    async (key: string, value: unknown) => {
      const updated = updateFrontmatterField(content, key, value)
      await saveFile(activeFilePath, updated)
    },
    [content, activeFilePath, saveFile],
  )

  const addField = useCallback(async () => {
    const key = prompt('Property name:')
    if (!key?.trim()) return
    await updateField(key.trim(), '')
  }, [updateField])

  const renderValue = (key: string, value: unknown) => {
    if (typeof value === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={e => updateField(key, e.target.checked)}
          className={styles.checkbox}
        />
      )
    }
    if (Array.isArray(value)) {
      return (
        <input
          className={styles.valueInput}
          defaultValue={value.join(', ')}
          onBlur={e =>
            updateField(
              key,
              e.target.value
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="value1, value2"
        />
      )
    }
    return (
      <input
        className={styles.valueInput}
        defaultValue={String(value ?? '')}
        onBlur={e => updateField(key, e.target.value)}
        placeholder="(empty)"
      />
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header} onClick={() => setCollapsed(c => !c)}>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`${styles.chevron} ${collapsed ? styles.collapsed : ''}`}
        />
        <span className={styles.headerTitle}>Properties</span>
        <span className={styles.count}>{fields.length}</span>
      </div>

      {!collapsed && (
        <>
          <div className={styles.fields}>
            {fields.length === 0 ? (
              <div className={styles.noFields}>No properties</div>
            ) : (
              fields.map(([key, value]) => (
                <div key={key} className={styles.field}>
                  <span className={styles.key} title={key}>
                    {key}
                  </span>
                  <div className={styles.valueWrapper}>
                    {renderValue(key, value)}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => updateField(key, null)}
                      title={`Remove ${key}`}
                      aria-label={`Remove ${key}`}
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className={styles.addBtn} onClick={addField}>
            <Plus size={14} strokeWidth={2} />
            Add property
          </button>
        </>
      )}
    </div>
  )
}
