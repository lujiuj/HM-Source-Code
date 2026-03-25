/**
 * MediaStore contract
 * Manages media storage (recordings, videos)
 * For now: minimal implementation with object URLs
 * Future tasks (8/9) will expand blob persistence
 */

/**
 * @typedef {Object} MediaMetadata
 * @property {string} id - Unique media ID
 * @property {string} userId - User ID of uploader
 * @property {string} type - MIME type
 * @property {number} size - File size in bytes
 * @property {number} timestamp - Unix timestamp
 */

/**
 * Interface definition for MediaStore
 * All adapters must implement these methods
 */
export class MediaStoreInterface {
  /**
   * Store media blob and return object URL
   * @param {Blob} blob - Media blob
   * @param {Object} metadata - Metadata
   * @param {string} metadata.userId - User ID
   * @param {string} metadata.type - MIME type
   * @returns {Promise<{id: string, url: string}>} Media ID and object URL
   */
  async storeMedia(blob, metadata) {
    throw new Error('MediaStore.storeMedia() must be implemented')
  }

  /**
   * Get media object URL by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<string|null>} Object URL or null if not found
   */
  async getMediaUrl(mediaId) {
    throw new Error('MediaStore.getMediaUrl() must be implemented')
  }

  /**
   * Delete media by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<void>}
   */
  async deleteMedia(mediaId) {
    throw new Error('MediaStore.deleteMedia() must be implemented')
  }

  /**
   * Revoke object URL (cleanup)
   * @param {string} url - Object URL to revoke
   */
  revokeObjectUrl(url) {
    throw new Error('MediaStore.revokeObjectUrl() must be implemented')
  }
}
