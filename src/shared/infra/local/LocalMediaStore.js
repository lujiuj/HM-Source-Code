import { MediaStoreInterface } from '../contracts/MediaStore.js'
import { STORES, get, put, remove, generateId } from './indexedDBHelper.js'

export class LocalMediaStore extends MediaStoreInterface {
  constructor() {
    super()
    this._objectUrls = new Map()
  }

  async storeMedia(blob, metadata) {
    const id = generateId('media')
    const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(blob)
      : `memory:${id}`
    
    const record = {
      id,
      userId: metadata.userId,
      type: metadata.type || blob.type,
      size: blob.size,
      timestamp: Date.now(),
      blob
    }
    
    await put(STORES.MEDIA, record)
    this._objectUrls.set(id, url)
    
    return { id, url }
  }

  async getMediaUrl(mediaId) {
    if (this._objectUrls.has(mediaId)) {
      return this._objectUrls.get(mediaId)
    }
    
    const record = await get(STORES.MEDIA, mediaId)
    if (!record) return null

    if (typeof record.url === 'string' && record.url) {
      this._objectUrls.set(mediaId, record.url)
      return record.url
    }

    if (!record.blob) return null

    const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(record.blob)
      : `memory:${mediaId}`
    this._objectUrls.set(mediaId, url)
    return url
  }

  async deleteMedia(mediaId) {
    const url = this._objectUrls.get(mediaId)
    if (url) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url)
      }
      this._objectUrls.delete(mediaId)
    }
    
    await remove(STORES.MEDIA, mediaId)
  }

  revokeObjectUrl(url) {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url)
    }
    
    for (const [id, storedUrl] of this._objectUrls.entries()) {
      if (storedUrl === url) {
        this._objectUrls.delete(id)
        break
      }
    }
  }
}
