import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildModePrompt, getModeMaxTokens } from '../../server/learn-ai/promptBuilder.js'
import { normalizeAdviceData } from '../../server/learn-ai/responseSchema.js'
import { createProviderHub } from '../../server/learn-ai/providers/index.js'
import { isQwenAudioConfigured, resolveAudioModel, buildAudioCandidates, requestQwenAudioInsights, buildQwenAudioHealthModels } from '../../server/learn-ai/providers/qwenAudioClient.js'
import { isQwenTtsConfigured, resolveTtsModel, requestTtsSynthesize, buildTtsHealthModels } from '../../server/learn-ai/providers/ttsClient.js'
import { isRetrievalConfigured, resolveEmbeddingModel, resolveRerankModel, requestMasterRecall, buildRetrievalHealthModels } from '../../server/learn-ai/providers/embeddingClient.js'
import { resolveQwenTextModel, TEXT_POOL_MODELS } from '../../server/learn-ai/providers/qwenClient.js'

function createJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body)
    },
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body
    }
  }
}

describe('learn-ai provider pool architecture', () => {
  const originalFetch = globalThis.fetch
  const envSnapshot = {}
  const envKeys = [
    'DEEPSEEK_API_KEY', 'LEARN_DEEPSEEK_API_KEY',
    'DASHSCOPE_API_KEY', 'QWEN_API_KEY', 'LEARN_QWEN_API_KEY'
  ]

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    for (const key of envKeys) {
      if (envSnapshot[key] == null) delete process.env[key]
      else process.env[key] = envSnapshot[key]
    }
  })

  for (const key of envKeys) envSnapshot[key] = process.env[key]

  it('falls back from Qwen to GLM when Qwen is busy', async () => {
    process.env.DASHSCOPE_API_KEY = 'qwen-test-key'
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.LEARN_DEEPSEEK_API_KEY

    const fetchedUrls = []
    globalThis.fetch = vi.fn(async (url) => {
      const target = String(url)
      fetchedUrls.push(target)

      if (target.includes('dashscope.aliyuncs.com')) {
        return createJsonResponse(429, 'busy')
      }

      if (target.includes('open.bigmodel.cn')) {
        return createJsonResponse(200, {
          choices: [{
            message: {
              content: JSON.stringify({
                headline: '发布前建议',
                summary: '整体可发，但建议先补弱项。',
                items: ['回听弱句', '补音准', '确认后发布']
              })
            }
          }]
        })
      }

      return createJsonResponse(500, 'unexpected-url')
    })

    const hub = createProviderHub({ apiKey: 'glm-test-key', requestedModel: 'qwen-plus' })
    const result = await hub.requestAdvice({
      mode: 'publish',
      payload: { operaName: '天仙配', excerptName: '路遇', singer: '严凤英' },
      model: hub.resolveModel(),
      stream: false,
      buildPrompt: buildModePrompt,
      getModeMaxTokens,
      normalizeAdviceData
    })

    expect(result.ok).toBe(true)
    expect(result.provider).toBe('glm')
    expect(fetchedUrls.some((u) => u.includes('dashscope.aliyuncs.com'))).toBe(true)
    expect(fetchedUrls.some((u) => u.includes('open.bigmodel.cn'))).toBe(true)
  })

  it('health includes all capability pools', () => {
    process.env.DASHSCOPE_API_KEY = 'qwen-test-key'
    const hub = createProviderHub({ apiKey: 'glm-test-key' })
    const health = hub.getHealth()

    expect(health.textPool).toBeDefined()
    expect(health.textPool.primary).toBe('qwen')
    expect(health.textPool.backup).toBe('glm')
    expect(health.audioPool).toBeDefined()
    expect(health.retrievalPool).toBeDefined()
    expect(health.ttsPool).toBeDefined()
    expect(health.activeTextModel).toBeTruthy()
    expect(health.activeAudioModel).toBeTruthy()
    expect(health.activeEmbeddingModel).toBeTruthy()
    expect(health.activeRerankModel).toBeTruthy()
    expect(health.activeTtsModel).toBeTruthy()
  })

  it('Qwen text pool whitelist recognizes valid models', () => {
    expect(TEXT_POOL_MODELS.has('qwen-plus')).toBe(true)
    expect(TEXT_POOL_MODELS.has('qwen-turbo')).toBe(true)
    expect(TEXT_POOL_MODELS.has('qwen3.5-plus')).toBe(true)
    expect(TEXT_POOL_MODELS.has('qwen3.5-flash')).toBe(true)
    expect(TEXT_POOL_MODELS.has('not-a-valid-model')).toBe(false)
  })

  it('resolveQwenTextModel falls back for invalid model name', () => {
    const resolved = resolveQwenTextModel('invalid-model-xyz')
    expect(TEXT_POOL_MODELS.has(resolved)).toBe(true)
  })

  it('requestedModel override works when model is in the whitelist', () => {
    expect(resolveQwenTextModel('qwen3.5-flash')).toBe('qwen3.5-flash')
  })
})

