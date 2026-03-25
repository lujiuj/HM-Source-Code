/**
 * InteractionStore contract
 * Manages live interactions (danmaku, gifts, comments, likes)
 */

/**
 * @typedef {Object} Danmaku
 * @property {string} id - Unique danmaku ID
 * @property {string} workId - The work ID this danmaku is for
 * @property {string} userId - User ID of sender
 * @property {string} username - Display name of sender
 * @property {string} text - Danmaku text content
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} Gift
 * @property {string} id - Unique gift ID
 * @property {string} workId - The work ID
 * @property {string} userId - User ID of sender
 * @property {string} username - Display name of sender
 * @property {string} type - Gift type (e.g., 'flower', 'trophy')
 * @property {number} count - Number of gifts sent
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} Comment
 * @property {string} id - Unique comment ID
 * @property {string} workId - The work ID
 * @property {string} userId - User ID of commenter
 * @property {string} username - Display name of commenter
 * @property {string} text - Comment text
 * @property {string|null} replyTo - Parent comment ID (null for top-level)
 * @property {number} likes - Like count
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} InteractionEvent
 * @property {string} id - Event ID
 * @property {string} type - Event type
 * @property {string} targetUserId - Recipient user ID
 * @property {string} workId - Related work ID
 * @property {Object} actorSnapshot - Lightweight sender snapshot
 * @property {number} timestamp - Unix timestamp
 * @property {number|null} readAt - Read timestamp
 */

/**
 * Interface definition for InteractionStore
 * All adapters must implement these methods
 */
export class InteractionStoreInterface {
  /**
   * Send a danmaku message
   * @param {string} workId - Work ID
   * @param {Omit<Danmaku, 'id'>} msg - Danmaku message data
   * @returns {Promise<string>} Danmaku ID
   */
  async sendDanmaku(workId, msg) {
    throw new Error('InteractionStore.sendDanmaku() must be implemented')
  }

  /**
   * List danmaku messages for a work
   * @param {string} workId - Work ID
   * @param {number} limit - Max messages to return (default: 200)
   * @returns {Promise<Danmaku[]>} List of danmaku messages
   */
  async listDanmaku(workId, limit = 200) {
    throw new Error('InteractionStore.listDanmaku() must be implemented')
  }

  /**
   * Send a gift
   * @param {string} workId - Work ID
   * @param {Omit<Gift, 'id'>} gift - Gift data
   * @returns {Promise<string>} Gift ID
   */
  async sendGift(workId, gift) {
    throw new Error('InteractionStore.sendGift() must be implemented')
  }

  /**
   * List gifts for a work
   * @param {string} workId - Work ID
   * @param {number} limit - Max items to return (default: 50)
   * @returns {Promise<Gift[]>} Gifts
   */
  async listGifts(workId, limit = 50) {
    throw new Error('InteractionStore.listGifts() must be implemented')
  }

  /**
   * Add a comment
   * @param {string} workId - Work ID
   * @param {Omit<Comment, 'id'|'likes'>} comment - Comment data
   * @returns {Promise<string>} Comment ID
   */
  async addComment(workId, comment) {
    throw new Error('InteractionStore.addComment() must be implemented')
  }

  /**
   * List comments for a work
   * @param {string} workId - Work ID
   * @param {number} limit - Max items to return (default: 200)
   * @returns {Promise<Comment[]>} Comments
   */
  async listComments(workId, limit = 200) {
    throw new Error('InteractionStore.listComments() must be implemented')
  }

  /**
   * Reply to a comment
   * @param {string} workId - Work ID
   * @param {Omit<Comment, 'id'|'likes'>} reply - Reply data (includes replyTo)
   * @returns {Promise<string>} Reply ID
   */
  async replyComment(workId, reply) {
    throw new Error('InteractionStore.replyComment() must be implemented')
  }

  /**
   * Like a comment
   * @param {string} workId - Work ID
   * @param {string} commentId - Comment ID to like
   * @returns {Promise<void>}
   */
  async likeComment(workId, commentId) {
    throw new Error('InteractionStore.likeComment() must be implemented')
  }

  /**
   * List interaction events for a target user
   * @param {string} targetUserId
   * @param {number} limit
   * @returns {Promise<InteractionEvent[]>}
   */
  async listInteractionEvents(targetUserId, limit = 100) {
    throw new Error('InteractionStore.listInteractionEvents() must be implemented')
  }

  /**
   * Mark interaction events as read
   * @param {string} targetUserId
   * @param {string[]} [eventIds]
   * @param {number} [readAt]
   * @returns {Promise<void>}
   */
  async markInteractionEventsRead(targetUserId, eventIds = [], readAt = Date.now()) {
    throw new Error('InteractionStore.markInteractionEventsRead() must be implemented')
  }
}
