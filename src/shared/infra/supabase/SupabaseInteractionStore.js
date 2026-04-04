import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseInteractionStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._logger = deps.logger || console
  }

  async listInteractionEvents(uid, limit = 50) {
    try {
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error || !data) return []

      return data.map(record => this._transformRecord(record))
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] listInteractionEvents failed:', error)
      return []
    }
  }

  async markInteractionEventsRead(uid, eventIds, readAt) {
    try {
      if (!eventIds || eventIds.length === 0) return

      const { error } = await this._supabase
        .from('interactions')
        .update({ read_at: readAt })
        .eq('user_id', uid)
        .in('id', eventIds)

      if (error) {
        throw error
      }
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] markInteractionEventsRead failed:', error)
      throw error
    }
  }

  async saveInteractionEvent(event) {
    try {
      const user = await ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        user_id: user.id,
        work_id: event.workId,
        type: event.type,
        actor_snapshot: event.actorSnapshot,
        gift_type: event.giftType,
        gift_count: event.giftCount,
        comment_text: event.commentText,
        timestamp: event.timestamp || Date.now(),
        read_at: null
      }

      const { data, error } = await this._supabase
        .from('interactions')
        .insert(record)
        .select()
        .single()

      if (error) {
        throw error
      }

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] saveInteractionEvent failed:', error)
      throw error
    }
  }

  _transformRecord(record) {
    return {
      id: record.id,
      workId: record.work_id,
      type: record.type,
      actorSnapshot: record.actor_snapshot,
      giftType: record.gift_type,
      giftCount: record.gift_count,
      commentText: record.comment_text,
      timestamp: record.timestamp,
      readAt: record.read_at
    }
  }
}