describe('learn-ai audio pool stub', () => {
  const envSnapshot = { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY }

  afterEach(() => {
    if (envSnapshot.DASHSCOPE_API_KEY == null) delete process.env.DASHSCOPE_API_KEY
    else process.env.DASHSCOPE_API_KEY = envSnapshot.DASHSCOPE_API_KEY
  })

  it('reports configured when DASHSCOPE_API_KEY is set', () => {
    process.env.DASHSCOPE_API_KEY = 'audio-test-key'
    expect(isQwenAudioConfigured()).toBe(true)
    delete process.env.DASHSCOPE_API_KEY
    expect(isQwenAudioConfigured()).toBe(false)
  })

  it('resolves valid audio model names', () => {
    expect(resolveAudioModel('qwen-omni-turbo')).toBe('qwen-omni-turbo')
    expect(resolveAudioModel('qwen3-omni-flash')).toBe('qwen3-omni-flash')
    expect(resolveAudioModel('invalid-audio')).toBe('qwen-omni-turbo')
  })

  it('builds audio fallback candidates', () => {
    const candidates = buildAudioCandidates('qwen3-omni-flash')
    expect(candidates[0]).toBe('qwen3-omni-flash')
    expect(candidates.length).toBeGreaterThan(1)
  })

  it('returns structured fallback perception when audio input exists', async () => {
    process.env.DASHSCOPE_API_KEY = 'audio-test-key'
    const result = await requestQwenAudioInsights({
      audioUrl: 'https://example.com/audio.mp3',
      analysisV2: {
        dimensions: {
          pitch: 82,
          rhythm: 80,
          articulation: 76,
          style: 74,
          breath: 79,
          emotion: 88
        }
      }
    })
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('local-perception-fallback')
    expect(result.insights).toEqual(expect.objectContaining({
      summary: expect.any(String),
      priority: expect.any(String)
    }))
    delete process.env.DASHSCOPE_API_KEY
  })

  it('returns missing-audio-url when no audio input', async () => {
    process.env.DASHSCOPE_API_KEY = 'audio-test-key'
    const result = await requestQwenAudioInsights({})
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('missing-audio-url')
    delete process.env.DASHSCOPE_API_KEY
  })

  it('health models include all pool models', () => {
    const health = buildQwenAudioHealthModels()
    expect(health.audioPoolModels.length).toBe(5)
    expect(health.fallbackOrder.length).toBe(5)
    expect(health.selected).toBe('qwen-omni-turbo')
  })
})

describe('learn-ai TTS pool stub', () => {
  const envSnapshot = { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY }

  afterEach(() => {
    if (envSnapshot.DASHSCOPE_API_KEY == null) delete process.env.DASHSCOPE_API_KEY
    else process.env.DASHSCOPE_API_KEY = envSnapshot.DASHSCOPE_API_KEY
  })

  it('reports configured state correctly', () => {
    process.env.DASHSCOPE_API_KEY = 'tts-test-key'
    expect(isQwenTtsConfigured()).toBe(true)
    delete process.env.DASHSCOPE_API_KEY
    expect(isQwenTtsConfigured()).toBe(false)
  })

  it('resolves valid TTS model names', () => {
    expect(resolveTtsModel('qwen3-tts-instruct-flash')).toBe('qwen3-tts-instruct-flash')
    expect(resolveTtsModel('invalid-tts')).toBe('qwen3-tts-instruct-flash')
  })

  it('stub returns not-available gracefully', async () => {
    process.env.DASHSCOPE_API_KEY = 'tts-test-key'
    const result = await requestTtsSynthesize({ text: 'hello' })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('stub-not-implemented')
    delete process.env.DASHSCOPE_API_KEY
  })

  it('health includes pool models', () => {
    const health = buildTtsHealthModels()
    expect(health.ttsPoolModels.length).toBe(2)
    expect(health.selected).toBe('qwen3-tts-instruct-flash')
  })
})

describe('learn-ai retrieval pool stub', () => {
  const envSnapshot = { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY }

  afterEach(() => {
    if (envSnapshot.DASHSCOPE_API_KEY == null) delete process.env.DASHSCOPE_API_KEY
    else process.env.DASHSCOPE_API_KEY = envSnapshot.DASHSCOPE_API_KEY
  })

  it('reports configured state correctly', () => {
    process.env.DASHSCOPE_API_KEY = 'emb-test-key'
    expect(isRetrievalConfigured()).toBe(true)
    delete process.env.DASHSCOPE_API_KEY
    expect(isRetrievalConfigured()).toBe(false)
  })

  it('resolves embedding and rerank model names', () => {
    expect(resolveEmbeddingModel('text-embedding-v4')).toBe('text-embedding-v4')
    expect(resolveEmbeddingModel('invalid')).toBe('text-embedding-v4')
    expect(resolveRerankModel('qwen3-rerank')).toBe('qwen3-rerank')
    expect(resolveRerankModel('invalid')).toBe('qwen3-rerank')
  })

  it('returns structured recall fragments and recommendations', async () => {
    process.env.DASHSCOPE_API_KEY = 'emb-test-key'
    const result = await requestMasterRecall({
      songId: 'tianxianpei-fuqishuangshuang',
      weakDimensions: ['pitch'],
      query: '找音准处理示范'
    })
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('catalog-recall')
    expect(result.fragments.length).toBeGreaterThan(0)
    expect(result.recommendations.length).toBeGreaterThan(0)
    delete process.env.DASHSCOPE_API_KEY
  })

  it('health includes all pool models', () => {
    const health = buildRetrievalHealthModels()
    expect(health.embeddingPoolModels.length).toBe(2)
    expect(health.rerankPoolModels.length).toBe(2)
    expect(health.embeddingModel).toBe('text-embedding-v4')
    expect(health.rerankModel).toBe('qwen3-rerank')
  })
})

describe('publish mode normalization', () => {
  it('normalizes publish AI response correctly', () => {
    const raw = {
      headline: '发布前建议',
      summary: '整体状态不错，先补弱句再发。',
      items: ['回听弱句', '补音准', '确认后发布']
    }
    const result = normalizeAdviceData('publish', raw, 'qwen-plus')
    expect(result.ok).toBe(true)
    expect(result.data.headline).toBe('发布前建议')
    expect(result.data.summary).toBe('整体状态不错，先补弱句再发。')
    expect(result.data.items).toHaveLength(3)
    expect(result.data.source).toBe('ai-service')
    expect(result.data.model).toBe('qwen-plus')
  })
})
