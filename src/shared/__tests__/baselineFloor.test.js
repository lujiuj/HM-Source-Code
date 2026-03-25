import { describe, it, expect } from 'vitest'

import {
  computeOffWindowPenalty,
  applyBaselineToLine,
  applyBaselineToFinal
} from '../domain/scoring/baselineFloor.js'

describe('baselineFloor', () => {
  it('computeOffWindowPenalty clamps to [0,35]', () => {
    expect(computeOffWindowPenalty(700, 0)).toBe(0)
    expect(computeOffWindowPenalty(0, 1000)).toBe(35)
  })

  it('applyBaselineToLine floors to >=60 when voiced >= minLineVoicedMs', () => {
    const line = { lineIndex: 0, overall: 10 }
    const out = applyBaselineToLine(line, 400, { minLineVoicedMs: 350, floorScore: 60 })

    expect(out.overall).toBe(60)
    expect(out.grade).toBe('B')
  })

  it('applyBaselineToFinal floors overall and per-line only when aligned voiced exists', () => {
    const final = {
      overall: 20,
      breakdown: {},
      lines: [
        { lineIndex: 0, overall: 10 },
        { lineIndex: 1, overall: 80 }
      ]
    }

    const state = {
      voicedInMs: 400,
      voicedOutMs: 0,
      lineVoicedMs: new Map([
        [0, 400],
        [1, 0]
      ])
    }

    const out = applyBaselineToFinal(final, state, { minLineVoicedMs: 350, floorScore: 60 })
    expect(out.overall).toBe(60)
    expect(out.grade).toBe('B')
    expect(out.lines[0].overall).toBe(60)
    expect(out.lines[1].overall).toBe(80)
  })

  it('applyBaselineToFinal applies off-window penalty (cap 35)', () => {
    const final = { overall: 100, breakdown: {}, lines: [] }
    const state = { voicedInMs: 350, voicedOutMs: 1050, lineVoicedMs: new Map() }

    const out = applyBaselineToFinal(final, state, { minLineVoicedMs: 350, floorScore: 60 })
    expect(out.overall).toBe(65)
  })
})
