import { supabase } from '../../config/supabase.js'

export class SupabaseMediaStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._bucket = deps.bucket || 'media'
    this._logger = deps.logger || console
  }

  async storeMedia(blob, metadata = {}) {
    const filePath = metadata.path || `uploads/${metadata.userId || 'anon'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const contentType = metadata.type || blob.type || 'application/octet-stream'

    const { data, error } = await this._supabase.storage
      .from(this._bucket)
      .upload(filePath, blob, {
        contentType,
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData, error: urlError } = this._supabase.storage
      .from(this._bucket)
      .getPublicUrl(filePath)

    if (urlError) {
      throw new Error(`Failed to resolve public url: ${urlError.message}`)
    }

    return {
      id: data.path,
      path: data.path,
      url: urlData.publicUrl
    }
  }

  async getMediaUrl(mediaId) {
    if (!mediaId) return null

    const { data, error } = this._supabase.storage
      .from(this._bucket)
      .getPublicUrl(mediaId)

    if (error) {
      throw new Error(`Failed to resolve public url: ${error.message}`)
    }

    return data.publicUrl
  }

  async deleteMedia(mediaId) {
    if (!mediaId) return

    const { error } = await this._supabase.storage
      .from(this._bucket)
      .remove([mediaId])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  revokeObjectUrl() {
    // Supabase storage exposes public URLs and does not use browser object URLs.
  }

  async upload(file, options = {}) {
    return this.storeMedia(file, { path: options.path, type: options.contentType, userId: options.userId })
  }
}
