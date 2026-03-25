/**
 * WorksStore contract
 * Manages published works (performances users want to share)
 */

/**
 * @typedef {Object} Work
 * @property {string} id - Unique work ID
 * @property {string} userId - User ID of the performer
 * @property {string} username - Display name of the performer
 * @property {string} songId - The song ID
 * @property {string} songName - The song name
 * @property {number} score - Performance score
 * @property {number} timestamp - Unix timestamp
 * @property {number|null} deletedAt - Soft delete timestamp (null if active)
 * @property {string|null} mediaUrl - URL to recording (future: blob storage)
 */

/**
 * Interface definition for WorksStore
 * All adapters must implement these methods
 */
export class WorksStoreInterface {
  /**
   * Publish a work
   * @param {Work} work - Work data to publish
   * @returns {Promise<string>} Work ID
   */
  async publishWork(work) {
    throw new Error('WorksStore.publishWork() must be implemented')
  }

  /**
   * List works with optional filtering
   * @param {Object} filter - Filter options
   * @param {string} [filter.userId] - Filter by user ID
   * @param {string} [filter.songId] - Filter by song ID
   * @param {boolean} [filter.includeDeleted=false] - Include soft-deleted works
   * @returns {Promise<Work[]>} List of works
   */
  async listWorks(filter = {}) {
    throw new Error('WorksStore.listWorks() must be implemented')
  }

  /**
   * Get a specific work by ID
   * @param {string} workId - Work ID
   * @returns {Promise<Work|null>} Work data or null if not found
   */
  async getWork(workId) {
    throw new Error('WorksStore.getWork() must be implemented')
  }

  /**
   * Soft delete a work
   * @param {string} workId - Work ID
   * @param {number} deletedAt - Deletion timestamp
   * @returns {Promise<void>}
   */
  async softDeleteWork(workId, deletedAt) {
    throw new Error('WorksStore.softDeleteWork() must be implemented')
  }
}
