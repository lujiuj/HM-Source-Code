import { describe, expect, it } from 'vitest'

import {
  buildAudioAnalysisResponse,
  buildAudioAnalysisUnavailable,
  canBuildAudioAnalysis,
  hasAudioInsightInput
} from '../../server/learn-ai/audioAnalysisService.js'

function buildAnalysisPayload() {
  return {
    context: 'publish',
    analysisV2: {
      overallScore: 87,
      overallGrade: 'A',
      dimensions: {
        pitch: 84,
        rhythm: 82,
        articulation: 79,
        style: 77,
        breath: 80,
        emotion: 78
      },
      lineDiagnostics: [
        {
          lineIndex: 0,
          lineText: 'line one',
          overall: 81,
          scores: {
            pitch: 82,
            rhythm: 80,
            articulation: 78,
            style: 76,
            breath: 79,
            emotion: 77
          }
        },
        {
          lineIndex: 1,
          lineText: 'line two',
          overall: 88,
          scores: {
            pitch: 89,
            rhythm: 87,
            articulation: 84,
            style: 82,
            breath: 85,
            emotion: 83
          }
        }
      ]
    }
  }
}

describe('learn audio analysis service', () => {
  it('rejects publish analysis when all dimensions are missing', () => {
    expect(canBuildAudioAnalysis({
      analysisV2: {
        overallScore: 87,
        overallGrade: 'A',
        dimensions: {
          pitch: 0,
          rhythm: 0,
          articulation: 0,
          style: 0,
          breath: 0,
          emotion: 0
        }
      }
    })).toBe(false)
  })

  it('requires work-detail payload to carry workId and lineScores', () => {
    expect(canBuildAudioAnalysis({
      context: 'work-detail',
      songId: 'song-1',
      analysisV2: {
        overallScore: 81,
        dimensions: {
          pitch: 70,
          rhythm: 82,
          articulation: 79,
          style: 77,
          breath: 80,
          emotion: 78
        }
      }
    })).toBe(false)
  })

  it('builds a publish response from real analysis payload plus AI summary', () => {
    const response = buildAudioAnalysisResponse(buildAnalysisPayload(), {
      headline: 'Publish advice',
      summary: 'Overall shape is usable, but tune the weak spots before posting.',
      items: ['Replay line one', 'Tune pitch first', 'Confirm then publish']
    })

    expect(response.source).toBe('audio-analysis')
    expect(response.context).toBe('publish')
    expect(response.summaryText).toBe('Overall shape is usable, but tune the weak spots before posting.')
    expect(response.publishAdviceItems).toEqual(['Replay line one', 'Tune pitch first', 'Confirm then publish'])
    expect(response.lineHighlights[0]).toEqual(expect.objectContaining({
      lineIndex: 0,
      lineText: 'line one'
    }))
    expect(response.analysisV2.overallScore).toBe(87)
  })

  it('builds a work-detail response with objective and final layers', () => {
    const response = buildAudioAnalysisResponse({
      context: 'work-detail',
      workId: 'work-1',
      songId: 'song-1',
      lineScores: [{ lineIndex: 0, lineText: 'line one', overall: 81 }],
      analysisV2: buildAnalysisPayload().analysisV2
    }, {
      overallJudgement: 'The main issue is pitch stability on the first line.',
      weakestDimension: {
        key: 'pitch',
        label: '音准',
        reason: '起音偏高。',
        suggestion: '先慢练。'
      },
      lineIssues: [
        { lineIndex: 0, lineText: 'line one', issue: 'pitch drifts', tip: 'slow down first' }
      ],
      nextSteps: ['repeat line one', 'lock the phrase ending', 'sing the full section again'],
      voiceoverText: 'Repeat line one and lock the phrase ending.'
    }, {
      context: 'work-detail',
      audioInsights: {
        ok: false,
        reason: 'stub-not-implemented',
        model: 'qwen-omni-turbo'
      }
    })

    expect(response.context).toBe('work-detail')
    expect(response.objectiveAnalysis.overallScore).toBe(87)
    expect(response.audioInsights).toEqual(expect.objectContaining({
      available: false,
      reason: 'stub-not-implemented'
    }))
    expect(response.finalAdvice).toEqual(expect.objectContaining({
      overallJudgement: 'The main issue is pitch stability on the first line.',
      nextSteps: ['repeat line one', 'lock the phrase ending', 'sing the full section again']
    }))
  })

  it('detects when audio insight input exists', () => {
    expect(hasAudioInsightInput({ audioUrl: 'https://example.com/demo.mp3' })).toBe(true)
    expect(hasAudioInsightInput({ mediaUrl: 'https://example.com/demo.mp3' })).toBe(true)
    expect(hasAudioInsightInput({ mediaId: 'demo-id' })).toBe(false)
  })

  it('marks unavailable responses explicitly', () => {
    expect(buildAudioAnalysisUnavailable('analysis endpoint missing', {
      errorCode: 'NO_PROVIDER',
      status: 503
    })).toEqual(expect.objectContaining({
      source: 'audio-analysis',
      unavailable: true,
      error: 'analysis endpoint missing',
      errorCode: 'NO_PROVIDER',
      status: 503
    }))
  })
})
