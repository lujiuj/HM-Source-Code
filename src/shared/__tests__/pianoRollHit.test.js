import { describe, it, expect } from 'vitest'

import { hzToMidiNumber, isPitchHit } from '../domain/pitch/pitchMath.js'

function hzWithCents(baseHz, cents) {
  return baseHz * Math.pow(2, cents / 1200)
}

describe('pitchMath', () => {
  it('hzToMidiNumber maps 440Hz -> 69', () => {
    expect(hzToMidiNumber(440)).toBe(69)
  })

  it('isPitchHit respects tolerance in cents', () => {
    const expected = 440
    expect(isPitchHit(expected, expected, 50)).toBe(true)
    expect(isPitchHit(hzWithCents(expected, 50), expected, 50)).toBe(true)
    expect(isPitchHit(hzWithCents(expected, 51), expected, 50)).toBe(false)
  })
})
