import { describe, it, expect, beforeEach, vi } from 'vitest'

const firebaseConfigMocks = vi.hoisted(() => {
  return {
    connectToEmulatorsIfEnabled: vi.fn(() => true),
    ensureAnonymousAuth: vi.fn(async () => ({ uid: 'anon' }))
  }
})

vi.mock('../config/firebase.js', () => ({
  connectToEmulatorsIfEnabled: firebaseConfigMocks.connectToEmulatorsIfEnabled,
  ensureAnonymousAuth: firebaseConfigMocks.ensureAnonymousAuth,
  auth: { currentUser: { uid: 'anon' } },
  database: {},
  storage: {}
}))

beforeEach(() => {
  vi.resetModules()
  firebaseConfigMocks.connectToEmulatorsIfEnabled.mockClear()
  firebaseConfigMocks.ensureAnonymousAuth.mockClear()
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

  it('initInfra(firebase) performs firebase bootstrap without throwing (mocked)', async () => {
    const mod = await import('../infra/index.js')

    await expect(mod.initInfra('firebase')).resolves.toBeTruthy()
    expect(firebaseConfigMocks.connectToEmulatorsIfEnabled).toHaveBeenCalledTimes(1)
    expect(firebaseConfigMocks.ensureAnonymousAuth).toHaveBeenCalledTimes(1)
  })
})
