import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLearnAiService } from '../../../server/learn-ai/adviceService.js'

function buildPublishData() {
  return {
    source: 'ai-service',
    model: 'glm-4.7-flash',
    headline: '发布前建议',
    summary: '整体状态可发，但建议先回听弱句。',
    items: ['回听弱句', '补音准', '确认后发布']
  }
}

async function createTempCacheDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'hmx-ai-test-'))
}

describe('learn-ai service', () => {
  it('reuses cache for identical mode+payload requests', async () => {
    const cacheDir = await createTempCacheDir()
    let callCount = 0

    const service = createLearnAiService({
      apiKey: 'test-key',
      cacheDir,
      requestGlmAdvice: async () => {
        callCount += 1
        return {
          ok: true,
          data: buildPublishData(),
          model: 'glm-4.7-flash',
          provider: 'glm',
          retryCount: 0
        }
      }
    })

    const payload = { songId: 'song_001', analysisV2: { overallScore: 83 } }

    const first = await service.getAdvice({ mode: 'publish', payload })
    const second = await service.getAdvice({ mode: 'publish', payload })

    expect(callCount).toBe(1)
    expect(first.meta.cacheHit).toBe(false)
    expect(second.meta.cacheHit).toBe(true)
    expect(second.data.meta.requestId).toBeTruthy()
    expect(second.data.meta.provider).toBe('glm')
    expect(second.data.headline).toBeTruthy()
  })

  it('deduplicates concurrent requests with same cache key', async () => {
    const cacheDir = await createTempCacheDir()
    let callCount = 0

    const service = createLearnAiService({
      apiKey: 'test-key',
      cacheDir,
      requestGlmAdvice: async () => {
        callCount += 1
        await new Promise((resolve) => setTimeout(resolve, 35))
        return {
          ok: true,
          data: buildPublishData(),
          model: 'glm-4.7-flash',
          provider: 'glm',
          retryCount: 1
        }
      }
    })

    const payload = { songId: 'song_002', analysisV2: { overallScore: 84 } }

    const [a, b] = await Promise.all([
      service.getAdvice({ mode: 'publish', payload }),
      service.getAdvice({ mode: 'publish', payload })
    ])

    expect(callCount).toBe(1)
    expect(a.data.meta.mode).toBe('publish')
    expect(b.data.meta.mode).toBe('publish')
    expect(a.data.meta.requestId).not.toBe(b.data.meta.requestId)
    expect(a.data.meta.provider).toBe('glm')
  })

  it('enters scoped cooldown when upstream is busy', async () => {
    const cacheDir = await createTempCacheDir()
    let callCount = 0

    const service = createLearnAiService({
      apiKey: 'test-key',
      cacheDir,
      cooldownMs: 2000,
      requestGlmAdvice: async () => {
        callCount += 1
        return {
          ok: false,
          busy: true,
          errorMessage: '429 busy',
          provider: 'glm',
          model: 'glm-4.7-flash',
          retryCount: 2
        }
      }
    })

    const payload = { songId: 'song_003', lineCount: 8 }

    const first = await service.getAdvice({ mode: 'publish', payload })
    const second = await service.getAdvice({ mode: 'publish', payload })

    expect(callCount).toBe(1)
    expect(first.data.source).toBe('ai-error')
    expect(first.data.meta.errorCode).toBe('UPSTREAM_BUSY')
    expect(first.data.meta.cooldownUntil).toBeGreaterThan(Date.now())
    expect(second.data.meta.cooldownUntil).toBeGreaterThan(0)
    expect(second.data.meta.provider).toBe('glm')
  })

  it('does not let one scope cooldown block another scope', async () => {
    const cacheDir = await createTempCacheDir()
    let callCount = 0

    const service = createLearnAiService({
      apiKey: 'test-key',
      cacheDir,
      cooldownMs: 2000,
      requestGlmAdvice: async () => {
        callCount += 1
        return {
          ok: false,
          busy: true,
          errorMessage: '429 busy',
          provider: 'glm',
          model: 'glm-4.7-flash',
          retryCount: 0
        }
      }
    })

    await service.getAdvice({ mode: 'publish', payload: { songId: 'scope_a' } })
    await service.getAdvice({ mode: 'publish', payload: { songId: 'scope_b' } })

    expect(callCount).toBe(2)
  })
})
