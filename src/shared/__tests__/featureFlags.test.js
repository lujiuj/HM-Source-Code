import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isFlagEnabled, FLAGS } from '../utils/featureFlags.js'

describe('featureFlags utility', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_KARAOKE_SCORING_V2', '')
  })

  it('should return false by default', () => {
    expect(isFlagEnabled(FLAGS.SCORING_V2)).toBe(false)
  })

  it('should return true when localStorage is set to "1"', () => {
    localStorage.setItem(FLAGS.SCORING_V2, '1')
    expect(isFlagEnabled(FLAGS.SCORING_V2)).toBe(true)
  })

  it('should return false when localStorage is set to "0"', () => {
    localStorage.setItem(FLAGS.SCORING_V2, '0')
    expect(isFlagEnabled(FLAGS.SCORING_V2)).toBe(false)
  })

  it('should return true when VITE_KARAOKE_SCORING_V2 is set to "1"', () => {
    vi.stubEnv('VITE_KARAOKE_SCORING_V2', '1')
    expect(isFlagEnabled(FLAGS.SCORING_V2)).toBe(true)
  })

  it('localStorage should take precedence over env variable', () => {
    localStorage.setItem(FLAGS.SCORING_V2, '0')
    vi.stubEnv('VITE_KARAOKE_SCORING_V2', '1')
    expect(isFlagEnabled(FLAGS.SCORING_V2)).toBe(false)
  })
})
