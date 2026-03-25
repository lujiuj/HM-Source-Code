/**
 * IndexedDB cache for audio analysis results
 * Prevents re-analyzing the same audio files
 */

const DB_NAME = 'hmx_analysis_cache'
const STORE_NAME = 'analyses'
const DB_VERSION = 1

let dbPromise = null

/**
 * Open/create the IndexedDB database
 */
function openDB() {
  if (dbPromise) return dbPromise
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      console.warn('IndexedDB open failed:', request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
  
  return dbPromise
}

/**
 * Get cached analysis result by song ID
 * @param {string} songId - The song identifier
 * @returns {Promise<object|null>} Cached analysis data or null
 */
export async function getCachedAnalysis(songId) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(songId)
      
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          console.log(`[AnalysisCache] Hit for ${songId}`)
          resolve(result.data)
        } else {
          console.log(`[AnalysisCache] Miss for ${songId}`)
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[AnalysisCache] Get failed:', err)
    return null
  }
}

/**
 * Store analysis result in cache
 * @param {string} songId - The song identifier
 * @param {object} data - Analysis data to cache
 */
export async function setCachedAnalysis(songId, data) {
  try {
    // Ensure data is serializable for IndexedDB structured cloning.
    let safeData = data
    try {
      safeData = JSON.parse(JSON.stringify(data))
    } catch {
      // Cache is optional; skip on non-serializable data.
      return
    }

    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put({
        id: songId,
        data: safeData,
        timestamp: Date.now()
      })
      
      request.onsuccess = () => {
        console.log(`[AnalysisCache] Stored ${songId}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[AnalysisCache] Set failed:', err)
    // Silently fail - cache is optional optimization
  }
}

/**
 * Clear all cached analyses
 */
export async function clearAnalysisCache() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log('[AnalysisCache] Cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[AnalysisCache] Clear failed:', err)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      
      countReq.onsuccess = () => {
        resolve({ count: countReq.result })
      }
      countReq.onerror = () => reject(countReq.error)
    })
  } catch (err) {
    return { count: 0, error: err.message }
  }
}
