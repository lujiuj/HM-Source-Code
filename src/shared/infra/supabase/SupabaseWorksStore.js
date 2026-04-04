import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseWorksStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._ensureAnonymousAuth = deps.ensureAnonymousAuth || ensureAnonymousAuth
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
      const user = await this._ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        user_id: user.id,
        song_id: work.songId,
        song_name: work.songName,
        media_id: work.mediaId,
        audio: work.audio,
        payload: work,
        deleted_at: work.deletedAt || null,
        created_at: work.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(work.id ? { id: work.id } : {})
      }

      const { data, error } = await this._supabase
        .from('works')
        .upsert(record, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (error) {
        throw error
      }

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] saveWork failed:', error)
      throw error
    }
  }

  async publishWork(work) {
    const saved = await this.saveWork(work)
    return saved?.id
  }

  async listWorks(filter = {}) {
    try {
      const { userId, songId, includeDeleted = false, limit = 100, offset = 0 } = typeof filter === 'string' ? { userId: filter } : filter
      const query = this._supabase.from('works').select('*')
      if (userId) query.eq('user_id', userId)
      if (songId) query.eq('song_id', songId)
      if (!includeDeleted) query.is('deleted_at', null)
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) return []

      return data.map(record => this._transformRecord(record))
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] listWorks failed:', error)
      return []
    }
  }

  async softDeleteWork(workId, deletedAt = Date.now()) {
    try {
      const { error } = await this._supabase
        .from('works')
        .update({ deleted_at: new Date(deletedAt).toISOString() })
        .eq('id', workId)

      if (error) {
        throw error
      }
    } catch (error) {
      this._logger?.warn?.('[SupabaseWorksStore] softDeleteWork failed:', error)
      throw error
    }
  }

  _transformRecord(record) {
    const payload = record.payload || {}
    return {
      ...payload,
      id: record.id || payload.id,
      userId: record.user_id || payload.userId,
      songId: record.song_id || payload.songId,
      songName: record.song_name || payload.songName,
      mediaId: record.media_id || payload.mediaId,
      audio: record.audio ?? payload.audio,
      mediaUrl: record.media_url ?? payload.mediaUrl,
      createdAt: record.created_at ?? payload.createdAt,
      updatedAt: record.updated_at ?? payload.updatedAt,
      deletedAt: record.deleted_at ?? payload.deletedAt
    }
  }
}
