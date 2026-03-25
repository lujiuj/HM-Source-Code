import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLearnAiService } from '../../server/learn-ai/adviceService.js'

async function createTempCacheDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'hmx-ai-health-'))
}

describe('learn-ai health surface', () => {
  it('exposes cache and recent error metadata for observability', async () => {
    const cacheDir = await createTempCacheDir()
    const service = createLearnAiService({
      apiKey: 'test-key',
      cacheDir,
      cooldownMs: 2000,
      requestGlmAdvice: async () => ({
        ok: false,
        busy: true,
        errorMessage: '429 busy',
        provider: 'glm',
        model: 'glm-4.7-flash',
        retryCount: 1
      })
    })

    await service.getAdvice({
      mode: 'publish',
      payload: { songId: 'tianxianpei-fuqishuangshuang', analysisV2: { overallScore: 80 } }
    })

    const health = service.getHealth()
    expect(health.ok).toBe(true)
    expect(health.service).toBe('hmx-learn-api')
    expect(health.stream).toMatchObject({
      endpoint: false,
      upstream: true
    })
    expect(health.cache).toMatchObject({
      enabled: true,
      root: cacheDir
    })
    expect(Array.isArray(health.providers)).toBe(true)
    expect(health.providers.some(p => p.id === 'qwen')).toBe(true)
    expect(health.providers.some(p => p.id === 'glm' && p.supportsStream === true)).toBe(true)
    expect(health.recentErrors.length).toBeGreaterThanOrEqual(1)
    expect(health.recentErrors[0]).toMatchObject({
      mode: 'publish',
      provider: 'glm',
      errorCode: 'UPSTREAM_BUSY'
    })
  })
})
