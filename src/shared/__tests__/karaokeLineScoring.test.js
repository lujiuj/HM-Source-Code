import { describe, it, expect } from 'vitest'
import { useHuangmeiScore } from '../composables/useHuangmeiScore.js'
import { scorePreviousLineOnChange } from '../utils/karaokeLineScoring.js'

describe('scorePreviousLineOnChange', () => {
  it('scores previous line and clears buffer (via scoreLine)', () => {
    const { addSample, scoreLine } = useHuangmeiScore()
    const lyrics = [{ time: 0, text: 'Line 1' }, { time: 5000, text: 'Line 2' }]

    addSample({ pitch: 440 }, { rms: 0.2, isVoiced: true }, 1000)
    addSample({ pitch: 445 }, { rms: 0.2, isVoiced: true }, 1040)

    const result = scorePreviousLineOnChange({
      previousIndex: 0,
      currentIndex: 1,
      lyrics,
      scoreLine
    })

    expect(result).toBeTruthy()
    expect(result.lineIndex).toBe(0)
    expect(result.sampleCount).toBeGreaterThan(0)

    // buffer should be cleared inside scoreLine; scoring next line with no new samples yields empty
    const next = scoreLine(1, 'Line 2')
    expect(next.sampleCount).toBe(0)
  })
})
