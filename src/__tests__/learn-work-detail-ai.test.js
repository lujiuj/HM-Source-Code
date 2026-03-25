import { describe, expect, it, vi } from 'vitest'

import {
  buildOwnerReviewFallback,
  buildOwnerReviewPayload,
  getAccessibleMediaUrl,
  resolveLearnApiEndpoint,
  resolveOwnerReviewError,
  resolveTtsFeedback
} from '../modules/learn/utils/workDetailAi.js'

describe('work detail ai utils', () => {
  it('builds owner review payload only when required data exists', () => {
    const payload = buildOwnerReviewPayload({
      id: 'work-1',
      songId: 'song-1',
      mediaUrl: 'https://example.com/demo.mp3',
      analysisV2: {
        overallScore: 82,
        overallGrade: 'A',
        dimensions: {
          pitch: 74,
          rhythm: 84,
          articulation: 79,
          style: 85,
          breath: 80,
          emotion: 83
        }
      },
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 71 }]
    })

    expect(payload).toEqual(expect.objectContaining({
      context: 'work-detail',
      workId: 'work-1',
      songId: 'song-1',
      audioUrl: 'https://example.com/demo.mp3'
    }))

    expect(buildOwnerReviewPayload({
      id: 'work-1',
      songId: 'song-1',
      analysisV2: { overallScore: 0 },
      lineScores: []
    })).toBeNull()
  })

  it('requires explicit work lineScores for owner review payload', () => {
    const payload = buildOwnerReviewPayload({
      id: 'work-legacy',
      songId: 'song-1',
      analysisV2: {
        overallScore: 82,
        overallGrade: 'A',
        dimensions: {
          pitch: 74,
          rhythm: 84,
          articulation: 79,
          style: 85,
          breath: 80,
          emotion: 83
        },
        lineDiagnostics: [
          {
            lineIndex: 0,
            lineText: '第一句',
            overall: 71,
            scores: {
              pitch: 70,
              rhythm: 75,
              articulation: 68,
              style: 80,
              breath: 72,
              emotion: 78
            }
          }
        ]
      }
    })

    expect(payload).toBeNull()
  })

  it('prefers accessible media urls only', () => {
    expect(getAccessibleMediaUrl({ mediaUrl: 'blob:demo' }, 'blob:demo')).toBe('')
    expect(getAccessibleMediaUrl({ mediaUrl: 'https://example.com/remote.mp3' }, '')).toBe('https://example.com/remote.mp3')
  })

  it('resolves learn endpoint for local and server contexts', () => {
    expect(resolveLearnApiEndpoint('/api/learn/audio-analysis')).toBe('https://hmx1-backend.onrender.com/api/learn/audio-analysis')

    vi.stubGlobal('window', {
      location: {
        hostname: '127.0.0.1',
        protocol: 'http:'
      }
    })
    expect(resolveLearnApiEndpoint('/api/learn/tts')).toBe('https://hmx1-backend.onrender.com/api/learn/tts')

    vi.stubGlobal('window', {
      location: {
        hostname: 'example.com',
        protocol: 'https:'
      }
    })
    expect(resolveLearnApiEndpoint('/api/learn/master-recall')).toBe('https://hmx1-backend.onrender.com/api/learn/master-recall')

    if (originalWindow) vi.stubGlobal('window', originalWindow)
    else vi.unstubAllGlobals()
  })

  it('maps owner review and tts feedback to user-facing messages', () => {
    expect(resolveOwnerReviewError('Failed to fetch')).toContain('作者复盘接口未连接')
    expect(resolveTtsFeedback({ reason: 'stub-not-implemented' })).toContain('语音老师接口已接通')
    expect(resolveTtsFeedback({ reason: 'request-failed', error: 'boom' })).toBe('boom')
  })

  it('builds a fallback review from weakest dimension', () => {
    const fallback = buildOwnerReviewFallback({
      analysisV2: {
        overallScore: 77,
        dimensions: {
          pitch: 69,
          rhythm: 84,
          articulation: 72,
          style: 80,
          breath: 78,
          emotion: 79
        }
      }
    })

    expect(fallback.overallJudgement).toContain('暂时不能生成作者复盘')
    expect(fallback.weakestDimension.label).toBe('音准')
  })
})
