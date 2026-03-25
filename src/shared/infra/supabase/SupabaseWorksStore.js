import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseWorksStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._logger = deps.logger || console
  }

  async getWork(workId) {
    try {
      const { data, error } = await this._supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .single()

      if (error || !data) return null

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] getWork failed:', error)
      return null
    }
  }

  async saveWork(work) {
    try {
      const user = await ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        user_id: user.id,
        song_id: work.songId,
        song_name: work.songName,
        media_id: work.mediaId,
        audio: work.audio,
        analysis: work.analysis,
        created_at: work.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this._supabase
        .from('works')
        .insert(record)
        .select()
        .single()

      if (error) {
        throw error
      }

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] saveWork failed:', error)
      throw error
    }
  }

  async listWorks(uid, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options

      const { data, error } = await this._supabase
        .from('works')
        .select('*')
        .eq('user_id', uid)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) return []

      return data.map(record => this._transformRecord(record))
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] listWorks failed:', error)
      return []
    }
  }

  async deleteWork(workId) {
    try {
      const { error } = await this._supabase
        .from('works')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', workId)

      if (error) {
        throw error
      }
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] deleteWork failed:', error)
      throw error
    }
  }

  _transformRecord(record) {
    return {
      id: record.id,
      songId: record.song_id,
      songName: record.song_name,
      mediaId: record.media_id,
      audio: record.audio,
      analysis: record.analysis,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      deletedAt: record.deleted_at
    }
  }
}
