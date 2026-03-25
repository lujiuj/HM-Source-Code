import { LeaderboardStoreInterface } from '../contracts/LeaderboardStore.js'
import { STORES, getAll, get, put } from './indexedDBHelper.js'

export class LocalLeaderboardStore extends LeaderboardStoreInterface {
  async upsertBestBySong(songId, uid, entry) {
    const key = [songId, uid]

    await put(STORES.LEADERBOARDS, {
      ...entry,
      songId,
      userId: uid,
      timestamp: entry.timestamp || Date.now()
    })
  }

  async listBySong(songId, limit = 10) {
    const all = await getAll(STORES.LEADERBOARDS)
    return all
      .filter(e => e.songId === songId)
      .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
        return (b.timestamp || 0) - (a.timestamp || 0)
      })
      .slice(0, limit)
  }

  async getBySongAndUser(songId, uid) {
    const key = [songId, uid]
    const entry = await get(STORES.LEADERBOARDS, key)
    return entry || null
  }

  async getOfficialBySong(_songId) {
    return null
  }
}
