const DB_NAME = 'kronos-os'
const DB_VERSION = 1
const STORE_VFS = 'vfs'
const STORE_META = 'meta'

let db: IDBDatabase | null = null

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db)
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (e) => {
            const database = (e.target as IDBOpenDBRequest).result
            if (!database.objectStoreNames.contains(STORE_VFS))
                database.createObjectStore(STORE_VFS, { keyPath: 'id' })
            if (!database.objectStoreNames.contains(STORE_META))
                database.createObjectStore(STORE_META, { keyPath: 'key' })
        }
        req.onsuccess = (e) => {
            db = (e.target as IDBOpenDBRequest).result
            resolve(db)
        }
        req.onerror = () => reject(req.error)
    })
}

export const saveVFS = async (inodes: Record<string, any>): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_VFS, 'readwrite')
        const store = tx.objectStore(STORE_VFS)
        store.clear()
        Object.values(inodes).forEach(node => store.put(node))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export const loadVFS = async (): Promise<Record<string, any> | null> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_VFS, 'readonly')
        const store = tx.objectStore(STORE_VFS)
        const req = store.getAll()
        req.onsuccess = () => {
            const results = req.result
            if (!results.length) return resolve(null)
            const map: Record<string, any> = {}
            results.forEach(n => map[n.id] = n)
            resolve(map)
        }
        req.onerror = () => reject(req.error)
    })
}

export const saveMeta = async (key: string, value: any): Promise<void> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_META, 'readwrite')
        tx.objectStore(STORE_META).put({ key, value })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export const loadMeta = async (key: string): Promise<any> => {
    const database = await initDB()
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_META, 'readonly')
        const req = tx.objectStore(STORE_META).get(key)
        req.onsuccess = () => resolve(req.result?.value ?? null)
        req.onerror = () => reject(req.error)
    })
}