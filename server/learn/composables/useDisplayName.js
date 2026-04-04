import { onBeforeUnmount, onMounted, ref } from 'vue'

export function normalizeDisplayName(value, maxLength = 12) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  return normalized.slice(0, Math.max(1, Number(maxLength) || 12))
}

export function generateRandomDisplayName(prefix = '戏迷') {
  const safePrefix = String(prefix || '戏迷').trim() || '戏迷'
  return `${safePrefix}${Math.floor(1000 + Math.random() * 9000)}`
}

export function useDisplayName(options = {}) {
  const identity = options.identity
  const maxLength = Number.isFinite(Number(options.maxLength)) ? Number(options.maxLength) : 12
  const fallbackPrefix = String(options.fallbackPrefix || '戏迷')
  const confirmChange = options.confirmChange !== false
  const confirmFn = typeof options.confirmFn === 'function'
    ? options.confirmFn
    : ((message) => {
        if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true
        return window.confirm(message)
      })

  const displayName = ref('')
  const confirmedDisplayName = ref('')

  function getProfileDisplayName() {
    return normalizeDisplayName(identity?.getProfile?.()?.displayName || '', maxLength)
  }

  function getStoredDisplayName() {
    return normalizeDisplayName(identity?.getDisplayName?.() || '', maxLength)
  }

  function getResolvedDisplayName() {
    return getProfileDisplayName() || getStoredDisplayName()
  }

  function syncFromIdentity() {
    const previousConfirmed = normalizeDisplayName(confirmedDisplayName.value, maxLength)
    const currentDraft = normalizeDisplayName(displayName.value, maxLength)
    const next = getResolvedDisplayName()
    if (!next) return

    confirmedDisplayName.value = next
    if (!currentDraft || currentDraft === previousConfirmed) {
      displayName.value = next
    }
  }

  function persistDisplayName(name) {
    if (!identity?.setDisplayName) return
    const persisted = normalizeDisplayName(name, maxLength)
    if (!persisted) return
    const maybePromise = identity.setDisplayName(persisted)
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.catch(() => {})
    }
  }

  function loadDisplayName(loadOptions = {}) {
    const ensureFallback = loadOptions.ensureFallback !== false
    const silent = Boolean(loadOptions.silent)

    const loaded = getResolvedDisplayName()
    displayName.value = loaded
    confirmedDisplayName.value = loaded

    if (!loaded && ensureFallback) {
      displayName.value = generateRandomDisplayName(fallbackPrefix)
      saveDisplayName({ silent, skipConfirm: true })
    }

    return displayName.value
  }

  function saveDisplayName(saveOptions = {}) {
    const silent = Boolean(saveOptions.silent)
    const skipConfirm = Boolean(saveOptions.skipConfirm)
    const fallbackName = normalizeDisplayName(saveOptions.fallbackName || '', maxLength)
    const fallback = fallbackName || generateRandomDisplayName(fallbackPrefix)

    const normalized = normalizeDisplayName(displayName.value, maxLength) || fallback
    const previous = normalizeDisplayName(confirmedDisplayName.value, maxLength)

    if (confirmChange && !silent && !skipConfirm && previous && normalized !== previous) {
      const ok = confirmFn(`确认将昵称修改为“${normalized}”吗？`)
      if (!ok) {
        displayName.value = previous
        return false
      }
    }

    displayName.value = normalized
    confirmedDisplayName.value = normalized
    persistDisplayName(normalized)
    return true
  }

  function handleProfileUpdated() {
    syncFromIdentity()
  }

  function handleStorage(event) {
    if (event?.key && event.key !== 'hmx_learn_profile_v2' && event.key !== 'karaoke_display_name') return
    syncFromIdentity()
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('learn-profile-updated', handleProfileUpdated)
    window.addEventListener('storage', handleStorage)
    syncFromIdentity()
  })

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('learn-profile-updated', handleProfileUpdated)
    window.removeEventListener('storage', handleStorage)
  })

  return {
    displayName,
    confirmedDisplayName,
    loadDisplayName,
    saveDisplayName,
    normalizeDisplayName,
    generateRandomDisplayName
  }
}
