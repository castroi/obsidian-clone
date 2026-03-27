'use client'
import { useEffect, useState } from 'react'
import { Ribbon } from './Ribbon'
import { TabBar } from './TabBar'
import { StatusBar } from './StatusBar'
import { BottomNav } from './BottomNav'
import { ResizablePanel } from './ResizablePanel'
import { LeftSidebar } from '../sidebar/LeftSidebar'
import { RightSidebar } from '../sidebar/RightSidebar'
import { EditorPane } from '../editor/EditorPane'
import { useUIStore } from '@/stores/ui'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import { useIndexStore } from '@/stores/index'
import { registerIndexBuilder } from '@/stores/vault'
import { GraphView } from '../graph/GraphView'
import { CommandPalette } from '../modals/CommandPalette'
import { QuickSwitcher } from '../modals/QuickSwitcher'
import { SettingsModal } from '../modals/SettingsModal'
import styles from './AppShell.module.css'

export function AppShell() {
  const {
    leftSidebarOpen, rightSidebarOpen,
    leftSidebarWidth, rightSidebarWidth,
    setLeftSidebarWidth, setRightSidebarWidth,
    setLeftSidebarOpen, setRightSidebarOpen,
    theme,
  } = useUIStore()

  const [showGraph, setShowGraph] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { activeFilePath, fileContents, selectFile } = useVaultStore()
  const {
    openTabs, activeTab, openTab, closeTab, setActiveTab,
    wordCount, charCount, cursorLine, cursorCol,
  } = useEditorStore()

  // Register index builder once on mount
  useEffect(() => {
    const { buildIndex } = useIndexStore.getState()
    registerIndexBuilder(buildIndex)
  }, [])

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // When vault selects a file, open it as a tab
  useEffect(() => {
    if (!activeFilePath) return
    const title = activeFilePath.split('/').pop() ?? activeFilePath
    openTab(activeFilePath, title)
  }, [activeFilePath, openTab])

  // Toggle graph view overlay on custom event
  useEffect(() => {
    const handler = () => setShowGraph(v => !v)
    window.addEventListener('open-graph-view', handler)
    return () => window.removeEventListener('open-graph-view', handler)
  }, [])

  // Open command palette via Ctrl+P or custom event from CodeMirror keymap
  useEffect(() => {
    const handleCommandPalette = () => setShowCommandPalette(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setShowCommandPalette(v => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleCommandPalette)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleCommandPalette)
    }
  }, [])

  // Open quick switcher via Ctrl+O or custom event from CodeMirror keymap
  useEffect(() => {
    const handleQuickSwitcher = () => setShowQuickSwitcher(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        setShowQuickSwitcher(v => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-quick-switcher', handleQuickSwitcher)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-quick-switcher', handleQuickSwitcher)
    }
  }, [])

  // Open settings modal via Ctrl+, or custom event from Ribbon
  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(v => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-settings', handleOpenSettings)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-settings', handleOpenSettings)
    }
  }, [])

  const handleSelectTab = (path: string) => {
    setActiveTab(path)
    selectFile(path)
  }

  const handleNewTab = async () => {
    // Will wire to createNote in a later task
  }

  return (
    <div className={styles.shell}>
      <Ribbon />
      <div className={styles.main}>
        <div data-left-sidebar="" data-mobile-open={leftSidebarOpen ? 'true' : 'false'}>
          <ResizablePanel
            side="left"
            width={leftSidebarWidth}
            onResize={setLeftSidebarWidth}
            open={leftSidebarOpen}
          >
            <LeftSidebar />
          </ResizablePanel>
        </div>

        <div className={styles.editorColumn}>
          <TabBar
            tabs={openTabs}
            activeTab={activeTab}
            onSelect={handleSelectTab}
            onClose={closeTab}
            onNew={handleNewTab}
          />
          <div className={styles.editorArea}>
            {activeTab && fileContents[activeTab] !== undefined ? (
              <EditorPane path={activeTab} />
            ) : (
              <div className={styles.emptyState}>
                <p>Open a file to start editing</p>
              </div>
            )}
          </div>
          {showGraph && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
              <GraphView mode="global" />
            </div>
          )}
        </div>

        <div data-right-sidebar="" data-mobile-open={rightSidebarOpen ? 'true' : 'false'}>
          <ResizablePanel
            side="right"
            width={rightSidebarWidth}
            onResize={setRightSidebarWidth}
            open={rightSidebarOpen}
          >
            <RightSidebar />
          </ResizablePanel>
        </div>
      </div>

      <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        line={cursorLine}
        col={cursorCol}
      />

      <BottomNav />

      {(leftSidebarOpen || rightSidebarOpen) && (
        <div
          className="sidebar-backdrop"
          onClick={() => {
            setLeftSidebarOpen(false)
            setRightSidebarOpen(false)
          }}
        />
      )}

      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}

      {showQuickSwitcher && (
        <QuickSwitcher onClose={() => setShowQuickSwitcher(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
