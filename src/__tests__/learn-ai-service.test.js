import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLearnAiService } from '../../server/learn-ai/adviceService.js'

async function createTempCacheDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'hmx-ai-service-'))
}

describe('learn-ai service extra capability wrappers', () => {
  it('passes work-detail mode through the text service', async () => {
    const cacheDir = await createTempCacheDir()
    const service = createLearnAiService({
      apiKey: 'glm-test-key',
      cacheDir,
      requestGlmAdvice: async ({ mode }) => ({
        ok: true,
        provider: 'glm',
        model: 'glm-4-flash-250414',
        data: {
          overallJudgement: `mode:${mode}`,
          weakestDimension: {
            key: 'pitch',
            label: '音准',
            reason: '起音偏高',
            suggestion: '先慢练'
          },
          lineIssues: [{ lineIndex: 0, lineText: '第一句', issue: '起音偏高', tip: '先半速' }],
          nextSteps: ['回练第一句', '稳住句尾', '再完整唱一遍'],
          voiceoverText: '先把第一句稳住。'
        }
      })
    })

    const result = await service.getAdvice({
      mode: 'work-detail',
      payload: {
        workId: 'work-1',
        songId: 'song-1',
        analysisV2: {
          overallScore: 82,
          dimensions: { pitch: 74, rhythm: 81, articulation: 79, style: 78, breath: 80, emotion: 77 }
        }
      }
    })

    expect(result.meta.mode).toBe('work-detail')
    expect(result.data.overallJudgement).toBe('mode:work-detail')
  })

  it('exposes audio, retrieval and tts wrapper methods', async () => {
    const cacheDir = await createTempCacheDir()
    const service = createLearnAiService({
      apiKey: 'glm-test-key',
      cacheDir,
      requestGlmAdvice: async () => ({ ok: false, busy: false, errorMessage: 'unused' }),
      requestAudioInsights: async () => ({ ok: false, reason: 'stub-audio', model: 'audio-model', insights: null }),
      requestMasterRecall: async () => ({ ok: false, reason: 'stub-recall', fragments: [], recommendations: [] }),
      requestTtsSynthesize: async () => ({ ok: false, reason: 'stub-tts', model: 'tts-model', audioUrl: null })
    })

    const audioResult = await service.getAudioInsights({ payload: { audioUrl: 'https://example.com/a.mp3' } })
    const recallResult = await service.getMasterRecall({ payload: { songId: 'song-1', query: '音准' } })
    const ttsResult = await service.synthesizeTts({ payload: { finalAdvice: '继续练第一句。' } })

    expect(audioResult.reason).toBe('stub-audio')
    expect(recallResult.reason).toBe('stub-recall')
    expect(ttsResult.reason).toBe('stub-tts')
  })
})
