import { getStrongAnalysisDimensions, getWeakAnalysisDimensions, normalizeAnalysisV2 } from '../learn/utils/analysisV2.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeItems(items, limit = 3) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => safeText(item))
    .filter(Boolean)
    .slice(0, limit)
}

function hasRenderableDimensions(analysis) {
  const dimensions = Array.isArray(analysis?.dimensions) ? analysis.dimensions : []
  return dimensions.some((item) => Number(item?.value || 0) > 0)
}

function normalizeContext(value) {
  return safeText(value, 'publish').toLowerCase() === 'work-detail' ? 'work-detail' : 'publish'
}

function normalizeAudioInsights(audioInsights) {
  if (!audioInsights || typeof audioInsights !== 'object') {
    return {
      available: false,
      reason: 'not-requested',
      model: null,
      insights: null
    }
  }

  return {
    available: Boolean(audioInsights.ok && audioInsights.insights),
    reason: safeText(audioInsights.reason, audioInsights.ok ? '' : 'not-available'),
    model: safeText(audioInsights.model) || null,
    insights: audioInsights.insights || null
  }
}

function normalizeMasterRecall(masterRecall) {
  if (!masterRecall || typeof masterRecall !== 'object') {
    return {
      available: false,
      reason: 'not-requested',
      embeddingModel: null,
      rerankModel: null,
      fragments: [],
      recommendations: []
    }
  }

  return {
    available: Boolean(masterRecall.ok || masterRecall.available || (Array.isArray(masterRecall.fragments) && masterRecall.fragments.length)),
    reason: safeText(masterRecall.reason, masterRecall.ok ? '' : 'not-available'),
    embeddingModel: safeText(masterRecall.embeddingModel) || null,
    rerankModel: safeText(masterRecall.rerankModel) || null,
    fragments: Array.isArray(masterRecall.fragments) ? masterRecall.fragments.slice(0, 4) : [],
    recommendations: normalizeItems(masterRecall.recommendations, 4)
  }
}

function buildLineHighlights(analysis) {
  return [...(analysis.lineDiagnostics || [])]
    .sort((a, b) => a.overall - b.overall)
    .slice(0, 3)
    .map((line) => ({
      lineIndex: line.lineIndex,
      lineText: line.lineText,
      score: line.overall,
      issue: line.objectiveDiagnosis,
      tip: line.trainingHint
    }))
}

function buildObjectiveAnalysis(analysis) {
  return {
    analysisV2: analysis,
    confidence: analysis.confidence,
    overallScore: analysis.overallScore,
    overallGrade: analysis.overallGrade,
    strongestDimensions: getStrongAnalysisDimensions(analysis, 2),
    weakestDimensions: getWeakAnalysisDimensions(analysis, 3),
    objectiveDiagnosis: analysis.objectiveDiagnosis,
    trainingSuggestions: analysis.trainingSuggestions,
    lineHighlights: buildLineHighlights(analysis)
  }
}

function buildVoiceoverText(aiAdvice, fallbackSummary, nextSteps) {
  const preferred = safeText(aiAdvice?.voiceoverText)
  if (preferred) return preferred
  return [safeText(fallbackSummary), ...normalizeItems(nextSteps, 3)].filter(Boolean).join('。')
}

function buildWorkDetailFinalAdvice(aiAdvice, objectiveAnalysis) {
  const weakest = aiAdvice?.weakestDimension && typeof aiAdvice.weakestDimension === 'object'
    ? aiAdvice.weakestDimension
    : objectiveAnalysis.weakestDimensions[0] || null

  const lineIssues = Array.isArray(aiAdvice?.lineIssues) && aiAdvice.lineIssues.length
    ? aiAdvice.lineIssues.slice(0, 3)
    : objectiveAnalysis.lineHighlights.map((line) => ({
      lineIndex: line.lineIndex,
      lineText: line.lineText,
      issue: line.issue,
      tip: line.tip
    }))

  const nextSteps = normalizeItems(aiAdvice?.nextSteps || aiAdvice?.items, 3)
  const overallJudgement = safeText(aiAdvice?.overallJudgement || aiAdvice?.summary, objectiveAnalysis.analysisV2.aiSummary)

  return {
    overallJudgement,
    weakestDimension: weakest ? {
      key: safeText(weakest.key),
      label: safeText(weakest.label),
      reason: safeText(weakest.reason || weakest.note),
      suggestion: safeText(weakest.suggestion || weakest.hint),
      score: Number.isFinite(Number(weakest.score ?? weakest.value)) ? Math.round(Number(weakest.score ?? weakest.value)) : undefined
    } : null,
    lineIssues,
    nextSteps: nextSteps.length ? nextSteps : (objectiveAnalysis.trainingSuggestions || []).slice(0, 3).map((item) => item.drill),
    voiceoverText: buildVoiceoverText(aiAdvice, overallJudgement, nextSteps)
  }
}

