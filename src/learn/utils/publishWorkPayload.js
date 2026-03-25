import { getLearnSongById } from './learnCatalog.js'
import { getLegacyBreakdownFromAnalysis, normalizeAnalysisV2 } from './analysisV2.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampInt(value, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.min(max, Math.max(min, Math.round(toFiniteNumber(value, min))))
}

function sanitizeJsonLike(value) {
  if (value === null) return null
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonLike(item)).filter((item) => item !== undefined)
  if (value instanceof Date) return value.getTime()

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'boolean') return value
  if (valueType === 'number') return Number.isFinite(value) ? value : 0
  if (valueType !== 'object') return undefined

  const output = {}
  Object.entries(value).forEach(([key, entry]) => {
    const sanitized = sanitizeJsonLike(entry)
    if (sanitized !== undefined) output[key] = sanitized
  })
  return output
}

function sanitizeBreakdown(session = {}) {
  const normalizedAnalysis = normalizeAnalysisV2(session.analysisV2 || {})
  const legacyBreakdown = getLegacyBreakdownFromAnalysis(normalizedAnalysis)
  const breakdown = sanitizeJsonLike(session.breakdown) || {}
  return {
    ...legacyBreakdown,
    ...breakdown,
    voiceActivity: clampInt(
      breakdown.voiceActivity
      ?? breakdown.breath
      ?? legacyBreakdown.voiceActivity
      ?? session.voiceActivity,
      0,
      100
    ),
    pitchAccuracy: clampInt(
      breakdown.pitchAccuracy
      ?? breakdown.pitch
      ?? legacyBreakdown.pitchAccuracy
      ?? session.pitchAccuracy,
      0,
      100
    )
  }
}

function sanitizeLineScores(lineScores = []) {
  if (!Array.isArray(lineScores)) return []
  return lineScores.map((entry, index) => {
    const raw = sanitizeJsonLike(entry) || {}
    return {
      lineIndex: clampInt(raw.lineIndex ?? index, 0, 999),
      lineText: safeText(raw.lineText),
      overall: clampInt(raw.overall, 0, 100),
      grade: safeText(raw.grade),
      gradeLabel: safeText(raw.gradeLabel),
      time: clampInt(raw.time ?? raw.startMs, 0, 9999999),
      startMs: clampInt(raw.startMs ?? raw.time, 0, 9999999),
      startSec: toFiniteNumber(raw.startSec, 0),
      endSec: toFiniteNumber(raw.endSec, 0),
      sampleCount: clampInt(raw.sampleCount, 0, 999999),
      durationMs: clampInt(raw.durationMs, 0, 9999999),
      scores: sanitizeJsonLike(raw.scores) || {},
      labels: sanitizeJsonLike(raw.labels) || {},
      deductions: Array.isArray(raw.deductions) ? raw.deductions.map((item) => safeText(item)).filter(Boolean) : []
    }
  })
}

export function formatLearnDurationSec(durationSec = 0) {
  const total = Math.max(0, Math.floor(toFiniteNumber(durationSec, 0)))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function hasStructuredPublishSession(session = {}) {
  return Boolean(
    session
    && typeof session.analysisV2 === 'object'
    && !Array.isArray(session.analysisV2)
    && Array.isArray(session.lineScores)
    && session.lineScores.length > 0
  )
}

export function isPublishPayloadReady(session, audioUrl) {
  return Boolean(session?.songId)
    && Boolean(String(audioUrl || '').trim())
    && hasStructuredPublishSession(session)
}

function comparableScore(record = {}) {
  return clampInt(record?.score ?? record?.averageScore ?? record?.overall, 0, 100)
}

function buildAvatarSnapshot(profile = {}, username = '') {
  return {
    uid: safeText(profile?.uid),
    displayName: safeText(profile?.displayName, safeText(username, '戏友')),
    avatar: safeText(profile?.avatar)
  }
}

export function buildLearnPublishPayload(options = {}) {
  const session = options.session || {}
  const audioUrl = safeText(options.audioUrl)
  const existingWork = options.existingWork || null
  const songMeta = options.songMeta || getLearnSongById(session.songId)

  if (!safeText(session.songId)) {
    throw new Error('当前练习记录缺少曲目信息，暂时无法发布。')
  }

  if (!audioUrl) {
    throw new Error('当前录音还没有准备好，请先回到练唱页重新完成录音。')
  }

  if (!hasStructuredPublishSession(session)) {
    throw new Error('当前练唱记录不是新结构数据，请重新完成一次练唱后再发布。')
  }

  const averageScore = clampInt(session.score ?? session.averageScore ?? session.overall, 0, 100)
  const previousBestScore = comparableScore(existingWork)
  if (existingWork?.id && averageScore <= previousBestScore) {
    throw new Error(`当前练习 ${averageScore} 分，未超过已发布作品的 ${previousBestScore} 分，不能覆盖公开作品。`)
  }
  const lineScores = sanitizeLineScores(session.lineScores)
  const lineCount = clampInt(session.lineCount ?? lineScores.length, 0, 999)
  const totalScore = clampInt(session.totalScore, 0, Math.max(averageScore, 1) * Math.max(lineCount, 1))
  const analysisV2 = normalizeAnalysisV2(session.analysisV2)
  const payload = {
    userId: safeText(options.userId),
    username: safeText(options.username, '戏友'),
    songId: safeText(session.songId),
    songName: safeText(options.songName, safeText(session.songName, '黄梅选段')),
    score: averageScore,
    averageScore,
    totalScore: totalScore || averageScore,
    lineCount,
    grade: safeText(options.grade || session.grade, 'C'),
    stars: clampInt(options.stars ?? session.stars, 0, 5),
    breakdown: sanitizeBreakdown({ ...session, analysisV2 }),
    lineScores,
    duration: clampInt(session.duration, 0, 99999),
    mediaId: safeText(session.mediaId),
    mediaUrl: audioUrl,
    avatarSnapshot: buildAvatarSnapshot(options.profile, options.username),
    coverUrl: safeText(options.coverUrl || songMeta?.cover),
    mvUrl: safeText(options.mvUrl || songMeta?.videoSrc || songMeta?.mvUrl),
    analysisV2: sanitizeJsonLike(analysisV2),
    publishAiAnalysis: sanitizeJsonLike(session.publishAiAnalysis) || null,
    publishedFromPracticeId: safeText(session.id),
    practiceId: safeText(session.id),
    timestamp: Date.now()
  }

  if (safeText(existingWork?.id || options.existingWorkId)) {
    payload.id = safeText(existingWork?.id || options.existingWorkId)
  }

  return payload
}
