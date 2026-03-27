import React from 'react'

export interface FuzzyResult {
  score: number
  indices: number[]  // matched character positions in the string
}

/**
 * Simple fuzzy match: checks if all chars of query appear in str in order.
 * Returns score (higher = better match) and matched indices.
 */
export function fuzzyMatch(query: string, str: string): FuzzyResult | null {
  if (!query) return { score: 1, indices: [] }
  const q = query.toLowerCase()
  const s = str.toLowerCase()
  const indices: number[] = []
  let qi = 0
  let lastIdx = -1

  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) {
      indices.push(i)
      qi++
      lastIdx = i
    }
  }

  if (qi < q.length) return null // not all chars matched

  // Score: bonus for consecutive matches, penalty for gaps
  let score = 0
  for (let i = 1; i < indices.length; i++) {
    score += indices[i] - indices[i - 1] === 1 ? 10 : 1
  }
  // Bonus for matching at start
  if (indices[0] === 0) score += 5
  // Penalty for total span
  score -= (lastIdx - indices[0]) * 0.1

  return { score, indices }
}

/**
 * Render a string with matched characters highlighted.
 */
export function highlightMatch(str: string, indices: number[]): React.ReactNode {
  if (indices.length === 0) return str
  const idxSet = new Set(indices)
  const parts: React.ReactNode[] = []
  let i = 0
  while (i < str.length) {
    if (idxSet.has(i)) {
      // Find consecutive run
      let j = i
      while (j < str.length && idxSet.has(j)) j++
      parts.push(<strong key={i}>{str.slice(i, j)}</strong>)
      i = j
    } else {
      let j = i
      while (j < str.length && !idxSet.has(j)) j++
      parts.push(str.slice(i, j))
      i = j
    }
  }
  return <>{parts}</>
}
