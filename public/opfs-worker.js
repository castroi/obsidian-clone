/**
 * OPFS Worker — handles write and delete operations via FileSystemSyncAccessHandle.
 *
 * `createWritable()` is unreliable on iOS Safari (both browser and standalone/PWA
 * mode). `createSyncAccessHandle()` is the iOS-supported write path (iOS 16.4+)
 * and must be called from inside a dedicated Worker.
 *
 * Message protocol (main thread → worker):
 *   write:  { id: number, op: 'write',  path: string, content: string }
 *   delete: { id: number, op: 'delete', path: string }
 *
 * Reply protocol (worker → main thread):
 *   success: { id: number, ok: true }
 *   failure: { id: number, ok: false, error: string }
 */

self.onmessage = async (event) => {
  const { id, op, path, content } = event.data

  try {
    if (op === 'write') {
      await handleWrite(path, content)
      self.postMessage({ id, ok: true })
    } else if (op === 'delete') {
      await handleDelete(path)
      self.postMessage({ id, ok: true })
    } else {
      self.postMessage({ id, ok: false, error: `Unknown op: ${op}` })
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * Write `content` to `path` inside OPFS using a SyncAccessHandle.
 * Intermediate directories are created as needed.
 */
async function handleWrite(path, content) {
  const root = await navigator.storage.getDirectory()
  const parts = path.split('/')
  const fileName = parts[parts.length - 1]
  const dirParts = parts.slice(0, -1)

  // Navigate / create intermediate directories
  let dir = root
  for (const part of dirParts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }

  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const syncHandle = await fileHandle.createSyncAccessHandle()

  try {
    const encoded = new TextEncoder().encode(content)
    syncHandle.truncate(0)
    syncHandle.write(encoded)
    syncHandle.flush()
  } finally {
    // Always close to release the exclusive lock, even if write fails
    syncHandle.close()
  }
}

/**
 * Delete the file at `path` from OPFS.
 */
async function handleDelete(path) {
  const root = await navigator.storage.getDirectory()
  const parts = path.split('/')
  const fileName = parts[parts.length - 1]
  const dirParts = parts.slice(0, -1)

  let dir = root
  for (const part of dirParts) {
    dir = await dir.getDirectoryHandle(part, { create: false })
  }

  await dir.removeEntry(fileName)
}
