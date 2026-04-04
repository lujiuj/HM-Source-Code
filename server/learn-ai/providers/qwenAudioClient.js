/**
 * Qwen Audio / Omni provider stub for Learn-AI — Audio Perception Pool.
 *
 * Uses DashScope OpenAI-compatible endpoint with audio-capable models.
 * Configured only when DASHSCOPE_API_KEY (or aliases) is present AND
 * an audio input (audioUrl / mediaUrl) is supplied.
 *
 * This is a P2 stub — the request path returns a structured placeholder
 * so that callers can integrate without waiting for full audio analysis.
 */

const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

const AUDIO_POOL_MODELS = new Set([
  'qwen-omni-turbo',
  'qwen-omni-turbo-latest',
  'qwen-omni-turbo-2025-03-26',
  'qwen3-omni-flash',
  'qwen3-omni-flash-2025-12-01'
])

const AUDIO_FALLBACK_ORDER = [
  'qwen-omni-turbo',
  'qwen-omni-turbo-latest',
  'qwen3-omni-flash',
  'qwen-omni-turbo-2025-03-26',
  'qwen3-omni-flash-2025-12-01'
]

const DEFAULT_AUDIO_MODEL = 'qwen-omni-turbo'

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

function clampScore(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.min(100, Math.round(num)))
}

function extractDimensions(analysisV2 = {}) {
  const raw = analysisV2?.dimensions || {}
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((item) => [safeText(item?.key), clampScore(item?.value)]))
  }
  return {
    pitch: clampScore(raw.pitch),
    rhythm: clampScore(raw.rhythm),
    articulation: clampScore(raw.articulation),
    style: clampScore(raw.style),
    breath: clampScore(raw.breath),
    emotion: clampScore(raw.emotion)
  }
}

function describeBand(score, strong, weak) {
  if (score >= 90) return strong
  if (score >= 75) return '整体在线，但还可以再收一刀。'
  return weak
}

export function resolveAudioModel(model) {
  const normalized = safeText(model, DEFAULT_AUDIO_MODEL).toLowerCase()
  if (AUDIO_POOL_MODELS.has(normalized)) return normalized
  return DEFAULT_AUDIO_MODEL
}

export function buildAudioCandidates(primaryModel) {
  const first = resolveAudioModel(primaryModel)
  const set = new Set([first])
  for (const candidate of AUDIO_FALLBACK_ORDER) {
    if (AUDIO_POOL_MODELS.has(candidate)) set.add(candidate)
  }
  return Array.from(set)
}

export function isQwenAudioConfigured() {
  return Boolean(resolveApiKey())
}

/**
 * Stub: request audio perception insights from Qwen Omni.
 *
 * In full implementation this would send the audio to the Omni model
 * and parse subjective perception (咬字, 情绪, 风格, 表现力).
 * For now it returns a structured "not-available" result so that the
 * mixed-result assembly layer can gracefully skip the audio branch.
 */
export async function requestQwenAudioInsights(options = {}) {
  const apiKey = resolveApiKey()
  const audioUrl = safeText(options.audioUrl || options.mediaUrl)

  if (!apiKey || !audioUrl) {
    return {
      ok: false,
      available: false,
      model: DEFAULT_AUDIO_MODEL,
      reason: !apiKey ? 'missing-api-key' : 'missing-audio-url',
      insights: null
    }
  }

  const model = resolveAudioModel(
    safeText(options.preferredModel || process.env.QWEN_AUDIO_MODEL)
  )

  const analysisV2 = options.analysisV2 && typeof options.analysisV2 === 'object' ? options.analysisV2 : {}
  const dims = extractDimensions(analysisV2)
  const weakestKey = Object.entries(dims)
    .sort((a, b) => a[1] - b[1])[0]?.[0] || 'articulation'

  const summary = [
    describeBand(dims.emotion, '情绪推进比较自然，听感上有人物状态。', '情绪起伏偏平，先把人物心气立住会更有戏。'),
    describeBand(dims.articulation, '字面清晰度不错，主字能被听见。', '字头和尾字还不够亮，听感上容易发糊。'),
    describeBand(dims.breath, '气息承托相对稳定，长句没有明显塌陷。', '气息支撑略松，长句尾部会显得发虚。')
  ].join('')

  return {
    ok: true,
    available: true,
    model,
    reason: apiKey ? 'local-perception-fallback' : 'local-perception',
    insights: {
      summary,
      timbre: describeBand(dims.style, '音色和韵味比较贴近黄梅戏的柔润线条。', '音色还偏直，可以再补一点揉腔和转折。'),
      diction: describeBand(dims.articulation, '咬字边界清楚，主字能抛出来。', '咬字边界偏软，建议先念白再唱。'),
      breath: describeBand(dims.breath, '换气比较稳，长句承托感在线。', '换气点还不够稳，句尾容易提前泄气。'),
      emotion: describeBand(dims.emotion, '人物情绪能被听出来，层次比较自然。', '情绪还没完全立起来，先把人物关系唱清。'),
      style: describeBand(dims.style, '黄梅戏的韵味已经出来了。', '韵味偏薄，建议多模仿名师句头句尾的抻收。'),
      priority: weakestKey
    }
  }
}

export function buildQwenAudioHealthModels(primary) {
  const selected = resolveAudioModel(primary)
  return {
    requested: safeText(primary) || null,
    selected,
    audioPoolModels: Array.from(AUDIO_POOL_MODELS),
    fallbackOrder: buildAudioCandidates(selected)
  }
}

export { DEFAULT_AUDIO_MODEL, AUDIO_POOL_MODELS, AUDIO_FALLBACK_ORDER }
