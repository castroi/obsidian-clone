import { create } from 'zustand'
import { searchVault, type SearchResult, type SearchOptions } from '@/lib/markdown/search'
import type { VaultFile } from '@/lib/fs/fileSystem'

interface SearchState {
  query: string
  results: SearchResult[]
  isSearching: boolean
  matchCase: boolean
  wholeWord: boolean
  useRegex: boolean

  setQuery(query: string, files: VaultFile[], contents: Record<string, string>): void
  setMatchCase(v: boolean): void
  setWholeWord(v: boolean): void
  setUseRegex(v: boolean): void
  clearSearch(): void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  matchCase: false,
  wholeWord: false,
  useRegex: false,

  setQuery(query, files, contents) {
    const { matchCase, wholeWord, useRegex } = get()
    set({ query, isSearching: true })
    const options: SearchOptions = { matchCase, wholeWord, useRegex }
    const results = searchVault(query, files, contents, options)
    set({ results, isSearching: false })
  },

  setMatchCase(v) {
    set({ matchCase: v })
  },
  setWholeWord(v) {
    set({ wholeWord: v })
  },
  setUseRegex(v) {
    set({ useRegex: v })
  },
  clearSearch() {
    set({ query: '', results: [], isSearching: false })
  },
}))
