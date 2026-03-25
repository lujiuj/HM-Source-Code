import { describe, it, expect } from 'vitest'
import { normalizeSources } from '../utils/teachingSources.js'

describe('normalizeSources', () => {
  it('returns empty for non-array inputs', () => {
    expect(normalizeSources(null)).toEqual([])
    expect(normalizeSources(undefined)).toEqual([])
    expect(normalizeSources({})).toEqual([])
  })

  it('normalizes strings and objects to {title,url}', () => {
    const res = normalizeSources([
      'https://example.com/a',
      { url: 'https://example.com/b', title: 'B' },
      { url: 'https://example.com/c' }
    ])

    expect(res).toEqual([
      { title: 'https://example.com/a', url: 'https://example.com/a' },
      { title: 'B', url: 'https://example.com/b' },
      { title: 'https://example.com/c', url: 'https://example.com/c' }
    ])
  })

  it('drops invalid entries', () => {
    const res = normalizeSources(['', '  ', { title: 'X' }, { url: '  ' }, 123])
    expect(res).toEqual([])
  })
})
