import { IdentityStoreInterface } from '../contracts/IdentityStore.js'
import { mergeLearnProfile, readLearnProfile, writeLearnProfile } from '../profileUtils.js'

const LS_UID_KEY = 'karaoke_anonymous_id'
const LS_DISPLAY_NAME_KEY = 'karaoke_display_name'

function emitProfileUpdated(profile) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new CustomEvent('learn-profile-updated', { detail: profile }))
}

export class LocalIdentityStore extends IdentityStoreInterface {
  getUid() {
    let uid = localStorage.getItem(LS_UID_KEY)
    if (!uid) {
      uid = 'anon_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem(LS_UID_KEY, uid)
    }
    return uid
  }

  getDisplayName() {
    return localStorage.getItem(LS_DISPLAY_NAME_KEY) || ''
  }

  setDisplayName(name) {
    const trimmed = name?.trim() || ''
    if (!trimmed) return
    localStorage.setItem(LS_DISPLAY_NAME_KEY, trimmed)
    this.saveProfile({ displayName: trimmed })
  }

  getProfile() {
    return readLearnProfile(this.getUid(), this.getDisplayName())
  }

  saveProfile(patch = {}) {
    const merged = mergeLearnProfile(this.getProfile(), patch, {
      uid: this.getUid(),
      displayName: this.getDisplayName()
    })

    if (merged.displayName) {
      localStorage.setItem(LS_DISPLAY_NAME_KEY, merged.displayName)
    }

    const profile = writeLearnProfile({
      ...merged,
      uid: this.getUid(),
      updatedAt: Date.now()
    })
    emitProfileUpdated(profile)
    return profile
  }
}
