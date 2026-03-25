const DB_NAME = 'hmx_local_store'
const DB_VERSION = 2

const STORES = {
  PRACTICE_SESSIONS: 'practice_sessions',
  WORKS: 'works',
  DANMAKU: 'danmaku',
  GIFTS: 'gifts',
  COMMENTS: 'comments',
  INTERACTION_EVENTS: 'interaction_events',
  LEADERBOARDS: 'leaderboards',
  MEDIA: 'media'
}

let dbPromise = null

export function openDB() {
  if (dbPromise) return dbPromise
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      console.warn('[IndexedDB] Open failed:', request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      if (!db.objectStoreNames.contains(STORES.PRACTICE_SESSIONS)) {
        const store = db.createObjectStore(STORES.PRACTICE_SESSIONS, { keyPath: 'id' })
        store.createIndex('userId_timestamp', ['userId', 'timestamp'], { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.WORKS)) {
        const store = db.createObjectStore(STORES.WORKS, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.DANMAKU)) {
        const store = db.createObjectStore(STORES.DANMAKU, { keyPath: 'id' })
        store.createIndex('workId_timestamp', ['workId', 'timestamp'], { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.GIFTS)) {
        const store = db.createObjectStore(STORES.GIFTS, { keyPath: 'id' })
        store.createIndex('workId', 'workId', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.COMMENTS)) {
        const store = db.createObjectStore(STORES.COMMENTS, { keyPath: 'id' })
        store.createIndex('workId', 'workId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.INTERACTION_EVENTS)) {
        const store = db.createObjectStore(STORES.INTERACTION_EVENTS, { keyPath: 'id' })
        store.createIndex('targetUserId_timestamp', ['targetUserId', 'timestamp'], { unique: false })
        store.createIndex('workId_timestamp', ['workId', 'timestamp'], { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.LEADERBOARDS)) {
        const store = db.createObjectStore(STORES.LEADERBOARDS, { keyPath: ['songId', 'userId'] })
        store.createIndex('songId_score', ['songId', 'score'], { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.MEDIA)) {
        const store = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
      }
    }
  })
  
  return dbPromise
}

export async function getAll(storeName, indexName = null, keyOrRange = null) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const source = indexName ? store.index(indexName) : store
      const request = keyOrRange ? source.getAll(keyOrRange) : source.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[IndexedDB] getAll from ${storeName} failed:`, err)
    return []
  }
}

export async function get(storeName, key) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[IndexedDB] get from ${storeName} failed:`, err)
    return null
  }
}

export async function put(storeName, data) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.put(data)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[IndexedDB] put to ${storeName} failed:`, err)
    throw err
  }
}

export async function add(storeName, data) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.add(data)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[IndexedDB] add to ${storeName} failed:`, err)
    throw err
  }
}

export async function remove(storeName, key) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.delete(key)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[IndexedDB] remove from ${storeName} failed:`, err)
  }
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function resetDBCache() {
  dbPromise = null
}

export { STORES }
