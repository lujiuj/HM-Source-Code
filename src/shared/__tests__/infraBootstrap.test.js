import { describe, it, expect, beforeEach, vi } from 'vitest'

const firebaseConfigMocks = vi.hoisted(() => {
  return {
    connectToEmulatorsIfEnabled: vi.fn(() => true),
    ensureAnonymousAuth: vi.fn(async () => ({ uid: 'anon' }))
  }
})

const supabaseProfileRecord = {
  user_id: 'anon_boot',
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

function createSupabaseQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
    upsert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: supabaseProfileRecord, error: null })),
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: supabaseProfileRecord, error: null }).then(onFulfilled, onRejected)
    },
    catch(onRejected) {
      return Promise.resolve({ data: supabaseProfileRecord, error: null }).catch(onRejected)
    }
  }
  return query
}

const supabaseConfigMocks = vi.hoisted(() => {
  return {
    ensureAnonymousAuth: vi.fn(async () => ({ id: 'anon_boot' })),
    supabase: {
      from: vi.fn(() => createSupabaseQuery())
    }
  }
})

vi.mock('../config/firebase.js', () => ({
  connectToEmulatorsIfEnabled: firebaseConfigMocks.connectToEmulatorsIfEnabled,
  ensureAnonymousAuth: firebaseConfigMocks.ensureAnonymousAuth,
  auth: { currentUser: { uid: 'anon' } },
  database: {},
  storage: {}
}))

vi.mock('../config/supabase.js', () => ({
  ensureAnonymousAuth: supabaseConfigMocks.ensureAnonymousAuth,
  supabase: supabaseConfigMocks.supabase
}))

beforeEach(() => {
  vi.resetModules()
  firebaseConfigMocks.connectToEmulatorsIfEnabled.mockClear()
  firebaseConfigMocks.ensureAnonymousAuth.mockClear()
  supabaseConfigMocks.ensureAnonymousAuth.mockClear()
  supabaseConfigMocks.supabase.from.mockClear()
})

describe('infra bootstrap', () => {
  it('initInfra(local) initializes singleton infra', async () => {
    const mod = await import('../infra/index.js')
    await mod.initInfra('local')

    const infra = mod.getInfra()
    expect(infra).toBeTruthy()
    expect(infra.identity).toBeTruthy()
    expect(infra.practice).toBeTruthy()
    expect(infra.works).toBeTruthy()
    expect(infra.interaction).toBeTruthy()
    expect(infra.leaderboard).toBeTruthy()
    expect(infra.media).toBeTruthy()
  })

  it('initInfra(local) is idempotent', async () => {
    const mod = await import('../infra/index.js')

    const infra1 = await mod.initInfra('local')
    const infra2 = await mod.initInfra('local')

    expect(infra1).toBe(infra2)
    expect(mod.getInfra()).toBe(infra1)
  })

  it('initInfra(firebase) rejects when firebase support is not configured', async () => {
    const mod = await import('../infra/index.js')

    await expect(mod.initInfra('firebase')).rejects.toThrow('createInfra(firebase) is not supported')
  })

  it('initInfra(supabase) performs supabase bootstrap without throwing (mocked)', async () => {
    const mod = await import('../infra/index.js')

    await expect(mod.initInfra('supabase')).resolves.toBeTruthy()
    expect(supabaseConfigMocks.ensureAnonymousAuth).toHaveBeenCalledTimes(3)
    const infra = mod.getInfra()
    expect(infra).toBeTruthy()
    expect(infra.identity).toBeTruthy()
    expect(infra.identity.getUid()).toBe('anon_boot')
    expect(infra.identity.getProfile().displayName).toBe('戏友')
  })
})
