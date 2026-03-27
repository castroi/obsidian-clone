'use client'
import { Link } from 'lucide-react'
import { useIndexStore } from '@/stores/index'
import { useVaultStore } from '@/stores/vault'
import styles from './BacklinksPanel.module.css'

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function BacklinksPanel() {
  const { activeFilePath, fileContents, selectFile } = useVaultStore()
  const { getBacklinks } = useIndexStore()

  if (!activeFilePath) {
    return <div className={styles.empty}>No file open</div>
  }

  const backlinkPaths = getBacklinks(activeFilePath)
  const activeFileName = activeFilePath.split('/').pop()?.replace(/\.md$/, '') ?? ''

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Link size={14} strokeWidth={1.75} />
        <span>Linked mentions</span>
        <span className={styles.count}>{backlinkPaths.length}</span>
      </div>

      {backlinkPaths.length === 0 ? (
        <div className={styles.empty}>No backlinks found</div>
      ) : (
        <div className={styles.list}>
          {backlinkPaths.map(path => {
            const content = fileContents[path] ?? ''
            const fileName = path.split('/').pop()?.replace(/\.md$/, '') ?? path
            // Find lines containing a link to the active file
            const lines = content.split('\n')
            const matchingLines = lines.filter(line =>
              line.toLowerCase().includes(`[[${activeFileName.toLowerCase()}`)
            ).slice(0, 3)

            return (
              <div key={path} className={styles.backlinkFile}>
                <button
                  className={styles.fileName}
                  onClick={() => selectFile(path)}
                  title={path}
                >
                  {fileName}
                </button>
                {matchingLines.map((line, i) => (
                  <div key={i} className={styles.context}>
                    {highlightMatch(line.trim(), `[[${activeFileName}`)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
