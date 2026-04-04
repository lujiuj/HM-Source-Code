/**
 * Provider Interface for Learn-AI – Capability Pool Architecture.
 *
 * Instead of a flat GLM → DeepSeek → Qwen fallback chain, providers are
 * organized into capability pools:
 *
 *   textPool   — Qwen (primary) → GLM (backup)   for structured JSON generation
 *   audioPool  — Qwen Omni (future)               for subjective audio perception
 *   retrievalPool — Qwen Embedding (future)        for master knowledge recall
 *   ttsPool    — Qwen TTS (future)                 for voice narration
 *
 * DeepSeek is kept for backward compat but removed from the active text path.
 * Each pool has its own model whitelist, fallback order, and health metadata.
 */

import {
  buildHealthModels,
  requestGlmAdvice,
  resolveFreeModel
} from '../glmClient.js'

import { requestDeepseekAdvice, isDeepseekConfigured, DEEPSEEK_MODEL } from './deepseekClient.js'
import { requestQwenAdvice, isQwenConfigured, QWEN_MODEL, resolveQwenTextModel, buildQwenHealthModels } from './qwenClient.js'
import { isQwenAudioConfigured, buildQwenAudioHealthModels } from './qwenAudioClient.js'
import { isQwenTtsConfigured, buildTtsHealthModels } from './ttsClient.js'
import { isRetrievalConfigured, buildRetrievalHealthModels } from './embeddingClient.js'

// ---------------------------------------------------------------------------
// GLM provider (text pool backup)
// ---------------------------------------------------------------------------

