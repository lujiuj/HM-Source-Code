import { describe, it, expect } from 'vitest'
import { buildWorksLeaderboard } from '../utils/worksLeaderboard.js'

describe('buildWorksLeaderboard', () => {
  it('keeps best per user and sorts desc by score', () => {
    const works = [
      { id: 'w1', userId: 'u1', username: 'A', score: 80, timestamp: 10, deletedAt: null },
      { id: 'w2', userId: 'u1', username: 'A', score: 90, timestamp: 20, deletedAt: null },
      { id: 'w3', userId: 'u2', username: 'B', score: 85, timestamp: 30, deletedAt: null },
      { id: 'w4', userId: 'u3', username: 'C', score: 70, timestamp: 40, deletedAt: null }
    ]

    const res = buildWorksLeaderboard(works, 10)
    expect(res.all.length).toBe(3)
    expect(res.all[0].userId).toBe('u1')
    expect(res.all[0].score).toBe(90)
    expect(res.all[1].userId).toBe('u2')
    expect(res.all[2].userId).toBe('u3')
  })

  it('ignores deleted works', () => {
    const res = buildWorksLeaderboard([
      { id: 'w1', userId: 'u1', score: 90, timestamp: 1, deletedAt: Date.now() }
    ])
    expect(res.all.length).toBe(0)
  })
})
