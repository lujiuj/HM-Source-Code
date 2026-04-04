/**
 * Qwen (Tongyi Qianwen) provider for Learn-AI.
 *
 * Uses the DashScope OpenAI-compatible Chat Completions endpoint.
 * Configured only when DASHSCOPE_API_KEY, QWEN_API_KEY, or LEARN_QWEN_API_KEY is present.
 *
 * Text pool models are tried in priority order with fallback.
 */

const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

// ---------------------------------------------------------------------------
// Text fusion pool – model whitelist & fallback order
// ---------------------------------------------------------------------------

const TEXT_POOL_MODELS = new Set([
  'qwen-plus',
  'qwen-turbo',
  'qwen3.5-plus',
  'qwen3.5-flash',
  'qwen3.5-plus-2026-02-15',
  'qwen3.5-flash-2026-02-23',
  'qwen3.5-27b',
  'qwen3.5-122b-a10b',
  'qwen3.5-397b-a17b'
])

const TEXT_FALLBACK_ORDER = [
  'qwen-plus',
  'qwen3.5-plus',
  'qwen-turbo',
  'qwen3.5-flash',
  'qwen3.5-plus-2026-02-15',
  'qwen3.5-flash-2026-02-23',
  'qwen3.5-27b',
  'qwen3.5-122b-a10b',
  'qwen3.5-397b-a17b'
]

const QWEN_MODEL = 'qwen-plus'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractJsonFromText(text) {
  const raw = safeText(text)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    const block = raw.match(/\{[\s\S]*\}/)
    if (!block) return null
    try {
      return JSON.parse(block[0])
    } catch {
      return null
    }
  }
}

function resolveApiKey(env = process.env) {
  return (
    safeText(env.DASHSCOPE_API_KEY)
    || safeText(env.QWEN_API_KEY)
    || safeText(env.LEARN_QWEN_API_KEY)
  )
}

/**
 * Resolve a whitelisted text model.  If the requested model is in the pool
 * whitelist it is returned as-is; otherwise falls back to QWEN_MODEL.
 */
function resolveTextModel(model) {
  const normalized = safeText(model, QWEN_MODEL).toLowerCase()
  if (TEXT_POOL_MODELS.has(normalized)) return normalized
  return QWEN_MODEL
}

/**
 * Build an ordered candidate list starting from `primaryModel`, followed by
 * remaining fallback models.  Same pattern as glmClient.buildModelCandidates.
 */
function buildTextCandidates(primaryModel) {
  const first = resolveTextModel(primaryModel)
  const set = new Set([first])
  for (const candidate of TEXT_FALLBACK_ORDER) {
    if (TEXT_POOL_MODELS.has(candidate)) set.add(candidate)
  }
  return Array.from(set)
}

/**
 * Send a single (non-streaming) request to Qwen Chat Completions.
 */
async function requestQwenOnce({ mode, payload, model, timeoutMs, apiKey, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
  const { system, user } = buildPrompt(mode, payload)
  let timeoutId = null

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        top_p: 0.8,
        stream: false,
        max_tokens: getModeMaxTokens(mode)
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const busy = response.status === 429
      return {
        ok: false,
        busy,
        status: response.status,
        errorMessage: `Qwen request failed: ${response.status} ${safeText(text, 'unknown error')}`
      }
    }

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    const parsed = extractJsonFromText(content)
    return normalizeAdviceData(mode, parsed, model)
  } catch (error) {
    const isTimeout = error?.name === 'AbortError'
    return {
      ok: false,
      busy: isTimeout,
      status: null,
      errorMessage: isTimeout ? 'Qwen request timeout.' : 'Qwen request failed.'
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Retry a single model up to `maxRetries` times.
 */
async function requestWithRetries(options) {
  const maxRetries = Number.isFinite(Number(options.maxRetries)) ? Math.max(0, Number(options.maxRetries)) : 1
  let retryCount = 0
  let latest = null

  for (let i = 0; i <= maxRetries; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    latest = await requestQwenOnce(options)
    if (latest?.ok) return { ...latest, retryCount }

    retryCount += 1
    if (latest?.status === 429) break
    if (i < maxRetries) {
      // eslint-disable-next-line no-await-in-loop
      await wait(400 + 200 * i)
    }
  }

  return {
    ...(latest || { ok: false, status: null, errorMessage: 'Qwen request failed.' }),
    retryCount
  }
}

/**
 * Top-level request function with multi-model fallback through the text pool.
 * Mirrors requestGlmAdvice shape: { ok, data?, errorMessage?, busy?, status?, model?, retryCount? }
 */
export async function requestQwenAdvice(options = {}) {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    return {
      ok: false,
      status: null,
      errorMessage: 'Missing DASHSCOPE_API_KEY / QWEN_API_KEY.',
      busy: false,
      retryCount: 0,
      model: QWEN_MODEL
    }
  }

  const mode = safeText(options.mode, 'master-line')
  const payload = options.payload || {}
  const preferredModel = resolveTextModel(options.preferredModel || safeText(process.env.QWEN_TEXT_MODEL))
  const candidates = buildTextCandidates(preferredModel)
  const timeoutByTry = [15000, 13000, 12000]
  const errors = []
  let totalRetries = 0

  for (let i = 0; i < candidates.length; i += 1) {
    const model = candidates[i]
    const timeoutMs = timeoutByTry[i] || 10000

    // eslint-disable-next-line no-await-in-loop
    const result = await requestWithRetries({
      mode,
      payload,
      model,
      timeoutMs,
      apiKey,
      maxRetries: 1,
      buildPrompt: options.buildPrompt,
      getModeMaxTokens: options.getModeMaxTokens,
      normalizeAdviceData: options.normalizeAdviceData
    })

    totalRetries += Number(result.retryCount || 0)

    if (result?.ok && result.data) {
      return {
        ok: true,
        data: result.data,
        model,
        retryCount: totalRetries,
        busy: false,
        errors
      }
    }

    if (result?.errorMessage) errors.push(`[${model}] ${result.errorMessage}`)
    if (result?.status === 429) break

    // eslint-disable-next-line no-await-in-loop
    await wait(420 + Math.round(Math.random() * 220) + i * 180)
  }

  const merged = safeText(errors.join(' ; '), 'Qwen request failed.')
  const lowered = merged.toLowerCase()
  const busy = lowered.includes('429') || lowered.includes('busy') || lowered.includes('timeout')

  return {
    ok: false,
    data: null,
    busy,
    model: preferredModel,
    retryCount: totalRetries,
    errors,
    errorMessage: merged
  }
}

export function isQwenConfigured() {
  return Boolean(resolveApiKey())
}

export function resolveQwenTextModel(model) {
  return resolveTextModel(model)
}

export function buildQwenHealthModels(primary) {
  const selected = resolveTextModel(primary)
  return {
    requested: safeText(primary) || null,
    selected,
    textPoolModels: Array.from(TEXT_POOL_MODELS),
    fallbackOrder: buildTextCandidates(selected)
  }
}

export { QWEN_MODEL, TEXT_POOL_MODELS, TEXT_FALLBACK_ORDER }
