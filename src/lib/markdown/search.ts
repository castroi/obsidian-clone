import type { VaultFile } from '@/lib/fs/fileSystem'

export interface SearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

export interface SearchMatch {
  lineNumber: number
  lineText: string
  matchStart: number  // within lineText
  matchEnd: number
}

export interface SearchOptions {
  matchCase?: boolean
  wholeWord?: boolean
  useRegex?: boolean
}

export function searchVault(
  query: string,
  files: VaultFile[],
  contents: Record<string, string>,
  options: SearchOptions = {}
): SearchResult[] {
  if (!query.trim()) return []

  const results: SearchResult[] = []

  let pattern: RegExp
  try {
    const flags = options.matchCase ? 'g' : 'gi'
    let src = options.useRegex ? query : escapeRegex(query)
    if (options.wholeWord) src = `\\b${src}\\b`
    pattern = new RegExp(src, flags)
  } catch {
    return []
  }

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue
    const content = contents[file.path]
    if (!content) continue

    const matches: SearchMatch[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          lineNumber: i + 1,
          lineText: line,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        })
        if (!pattern.global) break
      }
    }

    if (matches.length > 0) {
      results.push({
        filePath: file.path,
        fileName: file.name.replace(/\.md$/, ''),
        matches,
      })
    }
  }

  // Sort by number of matches descending
  results.sort((a, b) => b.matches.length - a.matches.length)
  return results
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract all #tags from content.
 */
export function extractTags(content: string): string[] {
  const tagRe = /#([\w/]+)/g
  const tags: string[] = []
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(content)) !== null) {
    tags.push(m[1])
  }
  return tags
}
