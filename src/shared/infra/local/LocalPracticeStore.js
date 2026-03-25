import { PracticeStoreInterface } from '../contracts/PracticeStore.js'
import { STORES, getAll, put, remove, generateId } from './indexedDBHelper.js'
import { toSerializablePracticeSession } from '../../../learn/utils/toSerializablePracticeSession.js'

export class LocalPracticeStore extends PracticeStoreInterface {
  constructor({ mediaStore } = {}) {
    super()
    this._mediaStore = mediaStore || null
  }

  async _isMediaReferencedByPublishedWork(uid, mediaId) {
    if (!uid || !mediaId) return false
    const works = await getAll(STORES.WORKS)
    return works.some((work) => (
      work
      && work.userId === uid
      && !work.deletedAt
      && work.mediaId === mediaId
    ))
  }

  async savePracticeSession(uid, session) {
    const id = session.id || generateId('practice')
    const record = toSerializablePracticeSession({
      ...session,
      id,
      userId: uid,
      timestamp: session.timestamp || Date.now()
    })
    
    await put(STORES.PRACTICE_SESSIONS, record)
    await this.enforceRetention(uid, 50)
    return id
  }

  async listPracticeSessions(uid) {
    const all = await getAll(STORES.PRACTICE_SESSIONS)
    return all
      .filter(s => s.userId === uid)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async deletePracticeSession(uid, practiceId) {
    const record = await getAll(STORES.PRACTICE_SESSIONS)
      .then(all => all.find(s => s.id === practiceId && s.userId === uid))
    
    if (record) {
      if (this._mediaStore && record.mediaId) {
        try {
          const referenced = await this._isMediaReferencedByPublishedWork(uid, record.mediaId)
          if (!referenced) await this._mediaStore.deleteMedia(record.mediaId)
        } catch (e) {
          console.warn('[PracticeStore] delete media failed:', e)
        }
      }
      await remove(STORES.PRACTICE_SESSIONS, practiceId)
    }
  }

  async enforceRetention(uid, limit = 50) {
    const sessions = await this.listPracticeSessions(uid)
    if (sessions.length <= limit) return 0
    
    const toDelete = sessions.slice(limit)
    for (const session of toDelete) {
      if (this._mediaStore && session.mediaId) {
        try {
          const referenced = await this._isMediaReferencedByPublishedWork(uid, session.mediaId)
          if (!referenced) await this._mediaStore.deleteMedia(session.mediaId)
        } catch (e) {
          console.warn('[PracticeStore] delete media failed:', e)
        }
      }
      await remove(STORES.PRACTICE_SESSIONS, session.id)
    }
    
    return toDelete.length
  }
}
