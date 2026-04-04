import { supabase } from '../../config/supabase.js'

function generatePracticeId() {
  return `practice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class SupabasePracticeStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._mediaStore = deps.mediaStore || null
    this._logger = deps.logger || console
  }

  async _isMediaReferencedByPublishedWork(uid, record) {
    const mediaId = typeof record?.media_id === 'string'
      ? record.media_id
      : (typeof record?.mediaId === 'string' ? record.mediaId : null)
    const songId = typeof record?.song_id === 'string'
      ? record.song_id
      : (typeof record?.songId === 'string' ? record.songId : null)

    if (!uid || !mediaId || !songId) return false

    try {
      const { data, error } = await this._supabase
        .from('works')
        .select('*')
        .eq('song_id', songId)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error || !Array.isArray(data) || data.length === 0) return false
      const work = data[0]
      if (work.deleted_at) return false

      const workMediaId = typeof work.media_id === 'string'
        ? work.media_id
        : (typeof work.audio?.storage_path === 'string' ? work.audio.storage_path : null)

      return workMediaId === mediaId
    } catch (e) {
      this._logger?.warn?.('[SupabasePracticeStore] check work reference failed:', e)
      return true
    }
  }

  async savePracticeSession(uid, session) {
    if (!uid) throw new Error('SupabasePracticeStore.savePracticeSession(): uid is required')

    const practiceId = session.practiceId || session.id || generatePracticeId()
    const now = Date.now()
    const record = {
      user_id: uid,
      practice_id: practiceId,
      song_id: session.songId || null,
      song_name: session.songName || null,
      timestamp: now,
      duration_ms: session.durationMs || session.duration || 0,
      score: session.score || null,
      analysis: session.analysis || null,
      media_id: session.mediaId || null,
      payload: session,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString()
    }

    const { error } = await this._supabase
      .from('practice_sessions')
      .upsert(record, { onConflict: 'user_id,practice_id' })

    if (error) {
      throw new Error(`Failed to save practice session: ${error.message}`)
    }

    return practiceId
  }

  async getPracticeSession(uid, practiceId) {
    if (!uid || !practiceId) return null

    const { data, error } = await this._supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', uid)
      .eq('practice_id', practiceId)
      .single()

    if (error || !data) return null

    return this._transformRecord(data)
  }

  async listPracticeSessions(uid, options = {}) {
    if (!uid) return []

    const { limit = 200, offset = 0 } = options

    const { data, error } = await this._supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    return data.map(record => this._transformRecord(record))
  }

  async deletePracticeSession(uid, practiceId) {
    if (!uid || !practiceId) {
      throw new Error('SupabasePracticeStore.deletePracticeSession(): uid and practiceId are required')
    }

    const { data: record, error: fetchError } = await this._supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', uid)
      .eq('practice_id', practiceId)
      .single()

    if (fetchError || !record) {
      throw new Error(`Practice session not found: ${practiceId}`)
    }

    const isReferenced = await this._isMediaReferencedByPublishedWork(uid, record)
    if (isReferenced) {
      throw new Error('Cannot delete: media is referenced by a published work')
    }

    if (record.media_id && this._mediaStore) {
      try {
        await this._mediaStore.deleteMedia(record.media_id)
      } catch (e) {
        this._logger?.warn?.('[SupabasePracticeStore] failed to delete media:', e)
      }
    }

    const { error } = await this._supabase
      .from('practice_sessions')
      .delete()
      .eq('user_id', uid)
      .eq('practice_id', practiceId)

    if (error) {
      throw new Error(`Failed to delete practice session: ${error.message}`)
    }
  }

  _transformRecord(record) {
    const payload = record.payload || {}
    return {
      ...payload,
      id: record.practice_id || payload.id,
      practiceId: record.practice_id || payload.practiceId,
      userId: record.user_id || payload.userId,
      songId: record.song_id || payload.songId,
      songName: record.song_name || payload.songName,
      timestamp: record.timestamp ?? payload.timestamp,
      durationMs: record.duration_ms ?? payload.durationMs ?? payload.duration,
      score: record.score ?? payload.score,
      analysis: record.analysis ?? payload.analysis,
      mediaId: record.media_id ?? payload.mediaId,
      createdAt: record.created_at ?? payload.createdAt,
      updatedAt: record.updated_at ?? payload.updatedAt
    }
  }
}
