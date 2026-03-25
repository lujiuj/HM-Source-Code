import { supabase } from '../../config/supabase.js'

export class SupabaseMediaStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._bucket = deps.bucket || 'media'
    this._logger = deps.logger || console
  }

  async upload(file, options = {}) {
    const { path, contentType, onProgress } = options
    
    const filePath = path || `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    
    const { data, error } = await this._supabase.storage
      .from(this._bucket)
      .upload(filePath, file, {
        contentType: contentType || file.type,
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = this._supabase.storage
      .from(this._bucket)
      .getPublicUrl(filePath)

    return {
      id: data.path,
      path: data.path,
      url: publicUrl
    }
  }

  async getUrl(path) {
    const { data: { publicUrl } } = this._supabase.storage
      .from(this._bucket)
      .getPublicUrl(path)

    return publicUrl
  }

  async delete(path) {
    const { error } = await this._supabase.storage
      .from(this._bucket)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  async download(path) {
    const { data, error } = await this._supabase.storage
      .from(this._bucket)
      .download(path)

    if (error) {
      throw new Error(`Download failed: ${error.message}`)
    }

    return data
  }
}
