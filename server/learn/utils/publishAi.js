import { normalizeAnalysisV2 } from './analysisV2.js'
import { resolveLearnApiEndpoint } from './workDetailAi.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function hasUsablePublishAiAnalysis(input = null) {
  if (!input || typeof input !== 'object') return false
  if (input.unavailable === true || input.source === 'ai-error') return false

  const hasStructuredAnalysis = typeof input.analysisV2 === 'object' && input.analysisV2
  const hasPublishSummary = safeText(input.headline) || safeText(input.summaryText) || safeText(input.summary)
  const hasAdviceItems = Array.isArray(input.publishAdviceItems)
    ? input.publishAdviceItems.length > 0
    : Array.isArray(input.items) && input.items.length > 0
  const hasDiagnosticContent = (Array.isArray(input.objectiveDiagnosis) && input.objectiveDiagnosis.length > 0)
    || (Array.isArray(input.trainingSuggestions) && input.trainingSuggestions.length > 0)
    || (Array.isArray(input.lineHighlights) && input.lineHighlights.length > 0)

  return Boolean(hasStructuredAnalysis || hasPublishSummary || hasAdviceItems || hasDiagnosticContent)
}

export function buildPublishAiPayload(options = {}) {
  const songId = safeText(options.songId)
  const songName = safeText(options.songName)
  const analysisV2 = options.analysisV2 ? normalizeAnalysisV2(options.analysisV2) : null

  if (!songId || !songName || !analysisV2) {
    return null
  }

  return {
    context: 'publish',
    songId,
    songName,
    analysisV2
  }
}

export function buildPublishOwnerReviewPayload(options = {}) {
  const songId = safeText(options.songId)
  const analysisV2 = options.analysisV2 ? normalizeAnalysisV2(options.analysisV2) : null
  const lineScores = Array.isArray(options.lineScores) ? options.lineScores : []
  const audioUrl = safeText(options.audioUrl || options.mediaUrl)
  const workId = safeText(options.workId || options.practiceId || `publish-${songId}`)

  if (!songId || !analysisV2 || !lineScores.length || !workId) {
    return null
  }

  return {
    context: 'work-detail',
    workId,
    songId,
    analysisV2,
    lineScores,
    audioUrl,
    mediaUrl: audioUrl
  }
}

export async function requestPublishAiAnalysis(options = {}) {
  const payload = buildPublishAiPayload(options)
  if (!payload) {
    throw new Error('Missing required fields for publish AI analysis.')
  }

  const response = await fetch(resolveLearnApiEndpoint('/api/learn/audio-analysis'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ payload })
  })
  const json = await response.json()

  if (!response.ok || json?.unavailable || json?.source === 'ai-error') {
    throw new Error(safeText(json?.error, 'Publish AI analysis request failed.'))
  }

  return json
}

export async function requestPublishOwnerReview(options = {}) {
  const payload = buildPublishOwnerReviewPayload(options)
  if (!payload) {
    throw new Error('Missing required fields for publish owner review.')
  }

  const response = await fetch(resolveLearnApiEndpoint('/api/learn/audio-analysis'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ payload })
  })
  const json = await response.json()

  if (!response.ok || json?.unavailable || !json?.finalAdvice) {
    throw new Error(safeText(json?.error, 'Publish owner review request failed.'))
  }

  return json
}
