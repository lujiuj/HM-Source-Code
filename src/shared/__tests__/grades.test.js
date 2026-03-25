import { describe, it, expect } from 'vitest'
import { getGradeByScore } from '../utils/grades.js'

describe('getGradeByScore', () => {
  it('maps thresholds correctly (boundaries)', () => {
    expect(getGradeByScore(59)).toBe('C')
    expect(getGradeByScore(60)).toBe('B')

    expect(getGradeByScore(74)).toBe('B')
    expect(getGradeByScore(75)).toBe('A')

    expect(getGradeByScore(84)).toBe('A')
    expect(getGradeByScore(85)).toBe('S')

    expect(getGradeByScore(89)).toBe('S')
    expect(getGradeByScore(90)).toBe('SS')

    expect(getGradeByScore(94)).toBe('SS')
    expect(getGradeByScore(95)).toBe('SSS')
  })
})
