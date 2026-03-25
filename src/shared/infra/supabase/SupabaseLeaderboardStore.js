import { supabase, ensureAnonymousAuth } from '../../config/supabase.js'

export class SupabaseLeaderboardStore {
  constructor(deps = {}) {
    this._supabase = deps.supabase || supabase
    this._logger = deps.logger || console
  }

  async getLeaderboard(category, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options

      const { data, error } = await this._supabase
        .from('leaderboard')
        .select('*')
        .eq('category', category)
        .order('score', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) return []

      return data.map(record => this._transformRecord(record))
    } catch (error) {
      this._logger?.warn?.('[SupabaseLeaderboardStore] getLeaderboard failed:', error)
      return []
    }
  }

  async addScore(userId, category, score, metadata = {}) {
    try {
      const user = await ensureAnonymousAuth()
      if (!user) throw new Error('User not authenticated')

      const record = {
        user_id: user.id,
        category: category,
        score: score,
        metadata: metadata,
        created_at: new Date().toISOString()
      }

      const { data, error } = await this._supabase
        .from('leaderboard')
        .insert(record)
        .select()
        .single()

      if (error) {
        throw error
      }

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseLeaderboardStore] addScore failed:', error)
      throw error
    }
  }

  async getUserBestScore(userId, category) {
    try {
      const { data, error } = await this._supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('score', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return this._transformRecord(data)
    } catch (error) {
      this._logger?.warn?.('[SupabaseLeaderboardStore] getUserBestScore failed:', error)
      return null
    }
  }

  _transformRecord(record) {
    return {
      id: record.id,
      userId: record.user_id,
      category: record.category,
      score: record.score,
      metadata: record.metadata,
      createdAt: record.created_at
    }
  }
}
