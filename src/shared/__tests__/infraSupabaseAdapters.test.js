import { describe, it, expect, beforeEach, vi } from 'vitest'

const supabaseConfigMocks = vi.hoisted(() => {
  return {
    ensureAnonymousAuth: vi.fn(async () => ({ id: 'anon_test' })),
    supabase: {
      from: vi.fn()
    }
  }
})

vi.mock('../config/supabase.js', () => ({
  ensureAnonymousAuth: supabaseConfigMocks.ensureAnonymousAuth,
  supabase: supabaseConfigMocks.supabase
}))

function createQuery(response = {}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(async () => response.range || { data: null, error: null }),
    single: vi.fn(async () => response.single || { data: null, error: null }),
    maybeSingle: vi.fn(async () => response.maybeSingle || { data: null, error: null }),
    upsert: vi.fn(() => query),
    delete: vi.fn(() => query),
    update: vi.fn(() => query),
    remove: vi.fn(() => query),
    then(onFulfilled, onRejected) {
      const payload = response.upsert || response.delete || response.update || response.remove || { data: null, error: null }
      return Promise.resolve(payload).then(onFulfilled, onRejected)
    },
    catch(onRejected) {
      const payload = response.upsert || response.delete || response.update || response.remove || { data: null, error: null }
      return Promise.resolve(payload).catch(onRejected)
    }
  }
  return query
}

function createSupabaseStub(tableResponses = {}) {
  return {
    from: vi.fn((table) => createQuery(tableResponses[table] || {})),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'uploads/demo-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/demo-path' }, error: null })),
        remove: vi.fn(async () => ({ error: null }))
      }))
    }
  }
}

beforeEach(() => {
  vi.resetModules()
  supabaseConfigMocks.ensureAnonymousAuth.mockClear()
  supabaseConfigMocks.supabase.from.mockClear()
})

describe('SupabaseIdentityStore', () => {
  it('initializes with anonymous uid and normalized profile', async () => {
    const { SupabaseIdentityStore } = await import('../infra/supabase/SupabaseIdentityStore.js')
    const profileRecord = {
      user_id: 'anon_test',
      display_name: '戏友',
      avatar: null,
      level: 1,
      total_exp: 0,
      gift_balance: 0,
      unread_interaction_count: 0,
      notifications: {},
      journey: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }

    const supabase = createSupabaseStub({
      profiles: {
        single: { data: null, error: { message: 'Not found' } },
        maybeSingle: { data: profileRecord, error: null },
        upsert: { data: profileRecord, error: null }
      }
    })

    const store = new SupabaseIdentityStore({ supabase, ensureAnonymousAuth: supabaseConfigMocks.ensureAnonymousAuth })
    const profile = await store.initialize()

    expect(profile).toEqual(expect.objectContaining({ userId: 'anon_test', displayName: '戏友' }))
    expect(store.getUid()).toBe('anon_test')
    expect(store.getDisplayName()).toBe('戏友')
    expect(store.getProfile().displayName).toBe('戏友')
    expect(supabaseConfigMocks.ensureAnonymousAuth).toHaveBeenCalledTimes(2)
  })

  it('saveProfile merges patch and keeps existing nested fields', async () => {
    const { SupabaseIdentityStore } = await import('../infra/supabase/SupabaseIdentityStore.js')
    const supabase = createSupabaseStub({
      profiles: {
        single: { data: null, error: { message: 'Not found' } },
        maybeSingle: { data: {
          user_id: 'anon_test',
          display_name: '小明',
          avatar: null,
          level: 1,
          total_exp: 0,
          gift_balance: 0,
          unread_interaction_count: 0,
          notifications: { lastReadAt: 123 },
          journey: { stages: ['start'] },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z'
        }, error: null },
        upsert: { data: {
          user_id: 'anon_test',
          display_name: '小明',
          avatar: null,
          level: 1,
          total_exp: 0,
          gift_balance: 0,
          unread_interaction_count: 0,
          notifications: { lastReadAt: 123 },
          journey: { stages: ['start'] },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z'
        }, error: null }
      }
    })

    const store = new SupabaseIdentityStore({ supabase, ensureAnonymousAuth: supabaseConfigMocks.ensureAnonymousAuth })
    await store.initialize()

    const updated = await store.saveProfile({ displayName: '小明', notifications: { lastReadAt: 123 } })
    expect(updated.displayName).toBe('小明')
    expect(updated.notifications.lastReadAt).toBe(123)
    expect(updated.journey).toEqual({ stages: ['start'] })
    expect(store.getDisplayName()).toBe('小明')
  })
})

