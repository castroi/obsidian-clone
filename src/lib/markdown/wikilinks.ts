/**
 * Parse and resolve [[wikilinks]] in Obsidian markdown.
 */

export interface WikiLink {
  raw: string          // Full match e.g. [[Note Name|Display]]
  target: string       // Note name/path e.g. "Note Name"
  display: string      // Display text e.g. "Display" (or same as target)
  heading?: string     // e.g. "#Heading" if [[Note#Heading]]
  blockId?: string     // e.g. "^block-id" if [[Note^block-id]]
}

const WIKILINK_RE = /\[\[([^\]|#^]+?)(?:#([^\]|^]+?))?(?:\^([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g

export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = []
  const re = new RegExp(WIKILINK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    links.push({
      raw: match[0],
      target: match[1].trim(),
      display: match[4]?.trim() ?? match[1].trim(),
      heading: match[2]?.trim(),
      blockId: match[3]?.trim(),
    })
  }
  return links
}

/**
 * Resolve a wikilink target to an actual file path in the vault.
 * Matches by filename (case-insensitive), with or without .md extension.
 */
export function resolveLink(target: string, allPaths: string[]): string | null {
  const targetLower = target.toLowerCase().replace(/\.md$/, '')
  // Exact match first
  for (const path of allPaths) {
    const nameLower = path.split('/').pop()!.replace(/\.md$/, '').toLowerCase()
    if (nameLower === targetLower) return path
  }
  // Partial path match
  for (const path of allPaths) {
    if (path.toLowerCase().replace(/\.md$/, '').endsWith('/' + targetLower)) return path
  }
  return null
}
