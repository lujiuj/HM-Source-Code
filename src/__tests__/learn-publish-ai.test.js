import { buildPublishOwnerReviewPayload, hasUsablePublishAiAnalysis } from '../modules/learn/utils/publishAi.js'

describe('learn publish ai cache', () => {
  it('accepts full publish analysis payloads', () => {
    expect(hasUsablePublishAiAnalysis({
      source: 'audio-analysis',
      analysisV2: { overallScore: 86 },
      headline: 'ready'
    })).toBe(true)
  })

  it('accepts legacy cached publish summaries from history records', () => {
    expect(hasUsablePublishAiAnalysis({
      source: 'ai-service',
      headline: '建议微调后再发布',
      summary: '整体状态可用，但先补弱项。',
      items: ['先补一句', '再录一遍']
    })).toBe(true)
  })

  it('rejects unavailable or broken payloads', () => {
    expect(hasUsablePublishAiAnalysis({
      source: 'ai-error',
      headline: 'broken'
    })).toBe(false)

    expect(hasUsablePublishAiAnalysis({
      unavailable: true,
      summaryText: 'later'
    })).toBe(false)
  })

  it('builds a publish-time owner review payload from practice data', () => {
    const payload = buildPublishOwnerReviewPayload({
      practiceId: 'practice-1',
      songId: 'song-1',
      audioUrl: 'https://example.com/demo.mp3',
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 78 }],
      analysisV2: {
        overallScore: 82,
        dimensions: {
          pitch: 74,
          rhythm: 84,
          articulation: 79,
          style: 85,
          breath: 80,
          emotion: 83
        }
      }
    })

    expect(payload).toEqual(expect.objectContaining({
      context: 'work-detail',
      workId: 'practice-1',
      songId: 'song-1',
      audioUrl: 'https://example.com/demo.mp3'
    }))
  })
})
