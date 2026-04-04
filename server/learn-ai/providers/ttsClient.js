/**
 * Qwen TTS provider stub for Learn-AI — Voice Narration Pool.
 *
 * Uses DashScope OpenAI-compatible TTS endpoint.
 * Configured only when DASHSCOPE_API_KEY (or aliases) is present.
 *
 * Returns audio bytes (wav by default) so API routes can persist them.
 */

const TTS_POOL_MODELS = new Set([
  'qwen3-tts-instruct-flash',
  'qwen3-tts-instruct-flash-realtime'
])

const TTS_FALLBACK_ORDER = [
  'qwen3-tts-instruct-flash',
  'qwen3-tts-instruct-flash-realtime'
]

const DEFAULT_TTS_MODEL = 'qwen3-tts-instruct-flash'

const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function resolveApiKey(env = process.env) {
  return (
    safeText(env.DASHSCOPE_API_KEY)
    || safeText(env.QWEN_API_KEY)
    || safeText(env.LEARN_QWEN_API_KEY)
  )
}

export function resolveTtsModel(model) {
  const normalized = safeText(model, DEFAULT_TTS_MODEL).toLowerCase()
  if (TTS_POOL_MODELS.has(normalized)) return normalized
  return DEFAULT_TTS_MODEL
}

export function isQwenTtsConfigured() {
  return Boolean(resolveApiKey())
}

/**
 * Synthesize speech from text and return raw audio bytes.
 */
export async function requestTtsSynthesize(options = {}) {
  const apiKey = resolveApiKey()
  const text = safeText(options.text || options.finalAdvice)

  if (!apiKey || !text) {
    return {
      ok: false,
      available: false,
      model: DEFAULT_TTS_MODEL,
      reason: !apiKey ? 'missing-api-key' : 'missing-text',
      audioUrl: null,
      audioBuffer: null,
      mimeType: null
    }
  }

  const model = resolveTtsModel(
    safeText(options.preferredModel || process.env.QWEN_TTS_MODEL)
  )

  const voice = safeText(options.voice || options.voiceStyle || process.env.QWEN_TTS_VOICE, 'alloy')
  const responseFormat = safeText(options.responseFormat || options.format || 'wav').toLowerCase()

  let timeoutId = null
  try {
    const controller = new AbortController()
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(3000, Number(options.timeoutMs)) : 20000
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${QWEN_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        // OpenAI-compatible field name
        response_format: responseFormat,
        // Some compatible providers use `format`
        format: responseFormat
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      return {
        ok: false,
        available: false,
        model,
        reason: response.status === 429 ? 'busy' : 'request-failed',
        status: response.status,
        error: safeText(raw, `TTS request failed: ${response.status}`),
        audioUrl: null,
        audioBuffer: null,
        mimeType: null
      }
    }

    const mimeType = safeText(response.headers.get('content-type'), 'audio/wav')
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    return {
      ok: true,
      available: true,
      model,
      reason: 'qwen-tts',
      voice,
      audioUrl: null,
      audioBuffer,
      mimeType
    }
  } catch (error) {
    const isTimeout = error?.name === 'AbortError'
    return {
      ok: false,
      available: false,
      model,
      reason: isTimeout ? 'timeout' : 'request-failed',
      error: isTimeout ? 'TTS request timeout.' : safeText(error?.message, 'TTS request failed.'),
      audioUrl: null,
      audioBuffer: null,
      mimeType: null
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export function buildTtsHealthModels(primary) {
  const selected = resolveTtsModel(primary)
  return {
    requested: safeText(primary) || null,
    selected,
    ttsPoolModels: Array.from(TTS_POOL_MODELS),
    fallbackOrder: TTS_FALLBACK_ORDER.slice()
  }
}

export { DEFAULT_TTS_MODEL, TTS_POOL_MODELS, TTS_FALLBACK_ORDER }
