export interface VaultFile {
  path: string        // full path relative to vault root, e.g. "folder/note.md"
  name: string        // filename with extension, e.g. "note.md"
  content: string
  lastModified: number
  isFile: true
}

export interface VaultFolder {
  path: string        // full path relative to vault root, e.g. "folder"
  name: string        // folder name, e.g. "folder"
  children: VaultEntry[]
  isFile: false
}

export type VaultEntry = VaultFile | VaultFolder

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete' | 'rename'
  path: string
  newPath?: string
}

export interface FileSystemAdapter {
  /** Open a vault (directory). Returns the root folder tree. */
  openVault(): Promise<VaultFolder>
  /** Read file content */
  readFile(path: string): Promise<string>
  /** Write file content, creating if needed */
  writeFile(path: string, content: string): Promise<void>
  /** Delete a file */
  deleteFile(path: string): Promise<void>
  /** Create a new file */
  createFile(path: string, content?: string): Promise<void>
  /** Create a new folder */
  createFolder(path: string): Promise<void>
  /** Delete a folder and all its contents */
  deleteFolder(path: string): Promise<void>
  /** Rename/move a file */
  renameFile(oldPath: string, newPath: string): Promise<void>
  /** List files at a given path (or root if not specified) */
  listFiles(folderPath?: string): Promise<VaultEntry[]>
  /** Re-read the tree from an already-open vault without showing a picker dialog */
  rereadTree(): Promise<VaultFolder>
  /** Watch for external changes (optional) */
  watchForChanges?(callback: (event: FileChangeEvent) => void): () => void
}
