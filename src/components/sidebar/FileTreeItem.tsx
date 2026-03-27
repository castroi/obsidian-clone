'use client'
import { useState, useRef } from 'react'
import { ChevronRight, Folder, FolderOpen, FileText, FilePlus, FolderPlus, Pencil, Trash2, Copy } from 'lucide-react'
import type { VaultEntry, VaultFile, VaultFolder } from '@/lib/fs/fileSystem'
import { useVaultStore } from '@/stores/vault'
import { ContextMenu } from '../ui/ContextMenu'
import styles from './FileTreeItem.module.css'

interface Props {
  entry: VaultEntry
  depth: number
  activeFilePath: string | null
}

export function FileTreeItem({ entry, depth, activeFilePath }: Props) {
  const [expanded, setExpanded] = useState(depth === 0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { selectFile, createNote, deleteNote, renameNote, createFolder, deleteFolder } = useVaultStore()

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const startRename = () => {
    setNewName(entry.name.replace(/\.md$/, ''))
    setRenaming(true)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  const commitRename = async () => {
    if (!newName.trim() || newName === entry.name.replace(/\.md$/, '')) {
      setRenaming(false)
      return
    }
    const dir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') : ''
    if (entry.isFile) {
      const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`
      await renameNote(entry.path, newPath)
    }
    setRenaming(false)
  }

  const contextItems = entry.isFile
    ? [
        { label: 'New note', icon: <FilePlus size={14} />, onClick: () => createNote(entry.path.split('/').slice(0, -1).join('/'), 'Untitled') },
        { separator: true as const },
        { label: 'Rename', icon: <Pencil size={14} />, onClick: startRename },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteNote(entry.path), danger: true },
        { separator: true as const },
        { label: 'Copy path', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(entry.path) },
      ]
    : [
        { label: 'New note', icon: <FilePlus size={14} />, onClick: () => createNote(entry.path, 'Untitled') },
        { label: 'New folder', icon: <FolderPlus size={14} />, onClick: () => createFolder(`${entry.path}/New Folder`) },
        { separator: true as const },
        { label: 'Rename', icon: <Pencil size={14} />, onClick: startRename },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteFolder(entry.path), danger: true },
        { separator: true as const },
        { label: 'Copy path', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(entry.path) },
      ]

  const indentStyle = { paddingLeft: `${8 + depth * 16}px` }
  const isActive = entry.isFile && activeFilePath === entry.path

  if (entry.isFile) {
    const file = entry as VaultFile
    return (
      <>
        <div
          className={`${styles.item} ${isActive ? styles.active : ''}`}
          style={indentStyle}
          onClick={() => selectFile(file.path)}
          onContextMenu={handleContextMenu}
          title={file.path}
        >
          <FileText size={14} strokeWidth={1.75} className={styles.fileIcon} />
          {renaming ? (
            <input
              ref={inputRef}
              className={styles.renameInput}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className={styles.name}>{file.name.replace(/\.md$/, '')}</span>
          )}
        </div>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextItems}
            onClose={() => setContextMenu(null)}
          />
        )}
      </>
    )
  }

  const folder = entry as VaultFolder
  return (
    <>
      <div
        className={`${styles.item} ${styles.folder}`}
        style={indentStyle}
        onClick={() => setExpanded(e => !e)}
        onContextMenu={handleContextMenu}
        title={folder.path}
      >
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
        />
        {expanded
          ? <FolderOpen size={14} strokeWidth={1.75} className={styles.folderIcon} />
          : <Folder size={14} strokeWidth={1.75} className={styles.folderIcon} />
        }
        {renaming ? (
          <input
            ref={inputRef}
            className={styles.renameInput}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className={styles.name}>{folder.name}</span>
        )}
      </div>
      {expanded && folder.children.map(child => (
        <FileTreeItem
          key={child.path}
          entry={child}
          depth={depth + 1}
          activeFilePath={activeFilePath}
        />
      ))}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
