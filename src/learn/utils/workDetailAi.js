import { normalizeAnalysisV2 } from './analysisV2.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(safeText(value))
}

export function resolveLearnApiEndpoint(pathname) {
  const safePath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (typeof window === 'undefined') return `http://localhost:3000${safePath}`
  const host = window.location.hostname || 'localhost'
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (isLocal) return `${window.location.protocol}//${host}:3000${safePath}`
  return safePath
}

export function getAccessibleMediaUrl(work = {}, resolvedMediaUrl = '') {
  const resolved = safeText(resolvedMediaUrl)
  if (isHttpUrl(resolved)) return resolved

  const mediaUrl = safeText(work.mediaUrl)
  if (isHttpUrl(mediaUrl)) return mediaUrl

  const audioUrl = safeText(work.audioUrl)
  if (isHttpUrl(audioUrl)) return audioUrl

  return ''
}

export function buildOwnerReviewPayload(work = {}, resolvedMediaUrl = '') {
  const analysis = work?.analysisV2 && typeof work.analysisV2 === 'object'
    ? normalizeAnalysisV2(work.analysisV2)
    : null
  const lineScores = Array.isArray(work?.lineScores) ? work.lineScores : []
  const workId = safeText(work?.id)
  const songId = safeText(work?.songId)

  if (!analysis || !workId || !songId || !lineScores.length || Number(analysis.overallScore || 0) <= 0) {
    return null
  }

  const mediaUrl = getAccessibleMediaUrl(work, resolvedMediaUrl)

  return {
    context: 'work-detail',
    workId,
    songId,
    analysisV2: analysis,
    lineScores,
    audioUrl: mediaUrl,
    mediaUrl
  }
}

export function resolveOwnerReviewError(errorLike, unavailableDetail = '') {
  const raw = safeText(errorLike)
  const detail = safeText(unavailableDetail)
  const text = raw || detail
  if (!text) return '当前还没生成作者复盘，请稍后重试。'
  if (/failed to fetch|network|load failed|fetch|networkerror/i.test(text)) {
    return '作者复盘接口未连接，请先启动本地分析服务。'
  }
  return text
}

export function resolveTtsFeedback(result = {}) {
  const reason = safeText(result.reason)
  if (reason === 'missing-text') return '复盘内容还没准备好，暂时不能播报。'
  if (reason === 'stub-not-implemented') return '语音老师接口已接通，当前还在等待语音模型开口。'
  if (reason === 'not-available') return '语音老师暂时没有返回可播放音频。'
  if (reason === 'request-failed') return safeText(result.error, '语音播报请求失败，请稍后重试。')
  return ''
}

export function buildOwnerReviewFallback(work = {}) {
  const analysis = work?.analysisV2 ? normalizeAnalysisV2(work.analysisV2) : null
  const weakest = analysis?.dimensions?.slice?.().sort((a, b) => a.value - b.value)?.[0] || null

  return {
    overallJudgement: '这条作品还缺少足够完整的逐句数据，暂时不能生成作者复盘。',
    weakestDimension: weakest ? {
      key: safeText(weakest.key),
      label: safeText(weakest.label),
      score: Number.isFinite(Number(weakest.value)) ? Math.round(Number(weakest.value)) : null,
      reason: '',
      suggestion: safeText(weakest.hint)
    } : null,
    lineIssues: [],
    nextSteps: ['继续练这首，先补一条带完整评分的练唱记录。'],
    voiceoverText: '这条作品还缺少足够完整的逐句数据，暂时不能生成作者复盘。'
  }
}
