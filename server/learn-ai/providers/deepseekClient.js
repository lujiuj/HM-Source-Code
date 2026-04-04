/**
 * DeepSeek provider for Learn-AI.
 *
 * Uses the OpenAI-compatible Chat Completions endpoint.
 * Configured only when DEEPSEEK_API_KEY or LEARN_DEEPSEEK_API_KEY is present.
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
const DEEPSEEK_MODEL = 'deepseek-chat'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
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
  return safeText(env.DEEPSEEK_API_KEY) || safeText(env.LEARN_DEEPSEEK_API_KEY)
}

/**
 * Send a single (non-streaming) request to DeepSeek Chat Completions.
 */
async function requestDeepseekOnce({ mode, payload, model, timeoutMs, apiKey, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
  const { system, user } = buildPrompt(mode, payload)
  let timeoutId = null

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
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
        errorMessage: `DeepSeek request failed: ${response.status} ${safeText(text, 'unknown error')}`
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
      errorMessage: isTimeout ? 'DeepSeek request timeout.' : 'DeepSeek request failed.'
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Top-level request function with retry.
 * Returns the same shape as requestGlmAdvice: { ok, data?, errorMessage?, busy?, status?, model?, retryCount? }
 */
export async function requestDeepseekAdvice(options = {}) {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    return {
      ok: false,
      status: null,
      errorMessage: 'Missing DEEPSEEK_API_KEY.',
      busy: false,
      retryCount: 0,
      model: DEEPSEEK_MODEL
    }
  }

  const mode = safeText(options.mode, 'master-line')
  const payload = options.payload || {}
  const model = DEEPSEEK_MODEL
  const timeoutMs = 15000
  const maxRetries = 1
  const errors = []
  let totalRetries = 0

  for (let i = 0; i <= maxRetries; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await requestDeepseekOnce({
      mode,
      payload,
      model,
      timeoutMs,
      apiKey,
      buildPrompt: options.buildPrompt,
      getModeMaxTokens: options.getModeMaxTokens,
      normalizeAdviceData: options.normalizeAdviceData
    })

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

    totalRetries += 1
    if (result?.errorMessage) errors.push(`[${model}] ${result.errorMessage}`)
    if (result?.status === 429) break

    if (i < maxRetries) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400 + 200 * i))
    }
  }

  const merged = safeText(errors.join(' ; '), 'DeepSeek request failed.')
  const lowered = merged.toLowerCase()
  const busy = lowered.includes('429') || lowered.includes('busy') || lowered.includes('timeout')

  return {
    ok: false,
    data: null,
    busy,
    model,
    retryCount: totalRetries,
    errors,
    errorMessage: merged
  }
}

export function isDeepseekConfigured() {
  return Boolean(resolveApiKey())
}

export { DEEPSEEK_MODEL }
