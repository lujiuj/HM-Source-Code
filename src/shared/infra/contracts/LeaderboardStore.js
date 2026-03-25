/**
 * LeaderboardStore contract
 * Manages song-based leaderboards
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} userId - User ID
 * @property {string} username - Display name
 * @property {number} score - Score (0-100)
 * @property {number} stars - Star rating (0-5)
 * @property {string} grade - Grade (SSS, SS, S, A, B, C)
 * @property {number} timestamp - Unix timestamp
 */

/**
 * Interface definition for LeaderboardStore
 * All adapters must implement these methods
 */
export class LeaderboardStoreInterface {
  /**
   * Upsert best score for a user on a specific song
   * (Only updates if new score is better than existing)
   * @param {string} songId - Song ID
   * @param {string} uid - User ID
   * @param {LeaderboardEntry} entry - Leaderboard entry data
   * @returns {Promise<void>}
   */
  async upsertBestBySong(songId, uid, entry) {
    throw new Error('LeaderboardStore.upsertBestBySong() must be implemented')
  }

  /**
   * List top scores for a song
   * @param {string} songId - Song ID
   * @param {number} limit - Max entries to return (default: 10)
   * @returns {Promise<LeaderboardEntry[]>} List of leaderboard entries (sorted by score desc)
   */
  async listBySong(songId, limit = 10) {
    throw new Error('LeaderboardStore.listBySong() must be implemented')
  }

  /**
   * Get a user's entry for a song (if exists)
   * @param {string} songId
   * @param {string} uid
   * @returns {Promise<LeaderboardEntry|null>}
   */
  async getBySongAndUser(songId, uid) {
    throw new Error('LeaderboardStore.getBySongAndUser() must be implemented')
  }

  /**
   * Get official pinned entry for a song (not in Top50)
   * @param {string} songId
   * @returns {Promise<LeaderboardEntry|null>}
   */
  async getOfficialBySong(songId) {
    throw new Error('LeaderboardStore.getOfficialBySong() must be implemented')
  }
}
