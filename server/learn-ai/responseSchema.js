import { getWeakAnalysisDimensions, normalizeAnalysisV2 } from '../../src/learn/utils/analysisV2.js'
import { buildPublishAdviceFallback } from '../../src/learn/utils/learnAiFallback.js'

const SUPPORTED_MODES = new Set(['publish', 'work-detail', 'practice-encourage'])

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeList(value, max = 4) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => safeText(item))
    .filter(Boolean)
    .slice(0, max)
}

function parseJsonFromText(text) {
  const content = safeText(text)
  if (!content) return null

  try {
    return JSON.parse(content)
  } catch {
    const block = content.match(/\{[\s\S]*\}/)
    if (!block) return null
    try {
      return JSON.parse(block[0])
    } catch {
      return null
    }
  }
}

function contentToText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        if (typeof item.text === 'string') return item.text
        if (typeof item.content === 'string') return item.content
      }
      return ''
    })
    .join('\n')
}

function withSourceAndModel(data, model) {
  return {
    ...data,
    source: 'ai-service',
    model
  }
}

function attachCooldown(data, extra = {}) {
  const retryAfterMs = Number(extra.retryAfterMs)
  const cooldownUntil = Number(extra.cooldownUntil)
  const output = { ...data }

  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    output.retryAfterMs = Math.round(retryAfterMs)
  }

  if (Number.isFinite(cooldownUntil) && cooldownUntil > 0) {
    output.cooldownUntil = Math.round(cooldownUntil)
  }

  return output
}

function normalizeWeakestDimension(value, payload = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const label = safeText(value.label || value.name)
    if (!label) return null
    const out = {
      label,
      key: safeText(value.key),
      reason: safeText(value.reason || value.note),
      suggestion: safeText(value.suggestion || value.tip)
    }
    const score = Number(value.score ?? value.value)
    if (Number.isFinite(score)) out.score = Math.round(score)
    return out
  }

  const label = safeText(value)
  if (label) {
    return {
      key: '',
      label,
      reason: '',
      suggestion: ''
    }
  }

  const weakest = getWeakAnalysisDimensions(payload.analysisV2 || payload, 1)[0]
  if (!weakest) return null
  return {
    key: safeText(weakest.key),
    label: safeText(weakest.label),
    reason: '',
    suggestion: safeText(weakest.hint),
    score: Number.isFinite(Number(weakest.value)) ? Math.round(Number(weakest.value)) : undefined
  }
}

function normalizeLineIssueItem(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const lineText = safeText(item.lineText || item.text, `第 ${index + 1} 句`)
    const issue = safeText(item.issue || item.problem || item.observation)
    const tip = safeText(item.tip || item.suggestion || item.fix)
    if (!issue && !tip) return null
    return {
      lineIndex: Number.isInteger(item.lineIndex) ? item.lineIndex : index,
      lineText,
      issue,
      tip
    }
  }

  const text = safeText(item)
  if (!text) return null
  return {
    lineIndex: index,
    lineText: `第 ${index + 1} 句`,
    issue: text,
    tip: ''
  }
}

function normalizeLineIssues(items, max = 3) {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => normalizeLineIssueItem(item, index))
    .filter(Boolean)
    .slice(0, max)
}

function buildPracticeEncourageFallback(message) {
  return {
    source: 'ai-error',
    summary: safeText(message, '当前没有拿到即时点评，先继续练这一首。'),
    focusPoint: '优先回到最弱的一句做慢练。',
    nextStep: '先慢两遍，再用原速完整唱一遍。',
    lineIssues: []
  }
}