function createGlmProvider({ apiKey, requestedModel }) {
  const selectedModel = resolveFreeModel(requestedModel)

  return {
    id: 'glm',
    pool: 'text',
    supportsStream: true,

    isConfigured() {
      return Boolean(apiKey)
    },

    resolveModel(preferredModel, _requestedModel) {
      return resolveFreeModel(preferredModel || _requestedModel || selectedModel)
    },

    async requestAdvice({ mode, payload, model, stream, onDelta, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
      return requestGlmAdvice({
        apiKey,
        mode,
        payload,
        preferredModel: model,
        stream,
        onDelta,
        buildPrompt,
        getModeMaxTokens,
        normalizeAdviceData
      })
    },

    getModelInfo() {
      const models = buildHealthModels(requestedModel || selectedModel)
      return {
        provider: 'glm',
        pool: 'text',
        selected: models.selected,
        requested: models.requested,
        freeModels: models.freeModels,
        fallbackOrder: models.fallbackOrder
      }
    }
  }
}

// ---------------------------------------------------------------------------
// DeepSeek provider (kept for compat, not in active text path)
// ---------------------------------------------------------------------------

function createDeepseekProvider() {
  return {
    id: 'deepseek',
    pool: 'text',
    supportsStream: false,

    isConfigured() {
      return isDeepseekConfigured()
    },

    resolveModel() {
      return DEEPSEEK_MODEL
    },

    async requestAdvice({ mode, payload, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
      return requestDeepseekAdvice({ mode, payload, buildPrompt, getModeMaxTokens, normalizeAdviceData })
    },

    getModelInfo() {
      return {
        provider: 'deepseek',
        pool: 'text',
        selected: DEEPSEEK_MODEL,
        requested: null,
        freeModels: [],
        fallbackOrder: [DEEPSEEK_MODEL]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Qwen provider (text pool primary)
// ---------------------------------------------------------------------------

function createQwenProvider() {
  return {
    id: 'qwen',
    pool: 'text',
    supportsStream: false,

    isConfigured() {
      return isQwenConfigured()
    },

    resolveModel(preferredModel) {
      return resolveQwenTextModel(preferredModel)
    },

    async requestAdvice({ mode, payload, model, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
      return requestQwenAdvice({ mode, payload, preferredModel: model, buildPrompt, getModeMaxTokens, normalizeAdviceData })
    },

    getModelInfo() {
      const models = buildQwenHealthModels()
      return {
        provider: 'qwen',
        pool: 'text',
        selected: models.selected,
        requested: models.requested,
        textPoolModels: models.textPoolModels,
        fallbackOrder: models.fallbackOrder
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Text pool order: Qwen primary → GLM backup.  DeepSeek is inactive.
// ---------------------------------------------------------------------------

const TEXT_POOL_FACTORIES = [
  { id: 'qwen', create: createQwenProvider },
  { id: 'glm', create: createGlmProvider }
]

// Kept for backward compat – providers list includes all
const ALL_PROVIDER_FACTORIES = [
  { id: 'qwen', create: createQwenProvider },
  { id: 'glm', create: createGlmProvider },
  { id: 'deepseek', create: createDeepseekProvider }
]

// ---------------------------------------------------------------------------
// Hub – single entry-point consumed by adviceService.js
// ---------------------------------------------------------------------------

export function createProviderHub({ apiKey, requestedModel } = {}) {
  // Build all providers for health reporting
  const allProviders = ALL_PROVIDER_FACTORIES.map((entry) =>
    entry.create({ apiKey, requestedModel })
  )

  // Text pool: only Qwen + GLM in priority order
  const textPoolProviders = TEXT_POOL_FACTORIES.map((entry) =>
    entry.create({ apiKey, requestedModel })
  )
  const configuredTextPool = textPoolProviders.filter((p) => p.isConfigured())
  const active = configuredTextPool[0] || textPoolProviders[0]

  return {
    /** The currently-active provider instance (text pool primary). */
    active,

    /** Convenience: id of the active provider. */
    get id() {
      return active.id
    },

    /** Whether any text pool provider has a usable API key. */
    isConfigured() {
      return configuredTextPool.length > 0
    },

    /** Resolve a model through the active provider. */
    resolveModel(preferredModel, requestedModel) {
      return active.resolveModel(preferredModel, requestedModel)
    },

    /**
     * Delegate an advice request to text pool providers.
     * On { ok: false, busy: true }, try the next configured pool provider.
     */
    async requestAdvice(options) {
      const candidates = configuredTextPool.length > 0 ? configuredTextPool : [textPoolProviders[0]]

      for (let i = 0; i < candidates.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await candidates[i].requestAdvice(options)
        const annotated = {
          ...(result || {}),
          provider: candidates[i].id
        }

        if (annotated?.ok || !annotated?.busy) {
          return annotated
        }

        // busy → try next text pool provider
        if (i < candidates.length - 1) {
          options = { ...options, model: candidates[i + 1].resolveModel() }
        } else {
          return annotated
        }
      }

      return { ok: false, busy: true, errorMessage: 'All text pool providers busy.' }
    },

    /** Health / model metadata for the /api/health endpoint. */
    getHealth() {
      const primaryInfo = active.getModelInfo()
      const qwenHealth = buildQwenHealthModels(requestedModel)
      const glmHealth = buildHealthModels(requestedModel)

      return {
        ...primaryInfo,
        supportsStream: Boolean(active.supportsStream),

        // Per-pool observability
        textPool: {
          primary: 'qwen',
          backup: 'glm',
          activeModel: primaryInfo.selected,
          qwen: {
            configured: isQwenConfigured(),
            models: qwenHealth.textPoolModels,
            fallbackOrder: qwenHealth.fallbackOrder,
            selected: qwenHealth.selected
          },
          glm: {
            configured: Boolean(apiKey),
            models: glmHealth.freeModels,
            fallbackOrder: glmHealth.fallbackOrder,
            selected: glmHealth.selected
          }
        },
        audioPool: (() => {
          const audioConfigured = isQwenAudioConfigured()
          const audioHealth = buildQwenAudioHealthModels()
          return {
            status: audioConfigured ? 'stub' : 'not-configured',
            primary: 'qwen-omni',
            configured: audioConfigured,
            models: audioHealth.audioPoolModels,
            fallbackOrder: audioHealth.fallbackOrder,
            selected: audioHealth.selected
          }
        })(),
        retrievalPool: (() => {
          const retrievalConfigured = isRetrievalConfigured()
          const retrievalHealth = buildRetrievalHealthModels()
          return {
            status: retrievalConfigured ? 'stub' : 'not-configured',
            primary: 'qwen-embedding',
            configured: retrievalConfigured,
            embeddingModel: retrievalHealth.embeddingModel,
            rerankModel: retrievalHealth.rerankModel,
            embeddingPoolModels: retrievalHealth.embeddingPoolModels,
            rerankPoolModels: retrievalHealth.rerankPoolModels,
            embeddingFallbackOrder: retrievalHealth.embeddingFallbackOrder,
            rerankFallbackOrder: retrievalHealth.rerankFallbackOrder
          }
        })(),
        ttsPool: (() => {
          const ttsConfigured = isQwenTtsConfigured()
          const ttsHealth = buildTtsHealthModels()
          return {
            status: ttsConfigured ? 'stub' : 'not-configured',
            primary: 'qwen-tts',
            configured: ttsConfigured,
            models: ttsHealth.ttsPoolModels,
            fallbackOrder: ttsHealth.fallbackOrder,
            selected: ttsHealth.selected
          }
        })(),

        // Active model shortcuts
        activeTextModel: primaryInfo.selected,
        activeAudioModel: isQwenAudioConfigured() ? buildQwenAudioHealthModels().selected : null,
        activeEmbeddingModel: isRetrievalConfigured() ? buildRetrievalHealthModels().embeddingModel : null,
        activeRerankModel: isRetrievalConfigured() ? buildRetrievalHealthModels().rerankModel : null,
        activeTtsModel: isQwenTtsConfigured() ? buildTtsHealthModels().selected : null,

        // Legacy compat fields
        providers: allProviders.map((p) => ({
          id: p.id,
          pool: p.pool,
          configured: p.isConfigured(),
          supportsStream: Boolean(p.supportsStream)
        })),
        freeModels: primaryInfo.freeModels || primaryInfo.textPoolModels || [],
        fallbackOrder: primaryInfo.fallbackOrder || []
      }
    }
  }
}