describe('SupabasePracticeStore', () => {
  it('saves and returns transformed practice sessions', async () => {
    const { SupabasePracticeStore } = await import('../infra/supabase/SupabasePracticeStore.js')
    const practiceSession = {
      practiceId: 'practice_1',
      songId: 'song1',
      songName: '女驸马',
      score: 92,
      mediaId: 'media_1',
      analysis: { pitch: 95 },
      timestamp: 1670000000000
    }

    const supabase = createSupabaseStub({
      practice_sessions: {
        upsert: { data: null, error: null },
        range: { data: [{
          practice_id: 'practice_1',
          user_id: 'anon_test',
          song_id: 'song1',
          song_name: '女驸马',
          timestamp: 1670000000000,
          duration_ms: 0,
          score: 92,
          analysis: { pitch: 95 },
          media_id: 'media_1',
          payload: practiceSession,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }], error: null }
      }
    })

    const store = new SupabasePracticeStore({ supabase })
    const savedId = await store.savePracticeSession('anon_test', practiceSession)
    expect(savedId).toBe('practice_1')

    const sessions = await store.listPracticeSessions('anon_test')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('practice_1')
    expect(sessions[0].songId).toBe('song1')
    expect(sessions[0].score).toBe(92)
    expect(sessions[0].mediaId).toBe('media_1')
  })
})

describe('SupabaseWorksStore', () => {
  it('saves work and publishes work id', async () => {
    const { SupabaseWorksStore } = await import('../infra/supabase/SupabaseWorksStore.js')

    const supabase = createSupabaseStub({
      works: {
        maybeSingle: { data: {
          id: 'work_1',
          user_id: 'anon_test',
          song_id: 'song1',
          song_name: '女驸马',
          media_id: 'media_1',
          payload: {
            songId: 'song1',
            songName: '女驸马',
            score: 95,
            mediaId: 'media_1'
          },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }, error: null },
        upsert: { data: {
          id: 'work_1',
          user_id: 'anon_test',
          song_id: 'song1',
          song_name: '女驸马',
          media_id: 'media_1',
          payload: {
            songId: 'song1',
            songName: '女驸马',
            score: 95,
            mediaId: 'media_1'
          },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }, error: null },
        range: { data: [{
          id: 'work_1',
          user_id: 'anon_test',
          song_id: 'song1',
          song_name: '女驸马',
          media_id: 'media_1',
          payload: {
            songId: 'song1',
            songName: '女驸马',
            score: 95,
            mediaId: 'media_1'
          },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }], error: null }
      }
    })

    const store = new SupabaseWorksStore({ supabase, ensureAnonymousAuth: supabaseConfigMocks.ensureAnonymousAuth })

    const work = {
      songId: 'song1',
      songName: '女驸马',
      score: 95,
      mediaId: 'media_1'
    }

    const saved = await store.saveWork(work)
    expect(saved.id).toBe('work_1')
    expect(saved.songId).toBe('song1')

    const publishedId = await store.publishWork(work)
    expect(publishedId).toBe('work_1')
  })
})

describe('SupabaseMediaStore', () => {
  it('uploads, resolves and deletes media urls', async () => {
    const { SupabaseMediaStore } = await import('../infra/supabase/SupabaseMediaStore.js')
    const supabase = createSupabaseStub()
    const mediaStore = new SupabaseMediaStore({ supabase })

    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const result = await mediaStore.storeMedia(blob, { path: 'demo/path', userId: 'anon_test', type: 'audio/webm' })
    expect(result.id).toBe('uploads/demo-path')
    expect(result.url).toBe('https://example.com/demo-path')

    const publicUrl = await mediaStore.getMediaUrl('uploads/demo-path')
    expect(publicUrl).toBe('https://example.com/demo-path')

    await expect(mediaStore.deleteMedia('uploads/demo-path')).resolves.toBeUndefined()
  })
})
