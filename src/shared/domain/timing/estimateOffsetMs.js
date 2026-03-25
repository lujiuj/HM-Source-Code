function clampInt(value, min, max) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0
  return Math.max(min, Math.min(max, n))
}

function binarySearchLastLE(times, t) {
  // returns last index i where times[i] <= t, or -1
  let lo = 0
  let hi = times.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= t) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}

function isInLyricWindow(lyricTimes, idx, tMs, windowMarginMs) {
  if (idx < 0) return false
  const start = lyricTimes[idx] + windowMarginMs
  const next = idx + 1 < lyricTimes.length ? lyricTimes[idx + 1] : Number.POSITIVE_INFINITY
  const end = next - windowMarginMs
  if (end <= start) return false
  return tMs >= start && tMs < end
}

/**
 * Estimate a single global offset to align voiced frames to lyric windows.
 *
 * offset is applied as: lyricTime ~= mediaMs + offsetMs
 *
 * @param {object} input
 * @param {{mediaMs:number,isVoiced:boolean}[]} input.samples
 * @param {{time:number}[]} input.lyrics
 * @param {number} [input.sampleIntervalMs]
 * @param {number} [input.searchMinMs]
 * @param {number} [input.searchMaxMs]
 * @param {number} [input.stepMs]
 * @param {number} [input.maxSampleMs]
 * @param {number} [input.windowMarginMs]
 */
export function estimateOffsetMs(input) {
  const sampleIntervalMs = clampInt(input?.sampleIntervalMs ?? 40, 10, 200)
  const searchMinMs = clampInt(input?.searchMinMs ?? -1500, -5000, 0)
  const searchMaxMs = clampInt(input?.searchMaxMs ?? 1500, 0, 5000)
  const stepMs = clampInt(input?.stepMs ?? 50, 10, 500)
  const maxSampleMs = clampInt(input?.maxSampleMs ?? 30000, 2000, 120000)
  const windowMarginMs = clampInt(input?.windowMarginMs ?? 0, 0, 800)

  const lyrics = Array.isArray(input?.lyrics) ? input.lyrics : []
  const lyricTimes = lyrics.map(l => l?.time).filter(t => typeof t === 'number' && Number.isFinite(t)).sort((a, b) => a - b)

  const samples = Array.isArray(input?.samples) ? input.samples : []
  const voiced = samples
    .filter(s => s && s.isVoiced)
    .map(s => s.mediaMs)
    .filter(t => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= maxSampleMs)

  if (!lyricTimes.length || voiced.length < 10) {
    return {
      offsetMs: 0,
      confidence: 0,
      bestScore: 0,
      secondScore: 0,
      details: {
        voicedFrames: voiced.length,
        sampleIntervalMs,
        searchMinMs,
        searchMaxMs,
        stepMs
      }
    }
  }

  let bestOffset = 0
  let bestScore = -Infinity
  let secondScore = -Infinity

  for (let offset = searchMinMs; offset <= searchMaxMs; offset += stepMs) {
    let vin = 0
    let vout = 0

    for (const mediaMs of voiced) {
      const t = mediaMs + offset
      const idx = binarySearchLastLE(lyricTimes, t)
      if (isInLyricWindow(lyricTimes, idx, t, windowMarginMs)) vin += 1
      else vout += 1
    }

    const score = (vin - vout) * sampleIntervalMs

    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      bestOffset = offset
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  const denom = Math.max(1, Math.abs(bestScore))
  const confidence = bestScore > 0 ? Math.max(0, Math.min(1, (bestScore - secondScore) / denom)) : 0

  return {
    offsetMs: bestOffset,
    confidence,
    bestScore,
    secondScore,
    details: {
      voicedFrames: voiced.length,
      sampleIntervalMs,
      windowMarginMs,
      searchMinMs,
      searchMaxMs,
      stepMs
    }
  }
}
