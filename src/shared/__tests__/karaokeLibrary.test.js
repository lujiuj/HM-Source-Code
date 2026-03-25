import { describe, it, expect } from 'vitest'
import { karaokeLibrary, getSongById, getAllSongs, getSongsByDifficulty } from '../config/karaokeLibrary.js'

describe('karaokeLibrary', () => {
  it('should expose the three-song learn library only', () => {
    expect(Object.keys(karaokeLibrary)).toEqual([
      'tianxianpei-fuqishuangshuang',
      'nvfuma-weijiulilang',
      'liangzhu-wocongci'
    ])
  })

  it('each song should have required fields', () => {
    const requiredFields = ['id', 'title', 'videoSrc', 'duration', 'durationSeconds', 'singer', 'difficulty']
    Object.values(karaokeLibrary).forEach(song => {
      requiredFields.forEach(field => {
        expect(song).toHaveProperty(field)
      })
    })
  })

  it('getSongById should return correct song', () => {
    const song = getSongById('tianxianpei-fuqishuangshuang')
    expect(song).toBeDefined()
    expect(song.title).toBe('《天仙配》选段 - 夫妻双双把家还')
  })

  it('getSongById should return undefined for invalid id', () => {
    expect(getSongById('nonexistent')).toBeUndefined()
  })

  it('getAllSongs should return exactly three learn songs', () => {
    expect(getAllSongs()).toHaveLength(3)
  })

  it('getSongsByDifficulty should sort correctly', () => {
    const ascending = getSongsByDifficulty(true)
    expect(ascending[0].difficulty).toBeLessThanOrEqual(ascending[1].difficulty)

    const descending = getSongsByDifficulty(false)
    expect(descending[0].difficulty).toBeGreaterThanOrEqual(descending[1].difficulty)
  })
})
