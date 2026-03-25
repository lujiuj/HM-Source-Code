import { WorksStoreInterface } from '../contracts/WorksStore.js'
import { STORES, getAll, get, put, generateId } from './indexedDBHelper.js'
import { toSerializablePracticeSession } from '../../../learn/utils/toSerializablePracticeSession.js'

export class LocalWorksStore extends WorksStoreInterface {
  async publishWork(work) {
    const id = work.id || generateId('work')
    const record = toSerializablePracticeSession({
      ...work,
      id,
      timestamp: work.timestamp || Date.now(),
      deletedAt: null
    })
    
    await put(STORES.WORKS, record)
    return id
  }

  async listWorks(filter = {}) {
    const all = await getAll(STORES.WORKS)
    let results = all

    if (!filter.includeDeleted) {
      results = results.filter(w => !w.deletedAt)
    }
    
    if (filter.userId) {
      results = results.filter(w => w.userId === filter.userId)
    }
    
    if (filter.songId) {
      results = results.filter(w => w.songId === filter.songId)
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp)
  }

  async getWork(workId) {
    return await get(STORES.WORKS, workId)
  }

  async softDeleteWork(workId, deletedAt) {
    const work = await this.getWork(workId)
    if (!work) return
    
    await put(STORES.WORKS, toSerializablePracticeSession({
      ...work,
      deletedAt
    }))
  }
}
