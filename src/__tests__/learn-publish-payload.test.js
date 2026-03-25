import { buildLearnPublishPayload, formatLearnDurationSec, hasStructuredPublishSession, isPublishPayloadReady } from '../modules/learn/utils/publishWorkPayload.js'

describe('learn publish payload', () => {
  it('formats duration in seconds', () => {
    expect(formatLearnDurationSec(125)).toBe('2:05')
    expect(formatLearnDurationSec('9')).toBe('0:09')
  })

  it('checks publish readiness with structured session data', () => {
    expect(hasStructuredPublishSession({
      analysisV2: { overallScore: 86 },
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 86 }]
    })).toBe(true)
    expect(hasStructuredPublishSession({ analysisV2: { overallScore: 86 }, lineScores: [] })).toBe(false)
    expect(isPublishPayloadReady({
      songId: 'song-a',
      analysisV2: { overallScore: 86 },
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 86 }]
    }, 'blob:demo')).toBe(true)
    expect(isPublishPayloadReady({ songId: 'song-a' }, '')).toBe(false)
  })

  it('builds a structured-clone-safe work payload', () => {
    const payload = buildLearnPublishPayload({
      session: {
        id: 'practice-1',
        songId: 'song-a',
        duration: 132,
        score: 86,
        grade: 'A',
        stars: 3,
        mediaId: 'media-1',
        analysisV2: {
          overallScore: 86,
          overallGrade: 'A',
          dimensions: {
            pitch: 82,
            rhythm: 84,
            articulation: 80,
            style: 88,
            breath: 81,
            emotion: 85
          }
        },
        breakdown: {
          voiceActivity: '77',
          pitchAccuracy: 88,
          extraFn: () => 'noop'
        },
        lineScores: [
          {
            lineIndex: 0,
            lineText: '树上的鸟儿成双对',
            overall: 86,
            gradeLabel: '稳',
            sampleCount: 12,
            recordedAt: new Date('2025-01-01T00:00:00Z'),
            helper: () => {}
          }
        ],
        publishAiAnalysis: {
          headline: '可发布',
          ownerReviewSnapshot: {
            finalAdvice: {
              overallJudgement: '先把第一句再稳一下。',
              nextSteps: ['回练第一句', '再完整唱一遍']
            }
          }
        }
      },
      audioUrl: 'blob:demo',
      userId: 'user-1',
      username: '戏友',
      songName: '夫妻双双把家还',
      existingWorkId: 'work-1'
    })

    expect(payload.id).toBe('work-1')
    expect(payload.duration).toBe(132)
    expect(payload.breakdown).toEqual(expect.objectContaining({
      voiceActivity: 77,
      pitchAccuracy: 88
    }))
    expect(payload.analysisV2).toBeTruthy()
    expect(payload.publishAiAnalysis).toEqual(expect.objectContaining({
      headline: '可发布'
    }))
    expect(payload.publishAiAnalysis.ownerReviewSnapshot.finalAdvice.overallJudgement).toBe('先把第一句再稳一下。')
    expect(payload.publishedFromPracticeId).toBe('practice-1')
    expect(payload.lineScores[0].lineText).toBe('树上的鸟儿成双对')
    expect(payload.lineScores[0].scores).toEqual({})
    expect(() => structuredClone(payload)).not.toThrow()
  })

  it('rejects legacy publish payloads without structured analysis data', () => {
    expect(() => buildLearnPublishPayload({
      session: {
        id: 'practice-legacy',
        songId: 'song-a',
        duration: 132,
        score: 86,
        grade: 'A',
        stars: 3,
        mediaId: 'media-1',
        lineScores: []
      },
      audioUrl: 'blob:demo',
      userId: 'user-1',
      username: '戏友',
      songName: '夫妻双双把家还'
    })).toThrow('当前练唱记录不是新结构数据')
  })
})
