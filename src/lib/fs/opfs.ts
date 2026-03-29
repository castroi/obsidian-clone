import type { FileSystemAdapter, VaultEntry, VaultFile, VaultFolder } from './fileSystem'
import { isIOS } from '@/lib/utils/platform'

/**
 * Origin Private File System adapter for iOS Safari PWA and Firefox
 */
export class OPFSFileSystem implements FileSystemAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null

  // Worker-based write path (used on iOS where createWritable() is unreliable)
  private worker: Worker | null = null
  private pendingOps: Map<number, { resolve: (v?: any) => void; reject: (e: Error) => void }> =
    new Map()
  private opCounter: number = 0
  private useWorker: boolean

  constructor() {
    this.useWorker = isIOS()
  }

  /**
   * Lazily creates the OPFS worker and wires up message/error handlers.
   */
  private getWorker(): Worker {
    if (this.worker) return this.worker

    const w = new Worker('/opfs-worker.js')

    w.onmessage = (event) => {
      const { id, ok, error } = event.data
      const pending = this.pendingOps.get(id)
      if (!pending) return
      this.pendingOps.delete(id)
      if (ok) {
        pending.resolve()
      } else {
        pending.reject(new Error(error ?? 'OPFS worker operation failed'))
      }
    }

    w.onerror = (event) => {
      // Reject all pending operations if the worker itself crashes
      const err = new Error(event.message ?? 'OPFS worker error')
      for (const pending of Array.from(this.pendingOps.values())) {
        pending.reject(err)
      }
      this.pendingOps.clear()
      this.worker = null
    }

    this.worker = w
    return w
  }

  /**
   * Send an operation to the worker and return a promise that resolves/rejects
   * when the worker replies with the matching id.
   */
  private workerOp(op: string, data: Record<string, unknown>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const id = ++this.opCounter
      this.pendingOps.set(id, { resolve, reject })
      this.getWorker().postMessage({ id, op, ...data })
    })
  }

  async openVault(): Promise<VaultFolder> {
    this.rootHandle = await navigator.storage.getDirectory()
    return this.readDirectory(this.rootHandle, '')
  }

  private async readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<VaultFolder> {
    const children: VaultEntry[] = []

    for await (const [name, handle] of (dirHandle as any)) {
      if (name.startsWith('.')) continue
      const entryPath = basePath ? `${basePath}/${name}` : name

      if (handle.kind === 'directory') {
        const folder = await this.readDirectory(handle as FileSystemDirectoryHandle, entryPath)
        children.push(folder)
      } else {
        const file = await (handle as FileSystemFileHandle).getFile()
        children.push({
          path: entryPath,
          name,
          content: '',
          lastModified: file.lastModified,
          isFile: true,
        } as VaultFile)
      }
    }

    children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })

    return { path: basePath, name: dirHandle.name, children, isFile: false }
  }

  private async resolveDir(path: string, create = false): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) throw new Error('No vault open')
    if (!path) return this.rootHandle
    const parts = path.split('/')
    let current = this.rootHandle
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create })
    }
    return current
  }

  async readFile(path: string): Promise<string> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    const dir = await this.resolveDir(parts.slice(0, -1).join('/'))
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    return file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')

    if (this.useWorker) {
      // iOS path: route through the worker which uses createSyncAccessHandle()
      await this.workerOp('write', { path, content })
      return
    }

    // Non-iOS path: use createWritable() on the main thread (unchanged)
    const parts = path.split('/')
    const dir = await this.resolveDir(parts.slice(0, -1).join('/'), true)
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')

    if (this.useWorker) {
      // iOS path: route through the worker
      await this.workerOp('delete', { path })
      return
    }

    // Non-iOS path: remove directly (unchanged)
    const parts = path.split('/')
    const dir = await this.resolveDir(parts.slice(0, -1).join('/'))
    await dir.removeEntry(parts[parts.length - 1])
  }

  async createFile(path: string, content = ''): Promise<void> {
    await this.writeFile(path, content)
  }

  async createFolder(path: string): Promise<void> {
    await this.resolveDir(path, true)
  }

  async deleteFolder(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    const parentDir = await this.resolveDir(parts.slice(0, -1).join('/'))
    await parentDir.removeEntry(parts[parts.length - 1], { recursive: true })
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const content = await this.readFile(oldPath)
    await this.writeFile(newPath, content)
    await this.deleteFile(oldPath)
  }

  async listFiles(folderPath?: string): Promise<VaultEntry[]> {
    if (!this.rootHandle) throw new Error('No vault open')
    const dir = await this.resolveDir(folderPath ?? '')
    const folder = await this.readDirectory(dir, folderPath ?? '')
    return folder.children
  }

  async rereadTree(): Promise<VaultFolder> {
    if (!this.rootHandle) throw new Error('No vault open')
    return this.readDirectory(this.rootHandle, '')
  }

  /** Import files from user's file system into OPFS */
  async importFiles(files: File[]): Promise<void> {
    for (const file of files) {
      const content = await file.text()
      await this.writeFile(file.name, content)
    }
  }

  /** Export a file to user's downloads */
  async exportFile(path: string): Promise<void> {
    const content = await this.readFile(path)
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() ?? 'note.md'
    a.click()
    URL.revokeObjectURL(url)
  }
}
