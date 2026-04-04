import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toPositiveMs(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(10 * 1000, Math.round(parsed))
}

function stableJson(value, depth = 0) {
  if (depth > 6) return null
  if (Array.isArray(value)) return value.map((item) => stableJson(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  const out = {}
  for (const key of Object.keys(value).sort()) {
    if (key === 'audio' || key === 'audioBlob' || key === 'audioBase64') continue
    out[key] = stableJson(value[key], depth + 1)
  }
  return out
}

function buildHash(value) {
  return crypto.createHash('sha1').update(JSON.stringify(stableJson(value))).digest('hex')
}

export function createCacheStore(options = {}) {
  const cacheDir = options.cacheDir
  const defaultTtlMs = toPositiveMs(options.defaultTtlMs, 12 * 60 * 1000)
  const ttlByMode = options.ttlByMode || {}

  const memCache = new Map()

  if (cacheDir) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true })
    } catch {
      // ignore
    }
  }

  function getModeTtlMs(mode) {
    return toPositiveMs(ttlByMode[mode], defaultTtlMs)
  }

  function buildCacheKey(mode, payload, model) {
    return buildHash({ mode, model, payload })
  }

  function getCacheFilePath(key) {
    if (!cacheDir) return ''
    return path.join(cacheDir, `${key}.json`)
  }

  function readFromDisk(key) {
    const filePath = getCacheFilePath(key)
    if (!filePath || !fs.existsSync(filePath)) return null
    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      if (!raw) return null
      const json = JSON.parse(raw)
      const expiresAt = Number(json?.expiresAt)
      if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        try {
          fs.unlinkSync(filePath)
        } catch {
          // ignore
        }
        return null
      }
      return { value: json.value, expiresAt }
    } catch {
      return null
    }
  }

  function writeToDisk(key, value, expiresAt) {
    const filePath = getCacheFilePath(key)
    if (!filePath) return

    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
    try {
      fs.writeFileSync(tmpPath, JSON.stringify({ version: 1, savedAt: Date.now(), expiresAt, value }), 'utf8')
      fs.renameSync(tmpPath, filePath)
    } catch {
      try {
        fs.unlinkSync(tmpPath)
      } catch {
        // ignore
      }
    }
  }

  function get(key) {
    const cached = memCache.get(key)
    if (cached) {
      if (Date.now() <= cached.expiresAt) return cached.value
      memCache.delete(key)
    }

    const disk = readFromDisk(key)
    if (!disk?.value) return null
    memCache.set(key, disk)
    return disk.value
  }

  function set(key, value, ttlMs) {
    const ttl = toPositiveMs(ttlMs, defaultTtlMs)
    const expiresAt = Date.now() + ttl
    const payload = { value, expiresAt }
    memCache.set(key, payload)
    writeToDisk(key, value, expiresAt)
  }

  function clearExpiredMem() {
    const now = Date.now()
    for (const [key, item] of memCache.entries()) {
      if (!item || now > Number(item.expiresAt || 0)) {
        memCache.delete(key)
      }
    }
  }

  return {
    getModeTtlMs,
    buildCacheKey,
    get,
    set,
    clearExpiredMem
  }
}
