import { describe, it, expect } from 'vitest'
import { parseLRC, findCurrentLineIndex } from '../composables/useLyricSync.js'

const sampleLRC = `[ti:测试歌曲]
[ar:测试歌手]
[00:00.00]第一句歌词
[00:05.50]第二句歌词
[00:10.00]第三句歌词
[00:15.00]第四句歌词`

describe('parseLRC', () => {
  it('should parse LRC format correctly', () => {
    const lyrics = parseLRC(sampleLRC)
    expect(lyrics.length).toBe(4)
    expect(lyrics[0]).toEqual({ time: 0, text: '第一句歌词' })
    expect(lyrics[1]).toEqual({ time: 5500, text: '第二句歌词' })
  })
  
  it('should skip metadata lines', () => {
    const lyrics = parseLRC(sampleLRC)
    const hasMetadata = lyrics.some(l => l.text.includes('[ti:'))
    expect(hasMetadata).toBe(false)
  })
  
  it('should sort lyrics by time', () => {
    const unsortedLRC = `[00:10.00]后面
[00:05.00]中间
[00:00.00]开头`
    const lyrics = parseLRC(unsortedLRC)
    expect(lyrics[0].time).toBeLessThan(lyrics[1].time)
    expect(lyrics[1].time).toBeLessThan(lyrics[2].time)
  })
  
  it('should handle empty input', () => {
    expect(parseLRC('')).toEqual([])
  })
})

describe('findCurrentLineIndex', () => {
  const lyrics = [
    { time: 0, text: 'Line 1' },
    { time: 5000, text: 'Line 2' },
    { time: 10000, text: 'Line 3' }
  ]
  
  it('should return -1 before first line', () => {
    expect(findCurrentLineIndex(lyrics, -100)).toBe(-1)
  })
  
  it('should return 0 at time 0', () => {
    expect(findCurrentLineIndex(lyrics, 0)).toBe(0)
  })
  
  it('should return correct index during song', () => {
    expect(findCurrentLineIndex(lyrics, 2500)).toBe(0)
    expect(findCurrentLineIndex(lyrics, 5000)).toBe(1)
    expect(findCurrentLineIndex(lyrics, 7500)).toBe(1)
    expect(findCurrentLineIndex(lyrics, 15000)).toBe(2)
  })
  
  it('should handle empty lyrics', () => {
    expect(findCurrentLineIndex([], 5000)).toBe(-1)
  })
})
