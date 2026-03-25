/**
 * PracticeStore contract
 * Manages practice session data
 */

/**
 * @typedef {Object} PracticeSession
 * @property {string} id - Unique practice session ID
 * @property {string} songId - The song ID that was practiced
 * @property {string} songName - The song name
 * @property {number} score - Overall score (0-100)
 * @property {number} voiceActivity - Voice activity score
 * @property {number} pitchAccuracy - Pitch accuracy score
 * @property {number} stars - Star rating (0-5)
 * @property {string} grade - Grade (SSS, SS, S, A, B, C)
 * @property {number} timestamp - Unix timestamp
 */

/**
 * Interface definition for PracticeStore
 * All adapters must implement these methods
 */
export class PracticeStoreInterface {
  /**
   * Save a practice session
   * @param {string} uid - User ID
   * @param {PracticeSession} session - Practice session data
   * @returns {Promise<string>} Practice session ID
   */
  async savePracticeSession(uid, session) {
    throw new Error('PracticeStore.savePracticeSession() must be implemented')
  }

  /**
   * List all practice sessions for a user
   * @param {string} uid - User ID
   * @returns {Promise<PracticeSession[]>} List of practice sessions
   */
  async listPracticeSessions(uid) {
    throw new Error('PracticeStore.listPracticeSessions() must be implemented')
  }

  /**
   * Delete a specific practice session
   * @param {string} uid - User ID
   * @param {string} practiceId - Practice session ID to delete
   * @returns {Promise<void>}
   */
  async deletePracticeSession(uid, practiceId) {
    throw new Error('PracticeStore.deletePracticeSession() must be implemented')
  }

  /**
   * Enforce retention limit - keep only the most recent N sessions
   * @param {string} uid - User ID
   * @param {number} limit - Maximum number of sessions to keep (default: 50)
   * @returns {Promise<number>} Number of sessions deleted
   */
  async enforceRetention(uid, limit = 50) {
    throw new Error('PracticeStore.enforceRetention() must be implemented')
  }
}
