import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref as dbRef, remove } from 'firebase/database'
import { getStorage, ref as storageRef, listAll, deleteObject } from 'firebase/storage'

function readEnv(key) {
  return String(process.env[key] || '').trim()
}

function requireEnv(key, fallback = '') {
  const value = readEnv(key) || fallback
  if (!value) {
    throw new Error(`缺少环境变量 ${key}，无法执行远端学戏数据清理。`)
  }
  return value
}

async function deleteStorageTree(rootRef) {
  const listed = await listAll(rootRef)
  for (const item of listed.items) {
    await deleteObject(item)
  }
  for (const prefix of listed.prefixes) {
    await deleteStorageTree(prefix)
  }
}

const projectId = requireEnv('VITE_FIREBASE_PROJECT_ID', readEnv('FIREBASE_PROJECT_ID'))
const apiKey = requireEnv('VITE_FIREBASE_API_KEY', readEnv('FIREBASE_API_KEY'))
const authDomain = requireEnv('VITE_FIREBASE_AUTH_DOMAIN', `${projectId}.firebaseapp.com`)
const storageBucket = requireEnv('VITE_FIREBASE_STORAGE_BUCKET', `${projectId}.appspot.com`)
const databaseURL = requireEnv('VITE_FIREBASE_DATABASE_URL', `https://${projectId}-default-rtdb.firebaseio.com`)

if (projectId === 'demo-yellow-play' || apiKey === 'demo-api-key') {
  throw new Error('当前仍是 demo Firebase 配置，脚本不会对 demo 项目执行远端删除。请先设置真实 VITE_FIREBASE_* 环境变量。')
}

const app = initializeApp({
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  databaseURL
})

const auth = getAuth(app)
const database = getDatabase(app, databaseURL)
const storage = getStorage(app)

console.log(`[reset-learn-remote] target project: ${projectId}`)
await signInAnonymously(auth)

console.log('[reset-learn-remote] removing RTDB path: learn')
await remove(dbRef(database, 'learn'))

console.log('[reset-learn-remote] deleting Storage path: works/')
await deleteStorageTree(storageRef(storage, 'works'))

console.log('[reset-learn-remote] done')
