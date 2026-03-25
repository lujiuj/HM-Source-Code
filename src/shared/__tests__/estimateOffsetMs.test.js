import { describe, it, expect } from 'vitest'

import { estimateOffsetMs } from '../domain/timing/estimateOffsetMs.js'

function makeVoicedSamples({ startMs, endMs, stepMs }) {
  const out = []
  for (let t = startMs; t <= endMs; t += stepMs) {
    out.push({ mediaMs: t, isVoiced: true })
  }
  return out
}

describe('estimateOffsetMs', () => {
  it('returns 0 when insufficient voiced frames', () => {
    const res = estimateOffsetMs({
      samples: [{ mediaMs: 100, isVoiced: true }],
      lyrics: [{ time: 1000 }]
    })
    expect(res.offsetMs).toBe(0)
    expect(res.confidence).toBe(0)
  })

  it('finds a negative offset when user voice is delayed vs lyric times', () => {
    const lyrics = [{ time: 1000 }, { time: 2000 }, { time: 3000 }, { time: 4000 }]

    // User starts voicing ~200ms late.
    const samples = makeVoicedSamples({ startMs: 1200, endMs: 1800, stepMs: 50 })
      .concat(makeVoicedSamples({ startMs: 2200, endMs: 2800, stepMs: 50 }))

    const res = estimateOffsetMs({
      samples,
      lyrics,
      sampleIntervalMs: 50,
      searchMinMs: -500,
      searchMaxMs: 500,
      stepMs: 50,
      windowMarginMs: 0
    })

    expect(res.offsetMs).toBe(-200)
    expect(res.confidence).toBeGreaterThanOrEqual(0)
  })
})
