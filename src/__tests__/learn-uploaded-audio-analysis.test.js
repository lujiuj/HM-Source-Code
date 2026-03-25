import { describe, expect, it } from 'vitest'

import {
  createPitchFrames,
  deriveReferenceAudioAffinity,
  isSongUploadAnalysisSupported,
  normalizeLyricsForScoring,
  recalibrateLineScores,
  scoreUploadedPitchFrames
} from '../modules/learn/utils/uploadedAudioAnalysis.js'

describe('uploaded audio analysis', () => {
  it('detects whether a song supports uploaded-audio analysis', () => {
    expect(isSongUploadAnalysisSupported({ id: 'song-a', lrcPath: '/demo.lrc' })).toBe(true)
    expect(isSongUploadAnalysisSupported({ id: 'song-a', title: 'demo song' })).toBe(false)
    expect(isSongUploadAnalysisSupported({ id: '', lrcPath: '' })).toBe(false)
  })

  it('normalizes LRC lines into scoring lyrics', () => {
    expect(normalizeLyricsForScoring([
      { startMs: 0, text: 'first line' },
      { startMs: 1200, text: 'second line' }
    ])).toEqual([
      { lineIndex: 0, time: 0, text: 'first line' },
      { lineIndex: 1, time: 1200, text: 'second line' }
    ])
  })

  it('scores aligned pitch frames against lyrics and scoreRef', () => {
    const lyrics = [
      { time: 0, text: 'line one' },
      { time: 1200, text: 'line two' }
    ]
    const frames = [
      { timeMs: 0, rms: 0.12, pitch: 440, isVoiced: true },
      { timeMs: 80, rms: 0.13, pitch: 440, isVoiced: true },
      { timeMs: 160, rms: 0.11, pitch: 440, isVoiced: true },
      { timeMs: 1280, rms: 0.12, pitch: 330, isVoiced: true },
      { timeMs: 1360, rms: 0.11, pitch: 330, isVoiced: true },
      { timeMs: 1440, rms: 0.13, pitch: 330, isVoiced: true }
    ]
    const scoreRef = {
      version: 1,
      source: 'test',
      generatedAt: 'today',
      lines: [
        {
          lineIndex: 0,
          points: [
            { tMs: 0, hz: 440 },
            { tMs: 200, hz: 440 }
          ]
        },
        {
          lineIndex: 1,
          points: [
            { tMs: 0, hz: 330 },
            { tMs: 200, hz: 330 }
          ]
        }
      ]
    }

    const result = scoreUploadedPitchFrames({
      frames,
      lyrics,
      scoreRef,
      referenceFrames: frames,
      durationMs: 2400
    })

    expect(result.referenceAudioMetrics?.affinity).toBeGreaterThan(0.95)
    expect(result.averageScore).toBeGreaterThanOrEqual(98)
    expect(result.analysisV2.overallScore).toBe(result.averageScore)
    expect(result.analysisV2.lineDiagnostics).toHaveLength(2)
    expect(result.lineScores[0].sampleCount).toBeGreaterThan(0)
    expect(result.breakdown.style).toBeGreaterThanOrEqual(97)
    expect(result.breakdown.emotion).toBeGreaterThanOrEqual(97)
    expect(result.analysisV2.aiSummary).toContain('接近示范演唱')
    expect(result.analysisV2.objectiveDiagnosis[0]).toContain('示范级')
    expect(result.analysisV2.lineDiagnostics[0].objectiveDiagnosis).toContain('示范句')
  })

  it('can score uploaded audio without a song-specific scoreRef', () => {
    const lyrics = [
      { time: 0, text: 'intro section' },
      { time: 1200, text: 'closing section' }
    ]
    const frames = [
      { timeMs: 0, rms: 0.12, pitch: 440, isVoiced: true },
      { timeMs: 80, rms: 0.13, pitch: 443, isVoiced: true },
      { timeMs: 160, rms: 0.11, pitch: 445, isVoiced: true },
      { timeMs: 1280, rms: 0.12, pitch: 332, isVoiced: true },
      { timeMs: 1360, rms: 0.11, pitch: 334, isVoiced: true },
      { timeMs: 1440, rms: 0.13, pitch: 336, isVoiced: true }
    ]

    const result = scoreUploadedPitchFrames({
      frames,
      lyrics,
      durationMs: 2400
    })

    expect(result.averageScore).toBeGreaterThan(0)
    expect(result.analysisV2.lineDiagnostics).toHaveLength(2)
    expect(result.scoreRefSummary.available).toBe(false)
  })

  it('creates pitch frames from mono samples', () => {
    const sampleRate = 44100
    const length = 4096
    const samples = new Float32Array(length)
    for (let index = 0; index < length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.3
    }

    const frames = createPitchFrames(samples, { sampleRate, frameSize: 2048, hopSize: 1024, minRms: 0.001 })
    expect(frames.length).toBeGreaterThan(0)
    expect(frames.some((frame) => frame.pitch)).toBe(true)
  })

  it('pulls near-reference vocals into a near-demo score band', () => {
    const sourceLines = [
      {
        lineIndex: 0,
        lineText: 'line one',
        overall: 100,
        sampleCount: 288,
        scores: {
          pitch: 74,
          rhythm: 82,
          articulation: 73,
          style: 42,
          breath: 76,
          emotion: 31
        },
        deductions: ['style low', 'emotion low']
      },
      {
        lineIndex: 1,
        lineText: 'line two',
        overall: 100,
        sampleCount: 286,
        scores: {
          pitch: 75,
          rhythm: 82,
          articulation: 72,
          style: 42,
          breath: 75,
          emotion: 69
        },
        deductions: ['style low']
      }
    ]

    const result = recalibrateLineScores(sourceLines, { referenceAudioAffinity: 0.98 })

    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.referenceAudioAffinity).toBeGreaterThan(0.9)
    expect(result.lines[0].scores.pitch).toBeGreaterThanOrEqual(96)
    expect(result.lines[0].scores.style).toBeGreaterThanOrEqual(97)
    expect(result.lines[0].scores.emotion).toBeGreaterThanOrEqual(97)
    expect(result.lines[0].overall).toBeGreaterThanOrEqual(98)
    expect(Math.min(...Object.values(result.lines[0].scores))).toBeGreaterThanOrEqual(96)
  })

  it('computes very high affinity for matching reference frames', () => {
    const referenceFrames = [
      { timeMs: 0, rms: 0.12, pitch: 440, isVoiced: true },
      { timeMs: 80, rms: 0.12, pitch: 442, isVoiced: true },
      { timeMs: 160, rms: 0.12, pitch: 445, isVoiced: true },
      { timeMs: 240, rms: 0.12, pitch: 330, isVoiced: true }
    ]
    const sourceFrames = [
      { timeMs: 0, rms: 0.11, pitch: 440, isVoiced: true },
      { timeMs: 80, rms: 0.11, pitch: 442, isVoiced: true },
      { timeMs: 160, rms: 0.11, pitch: 445, isVoiced: true },
      { timeMs: 240, rms: 0.11, pitch: 330, isVoiced: true }
    ]

    const metrics = deriveReferenceAudioAffinity(sourceFrames, referenceFrames)

    expect(metrics.affinity).toBeGreaterThan(0.98)
    expect(metrics.coverage).toBeGreaterThan(0.9)
  })
})
