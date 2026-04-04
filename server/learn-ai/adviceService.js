import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCacheStore } from './cacheStore.js'
import { buildModePrompt, getModeMaxTokens } from './promptBuilder.js'
import { createProviderHub } from './providers/index.js'
import { requestMasterRecall } from './providers/embeddingClient.js'
import { requestQwenAudioInsights } from './providers/qwenAudioClient.js'
import { requestTtsSynthesize } from './providers/ttsClient.js'
import { buildAiErrorPayload, normalizeAdviceData, normalizeMode } from './responseSchema.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function nowMs() {
  return Date.now()
}

function pickQueueScope(payload = {}) {
  return safeText(payload.songId || payload.workId, 'global')
}

function buildCooldownKey(mode, payload = {}, provider = 'unknown') {
  return `${normalizeMode(mode)}:${pickQueueScope(payload)}:${safeText(provider, 'unknown')}`
}

function createRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `req_${crypto.randomBytes(8).toString('hex')}`
}

function attachMeta(data, meta) {
  return {
    ...data,
    meta
  }
}

function mergeMeta(baseMeta, overrides = {}) {
  return {
    ...baseMeta,
    ...(overrides || {})
  }
}

function classifyErrorCode(result, providerHub) {
  const explicit = safeText(result?.errorCode)
  if (explicit) return explicit
  if (!providerHub.isConfigured() && !result?.ok) return 'NO_PROVIDER'
  if (result?.busy) return 'UPSTREAM_BUSY'

  const message = safeText(result?.errorMessage).toLowerCase()
  if (!message) return 'REQUEST_FAILED'
  if (message.includes('timeout')) return 'TIMEOUT'
  if (message.includes('json') || message.includes('format') || message.includes('incomplete')) return 'SCHEMA_FAIL'
  if (message.includes('missing') && message.includes('api_key')) return 'NO_PROVIDER'
  return 'REQUEST_FAILED'
}

function logLearnAi(meta, extra = {}) {
  try {
    console.info('[learn-ai]', JSON.stringify({ ...meta, ...extra }))
  } catch {
    // ignore logging failures
  }
}

function normalizeRequestModel(providerHub, preferredModel, requestedModel) {
  const candidate = safeText(preferredModel || requestedModel)
  return providerHub.resolveModel(candidate || requestedModel)
}

