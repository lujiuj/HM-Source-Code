import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseInteractionStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._ensureAnonymousAuth = deps.ensureAnonymousAuth || ensureAnonymousAuth
    this._logger = deps.logger || console
  }

  async _insertInteractionRecord(record) {
    const { data, error } = await this._supabase
      .from('interactions')
      .insert(record)
      .select()
      .single()

    if (error) throw error
    return data
  }

  _toTimestamp(value, fallback = Date.now()) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return fallback
  }

  _toIsoTimestamp(value) {
    return new Date(this._toTimestamp(value)).toISOString()
  }

  _transformCommentRecord(record) {
    const payload = record?.content || {}
    return {
      ...payload,
      id: record.id || payload.id,
      workId: record.work_id || payload.workId,
      userId: payload.userId || record.user_id,
      username: payload.username || payload.userName || '戏友',
      userName: payload.userName || payload.username || '戏友',
      avatar: payload.avatar || payload.userAvatar || '',
      userAvatar: payload.userAvatar || payload.avatar || '',
      text: payload.text || payload.content || '',
      content: payload.content || payload.text || '',
      replyTo: payload.replyTo || null,
      likes: Number(payload.likes || 0),
      timestamp: this._toTimestamp(payload.timestamp, this._toTimestamp(record.created_at)),
      createdAt: payload.createdAt || payload.timestamp || this._toTimestamp(record.created_at)
    }
  }

  _transformGiftRecord(record) {
    const payload = record?.content || {}
    return {
      ...payload,
      id: record.id || payload.id,
      workId: record.work_id || payload.workId,
      userId: payload.userId || record.user_id,
      username: payload.username || payload.userName || '戏友',
      userName: payload.userName || payload.username || '戏友',
      avatar: payload.avatar || payload.userAvatar || '',
      userAvatar: payload.userAvatar || payload.avatar || '',
      type: payload.type || 'flower',
      count: Number(payload.count || 1),
      timestamp: this._toTimestamp(payload.timestamp, this._toTimestamp(record.created_at)),
      createdAt: payload.createdAt || payload.timestamp || this._toTimestamp(record.created_at)
    }
  }

  _transformDanmakuRecord(record) {
    const payload = record?.content || {}
    return {
      ...payload,
      id: record.id || payload.id,
      workId: record.work_id || payload.workId,
      userId: payload.userId || record.user_id,
      username: payload.username || payload.userName || '戏友',
      userName: payload.userName || payload.username || '戏友',
      avatar: payload.avatar || payload.userAvatar || '',
      userAvatar: payload.userAvatar || payload.avatar || '',
      text: payload.text || payload.content || '',
      content: payload.content || payload.text || '',
      timeMs: Number(payload.timeMs || 0),
      timestamp: this._toTimestamp(payload.timestamp, this._toTimestamp(record.created_at)),
      createdAt: payload.createdAt || payload.timestamp || this._toTimestamp(record.created_at)
    }
  }

  async _recordInteractionEvent(type, payload = {}) {
    const targetUserId = payload?.targetUserId
    const actorUserId = payload?.actorSnapshot?.userId || payload?.userId
    if (!targetUserId || !payload?.workId || !actorUserId || targetUserId === actorUserId) return null

    const eventRecord = {
      work_id: payload.workId,
      user_id: targetUserId,
      type,
      content: {
        targetUserId,
        workId: payload.workId,
        actorSnapshot: payload.actorSnapshot || {
          userId: actorUserId,
          username: payload.username || '戏友',
          avatar: payload.avatar || ''
        },
        commentText: payload.commentText || payload.text || '',
        giftType: payload.giftType || payload.type || '',
        giftCount: Number(payload.giftCount || payload.count || 0),
        timestamp: this._toTimestamp(payload.timestamp)
      },
      read_at: null,
      created_at: this._toIsoTimestamp(payload.timestamp)
    }

    const inserted = await this._insertInteractionRecord(eventRecord)
    return inserted?.id || null
  }

  async sendDanmaku(workId, msg) {
    try {
      const user = await this._ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        work_id: workId,
        user_id: msg.userId || user.id,
        type: 'danmaku',
        content: {
          ...msg,
          workId,
          userId: msg.userId || user.id,
          timestamp: this._toTimestamp(msg.timestamp)
        },
        read_at: null,
        created_at: this._toIsoTimestamp(msg.timestamp)
      }

      const inserted = await this._insertInteractionRecord(record)
      return inserted?.id
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] sendDanmaku failed:', error)
      throw error
    }
  }

  async listDanmaku(workId, limit = 200) {
    try {
      const safeLimit = Math.max(1, Number(limit) || 200)
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('work_id', workId)
        .eq('type', 'danmaku')
        .order('created_at', { ascending: false })
        .range(0, safeLimit - 1)

      if (error || !Array.isArray(data)) return []
      return data.map((record) => this._transformDanmakuRecord(record)).reverse()
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] listDanmaku failed:', error)
      return []
    }
  }

  async sendGift(workId, gift) {
    try {
      const user = await this._ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const payload = {
        ...gift,
        workId,
        userId: gift.userId || user.id,
        count: Number(gift.count || 1),
        timestamp: this._toTimestamp(gift.timestamp)
      }

      const record = {
        work_id: workId,
        user_id: payload.userId,
        type: 'gift',
        content: payload,
        read_at: null,
        created_at: this._toIsoTimestamp(payload.timestamp)
      }

      const inserted = await this._insertInteractionRecord(record)
      await this._recordInteractionEvent('gift_sent', {
        ...payload,
        actorSnapshot: payload.actorSnapshot || {
          userId: payload.userId,
          username: payload.username || '戏友',
          avatar: payload.avatar || ''
        },
        giftType: payload.type,
        giftCount: payload.count
      })
      return inserted?.id
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] sendGift failed:', error)
      throw error
    }
  }

  async listGifts(workId, limit = 50) {
    try {
      const safeLimit = Math.max(1, Number(limit) || 50)
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('work_id', workId)
        .eq('type', 'gift')
        .order('created_at', { ascending: false })
        .range(0, safeLimit - 1)

      if (error || !Array.isArray(data)) return []
      return data.map((record) => this._transformGiftRecord(record))
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] listGifts failed:', error)
      return []
    }
  }

  async addComment(workId, comment) {
    try {
      const user = await this._ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const payload = {
        ...comment,
        workId,
        userId: comment.userId || user.id,
        likes: Number(comment.likes || 0),
        timestamp: this._toTimestamp(comment.timestamp)
      }

      const record = {
        work_id: workId,
        user_id: payload.userId,
        type: 'comment',
        content: payload,
        read_at: null,
        created_at: this._toIsoTimestamp(payload.timestamp)
      }

      const inserted = await this._insertInteractionRecord(record)
      await this._recordInteractionEvent('comment_created', {
        ...payload,
        actorSnapshot: payload.actorSnapshot || {
          userId: payload.userId,
          username: payload.username || '戏友',
          avatar: payload.avatar || ''
        },
        commentText: payload.text
      })
      return inserted?.id
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] addComment failed:', error)
      throw error
    }
  }

  async listComments(workId, limit = 200) {
    try {
      const safeLimit = Math.max(1, Number(limit) || 200)
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('work_id', workId)
        .eq('type', 'comment')
        .order('created_at', { ascending: false })
        .range(0, safeLimit - 1)

      if (error || !Array.isArray(data)) return []
      return data.map((record) => this._transformCommentRecord(record)).reverse()
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] listComments failed:', error)
      return []
    }
  }

  async replyComment(workId, reply) {
    return this.addComment(workId, reply)
  }

  async likeComment(workId, commentId) {
    try {
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('id', commentId)
        .eq('work_id', workId)
        .eq('type', 'comment')
        .single()

      if (error || !data) return

      const content = data.content || {}
      const likes = Number(content.likes || 0) + 1
      const { error: updateError } = await this._supabase
        .from('interactions')
        .update({
          content: {
            ...content,
            likes
          }
        })
        .eq('id', commentId)

      if (updateError) throw updateError
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] likeComment failed:', error)
      throw error
    }
  }

  async listInteractionEvents(uid, limit = 50) {
    try {
      const safeLimit = Math.max(1, Number(limit) || 50)
      const { data, error } = await this._supabase
        .from('interactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(0, safeLimit * 3 - 1)

      if (error || !Array.isArray(data)) return []

      return data
        .filter((record) => record.type === 'gift_sent' || record.type === 'comment_created')
        .map((record) => this._transformRecord(record))
        .slice(0, safeLimit)
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] listInteractionEvents failed:', error)
      return []
    }
  }

  async markInteractionEventsRead(uid, eventIds, readAt) {
    try {
      const readAtIso = this._toIsoTimestamp(readAt)
      const targetIds = Array.isArray(eventIds) ? eventIds.filter(Boolean) : []

      if (!targetIds.length) {
        const { error } = await this._supabase
          .from('interactions')
          .update({ read_at: readAtIso })
          .eq('user_id', uid)
          .is('read_at', null)
          .in('type', ['gift_sent', 'comment_created'])

        if (error) throw error
        return
      }

      for (const eventId of targetIds) {
        const { error } = await this._supabase
          .from('interactions')
          .update({ read_at: readAtIso })
          .eq('user_id', uid)
          .eq('id', eventId)

        if (error) throw error
      }
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] markInteractionEventsRead failed:', error)
      throw error
    }
  }

  async saveInteractionEvent(event) {
    try {
      const targetUserId = event?.targetUserId
      if (!targetUserId) throw new Error('Target user is required')
      await this._ensureAnonymousAuth()

      const record = {
        user_id: targetUserId,
        work_id: event.workId,
        type: event.type,
        content: {
          targetUserId,
          workId: event.workId,
          actorSnapshot: event.actorSnapshot || {},
          giftType: event.giftType,
          giftCount: Number(event.giftCount || 0),
          commentText: event.commentText || '',
          timestamp: this._toTimestamp(event.timestamp)
        },
        read_at: null
      }

      const data = await this._insertInteractionRecord(record)

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseInteractionStore] saveInteractionEvent failed:', error)
      throw error
    }
  }

  _transformRecord(record) {
    const payload = record?.content || {}
    return {
      id: record.id,
      workId: record.work_id,
      type: record.type,
      targetUserId: payload.targetUserId || record.user_id,
      actorSnapshot: payload.actorSnapshot || {},
      giftType: payload.giftType || '',
      giftCount: Number(payload.giftCount || 0),
      commentText: payload.commentText || '',
      timestamp: this._toTimestamp(payload.timestamp, this._toTimestamp(record.created_at)),
      readAt: record.read_at ? this._toTimestamp(record.read_at, null) : null
    }
  }
}
