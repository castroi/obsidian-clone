import { create } from 'zustand'
import type { VaultFile } from '@/lib/fs/fileSystem'
import { extractWikiLinks, resolveLink } from '@/lib/markdown/wikilinks'
import { extractTags } from '@/lib/markdown/search'

interface IndexState {
  /** forward links: filePath -> resolved target paths */
  forwardLinks: Map<string, string[]>
  /** backlinks: filePath -> array of files that link TO it */
  backlinks: Map<string, string[]>
  /** tags: tagName -> array of file paths with that tag */
  tags: Map<string, string[]>
  /** all tag names sorted */
  allTags: string[]
  /** whether index has been built */
  indexed: boolean

  buildIndex(files: VaultFile[], contents: Record<string, string>): void
  getBacklinks(filePath: string): string[]
  getForwardLinks(filePath: string): string[]
  getFilesWithTag(tag: string): string[]
}

export const useIndexStore = create<IndexState>((set, get) => ({
  forwardLinks: new Map(),
  backlinks: new Map(),
  tags: new Map(),
  allTags: [],
  indexed: false,

  buildIndex(files, contents) {
    const allPaths = files.map(f => f.path)
    const forwardLinks = new Map<string, string[]>()
    const backlinks = new Map<string, string[]>()
    const tags = new Map<string, string[]>()

    // Initialize backlinks for all files
    for (const path of allPaths) backlinks.set(path, [])

    for (const file of files) {
      const content = contents[file.path] ?? ''
      const links = extractWikiLinks(content)
      const resolved: string[] = []

      for (const link of links) {
        const targetPath = resolveLink(link.target, allPaths)
        if (targetPath) {
          resolved.push(targetPath)
          const existing = backlinks.get(targetPath) ?? []
          if (!existing.includes(file.path)) {
            backlinks.set(targetPath, [...existing, file.path])
          }
        }
      }
      forwardLinks.set(file.path, resolved)

      // Tags
      const fileTags = extractTags(content)
      for (const tag of fileTags) {
        const existing = tags.get(tag) ?? []
        if (!existing.includes(file.path)) {
          tags.set(tag, [...existing, file.path])
        }
      }
    }

    const allTags = Array.from(tags.keys()).sort()
    set({ forwardLinks, backlinks, tags, allTags, indexed: true })
  },

  getBacklinks(filePath) {
    return get().backlinks.get(filePath) ?? []
  },

  getForwardLinks(filePath) {
    return get().forwardLinks.get(filePath) ?? []
  },

  getFilesWithTag(tag) {
    return get().tags.get(tag) ?? []
  },
}))
