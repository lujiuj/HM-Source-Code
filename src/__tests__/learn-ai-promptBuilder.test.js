import { describe, expect, it } from 'vitest'

import { buildModePrompt } from '../../server/learn-ai/promptBuilder.js'
import { normalizeAdviceData, normalizeMode } from '../../server/learn-ai/responseSchema.js'

function extractOutputShape(userPrompt) {
  const startHint = '输出 JSON 模板'
  const endHint = '严格按模板返回'
  const startIdx = userPrompt.indexOf(startHint)
  const endIdx = userPrompt.indexOf(endHint)
  if (startIdx < 0 || endIdx <= startIdx) return null

  const section = userPrompt.slice(startIdx, endIdx)
  const firstBrace = section.indexOf('{')
  const lastBrace = section.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace <= firstBrace) return null

  try {
    return JSON.parse(section.slice(firstBrace, lastBrace + 1))
  } catch {
    return null
  }
}

describe('learn-ai prompt builder schema stability', () => {
  it('keeps stable publish prompt output shape', () => {
    const payload = {
      songId: 'non-existent-song',
      operaName: '天仙配',
      excerptName: '路遇',
      singer: '严凤英',
      style: '抒情',
      analysisV2: { overallScore: 86 }
    }

    const { system, user } = buildModePrompt('publish', payload)
    const shape = extractOutputShape(user)

    expect(normalizeMode('publish')).toBe('publish')
    expect(system.trim().length).toBeGreaterThan(0)
    expect(user.trim().length).toBeGreaterThan(0)
    expect(shape).toEqual(expect.objectContaining({
      headline: expect.any(String),
      summary: expect.any(String),
      items: expect.any(Array)
    }))

    const normalized = normalizeAdviceData('publish', {
      headline: '发布前建议',
      summary: '整体可发，但建议先补弱项。',
      items: ['回听弱句', '补音准', '确认后发布']
    }, 'test-model')

    expect(normalized.ok).toBe(true)
    expect(normalized.data).toMatchObject({
      source: 'ai-service',
      model: 'test-model',
      headline: '发布前建议'
    })
  })

  it('builds work-detail prompt and normalization contract', () => {
    const { user } = buildModePrompt('work-detail', {
      songId: 'demo-song',
      workId: 'work-1',
      analysisV2: { overallScore: 76, dimensions: { pitch: 70, rhythm: 80, articulation: 75, style: 77, breath: 78, emotion: 79 } },
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 72, scores: { pitch: 68 } }]
    })

    const shape = extractOutputShape(user)
    expect(normalizeMode('work-detail')).toBe('work-detail')
    expect(shape).toEqual(expect.objectContaining({
      overallJudgement: expect.any(String),
      weakestDimension: expect.any(Object),
      lineIssues: expect.any(Array),
      nextSteps: expect.any(Array),
      voiceoverText: expect.any(String)
    }))

    const normalized = normalizeAdviceData('work-detail', {
      overallJudgement: '这次最需要回到音准和句尾稳定。',
      weakestDimension: {
        key: 'pitch',
        label: '音准',
        reason: '起音偏高，句尾落音不稳。',
        suggestion: '先慢练再回原速。'
      },
      lineIssues: [
        { lineIndex: 0, lineText: '第一句', issue: '起音偏高', tip: '先半速校音' }
      ],
      nextSteps: ['先练第一句', '再练句尾落音', '最后整段回唱'],
      voiceoverText: '先把第一句的音准和句尾稳住。'
    }, 'test-model', {
      analysisV2: { overallScore: 76, dimensions: { pitch: 70, rhythm: 80, articulation: 75, style: 77, breath: 78, emotion: 79 } }
    })

    expect(normalized.ok).toBe(true)
    expect(normalized.data.voiceoverText).toContain('第一句')
  })
})
