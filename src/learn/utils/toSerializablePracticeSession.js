/**
 * toSerializablePracticeSession
 * ─────────────────────────────
 * Deep-cleans a practice session object so it only contains
 * JSON-safe / IDB-cloneable primitives (string, number, boolean,
 * null, plain Array, plain Object, Blob, ArrayBuffer, Date).
 *
 * Specifically strips: Vue reactive proxies, Functions, Symbols,
 * DOM nodes, WeakRef, and any non-structuredClone-able values.
 */

const MAX_DEPTH = 12

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function deepClean(value, depth) {
  if (depth > MAX_DEPTH) return undefined

  // Primitives pass through
  if (value === null || value === undefined) return value
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'function' || t === 'symbol') return undefined

  // Date → keep as-is (structuredClone supports it)
  if (value instanceof Date) return new Date(value.getTime())

  // Blob / ArrayBuffer → keep as-is (structuredClone supports them)
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return value

  // Array
  if (Array.isArray(value)) {
    const out = []
    for (let i = 0; i < value.length; i++) {
      const cleaned = deepClean(value[i], depth + 1)
      out.push(cleaned === undefined ? null : cleaned)
    }
    return out
  }

  // Plain object / vue proxy → strip to plain
  if (isPlainObject(value) || (typeof value === 'object' && value.constructor?.name === 'Object')) {
    const out = {}
    for (const key of Object.keys(value)) {
      if (key.startsWith('__v_') || key.startsWith('__ob__')) continue // Vue internal markers
      const v = deepClean(value[key], depth + 1)
      if (v !== undefined) out[key] = v
    }
    return out
  }

  // Fallback: try JSON round-trip
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return undefined
  }
}

/**
 * @param {object} session – a practice session that may contain Vue
 *   reactive proxies or other non-cloneable nested objects.
 * @returns {object} a deeply cleaned plain object safe for IndexedDB put().
 */
export function toSerializablePracticeSession(session) {
  if (!session || typeof session !== 'object') return session
  return deepClean(session, 0)
}
