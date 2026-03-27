'use client'
import { FilePlus, FolderPlus, ChevronsDownUp, FolderOpen } from 'lucide-react'
import { useVaultStore } from '@/stores/vault'
import { FileTreeItem } from './FileTreeItem'
import styles from './FileExplorer.module.css'

export function FileExplorer() {
  const { tree, activeFilePath, openVault, createNote, createFolder, isLoading, error } = useVaultStore()

  const handleNewNote = async () => {
    await createNote('', 'Untitled')
  }

  if (!tree) {
    return (
      <div className={styles.emptyVault}>
        <FolderOpen size={32} strokeWidth={1} className={styles.emptyIcon} />
        <p className={styles.emptyText}>No vault open</p>
        <button className={styles.openBtn} onClick={openVault} disabled={isLoading}>
          {isLoading ? 'Opening\u2026' : 'Open folder'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    )
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.header}>
        <span className={styles.vaultName}>{tree.name}</span>
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            title="New note"
            aria-label="New note"
            onClick={handleNewNote}
          >
            <FilePlus size={16} strokeWidth={1.75} />
          </button>
          <button
            className={styles.actionBtn}
            title="New folder"
            aria-label="New folder"
            onClick={() => createFolder('Untitled Folder').catch(console.error)}
          >
            <FolderPlus size={16} strokeWidth={1.75} />
          </button>
          <button
            className={styles.actionBtn}
            title="Collapse all"
            aria-label="Collapse all"
          >
            <ChevronsDownUp size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className={styles.tree}>
        {tree.children.map(entry => (
          <FileTreeItem
            key={entry.path}
            entry={entry}
            depth={0}
            activeFilePath={activeFilePath}
          />
        ))}
        {tree.children.length === 0 && (
          <p className={styles.emptyDir}>No files yet. Create a note!</p>
        )}
      </div>
    </div>
  )
}
