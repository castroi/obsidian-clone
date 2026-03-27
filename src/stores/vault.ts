import { create } from 'zustand'
import type { VaultEntry, VaultFile, VaultFolder, FileSystemAdapter } from '@/lib/fs/fileSystem'
import { NativeFileSystem } from '@/lib/fs/nativeFS'
import { OPFSFileSystem } from '@/lib/fs/opfs'
import { persistHandle, getPersistedHandle, clearPersistedHandle } from '@/lib/fs/persist'
import { supportsNativeFS } from '@/lib/utils/platform'

// Index builder registration — avoids circular imports with @/stores/index
let indexBuilder: ((files: VaultFile[], contents: Record<string, string>) => void) | null = null

export function registerIndexBuilder(fn: (files: VaultFile[], contents: Record<string, string>) => void) {
  indexBuilder = fn
}

function triggerIndexBuild(files: VaultFile[], contents: Record<string, string>) {
  indexBuilder?.(files, contents)
}

interface VaultState {
  adapter: FileSystemAdapter | null
  tree: VaultFolder | null
  allFiles: VaultFile[]
  activeFilePath: string | null
  fileContents: Record<string, string>   // path -> content cache
  isLoading: boolean
  error: string | null

  // Actions
  openVault(): Promise<void>
  closeVault(): void
  tryRestoreVault(): Promise<boolean>
  selectFile(path: string): Promise<void>
  saveFile(path: string, content: string): Promise<void>
  createNote(folderPath: string, name: string): Promise<string>
  deleteNote(path: string): Promise<void>
  renameNote(oldPath: string, newPath: string): Promise<void>
  createFolder(path: string): Promise<void>
  deleteFolder(path: string): Promise<void>
  refreshTree(): Promise<void>
}

function flattenFiles(folder: VaultFolder): VaultFile[] {
  const files: VaultFile[] = []
  for (const entry of folder.children) {
    if (entry.isFile) {
      files.push(entry as VaultFile)
    } else {
      files.push(...flattenFiles(entry as VaultFolder))
    }
  }
  return files
}

export const useVaultStore = create<VaultState>((set, get) => ({
  adapter: null,
  tree: null,
  allFiles: [],
  activeFilePath: null,
  fileContents: {},
  isLoading: false,
  error: null,

  async openVault() {
    const adapter = supportsNativeFS() ? new NativeFileSystem() : new OPFSFileSystem()
    set({ isLoading: true, error: null })
    try {
      const tree = await adapter.openVault()
      // Persist handle for native FS
      if (adapter instanceof NativeFileSystem) {
        // Access root handle through adapter - we'll store after open
      }
      const flatFiles = flattenFiles(tree)
      set({
        adapter,
        tree,
        allFiles: flatFiles,
        isLoading: false,
      })
      // Load markdown file contents and build the link/tag index
      const filesToIndex = flatFiles.filter(f => f.name.endsWith('.md')).slice(0, 200)
      const contentMap: Record<string, string> = {}
      for (const file of filesToIndex) {
        try {
          contentMap[file.path] = await adapter.readFile(file.path)
        } catch { /* skip unreadable files */ }
      }
      set(state => ({ fileContents: { ...state.fileContents, ...contentMap } }))
      triggerIndexBuild(filesToIndex, contentMap)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        set({ error: err.message, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    }
  },

  closeVault() {
    clearPersistedHandle().catch(() => {})
    set({ adapter: null, tree: null, allFiles: [], activeFilePath: null, fileContents: {} })
  },

  async tryRestoreVault() {
    if (!supportsNativeFS()) return false
    const handle = await getPersistedHandle()
    if (!handle) return false
    const adapter = new NativeFileSystem()
    adapter.restoreFromHandle(handle)
    try {
      const tree = await adapter.rereadTree()
      set({ adapter, tree, allFiles: flattenFiles(tree) })
      return true
    } catch {
      return false
    }
  },

  async selectFile(path: string) {
    const { adapter, fileContents } = get()
    if (!adapter) return
    if (!fileContents[path]) {
      const content = await adapter.readFile(path)
      set(state => ({
        activeFilePath: path,
        fileContents: { ...state.fileContents, [path]: content }
      }))
    } else {
      set({ activeFilePath: path })
    }
  },

  async saveFile(path: string, content: string) {
    const { adapter } = get()
    if (!adapter) return
    await adapter.writeFile(path, content)
    set(state => ({
      fileContents: { ...state.fileContents, [path]: content }
    }))
    // Trigger incremental index rebuild after save
    const { allFiles, fileContents } = get()
    const mdFiles = allFiles.filter(f => f.name.endsWith('.md'))
    triggerIndexBuild(mdFiles, { ...fileContents, [path]: content })
  },

  async createNote(folderPath: string, name: string) {
    const { adapter } = get()
    if (!adapter) throw new Error('No vault open')
    const filename = name.endsWith('.md') ? name : `${name}.md`
    const path = folderPath ? `${folderPath}/${filename}` : filename
    const content = `# ${name}\n\n`
    await adapter.createFile(path, content)
    await get().refreshTree()
    return path
  },

  async deleteNote(path: string) {
    const { adapter } = get()
    if (!adapter) return
    await adapter.deleteFile(path)
    set(state => {
      const { [path]: _, ...rest } = state.fileContents
      return {
        fileContents: rest,
        activeFilePath: state.activeFilePath === path ? null : state.activeFilePath
      }
    })
    await get().refreshTree()
  },

  async renameNote(oldPath: string, newPath: string) {
    const { adapter, fileContents } = get()
    if (!adapter) return
    await adapter.renameFile(oldPath, newPath)
    const content = fileContents[oldPath]
    set(state => {
      const { [oldPath]: _, ...rest } = state.fileContents
      return {
        fileContents: content ? { ...rest, [newPath]: content } : rest,
        activeFilePath: state.activeFilePath === oldPath ? newPath : state.activeFilePath
      }
    })
    await get().refreshTree()
  },

  async createFolder(path: string) {
    const { adapter } = get()
    if (!adapter) return
    await adapter.createFolder(path)
    await get().refreshTree()
  },

  async deleteFolder(path: string) {
    const { adapter } = get()
    if (!adapter) return
    await adapter.deleteFolder(path)
    await get().refreshTree()
  },

  async refreshTree() {
    const { adapter } = get()
    if (!adapter) return
    const tree = await adapter.rereadTree()
    set({ tree, allFiles: flattenFiles(tree) })
  },
}))
