import { LocalIdentityStore } from './local/LocalIdentityStore.js'
import { LocalInteractionStore } from './local/LocalInteractionStore.js'
import { LocalLeaderboardStore } from './local/LocalLeaderboardStore.js'
import { LocalMediaStore } from './local/LocalMediaStore.js'
import { LocalPracticeStore } from './local/LocalPracticeStore.js'
import { LocalWorksStore } from './local/LocalWorksStore.js'
import { createSupabaseInfra } from './supabase/index.js'

let infraInstance = null
let infraInitPromise = null
let infraInitMode = null

function readEnv(key) {
  const viteEnv = import.meta?.env
  if (viteEnv && Object.prototype.hasOwnProperty.call(viteEnv, key)) return viteEnv[key]
  if (typeof process !== 'undefined' && process.env && Object.prototype.hasOwnProperty.call(process.env, key)) return process.env[key]
  return undefined
}

function resolveInfraMode(explicitMode) {
  if (explicitMode) return explicitMode
  return readEnv('VITE_INFRA_MODE') || 'local'
}

export function createInfra(mode = 'local') {
  if (mode === 'local') {
    const media = new LocalMediaStore()
    return {
      identity: new LocalIdentityStore(),
      practice: new LocalPracticeStore({ mediaStore: media }),
      works: new LocalWorksStore(),
      interaction: new LocalInteractionStore(),
      leaderboard: new LocalLeaderboardStore(),
      media,
    }
  }

  if (mode === 'firebase') {
    // Firebase mode requires async bootstrap. Use initInfra('firebase') instead.
    throw new Error('createInfra(firebase) is not supported. Use initInfra("firebase") instead.')
  }

  if (mode === 'supabase') {
    return createSupabaseInfra()
  }

  // Unknown mode - fallback to local
  console.warn('Unknown infra mode:', mode, '- falling back to local')
  const media = new LocalMediaStore()
  return {
    identity: new LocalIdentityStore(),
    practice: new LocalPracticeStore({ mediaStore: media }),
    works: new LocalWorksStore(),
    interaction: new LocalInteractionStore(),
    leaderboard: new LocalLeaderboardStore(),
    media,
  }
}

export async function initInfra(mode) {
  const selectedMode = resolveInfraMode(mode)

  if (infraInitPromise) {
    if (infraInitMode !== selectedMode) {
      throw new Error(
        `Infra initialization already in progress (mode=${infraInitMode}); cannot re-init with mode=${selectedMode}`
      )
    }
    await infraInitPromise
    return infraInstance
  }

  if (infraInstance) {
    if (infraInitMode && infraInitMode !== selectedMode) {
      throw new Error(`Infra already initialized (mode=${infraInitMode}); cannot re-init with mode=${selectedMode}`)
    }
    infraInitMode = infraInitMode || selectedMode
    return infraInstance
  }

  infraInitMode = selectedMode

  infraInitPromise = (async () => {
    if (selectedMode === 'supabase') {
      try {
        const { ensureAnonymousAuth } = await import('../config/supabase.js')
        await ensureAnonymousAuth()
        
        infraInstance = createSupabaseInfra()
        if (typeof infraInstance.identity?.initialize === 'function') {
          await infraInstance.identity.initialize()
        }
        return infraInstance
      } catch (error) {
        console.warn('Supabase initialization failed, falling back to local mode:', error.message)
        infraInitMode = 'local'
        infraInstance = createInfra('local')
        return infraInstance
      }
    }

    // if (selectedMode === 'firebase') {
    //   try {
    //     const { connectToEmulatorsIfEnabled, ensureAnonymousAuth } = await import('../config/firebase.js')
    //     connectToEmulatorsIfEnabled()
    //     await ensureAnonymousAuth()

    //     const { FirebaseIdentityStore } = await import('./firebase/FirebaseIdentityStore.js')
    //     const { FirebasePracticeStore } = await import('./firebase/FirebasePracticeStore.js')
    //     const { FirebaseWorksStore } = await import('./firebase/FirebaseWorksStore.js')
    //     const { FirebaseInteractionStore } = await import('./firebase/FirebaseInteractionStore.js')
    //     const { FirebaseLeaderboardStore } = await import('./firebase/FirebaseLeaderboardStore.js')
    //     const { FirebaseMediaStore } = await import('./firebase/FirebaseMediaStore.js')

    //     const media = new FirebaseMediaStore()
    //     infraInstance = {
    //       identity: new FirebaseIdentityStore(),
    //       practice: new FirebasePracticeStore({ mediaStore: media }),
    //       works: new FirebaseWorksStore(),
    //       interaction: new FirebaseInteractionStore(),
    //       leaderboard: new FirebaseLeaderboardStore(),
    //       media,
    //     }
    //     return infraInstance
    //   } catch (error) {
    //     console.warn('Firebase initialization failed, falling back to local mode:', error.message)
    //     infraInitMode = 'local'
    //     infraInstance = createInfra('local')
    //     return infraInstance
    //   }
    // }

    infraInstance = createInfra(selectedMode)
    return infraInstance
  })()

  try {
    return await infraInitPromise
  } finally {
    infraInitPromise = null
  }
}

function createLocalInfraSync() {
  const media = new LocalMediaStore()
  return {
    identity: new LocalIdentityStore(),
    practice: new LocalPracticeStore({ mediaStore: media }),
    works: new LocalWorksStore(),
    interaction: new LocalInteractionStore(),
    leaderboard: new LocalLeaderboardStore(),
    media,
  }
}

export function getInfra() {
  if (!infraInstance) {
    const mode = resolveInfraMode('auto')
    infraInitMode = mode
    if (mode === 'supabase') {
      try {
        infraInstance = createSupabaseInfra()
        if (typeof infraInstance.identity?.initialize === 'function') {
          void infraInstance.identity.initialize().catch((error) => {
            console.warn('Supabase background initialization failed:', error?.message || error)
          })
        }
      } catch (error) {
        console.warn('Supabase initialization failed, falling back to local mode:', error.message)
        infraInitMode = 'local'
        infraInstance = createLocalInfraSync()
      }
    }  else {
      infraInstance = createLocalInfraSync()
    }
  }
  return infraInstance
}