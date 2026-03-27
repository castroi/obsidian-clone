'use client'
import { useRef, useCallback } from 'react'
import { Search, CaseSensitive, WholeWord, Regex } from 'lucide-react'
import { useSearchStore } from '@/stores/search'
import { useVaultStore } from '@/stores/vault'
import { debounce } from '@/lib/utils/debounce'
import styles from './SearchPanel.module.css'

function MatchSegment({ text, start, end }: { text: string; start: number; end: number }) {
  const safeStart = Math.max(0, Math.min(start, text.length))
  const safeEnd = Math.max(safeStart, Math.min(end, text.length))
  return (
    <span>
      {text.slice(0, safeStart)}
      <mark className={styles.matchHighlight}>{text.slice(safeStart, safeEnd)}</mark>
      {text.slice(safeEnd)}
    </span>
  )
}

export function SearchPanel() {
  const {
    query,
    results,
    isSearching,
    matchCase,
    wholeWord,
    useRegex,
    setQuery,
    setMatchCase,
    setWholeWord,
    setUseRegex,
    clearSearch,
  } = useSearchStore()
  const { allFiles, fileContents, selectFile } = useVaultStore()

  const inputRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runSearch = useCallback(
    debounce((q: string) => {
      setQuery(q, allFiles, fileContents)
    }, 300),
    [allFiles, fileContents, setQuery]
  )

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    if (!q) {
      clearSearch()
      return
    }
    runSearch(q)
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <div className={styles.panel}>
      {/* Search input */}
      <div className={styles.inputRow}>
        <div className={styles.inputWrapper}>
          <Search size={14} className={styles.inputIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search…"
            defaultValue={query}
            onChange={handleInput}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Filter toggles */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${matchCase ? styles.active : ''}`}
          title="Match case"
          onClick={() => setMatchCase(!matchCase)}
        >
          <CaseSensitive size={14} />
        </button>
        <button
          className={`${styles.filterBtn} ${wholeWord ? styles.active : ''}`}
          title="Whole word"
          onClick={() => setWholeWord(!wholeWord)}
        >
          <WholeWord size={14} />
        </button>
        <button
          className={`${styles.filterBtn} ${useRegex ? styles.active : ''}`}
          title="Use regex"
          onClick={() => setUseRegex(!useRegex)}
        >
          <Regex size={14} />
        </button>
        {query && (
          <span className={styles.resultCount}>
            {isSearching ? '…' : `${totalMatches} result${totalMatches !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {/* Results */}
      <div className={styles.results}>
        {results.map(result => {
          const trimOffset = result.matches.length > 0
            ? result.matches[0].lineText.length - result.matches[0].lineText.trimStart().length
            : 0
          return (
            <div key={result.filePath} className={styles.fileGroup}>
              <button
                className={styles.fileHeader}
                onClick={() => selectFile(result.filePath)}
                title={result.filePath}
              >
                <span className={styles.fileName}>{result.fileName}</span>
                <span className={styles.matchCount}>{result.matches.length}</span>
              </button>
              {result.matches.slice(0, 5).map((match, i) => {
                const leadingSpaces = match.lineText.length - match.lineText.trimStart().length
                const trimmedText = match.lineText.trim().slice(0, 80)
                const adjustedStart = Math.max(0, match.matchStart - leadingSpaces)
                const adjustedEnd = Math.max(0, match.matchEnd - leadingSpaces)
                return (
                  <button
                    key={i}
                    className={styles.matchLine}
                    onClick={() => selectFile(result.filePath)}
                    title={`Line ${match.lineNumber}`}
                  >
                    <MatchSegment
                      text={trimmedText}
                      start={adjustedStart}
                      end={Math.min(adjustedEnd, trimmedText.length)}
                    />
                  </button>
                )
              })}
              {result.matches.length > 5 && (
                <div className={styles.moreMatches}>
                  +{result.matches.length - 5} more matches
                </div>
              )}
            </div>
          )
        })}
        {query && !isSearching && results.length === 0 && (
          <div className={styles.noResults}>No results for &ldquo;{query}&rdquo;</div>
        )}
      </div>
    </div>
  )
}
