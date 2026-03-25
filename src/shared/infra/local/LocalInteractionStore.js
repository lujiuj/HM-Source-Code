import { InteractionStoreInterface } from '../contracts/InteractionStore.js'
import { STORES, getAll, get, put, remove, generateId } from './indexedDBHelper.js'
import { buildInteractionEvent, normalizeInteractionEvent } from '../interactionEventUtils.js'

export class LocalInteractionStore extends InteractionStoreInterface {
  async _recordInteractionEvent(type, payload = {}) {
    const event = buildInteractionEvent(type, payload)
    if (!event.targetUserId || !event.workId) return null
    if (event.targetUserId === event.actorSnapshot.userId) {
      console.log('[LocalInteractionStore] Skip event: Actor and Target match', event.targetUserId)
      return null
    }

    const id = generateId('interaction')
    await put(STORES.INTERACTION_EVENTS, { ...event, id })
    console.log('[LocalInteractionStore] Wrote event for target:', event.targetUserId)
    return id
  }

  async sendDanmaku(workId, msg) {
    const id = generateId('danmaku')
    const record = {
      ...msg,
      id,
      workId,
      timestamp: msg.timestamp || Date.now()
    }
    
    await put(STORES.DANMAKU, record)
    await this._enforceDanmakuRetention(workId, 200)
    return id
  }

  async listDanmaku(workId, limit = 200) {
    const all = await getAll(STORES.DANMAKU)
    return all
      .filter(d => d.workId === workId)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit)
  }

  async _enforceDanmakuRetention(workId, limit) {
    const all = await getAll(STORES.DANMAKU)
    const forWork = all
      .filter(d => d.workId === workId)
      .sort((a, b) => a.timestamp - b.timestamp)
    
    if (forWork.length <= limit) return
    
    const toDelete = forWork.slice(0, forWork.length - limit)
    for (const item of toDelete) {
      await remove(STORES.DANMAKU, item.id)
    }
  }

  async sendGift(workId, gift) {
    const id = generateId('gift')
    const record = {
      ...gift,
      id,
      workId,
      timestamp: gift.timestamp || Date.now()
    }
    
    await put(STORES.GIFTS, record)
    await this._recordInteractionEvent('gift_sent', {
      ...record,
      actorSnapshot: {
        userId: record.userId,
        username: record.username,
        avatar: record.avatar
      },
      giftType: record.type,
      giftCount: record.count
    })
    return id
  }

  async listGifts(workId, limit = 50) {
    const all = await getAll(STORES.GIFTS)
    return all
      .filter(g => g.workId === workId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  async addComment(workId, comment) {
    const id = generateId('comment')
    const record = {
      ...comment,
      id,
      workId,
      likes: 0,
      timestamp: comment.timestamp || Date.now()
    }
    
    await put(STORES.COMMENTS, record)
    await this._recordInteractionEvent('comment_created', {
      ...record,
      actorSnapshot: {
        userId: record.userId,
        username: record.username,
        avatar: record.avatar
      },
      commentText: record.text
    })
    return id
  }

  async listComments(workId, limit = 200) {
    const all = await getAll(STORES.COMMENTS)
    return all
      .filter(c => c.workId === workId)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit)
  }

  async replyComment(workId, reply) {
    return this.addComment(workId, reply)
  }

  async likeComment(workId, commentId) {
    const comment = await get(STORES.COMMENTS, commentId)
    if (!comment || comment.workId !== workId) return
    
    comment.likes = (comment.likes || 0) + 1
    await put(STORES.COMMENTS, comment)
  }

  async listInteractionEvents(targetUserId, limit = 100) {
    const all = await getAll(STORES.INTERACTION_EVENTS)
    return all
      .filter((event) => event.targetUserId === targetUserId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((event) => normalizeInteractionEvent(event, event.id))
  }

  async markInteractionEventsRead(targetUserId, eventIds = [], readAt = Date.now()) {
    const targetSet = Array.isArray(eventIds) && eventIds.length ? new Set(eventIds) : null
    const events = await getAll(STORES.INTERACTION_EVENTS)
    const updates = events.filter((event) => (
      event.targetUserId === targetUserId
      && !event.readAt
      && (!targetSet || targetSet.has(event.id))
    ))

    for (const event of updates) {
      await put(STORES.INTERACTION_EVENTS, {
        ...event,
        readAt
      })
    }
  }
}
