import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LeftPanel = 'files' | 'search' | 'bookmarks' | 'tags'
type RightPanel = 'backlinks' | 'outline' | 'properties'
type Theme = 'dark' | 'light'

interface UIState {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  leftSidebarWidth: number
  rightSidebarWidth: number
  activeLeftPanel: LeftPanel
  activeRightPanel: RightPanel
  theme: Theme

  setLeftSidebarOpen(open: boolean): void
  setRightSidebarOpen(open: boolean): void
  setLeftSidebarWidth(w: number): void
  setRightSidebarWidth(w: number): void
  setActiveLeftPanel(panel: LeftPanel): void
  setActiveRightPanel(panel: RightPanel): void
  setTheme(theme: Theme): void
  toggleTheme(): void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      leftSidebarOpen: true,
      rightSidebarOpen: false,
      leftSidebarWidth: 280,
      rightSidebarWidth: 280,
      activeLeftPanel: 'files',
      activeRightPanel: 'backlinks',
      theme: 'dark',

      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      setLeftSidebarWidth: (w) => set({ leftSidebarWidth: Math.max(100, Math.min(600, w)) }),
      setRightSidebarWidth: (w) => set({ rightSidebarWidth: Math.max(100, Math.min(600, w)) }),
      setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel, leftSidebarOpen: true }),
      setActiveRightPanel: (panel) => set({ activeRightPanel: panel, rightSidebarOpen: true }),
      setTheme: (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme)
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },
    }),
    {
      name: 'obsidian-ui',
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        leftSidebarWidth: state.leftSidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth,
        activeLeftPanel: state.activeLeftPanel,
        activeRightPanel: state.activeRightPanel,
        theme: state.theme,
      }),
    }
  )
)
