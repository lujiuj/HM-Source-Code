import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseIdentityStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._logger = deps.logger || console
    this._profileCache = null
  }

  async getUid() {
    try {
      const user = await ensureAnonymousAuth()
      return user.id
    } catch (error) {
      this._logger?.warn?.('[SupabaseIdentityStore] getUid failed:', error)
      return null
    }
  }

  async getProfile() {
    try {
      const user = await ensureAnonymousAuth()
      if (!user) return null

      if (this._profileCache) {
        return this._profileCache
      }

      const { data, error } = await this._supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        // 如果没有记录，返回默认配置
        const defaultProfile = this._getDefaultProfile(user.id)
        await this.saveProfile(defaultProfile)
        this._profileCache = defaultProfile
        return defaultProfile
      }

      this._profileCache = data
      return data
    } catch (error) {
      this._logger?.warn?.('[SupabaseIdentityStore] getProfile failed:', error)
      return this._getDefaultProfile()
    }
  }

  async saveProfile(profile) {
    try {
      const user = await ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        user_id: user.id,
        display_name: profile.displayName || '戏友',
        avatar: profile.avatar || null,
        level: profile.level || 1,
        total_exp: profile.totalExp || 0,
        gift_balance: profile.giftBalance || 0,
        unread_interaction_count: profile.unreadInteractionCount || 0,
        notifications: profile.notifications || {},
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this._supabase
        .from('profiles')
        .upsert(record, { onConflict: 'user_id' })

      if (error) {
        throw error
      }

      this._profileCache = data[0]
      return data[0]
    } catch (error) {
      this._logger?.warn?.('[SupabaseIdentityStore] saveProfile failed:', error)
      throw error
    }
  }

  _getDefaultProfile(uid = null) {
    return {
      user_id: uid,
      display_name: '戏友',
      avatar: null,
      level: 1,
      total_exp: 0,
      gift_balance: 0,
      unread_interaction_count: 0,
      notifications: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}
