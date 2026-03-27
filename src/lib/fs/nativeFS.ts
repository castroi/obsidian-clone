import type { FileSystemAdapter, VaultEntry, VaultFile, VaultFolder, FileChangeEvent } from './fileSystem'

/**
 * File System Access API adapter for Chrome/Edge desktop
 */
export class NativeFileSystem implements FileSystemAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null
  private handleCache = new Map<string, FileSystemFileHandle | FileSystemDirectoryHandle>()

  async openVault(): Promise<VaultFolder> {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    this.rootHandle = handle
    this.handleCache.clear()
    return this.readDirectory(handle, '')
  }

  private async readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<VaultFolder> {
    const children: VaultEntry[] = []

    for await (const [name, handle] of (dirHandle as any)) {
      // Skip hidden files/dirs
      if (name.startsWith('.')) continue

      const entryPath = basePath ? `${basePath}/${name}` : name
      this.handleCache.set(entryPath, handle)

      if (handle.kind === 'directory') {
        const folder = await this.readDirectory(handle as FileSystemDirectoryHandle, entryPath)
        children.push(folder)
      } else if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile()
        children.push({
          path: entryPath,
          name,
          content: '',   // lazy-loaded
          lastModified: file.lastModified,
          isFile: true,
        } as VaultFile)
      }
    }

    // Sort: folders first, then files, alphabetically
    children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })

    return {
      path: basePath,
      name: dirHandle.name,
      children,
      isFile: false,
    }
  }

  private async getFileHandle(path: string): Promise<FileSystemFileHandle> {
    if (this.handleCache.has(path)) {
      return this.handleCache.get(path) as FileSystemFileHandle
    }
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    let current: FileSystemDirectoryHandle = this.rootHandle
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i])
    }
    const handle = await current.getFileHandle(parts[parts.length - 1])
    this.handleCache.set(path, handle)
    return handle
  }

  private async getDirHandle(path: string): Promise<FileSystemDirectoryHandle> {
    if (!path) return this.rootHandle!
    if (this.handleCache.has(path)) {
      return this.handleCache.get(path) as FileSystemDirectoryHandle
    }
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    let current: FileSystemDirectoryHandle = this.rootHandle
    for (const part of parts) {
      current = await current.getDirectoryHandle(part)
    }
    this.handleCache.set(path, current)
    return current
  }

  async readFile(path: string): Promise<string> {
    const handle = await this.getFileHandle(path)
    const file = await handle.getFile()
    return file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    let dir: FileSystemDirectoryHandle = this.rootHandle
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true })
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
    this.handleCache.set(path, fileHandle)
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    const parentHandle = parentPath ? await this.getDirHandle(parentPath) : this.rootHandle
    await parentHandle.removeEntry(parts[parts.length - 1])
    this.handleCache.delete(path)
  }

  async createFile(path: string, content = ''): Promise<void> {
    await this.writeFile(path, content)
  }

  async createFolder(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    let current: FileSystemDirectoryHandle = this.rootHandle
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true })
    }
    this.handleCache.set(path, current)
  }

  async deleteFolder(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
    const parts = path.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    const parentHandle = parentPath ? await this.getDirHandle(parentPath) : this.rootHandle
    await parentHandle.removeEntry(parts[parts.length - 1], { recursive: true })
    // Clear all cached handles under this path
    const keysToDelete = Array.from(this.handleCache.keys()).filter(
      key => key === path || key.startsWith(path + '/')
    )
    keysToDelete.forEach(key => this.handleCache.delete(key))
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    // File System Access API doesn't support rename natively
    const content = await this.readFile(oldPath)
    await this.writeFile(newPath, content)
    await this.deleteFile(oldPath)
  }

  async listFiles(folderPath?: string): Promise<VaultEntry[]> {
    if (!this.rootHandle) throw new Error('No vault open')
    const dirHandle = folderPath ? await this.getDirHandle(folderPath) : this.rootHandle
    const folder = await this.readDirectory(dirHandle, folderPath ?? '')
    return folder.children
  }

  async rereadTree(): Promise<VaultFolder> {
    if (!this.rootHandle) throw new Error('No vault open')
    this.handleCache.clear()
    return this.readDirectory(this.rootHandle, '')
  }

  /** Restore from a persisted FileSystemDirectoryHandle (no picker dialog) */
  restoreFromHandle(handle: FileSystemDirectoryHandle): void {
    this.rootHandle = handle
    this.handleCache.clear()
  }
}
