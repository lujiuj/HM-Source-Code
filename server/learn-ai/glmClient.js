const FREE_GLM_MODELS = new Set([
  'glm-4-flash-250414',
  'glm-4.7-flash',
  'glm-4.1v-thinking-flash',
  'glm-4.6v-flash',
  'glm-4v-flash'
])

const FALLBACK_MODEL_ORDER = [
  'glm-4-flash-250414',
  'glm-4.7-flash',
  'glm-4.1v-thinking-flash',
  'glm-4.6v-flash',
  'glm-4v-flash'
]

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveFreeGlmModel(model) {
  const normalized = safeText(model, 'glm-4-flash-250414').toLowerCase()
  if (FREE_GLM_MODELS.has(normalized)) return normalized
  return 'glm-4-flash-250414'
}

function buildModelCandidates(primaryModel) {
  const first = resolveFreeGlmModel(primaryModel)
  const set = new Set([first])
  for (const candidate of FALLBACK_MODEL_ORDER) {
    if (FREE_GLM_MODELS.has(candidate)) set.add(candidate)
  }
  return Array.from(set)
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

async function requestGlmOnce({ mode, payload, model, timeoutMs, apiKey, buildPrompt, getModeMaxTokens, normalizeAdviceData }) {
  const { system, user } = buildPrompt(mode, payload)
  let timeoutId = null

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        top_p: 0.8,
        max_tokens: getModeMaxTokens(mode),
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        ok: false,
        busy: response.status === 429,
        status: response.status,
        errorMessage: `GLM request failed: ${response.status} ${safeText(text, 'unknown error')}`
      }
    }

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    const parsed = extractJsonFromText(Array.isArray(content) ? content.map((item) => item?.text || '').join('\n') : content)
    return normalizeAdviceData(mode, parsed, model)
  } catch (error) {
    const isTimeout = error?.name === 'AbortError'
    return {
      ok: false,
      busy: isTimeout,
      status: null,
      errorMessage: isTimeout ? 'GLM request timeout.' : 'GLM request failed.'
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function requestGlmStreamRaw({ mode, payload, model, timeoutMs, apiKey, buildPrompt, getModeMaxTokens, normalizeAdviceData, onDelta }) {
  const { system, user } = buildPrompt(mode, payload)
  let timeoutId = null

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        top_p: 0.8,
        max_tokens: getModeMaxTokens(mode),
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        ok: false,
        busy: response.status === 429,
        status: response.status,
        errorMessage: `GLM request failed: ${response.status} ${safeText(text, 'unknown error')}`
      }
    }

    if (!response.body || typeof response.body.getReader !== 'function') {
      return { ok: false, status: null, errorMessage: 'GLM stream not available.' }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let mergedText = ''

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = String(line || '').trim()
        if (!trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        let json = null
        try {
          json = JSON.parse(dataStr)
        } catch {
          json = null
        }

        const delta = safeText(
          json?.choices?.[0]?.delta?.content
          || json?.choices?.[0]?.delta?.text
          || json?.choices?.[0]?.message?.content
        )

        if (delta) {
          mergedText += delta
          if (typeof onDelta === 'function') {
            try {
              onDelta(delta)
            } catch {
              // ignore user callback errors
            }
          }
        }
      }
    }

    const parsed = extractJsonFromText(mergedText)
    return normalizeAdviceData(mode, parsed, model)
  } catch (error) {
    const isTimeout = error?.name === 'AbortError'
    return {
      ok: false,
      busy: isTimeout,
      status: null,
      errorMessage: isTimeout ? 'GLM request timeout.' : 'GLM request failed.'
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function requestWithRetries(options) {
  const maxRetries = Number.isFinite(Number(options.maxRetries)) ? Math.max(0, Number(options.maxRetries)) : 1

  let retryCount = 0
  let latest = null

  for (let i = 0; i <= maxRetries; i += 1) {
    const run = options.stream ? requestGlmStreamRaw : requestGlmOnce
    // eslint-disable-next-line no-await-in-loop
    latest = await run(options)
    if (latest?.ok) {
      return { ...latest, retryCount }
    }

    retryCount += 1
    if (i < maxRetries) {
      // eslint-disable-next-line no-await-in-loop
      await wait(320 + 200 * i)
    }
  }

  return {
    ...(latest || { ok: false, status: null, errorMessage: 'GLM request failed.' }),
    retryCount
  }
}

export async function requestGlmAdvice(options = {}) {
  const apiKey = safeText(options.apiKey)
  if (!apiKey) {
    return {
      ok: false,
      status: null,
      errorMessage: 'Missing GLM_API_KEY.',
      busy: false,
      retryCount: 0,
      model: resolveFreeGlmModel(options.preferredModel)
    }
  }

  const mode = safeText(options.mode, 'master-line')
  const payload = options.payload || {}
  const stream = Boolean(options.stream)
  const preferredModel = resolveFreeGlmModel(options.preferredModel)
  const candidates = buildModelCandidates(preferredModel)
  const timeoutByTry = stream ? [16000, 13000, 12000] : [15000, 12000, 11000]
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
      stream,
      maxRetries: 2,
      buildPrompt: options.buildPrompt,
      getModeMaxTokens: options.getModeMaxTokens,
      normalizeAdviceData: options.normalizeAdviceData,
      onDelta: options.onDelta
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

  const merged = safeText(errors.join(' ; '), 'GLM request failed.')
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

export function resolveFreeModel(model) {
  return resolveFreeGlmModel(model)
}

export function buildHealthModels(primary) {
  return {
    requested: safeText(primary) || null,
    selected: resolveFreeGlmModel(primary),
    freeModels: Array.from(FREE_GLM_MODELS),
    fallbackOrder: buildModelCandidates(primary)
  }
}
