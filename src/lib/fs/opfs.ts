import type { FileSystemAdapter, VaultEntry, VaultFile, VaultFolder } from './fileSystem'

/**
 * Origin Private File System adapter for iOS Safari PWA and Firefox
 */
export class OPFSFileSystem implements FileSystemAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null

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
    const parts = path.split('/')
    const dir = await this.resolveDir(parts.slice(0, -1).join('/'), true)
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootHandle) throw new Error('No vault open')
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