export function getAudioAnalysisContext(payload = {}) {
  return normalizeContext(payload.context)
}

export function hasAudioInsightInput(payload = {}) {
  return Boolean(
    safeText(payload.audioUrl)
    || safeText(payload.mediaUrl)
  )
}

export function canBuildAudioAnalysis(payload = {}, context = getAudioAnalysisContext(payload)) {
  const analysis = normalizeAnalysisV2(payload.analysisV2 || payload)
  const hasBaseAnalysis = hasRenderableDimensions(analysis) && Number(analysis.overallScore || 0) > 0
  if (!hasBaseAnalysis) return false

  if (normalizeContext(context) !== 'work-detail') {
    return true
  }

  const hasWorkId = Boolean(safeText(payload.workId))
  const hasSongId = Boolean(safeText(payload.songId))
  const hasAnalysis = Boolean(payload.analysisV2 && typeof payload.analysisV2 === 'object')
  const hasLineScores = Array.isArray(payload.lineScores) && payload.lineScores.length > 0

  return hasWorkId && hasSongId && hasAnalysis && hasLineScores
}

export function buildAudioAnalysisUnavailable(message, options = {}) {
  return {
    source: 'audio-analysis',
    context: normalizeContext(options.context),
    unavailable: true,
    error: safeText(message, '当前音频分析暂时不可用。'),
    errorCode: safeText(options.errorCode),
    detail: safeText(options.detail),
    status: Number(options.status || 503)
  }
}

export function buildAudioAnalysisResponse(payload = {}, aiAdvice = null, options = {}) {
  const context = normalizeContext(options.context || payload.context)
  const analysis = normalizeAnalysisV2(payload.analysisV2 || payload)
  const objectiveAnalysis = buildObjectiveAnalysis(analysis)

  if (context !== 'work-detail') {
    const aiSummary = safeText(aiAdvice?.summary)
    const aiHeadline = safeText(aiAdvice?.headline)
    const aiItems = normalizeItems(aiAdvice?.items)

    return {
      source: 'audio-analysis',
      context: 'publish',
      headline: aiHeadline,
      analysisV2: analysis,
      method: [
        '逐句评分',
        '六维指标聚合',
        analysis.scoreRefSummary?.available ? '参考谱面对齐' : '无参考谱面回退'
      ],
      explain: '本分析依据逐句评分、六维指标和参考谱面对齐结果生成，不是自由发挥式夸赞。',
      confidence: analysis.confidence,
      overallScore: analysis.overallScore,
      overallGrade: analysis.overallGrade,
      strongestDimensions: objectiveAnalysis.strongestDimensions,
      weakestDimensions: objectiveAnalysis.weakestDimensions,
      objectiveDiagnosis: analysis.objectiveDiagnosis,
      trainingSuggestions: analysis.trainingSuggestions,
      lineHighlights: objectiveAnalysis.lineHighlights,
      publishAdviceItems: aiItems,
      summaryText: aiSummary || analysis.aiSummary,
      masterRecall: normalizeMasterRecall(options.masterRecall)
    }
  }

  return {
    source: 'audio-analysis',
    context: 'work-detail',
    workId: safeText(payload.workId),
    songId: safeText(payload.songId),
    objectiveAnalysis,
    audioInsights: normalizeAudioInsights(options.audioInsights),
    masterRecall: normalizeMasterRecall(options.masterRecall),
    finalAdvice: buildWorkDetailFinalAdvice(aiAdvice, objectiveAnalysis)
  }
}