export function createLearnAiService(options = {}) {
  const apiKey = safeText(options.apiKey)
  const requestedModel = safeText(options.requestedModel)
  const providerHub = createProviderHub({ apiKey, requestedModel })
  const keySource = safeText(options.keySource) || null
  const modelSource = safeText(options.modelSource) || null
  const loadedEnvFiles = Array.isArray(options.loadedEnvFiles) ? options.loadedEnvFiles.slice(0, 6) : []

  const cooldownMs = Number.isFinite(Number(options.cooldownMs))
    ? Math.max(5 * 1000, Math.round(Number(options.cooldownMs)))
    : 20 * 1000

  const cacheRoot = options.cacheDir || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cache')
  const cacheTtlByMode = options.cacheTtlByMode || {}
  const defaultCacheTtlMs = Number(options.defaultCacheTtlMs || 12 * 60 * 1000)
  const cacheStore = createCacheStore({
    cacheDir: cacheRoot,
    defaultTtlMs: defaultCacheTtlMs,
    ttlByMode: cacheTtlByMode
  })

  const inFlightByCacheKey = new Map()
  const queueByScope = new Map()
  const cooldownUntilByKey = new Map()
  const recentErrors = []
  const requestAi = typeof options.requestGlmAdvice === 'function' ? options.requestGlmAdvice : (opts) => providerHub.requestAdvice(opts)
  const requestAudioInsights = typeof options.requestAudioInsights === 'function' ? options.requestAudioInsights : requestQwenAudioInsights
  const requestMasterRecallFn = typeof options.requestMasterRecall === 'function' ? options.requestMasterRecall : requestMasterRecall
  const requestTts = typeof options.requestTtsSynthesize === 'function' ? options.requestTtsSynthesize : requestTtsSynthesize

  function enqueueByScope(scopeKey, taskFn) {
    const previous = queueByScope.get(scopeKey) || Promise.resolve()
    const run = () => taskFn()
    const next = previous.then(run, run)
    const cleanup = next.catch(() => {}).then(() => {
      if (queueByScope.get(scopeKey) === cleanup) queueByScope.delete(scopeKey)
    })
    queueByScope.set(scopeKey, cleanup)
    return next
  }

  function isCooling(cooldownKey) {
    const until = Number(cooldownUntilByKey.get(cooldownKey) || 0)
    if (!Number.isFinite(until) || until <= nowMs()) {
      cooldownUntilByKey.delete(cooldownKey)
      return 0
    }
    return until
  }

  function setCooling(cooldownKey) {
    const until = nowMs() + cooldownMs
    cooldownUntilByKey.set(cooldownKey, until)
    return until
  }

  function rememberError(entry) {
    recentErrors.push(entry)
    while (recentErrors.length > 10) recentErrors.shift()
  }

  async function getAdvice(params = {}) {
    const mode = normalizeMode(params.mode)
    const payload = params.payload || {}
    const stream = Boolean(params.stream)
    const onDelta = typeof params.onDelta === 'function' ? params.onDelta : null

    const requestId = createRequestId()
    const startedAt = nowMs()
    const queueScope = `${mode}:${pickQueueScope(payload)}`
    const providerId = providerHub.id
    const model = normalizeRequestModel(providerHub, params.preferredModel, requestedModel)
    const cooldownKey = buildCooldownKey(mode, payload, providerId)
    const cacheKey = cacheStore.buildCacheKey(mode, payload, model)
    const cacheTtlMs = cacheStore.getModeTtlMs(mode)

    const fromCache = cacheStore.get(cacheKey)
    if (fromCache) {
      const latencyMs = nowMs() - startedAt
      const meta = {
        requestId,
        mode,
        provider: safeText(fromCache?.provider || providerId, providerId),
        model: safeText(fromCache?.model || model, model),
        cacheHit: true,
        latencyMs,
        retryCount: 0,
        cooldownUntil: 0,
        retryAfterMs: 0,
        errorCode: '',
        status: 200
      }
      logLearnAi(meta)
      return { data: attachMeta(fromCache, meta), meta }
    }

    const cooldownUntil = isCooling(cooldownKey)
    if (cooldownUntil) {
      const retryAfterMs = Math.max(0, cooldownUntil - nowMs())
      const latencyMs = nowMs() - startedAt
      const fallback = buildAiErrorPayload(mode, payload, 'AI 分析通道繁忙，请稍后重试。', {
        retryAfterMs,
        cooldownUntil
      })
      const meta = {
        requestId,
        mode,
        provider: providerId,
        model,
        cacheHit: false,
        latencyMs,
        retryCount: 0,
        cooldownUntil,
        retryAfterMs,
        errorCode: 'UPSTREAM_BUSY',
        status: 429
      }
      logLearnAi(meta)
      return { data: attachMeta(fallback, meta), meta }
    }

    if (inFlightByCacheKey.has(cacheKey)) {
      const deduped = await inFlightByCacheKey.get(cacheKey)
      const meta = mergeMeta(deduped.meta, { requestId })
      logLearnAi(meta, { deduped: true })
      return {
        data: attachMeta(deduped.data, meta),
        meta
      }
    }

    const task = enqueueByScope(queueScope, async () => {
      let result
      try {
        result = await requestAi({
          apiKey,
          mode,
          payload,
          model,
          preferredModel: model,
          stream,
          onDelta,
          buildPrompt: buildModePrompt,
          getModeMaxTokens,
          normalizeAdviceData: (currentMode, parsed, currentModel) => normalizeAdviceData(currentMode, parsed, currentModel, payload)
        })
      } catch (error) {
        result = {
          ok: false,
          busy: false,
          status: 0,
          provider: providerId,
          model,
          retryCount: 0,
          errorCode: error?.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_FAILED',
          errorMessage: safeText(error?.message, 'AI request failed.')
        }
      }

      const latencyMs = nowMs() - startedAt
      const responseProvider = safeText(result?.provider || providerId, providerId)
      const responseModel = safeText(result?.model || model, model)
      const retryCount = Number(result?.retryCount || 0)
      const errorCode = classifyErrorCode(result, providerHub)

      if (result?.ok && result.data) {
        const cacheable = {
          ...result.data,
          provider: responseProvider
        }
        cacheStore.set(cacheKey, cacheable, cacheTtlMs)

        const meta = {
          requestId,
          mode,
          provider: responseProvider,
          model: responseModel,
          cacheHit: false,
          latencyMs,
          retryCount,
          cooldownUntil: 0,
          retryAfterMs: 0,
          errorCode: '',
          status: 200
        }

        logLearnAi(meta)
        return {
          data: attachMeta(result.data, meta),
          meta
        }
      }

      const busy = Boolean(result?.busy)
      const nextCooldownUntil = busy ? setCooling(buildCooldownKey(mode, payload, responseProvider)) : 0
      const retryAfterMs = busy ? Math.max(0, nextCooldownUntil - nowMs()) : 0
      const errorMessage = safeText(result?.errorMessage, 'AI 服务暂不可用，请稍后重试。')
      const fallback = buildAiErrorPayload(
        mode,
        payload,
        busy ? 'AI 分析通道繁忙，请稍后重试。' : errorMessage,
        busy ? { retryAfterMs, cooldownUntil: nextCooldownUntil } : {}
      )

      const meta = {
        requestId,
        mode,
        provider: responseProvider,
        model: responseModel,
        cacheHit: false,
        latencyMs,
        retryCount,
        cooldownUntil: nextCooldownUntil,
        retryAfterMs,
        errorCode,
        status: Number(result?.status || (busy ? 429 : 503))
      }

      rememberError({
        at: nowMs(),
        mode,
        provider: responseProvider,
        errorCode,
        message: errorMessage
      })
      logLearnAi(meta, { message: errorMessage })

      return {
        data: attachMeta(fallback, meta),
        meta
      }
    })

    inFlightByCacheKey.set(cacheKey, task)
    try {
      return await task
    } finally {
      inFlightByCacheKey.delete(cacheKey)
    }
  }

  async function getAudioInsights(params = {}) {
    const payload = params.payload || {}
    return requestAudioInsights({
      ...payload,
      audioUrl: safeText(params.audioUrl || payload.audioUrl),
      mediaUrl: safeText(params.mediaUrl || payload.mediaUrl),
      preferredModel: safeText(params.preferredModel)
    })
  }

  async function getMasterRecall(params = {}) {
    const payload = params.payload || params
    return requestMasterRecallFn(payload)
  }

  async function synthesizeTts(params = {}) {
    const payload = params.payload || params
    return requestTts(payload)
  }

  function getHealth() {
    const healthInfo = providerHub.getHealth()
    return {
      ok: true,
      service: 'hmx-learn-api',
      at: nowMs(),
      aiProvider: healthInfo.provider,
      aiConfigured: providerHub.isConfigured(),
      aiModel: healthInfo.selected,
      requestedModel: healthInfo.requested,
      keySource,
      modelSource,
      loadedEnvFiles,
      textPool: healthInfo.textPool || null,
      audioPool: healthInfo.audioPool || null,
      retrievalPool: healthInfo.retrievalPool || null,
      ttsPool: healthInfo.ttsPool || null,
      activeTextModel: healthInfo.activeTextModel || null,
      activeAudioModel: healthInfo.activeAudioModel || null,
      activeEmbeddingModel: healthInfo.activeEmbeddingModel || null,
      activeRerankModel: healthInfo.activeRerankModel || null,
      activeTtsModel: healthInfo.activeTtsModel || null,
      providers: Array.isArray(healthInfo.providers) ? healthInfo.providers : [],
      freeModels: healthInfo.freeModels,
      fallbackOrder: healthInfo.fallbackOrder,
      stream: {
        endpoint: false,
        upstream: Boolean(healthInfo.supportsStream)
      },
      cache: {
        enabled: true,
        root: cacheRoot,
        defaultTtlMs: defaultCacheTtlMs,
        ttlByMode: cacheTtlByMode
      },
      recentErrors: recentErrors.slice(-5)
    }
  }

  return {
    getAdvice,
    getAudioInsights,
    getMasterRecall,
    synthesizeTts,
    getHealth
  }
}
