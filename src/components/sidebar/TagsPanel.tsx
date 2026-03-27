'use client'
import { useState } from 'react'
import { ChevronRight, Tag } from 'lucide-react'
import { useIndexStore } from '@/stores/index'
import { useVaultStore } from '@/stores/vault'
import styles from './TagsPanel.module.css'

interface TagNode {
  name: string
  fullPath: string
  count: number
  children: TagNode[]
}

function buildTagTree(allTags: string[], tags: Map<string, string[]>): TagNode[] {
  const root: TagNode[] = []

  for (const tag of allTags) {
    const parts = tag.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const partPath = parts.slice(0, i + 1).join('/')
      let node = current.find(n => n.name === parts[i])
      if (!node) {
        node = {
          name: parts[i],
          fullPath: partPath,
          count: tags.get(partPath)?.length ?? 0,
          children: [],
        }
        current.push(node)
      }
      current = node.children
    }
  }

  return root
}

function TagNodeItem({
  node,
  depth,
  onSelect,
}: {
  node: TagNode
  depth: number
  onSelect: (tag: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={styles.tagItem}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(e => !e)
          onSelect(node.fullPath)
        }}
      >
        {hasChildren ? (
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`${styles.chevron} ${expanded ? styles.open : ''}`}
          />
        ) : (
          <Tag size={12} strokeWidth={1.75} className={styles.tagIcon} />
        )}
        <span className={styles.tagName}>{node.name}</span>
        <span className={styles.tagCount}>{node.count}</span>
      </div>
      {expanded &&
        hasChildren &&
        node.children.map(child => (
          <TagNodeItem key={child.fullPath} node={child} depth={depth + 1} onSelect={onSelect} />
        ))}
    </div>
  )
}

export function TagsPanel() {
  const { tags, allTags, getFilesWithTag, indexed } = useIndexStore()
  const { selectFile } = useVaultStore()

  const tree = buildTagTree(allTags, tags)

  const handleSelectTag = (tag: string) => {
    const files = getFilesWithTag(tag)
    if (files.length === 1) {
      selectFile(files[0])
    }
    // TODO: In a later iteration, filter file explorer by tag
  }

  if (!indexed || allTags.length === 0) {
    return (
      <div className={styles.empty}>
        {!indexed ? 'Open a vault to see tags' : 'No tags found'}
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Tag size={14} strokeWidth={1.75} />
        <span>Tags</span>
        <span className={styles.count}>{allTags.length}</span>
      </div>
      <div className={styles.tree}>
        {tree.map(node => (
          <TagNodeItem key={node.fullPath} node={node} depth={0} onSelect={handleSelectTag} />
        ))}
      </div>
    </div>
  )
}
