const SCORE_REF_VERSION = 1

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function hzToLogCents(hz) {
  // cents on an absolute log scale (not relative to A4)
  return 1200 * Math.log2(hz)
}

function logCentsToHz(cents) {
  return 2 ** (cents / 1200)
}

function normalizePoint(raw) {
  if (!raw || typeof raw !== 'object') return null

  const tMs = raw.tMs ?? raw.t ?? raw.timeMs ?? raw.time
  const hz = raw.hz ?? raw.pitchHz ?? raw.f0Hz ?? raw.f0

  if (!isFiniteNumber(tMs) || tMs < 0) return null
  if (!isFiniteNumber(hz) || hz <= 0) return null

  return { tMs, hz }
}

function normalizeLine(raw, expectedLineIndex) {
  if (!raw || typeof raw !== 'object') return null

  const lineIndex = raw.lineIndex
  if (!Number.isInteger(lineIndex) || lineIndex !== expectedLineIndex) return null

  const pointsRaw = Array.isArray(raw.points) ? raw.points : []
  const points = pointsRaw
    .map(normalizePoint)
    .filter(Boolean)
    .sort((a, b) => a.tMs - b.tMs)

  return { lineIndex, points }
}

export function validateAndNormalizeScoreRef(json, lyrics) {
  if (!json || typeof json !== 'object') {
    return { ok: false, error: 'scoreRef: json must be an object' }
  }

  const version = json.version
  if (version !== SCORE_REF_VERSION) {
    return { ok: false, error: `scoreRef: unsupported version ${String(version)}` }
  }

  const songId = json.songId
  if (typeof songId !== 'string' || !songId) {
    return { ok: false, error: 'scoreRef: missing songId' }
  }

  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return { ok: false, error: 'scoreRef: lyrics must be a non-empty array' }
  }

  const linesRaw = Array.isArray(json.lines) ? json.lines : null
  if (!linesRaw) {
    return { ok: false, error: 'scoreRef: lines must be an array' }
  }

  if (linesRaw.length !== lyrics.length) {
    return {
      ok: false,
      error: `scoreRef: line count mismatch (ref=${linesRaw.length} lyrics=${lyrics.length})`
    }
  }

  const lines = []
  for (let i = 0; i < lyrics.length; i += 1) {
    const normalized = normalizeLine(linesRaw[i], i)
    if (!normalized) {
      return { ok: false, error: `scoreRef: invalid line at index ${i}` }
    }
    lines.push(normalized)
  }

  return {
    ok: true,
    value: {
      version,
      songId,
      generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : null,
      source: typeof json.source === 'string' ? json.source : null,
      lines
    }
  }
}

export function getExpectedPitchForLine(scoreRef, lineIndex, relTimeMs) {
  if (!scoreRef || !Array.isArray(scoreRef.lines)) return null
  if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= scoreRef.lines.length) return null
  if (!isFiniteNumber(relTimeMs)) return null

  const points = scoreRef.lines[lineIndex]?.points || []
  if (points.length === 0) return null

  // clamp before/after
  if (relTimeMs <= points[0].tMs) return points[0].hz
  if (relTimeMs >= points[points.length - 1].tMs) return points[points.length - 1].hz

  // find segment (linear scan is fine for v1; points count per line is expected small)
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i]
    if (relTimeMs <= next.tMs) {
      const span = next.tMs - prev.tMs
      if (span <= 0) return next.hz
      const t = (relTimeMs - prev.tMs) / span
      // interpolate in log domain (better perceptual behavior than linear Hz)
      const a = hzToLogCents(prev.hz)
      const b = hzToLogCents(next.hz)
      return logCentsToHz(a + (b - a) * t)
    }
  }

  return points[points.length - 1].hz
}

export function createScoreRefProvider(scoreRef) {
  return function provide(lineIndex, relTimeMs) {
    const expectedPitch = getExpectedPitchForLine(scoreRef, lineIndex, relTimeMs)
    if (expectedPitch === null) return null
    return { expectedPitch, expectedTime: relTimeMs }
  }
}

export async function loadScoreRef(songId, lyrics, options = {}) {
  const baseUrl = options.baseUrl || '/score-ref'
  const url = `${baseUrl}/${encodeURIComponent(songId)}.json`

  try {
    const response = await fetch(url)
    if (!response || !response.ok) return null

    const json = await response.json()
    const validated = validateAndNormalizeScoreRef(json, lyrics)
    if (!validated.ok) {
      console.warn('[scoreRef] invalid:', validated.error)
      return null
    }

    return validated.value
  } catch (err) {
    console.warn('[scoreRef] load failed:', err)
    return null
  }
}

export { SCORE_REF_VERSION }
