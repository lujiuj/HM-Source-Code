import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

function emitProfileUpdated(profile) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new CustomEvent('learn-profile-updated', { detail: profile }))
}

function normalizeProfile(record) {
  if (!record) return null
  return {
    uid: record.user_id || record.uid || null,
    userId: record.user_id || record.userId || null,
    displayName: record.display_name || record.displayName || '戏友',
    avatar: record.avatar || null,
    level: record.level ?? record.level ?? 1,
    totalExp: record.total_exp ?? record.totalExp ?? 0,
    giftBalance: record.gift_balance ?? record.giftBalance ?? 0,
    unreadInteractionCount: record.unread_interaction_count ?? record.unreadInteractionCount ?? 0,
    notifications: record.notifications || {},
    journey: record.journey || {},
    createdAt: record.created_at || record.createdAt || new Date().toISOString(),
    updatedAt: record.updated_at || record.updatedAt || new Date().toISOString()
  }
}

function mergeProfile(current, patch = {}) {
  return {
    ...current,
    ...patch,
    notifications: {
      ...(current?.notifications || {}),
      ...(patch?.notifications || {})
    },
    journey: {
      ...(current?.journey || {}),
      ...(patch?.journey || {})
    }
  }
}

export class SupabaseIdentityStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._ensureAnonymousAuth = deps.ensureAnonymousAuth || ensureAnonymousAuth
    this._logger = deps.logger || console
    this._profileCache = null
    this._uid = null
    this._initPromise = null
  }

  async initialize() {
    if (this._initPromise) return this._initPromise

    this._initPromise = (async () => {
      try {
        const user = await this._ensureAnonymousAuth()
        this._uid = user?.id || null
        this._profileCache = await this._fetchOrCreateProfile()
        return this._profileCache
      } catch (error) {
        this._logger?.warn?.('[SupabaseIdentityStore] initialize failed:', error)
        this._profileCache = this._getDefaultProfile(this._uid)
        return this._profileCache
      } finally {
        this._initPromise = null
      }
    })()

    return this._initPromise
  }

  getUid() {
    return this._uid
  }

  getDisplayName() {
    return this.getProfile()?.displayName || ''
  }

  setDisplayName(name) {
    const trimmed = name?.trim() || ''
    if (!trimmed) return
    return this.saveProfile({ displayName: trimmed })
  }

  getProfile() {
    if (this._profileCache) {
      return this._profileCache
    }
    return this._getDefaultProfile(this._uid)
  }

  async _fetchOrCreateProfile() {
    if (!this._uid) {
      return this._getDefaultProfile()
    }

    const { data, error } = await this._supabase
      .from('profiles')
      .select('*')
      .eq('user_id', this._uid)
      .single()

    if (error || !data) {
      const defaultProfile = this._getDefaultProfile(this._uid)
      await this.saveProfile(defaultProfile)
      return defaultProfile
    }

    return normalizeProfile(data)
  }

  async saveProfile(profile = {}) {
    try {
      const user = await this._ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      this._uid = user.id
      const currentProfile = this.getProfile()
      const mergedProfile = mergeProfile(currentProfile, profile)
      const record = {
        user_id: user.id,
        display_name: mergedProfile.displayName || '戏友',
        avatar: mergedProfile.avatar || null,
        level: mergedProfile.level ?? 1,
        total_exp: mergedProfile.totalExp ?? 0,
        gift_balance: mergedProfile.giftBalance ?? 0,
        unread_interaction_count: mergedProfile.unreadInteractionCount ?? 0,
        notifications: mergedProfile.notifications || {},
        journey: mergedProfile.journey || {},
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this._supabase
        .from('profiles')
        .upsert(record, { onConflict: 'user_id' })
        .select()
        .maybeSingle()

      if (error) {
        throw error
      }

      this._profileCache = normalizeProfile(Array.isArray(data) ? data[0] : data)
      emitProfileUpdated(this._profileCache)
      return this._profileCache
    } catch (error) {
      this._logger?.warn?.('[SupabaseIdentityStore] saveProfile failed:', error)
      throw error
    }
  }

  _getDefaultProfile(uid = null) {
    return {
      uid,
      userId: uid,
      displayName: '戏友',
      avatar: null,
      level: 1,
      totalExp: 0,
      giftBalance: 0,
      unreadInteractionCount: 0,
      notifications: {},
      journey: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}
