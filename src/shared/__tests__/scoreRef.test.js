import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SCORE_REF_VERSION,
  validateAndNormalizeScoreRef,
  loadScoreRef,
  getExpectedPitchForLine
} from '../utils/scoreRef.js'

const lyrics = [
  { time: 0, text: 'Line 1' },
  { time: 5000, text: 'Line 2' }
]

describe('scoreRef', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('validateAndNormalizeScoreRef rejects invalid inputs', () => {
    expect(validateAndNormalizeScoreRef(null, lyrics).ok).toBe(false)
    expect(validateAndNormalizeScoreRef({ version: 999 }, lyrics).ok).toBe(false)
    expect(validateAndNormalizeScoreRef({ version: SCORE_REF_VERSION, songId: 's', lines: [] }, lyrics).ok).toBe(false)
  })

  it('validateAndNormalizeScoreRef accepts correct schema with matching lyric lines', () => {
    const json = {
      version: SCORE_REF_VERSION,
      songId: 'song1',
      lines: [
        { lineIndex: 0, points: [{ tMs: 0, hz: 440 }] },
        { lineIndex: 1, points: [{ tMs: 0, hz: 440 }] }
      ]
    }

    const res = validateAndNormalizeScoreRef(json, lyrics)
    expect(res.ok).toBe(true)
    expect(res.value.songId).toBe('song1')
    expect(res.value.lines.length).toBe(2)
    expect(res.value.lines[0].points[0]).toEqual({ tMs: 0, hz: 440 })
  })

  it('loadScoreRef returns null when fetch is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
    const ref = await loadScoreRef('song1', lyrics)
    expect(ref).toBe(null)
  })

  it('loadScoreRef returns null when JSON is invalid', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ version: SCORE_REF_VERSION, songId: 'song1', lines: [] })
    })
    const ref = await loadScoreRef('song1', lyrics)
    expect(ref).toBe(null)
  })

  it('getExpectedPitchForLine interpolates in log domain', () => {
    const ref = {
      version: SCORE_REF_VERSION,
      songId: 'song1',
      lines: [
        {
          lineIndex: 0,
          points: [
            { tMs: 0, hz: 440 },
            { tMs: 1000, hz: 880 }
          ]
        },
        { lineIndex: 1, points: [{ tMs: 0, hz: 440 }] }
      ]
    }

    const mid = getExpectedPitchForLine(ref, 0, 500)
    // geometric mean of 440 and 880 is ~622.254
    expect(mid).toBeGreaterThan(620)
    expect(mid).toBeLessThan(625)
  })
})
