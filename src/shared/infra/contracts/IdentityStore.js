/**
 * IdentityStore contract
 * Manages user identity (uid, display name)
 */

/**
 * @typedef {Object} IdentityStore
 * @property {function(): string} getUid - Get the current user's unique ID
 * @property {function(): string} getDisplayName - Get the current user's display name
 * @property {function(string): void} setDisplayName - Set the user's display name
 * @property {function(): object} getProfile - Get the current user's learn profile
 * @property {function(object): Promise<object>|object} saveProfile - Merge and persist the user's learn profile
 */

/**
 * Interface definition for IdentityStore
 * All adapters must implement these methods
 */
export class IdentityStoreInterface {
  /**
   * Get the current user's unique ID
   * @returns {string} User ID (anonymous or authenticated)
   */
  getUid() {
    throw new Error('IdentityStore.getUid() must be implemented')
  }

  /**
   * Get the current user's display name
   * @returns {string} Display name
   */
  getDisplayName() {
    throw new Error('IdentityStore.getDisplayName() must be implemented')
  }

  /**
   * Set the user's display name
   * @param {string} name - The display name to set
   */
  setDisplayName(name) {
    throw new Error('IdentityStore.setDisplayName() must be implemented')
  }

  /**
   * Get the user's learn profile
   * @returns {object}
   */
  getProfile() {
    throw new Error('IdentityStore.getProfile() must be implemented')
  }

  /**
   * Merge and persist the user's learn profile
   * @param {object} patch
   * @returns {Promise<object>|object}
   */
  saveProfile(patch) {
    throw new Error('IdentityStore.saveProfile() must be implemented')
  }
}
