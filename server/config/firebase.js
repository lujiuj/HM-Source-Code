import { initializeApp, getApp, getApps } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

function readEnv(key) {
  const viteEnv = import.meta?.env
  if (viteEnv && Object.prototype.hasOwnProperty.call(viteEnv, key)) return viteEnv[key]
  if (typeof process !== 'undefined' && process.env && Object.prototype.hasOwnProperty.call(process.env, key)) return process.env[key]
  return undefined
}

const projectId = readEnv('VITE_FIREBASE_PROJECT_ID') || 'fir-yellow-play'
const databaseURL =
  readEnv('VITE_FIREBASE_DATABASE_URL') ||
  readEnv('VITE_FIREBASE_DATABASEURL') ||
  'https://fir-yellow-play-default-rtdb.firebaseio.com/'

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyC41bcKdjRrInfw4nfTCxEGFG9BXhUF4MM',
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'fir-yellow-play.firebaseapp.com',
  projectId,
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'fir-yellow-play.firebasestorage.app',
  databaseURL
}

let app
const existingApps = getApps()
if (existingApps.length > 0) {
  app = existingApps[0]
} else {
  try {
    app = initializeApp(firebaseConfig)
  } catch (e) {
    console.warn('[Firebase] Init warning:', e.message)
    // If initialization fails (e.g., invalid API key), try to get existing app
    try {
      app = existingApps[0] || getApp()
    } catch (innerErr) {
      // If no app exists, create a fallback mock app
      console.warn('[Firebase] Could not get app, using fallback config')
      app = null
    }
  }
}

export { app }
export const auth = app ? getAuth(app) : null
export const database = app ? getDatabase(app, firebaseConfig.databaseURL) : null
export const storage = app ? getStorage(app) : null

let emulatorsConnected = false

function splitHostPort(value, defaultHost, defaultPort) {
  if (!value) return { host: defaultHost, port: defaultPort }
  const cleaned = String(value).replace(/^https?:\/\//, '')
  const [hostPart, portPart] = cleaned.split(':')
  const host = hostPart || defaultHost
  const port = Number(portPart)
  return { host, port: Number.isFinite(port) ? port : defaultPort }
}

function normalizeAuthEmulatorUrl(value, defaultHost, defaultPort) {
  const raw = value || `${defaultHost}:${defaultPort}`
  if (/^https?:\/\//.test(String(raw))) return String(raw)
  return `http://${raw}`
}

export function connectToEmulatorsIfEnabled() {
  if (!app) return false
  
  const useViteToggle = readEnv('VITE_USE_FIREBASE_EMULATORS') === 'true'
  const authHost = typeof process !== 'undefined' ? process.env?.FIREBASE_AUTH_EMULATOR_HOST : undefined
  const dbHost = typeof process !== 'undefined' ? process.env?.FIREBASE_DATABASE_EMULATOR_HOST : undefined
  const storageHost = typeof process !== 'undefined' ? process.env?.FIREBASE_STORAGE_EMULATOR_HOST : undefined

  const enabled = useViteToggle || Boolean(authHost || dbHost || storageHost)
  if (!enabled) return false
  if (emulatorsConnected) return true

  const defaultHost = '127.0.0.1'

  const shouldAuth = useViteToggle || Boolean(authHost)
  const shouldDb = useViteToggle || Boolean(dbHost)
  const shouldStorage = useViteToggle || Boolean(storageHost)

  if (shouldAuth && auth) {
    const url = normalizeAuthEmulatorUrl(authHost, defaultHost, 9099)
    connectAuthEmulator(auth, url, { disableWarnings: true })
  }
  if (shouldDb && database) {
    const { host, port } = splitHostPort(dbHost, defaultHost, 9000)
    connectDatabaseEmulator(database, host, port)
  }
  if (shouldStorage && storage) {
    const { host, port } = splitHostPort(storageHost, defaultHost, 9199)
    connectStorageEmulator(storage, host, port)
  }

  emulatorsConnected = true
  return true
}

let anonSignInPromise = null

export async function ensureAnonymousAuth() {
  if (!auth) throw new Error('Firebase auth not initialized')
  
  if (auth.currentUser) return auth.currentUser
  if (anonSignInPromise) {
    await anonSignInPromise
    if (!auth.currentUser) throw new Error('Anonymous auth failed: no currentUser')
    return auth.currentUser
  }

  anonSignInPromise = signInAnonymously(auth)
    .then(cred => {
      if (cred?.user) return cred.user
      return auth.currentUser
    })
    .finally(() => {
      anonSignInPromise = null
    })

  const user = await anonSignInPromise
  if (!user) throw new Error('Anonymous auth failed: no user')
  return user
}