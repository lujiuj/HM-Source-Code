import { describe, expect, it } from 'vitest'
import { normalizeAnalysisV2 } from '../modules/learn/utils/analysisV2.js'

describe('analysisV2 alias normalization', () => {
  it('maps legacy dimension aliases onto the canonical six dimensions', () => {
    const normalized = normalizeAnalysisV2({
      overallScore: 88,
      dimensions: {
        pitch: 91,
        rhythm: 84,
        pronunciation: 79,
        tone: 83,
        voiceActivity: 76,
        expression: 90
      }
    })

    expect(normalized.dimensionMap.pitch).toBe(91)
    expect(normalized.dimensionMap.rhythm).toBe(84)
    expect(normalized.dimensionMap.articulation).toBe(79)
    expect(normalized.dimensionMap.style).toBe(83)
    expect(normalized.dimensionMap.breath).toBe(76)
    expect(normalized.dimensionMap.emotion).toBe(90)
  })
})
