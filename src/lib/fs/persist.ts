import { openDB } from 'idb'

const DB_NAME = 'obsidian-clone-fs'
const DB_VERSION = 1
const STORE_NAME = 'handles'

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function persistHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, handle, 'vault')
}

export async function getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB()
    const handle = await db.get(STORE_NAME, 'vault') as FileSystemDirectoryHandle | undefined
    if (!handle) return null

    // Verify permission is still granted
    const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return handle

    // Try to request it
    const requested = await (handle as any).requestPermission({ mode: 'readwrite' })
    return requested === 'granted' ? handle : null
  } catch {
    return null
  }
}

export async function clearPersistedHandle(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, 'vault')
}