function buildWorkDetailFallback(payload = {}, message = '') {
  const analysis = normalizeAnalysisV2(payload.analysisV2 || payload)
  const weakest = getWeakAnalysisDimensions(analysis, 1)[0] || null
  return {
    source: 'ai-error',
    unavailable: true,
    overallJudgement: safeText(message, '当前还不能生成作者复盘，请先继续练这一首。'),
    weakestDimension: weakest ? {
      key: safeText(weakest.key),
      label: safeText(weakest.label),
      score: Number.isFinite(Number(weakest.value)) ? Math.round(Number(weakest.value)) : undefined,
      reason: '',
      suggestion: safeText(weakest.hint)
    } : null,
    lineIssues: [],
    nextSteps: ['继续练这首，优先回到最弱的一句。'],
    voiceoverText: safeText(message, '当前还不能生成作者复盘，请先继续练这一首。')
  }
}

function normalizePublishData(parsed, model) {
  const headline = safeText(parsed.headline)
  const summary = safeText(parsed.summary)
  const items = normalizeList(parsed.items, 3)
  if (!headline || !summary || items.length < 2) {
    return { ok: false, errorMessage: 'AI response for publish mode is incomplete.' }
  }

  return {
    ok: true,
    data: withSourceAndModel({ headline, summary, items }, model)
  }
}

function normalizePracticeEncourageData(parsed, model) {
  const summary = safeText(parsed.summary || parsed.headline)
  const focusPoint = safeText(parsed.focusPoint || parsed.focus || parsed.keyFix)
  const nextStep = safeText(parsed.nextStep || parsed.nextAction)
  const lineIssues = normalizeLineIssues(parsed.lineIssues, 2)

  if (!summary || !focusPoint || !nextStep) {
    return { ok: false, errorMessage: 'AI response for practice-encourage mode is incomplete.' }
  }

  return {
    ok: true,
    data: withSourceAndModel({
      summary,
      focusPoint,
      nextStep,
      lineIssues
    }, model)
  }
}

function normalizeWorkDetailData(parsed, model, payload = {}) {
  const overallJudgement = safeText(parsed.overallJudgement || parsed.summary || parsed.headline)
  const weakestDimension = normalizeWeakestDimension(parsed.weakestDimension, payload)
  const lineIssues = normalizeLineIssues(parsed.lineIssues, 3)
  const nextSteps = normalizeList(parsed.nextSteps || parsed.items, 3)
  const voiceoverText = safeText(
    parsed.voiceoverText
    || parsed.ttsText
    || [overallJudgement, ...nextSteps].filter(Boolean).join(' ')
  )

  if (!overallJudgement || !weakestDimension || !lineIssues.length || nextSteps.length < 2) {
    return { ok: false, errorMessage: 'AI response for work-detail mode is incomplete.' }
  }

  return {
    ok: true,
    data: withSourceAndModel({
      overallJudgement,
      weakestDimension,
      lineIssues,
      nextSteps,
      voiceoverText,
      summary: overallJudgement,
      items: nextSteps
    }, model)
  }
}

export function parseGlmMessage(json) {
  const content = json?.choices?.[0]?.message?.content
  if (!content) return null
  return parseJsonFromText(contentToText(content))
}

export function normalizeMode(mode) {
  const normalized = safeText(mode, 'publish').toLowerCase()
  return SUPPORTED_MODES.has(normalized) ? normalized : 'publish'
}

export function normalizeAdviceData(mode, parsed, model, payload = {}) {
  const normalizedMode = normalizeMode(mode)
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, errorMessage: 'AI response is not valid JSON.' }
  }

  if (normalizedMode === 'work-detail') {
    return normalizeWorkDetailData(parsed, model, payload)
  }

  if (normalizedMode === 'practice-encourage') {
    return normalizePracticeEncourageData(parsed, model)
  }

  return normalizePublishData(parsed, model)
}

export function buildAiErrorPayload(mode, payload = {}, message = 'AI service unavailable.', extra = {}) {
  const normalizedMode = normalizeMode(mode)

  if (normalizedMode === 'work-detail') {
    return attachCooldown(buildWorkDetailFallback(payload, message), extra)
  }

  if (normalizedMode === 'practice-encourage') {
    return attachCooldown(buildPracticeEncourageFallback(message), extra)
  }

  const fallback = buildPublishAdviceFallback(payload)
  return attachCooldown({ ...fallback, source: 'ai-error' }, extra)
}
