const LEARN_DATA_VERSION_KEY = 'hmx_learn_data_version'
const LEARN_DATA_VERSION = '2026-03-24-handoff-clean-v1'
const LOCAL_DB_NAME = 'hmx_local_store'

const LEARN_LOCAL_KEYS = [
  'hmx_learn_profile_v2',
  'karaoke_anonymous_id',
  'karaoke_display_name'
]

function canUseWindowStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function shouldResetLearnData() {
  if (!canUseWindowStorage()) return false
  return window.localStorage.getItem(LEARN_DATA_VERSION_KEY) !== LEARN_DATA_VERSION
}

function markLearnDataVersion() {
  if (!canUseWindowStorage()) return
  window.localStorage.setItem(LEARN_DATA_VERSION_KEY, LEARN_DATA_VERSION)
}

function clearLearnLocalStorage() {
  if (!canUseWindowStorage()) return
  LEARN_LOCAL_KEYS.forEach((key) => {
    window.localStorage.removeItem(key)
  })
}

function deleteLearnIndexedDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

export async function resetLearnLocalDataIfNeeded() {
  if (!shouldResetLearnData()) return false
  clearLearnLocalStorage()
  await deleteLearnIndexedDb()
  markLearnDataVersion()
  return true
}
