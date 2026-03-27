import { create } from 'zustand'

export type EditorMode = 'source' | 'preview' | 'reading'

interface Tab {
  path: string
  title: string
  dirty: boolean
}

interface EditorState {
  mode: EditorMode
  activeTab: string | null
  openTabs: Tab[]
  cursorLine: number
  cursorCol: number
  wordCount: number
  charCount: number

  setMode(mode: EditorMode): void
  openTab(path: string, title: string): void
  closeTab(path: string): void
  setActiveTab(path: string): void
  setDirty(path: string, dirty: boolean): void
  updateCursor(line: number, col: number): void
  updateCounts(wordCount: number, charCount: number): void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  mode: 'preview',
  activeTab: null,
  openTabs: [],
  cursorLine: 1,
  cursorCol: 1,
  wordCount: 0,
  charCount: 0,

  setMode: (mode) => set({ mode }),

  openTab: (path, title) => {
    const { openTabs } = get()
    const exists = openTabs.find(t => t.path === path)
    if (!exists) {
      set({ openTabs: [...openTabs, { path, title, dirty: false }], activeTab: path })
    } else {
      set({ activeTab: path })
    }
  },

  closeTab: (path) => {
    const { openTabs, activeTab } = get()
    const idx = openTabs.findIndex(t => t.path === path)
    const next = openTabs.filter(t => t.path !== path)
    let nextActive = activeTab
    if (activeTab === path) {
      nextActive = next[Math.max(0, idx - 1)]?.path ?? next[0]?.path ?? null
    }
    set({ openTabs: next, activeTab: nextActive })
  },

  setActiveTab: (path) => set({ activeTab: path }),

  setDirty: (path, dirty) => set(state => ({
    openTabs: state.openTabs.map(t => t.path === path ? { ...t, dirty } : t)
  })),

  updateCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),

  updateCounts: (wordCount, charCount) => set({ wordCount, charCount }),
}))
