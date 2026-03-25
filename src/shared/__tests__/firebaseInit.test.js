import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const app = { __app: true }
  const auth = { currentUser: null }
  const database = { __db: true }
  const storage = { __storage: true }

  return {
    app,
    auth,
    database,
    storage,
    initializeApp: vi.fn(() => app),
    getApps: vi.fn(() => []),
    getApp: vi.fn(() => app),
    getAuth: vi.fn(() => auth),
    signInAnonymously: vi.fn(async () => {
      auth.currentUser = { uid: 'anon' }
      return { user: auth.currentUser }
    }),
    connectAuthEmulator: vi.fn(),
    getDatabase: vi.fn(() => database),
    connectDatabaseEmulator: vi.fn(),
    getStorage: vi.fn(() => storage),
    connectStorageEmulator: vi.fn()
  }
})

vi.mock('firebase/app', () => ({
  initializeApp: mocks.initializeApp,
  getApps: mocks.getApps,
  getApp: mocks.getApp
}))

vi.mock('firebase/auth', () => ({
  getAuth: mocks.getAuth,
  signInAnonymously: mocks.signInAnonymously,
  connectAuthEmulator: mocks.connectAuthEmulator
}))

vi.mock('firebase/database', () => ({
  getDatabase: mocks.getDatabase,
  connectDatabaseEmulator: mocks.connectDatabaseEmulator
}))

vi.mock('firebase/storage', () => ({
  getStorage: mocks.getStorage,
  connectStorageEmulator: mocks.connectStorageEmulator
}))

function clearEmulatorEnv() {
  delete process.env.VITE_USE_FIREBASE_EMULATORS
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST
}

beforeEach(() => {
  vi.resetModules()

  mocks.auth.currentUser = null
  mocks.getApps.mockReturnValue([])

  mocks.initializeApp.mockClear()
  mocks.getAuth.mockClear()
  mocks.getDatabase.mockClear()
  mocks.getStorage.mockClear()

  mocks.signInAnonymously.mockClear()
  mocks.connectAuthEmulator.mockClear()
  mocks.connectDatabaseEmulator.mockClear()
  mocks.connectStorageEmulator.mockClear()

  clearEmulatorEnv()
})

afterEach(() => {
  clearEmulatorEnv()
})

describe('src/config/firebase.js', () => {
  it('exports app/auth/database/storage', async () => {
    const mod = await import('../config/firebase.js')

    expect(mod.app).toBe(mocks.app)
    expect(mod.auth).toBe(mocks.auth)
    expect(mod.database).toBe(mocks.database)
    expect(mod.storage).toBe(mocks.storage)
  })

  it('connectToEmulatorsIfEnabled connects all emulators when VITE_USE_FIREBASE_EMULATORS=true', async () => {
    process.env.VITE_USE_FIREBASE_EMULATORS = 'true'
    const mod = await import('../config/firebase.js')

    expect(mod.connectToEmulatorsIfEnabled()).toBe(true)
    expect(mocks.connectAuthEmulator).toHaveBeenCalledTimes(1)
    expect(mocks.connectDatabaseEmulator).toHaveBeenCalledTimes(1)
    expect(mocks.connectStorageEmulator).toHaveBeenCalledTimes(1)

    // idempotent
    expect(mod.connectToEmulatorsIfEnabled()).toBe(true)
    expect(mocks.connectAuthEmulator).toHaveBeenCalledTimes(1)
    expect(mocks.connectDatabaseEmulator).toHaveBeenCalledTimes(1)
    expect(mocks.connectStorageEmulator).toHaveBeenCalledTimes(1)
  })

  it('connectToEmulatorsIfEnabled auto-detects per-service FIREBASE_*_EMULATOR_HOST', async () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:1111'
    const mod = await import('../config/firebase.js')

    expect(mod.connectToEmulatorsIfEnabled()).toBe(true)
    expect(mocks.connectAuthEmulator).toHaveBeenCalledTimes(1)
    expect(mocks.connectDatabaseEmulator).toHaveBeenCalledTimes(0)
    expect(mocks.connectStorageEmulator).toHaveBeenCalledTimes(0)
  })

  it('ensureAnonymousAuth signs in once and returns currentUser', async () => {
    const mod = await import('../config/firebase.js')

    const u1 = await mod.ensureAnonymousAuth()
    expect(u1).toEqual({ uid: 'anon' })
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1)

    const u2 = await mod.ensureAnonymousAuth()
    expect(u2).toEqual({ uid: 'anon' })
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1)
  })

  it('ensureAnonymousAuth dedupes concurrent sign-in calls', async () => {
    let resolve
    mocks.signInAnonymously.mockImplementation(
      () =>
        new Promise(r => {
          resolve = () => {
            mocks.auth.currentUser = { uid: 'anon2' }
            r({ user: mocks.auth.currentUser })
          }
        })
    )

    const mod = await import('../config/firebase.js')

    const p1 = mod.ensureAnonymousAuth()
    const p2 = mod.ensureAnonymousAuth()

    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1)
    resolve()

    await expect(p1).resolves.toEqual({ uid: 'anon2' })
    await expect(p2).resolves.toEqual({ uid: 'anon2' })
  })
})
