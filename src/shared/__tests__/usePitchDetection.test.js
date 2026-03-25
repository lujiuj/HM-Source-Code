import { describe, it, expect } from 'vitest'
import { frequencyToNote, PitchSmoother } from '../composables/usePitchDetection.js'

describe('frequencyToNote', () => {
  it('should return null for invalid frequency', () => {
    expect(frequencyToNote(0)).toBeNull()
    expect(frequencyToNote(-100)).toBeNull()
    expect(frequencyToNote(null)).toBeNull()
  })
  
  it('should correctly identify A4 = 440Hz', () => {
    const result = frequencyToNote(440)
    expect(result.note).toBe('A')
    expect(result.octave).toBe(4)
    expect(Math.abs(result.cents)).toBeLessThan(5) // Allow small deviation
  })
  
  it('should correctly identify middle C (C4 ≈ 261.63Hz)', () => {
    const result = frequencyToNote(261.63)
    expect(result.note).toBe('C')
    expect(result.octave).toBe(4)
  })
  
  it('should calculate cents deviation', () => {
    // A4 slightly sharp
    const sharp = frequencyToNote(450)
    expect(sharp.cents).toBeGreaterThan(0)
    
    // A4 slightly flat
    const flat = frequencyToNote(430)
    expect(flat.cents).toBeLessThan(0)
  })
  
  it('should provide MIDI number', () => {
    const a4 = frequencyToNote(440)
    expect(a4.midiNumber).toBe(69) // A4 = MIDI 69
    
    const c4 = frequencyToNote(261.63)
    expect(c4.midiNumber).toBe(60) // C4 = MIDI 60
  })
})

describe('PitchSmoother', () => {
  it('should smooth values with median', () => {
    const smoother = new PitchSmoother(5)
    
    smoother.add(100)
    smoother.add(102)
    smoother.add(101)
    smoother.add(99)
    const result = smoother.add(101)
    
    expect(result).toBe(101) // Median of [99, 100, 101, 101, 102]
  })
  
  it('should handle null values', () => {
    const smoother = new PitchSmoother(3)
    expect(smoother.add(null)).toBeNull()
  })
  
  it('should reject outliers with median', () => {
    const smoother = new PitchSmoother(5)
    
    smoother.add(100)
    smoother.add(100)
    smoother.add(500) // Outlier
    smoother.add(100)
    const result = smoother.add(100)
    
    expect(result).toBe(100) // Median rejects the outlier
  })
  
  it('should reset properly', () => {
    const smoother = new PitchSmoother(3)
    smoother.add(100)
    smoother.add(200)
    smoother.reset()
    
    const result = smoother.add(50)
    expect(result).toBe(50) // Only value after reset
  })
})
