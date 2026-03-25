const DIMENSION_ORDER = ['pitch', 'rhythm', 'articulation', 'style', 'breath', 'emotion']
const DIMENSION_ALIASES = {
  pronunciation: 'articulation',
  expression: 'emotion',
  voiceActivity: 'breath',
  tone: 'style'
}

export const ANALYSIS_DIMENSION_META = {
  pitch: {
    label: '音准',
    note: '参考谱面对齐后的音高稳定度',
    hint: '先把句尾落音唱稳，再回到原速连起来。'
  },
  rhythm: {
    label: '节奏',
    note: '板眼进入、拖腔停连和句间呼吸',
    hint: '用半速跟拍练两遍，再恢复原速。'
  },
  articulation: {
    label: '咬字',
    note: '字头是否清楚，尾字是否收住',
    hint: '先念白一遍，再带旋律唱。'
  },
  style: {
    label: '韵味',
    note: '黄梅戏行腔味道和句法神态',
    hint: '先模仿名家句头句尾的抻收。'
  },
  breath: {
    label: '气息',
    note: '句中托腔、连句平顺度和支撑感',
    hint: '把换气点固定下来，不要每遍都变。'
  },
  emotion: {
    label: '情感',
    note: '角色状态、起伏和句内表达',
    hint: '先想人物处境，再决定轻重缓急。'
  }
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function clampScore(value, fallback = 0) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function clampFloat(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.min(1, Math.round(num * 100) / 100))
}

function normalizeDimensionKey(key) {
  const raw = safeText(key)
  if (!raw) return ''
  return DIMENSION_ALIASES[raw] || raw
}

function normalizeDimensionInput(input = {}) {
  if (!input || typeof input !== 'object') return {}
  const normalized = {}

  Object.entries(input).forEach(([key, value]) => {
    const normalizedKey = normalizeDimensionKey(key)
    if (!normalizedKey) return
    normalized[normalizedKey] = value
  })

  return normalized
}

function normalizeDimensionsMap(input = {}) {
  const source = normalizeDimensionInput(input)
  const normalized = {}
  DIMENSION_ORDER.forEach((key) => {
    normalized[key] = clampScore(source?.[key], 0)
  })
  return normalized
}

function buildDimensionsArray(dimensions = {}) {
  return DIMENSION_ORDER.map((key) => ({
    key,
    label: ANALYSIS_DIMENSION_META[key].label,
    value: clampScore(dimensions[key], 0),
    note: ANALYSIS_DIMENSION_META[key].note,
    hint: ANALYSIS_DIMENSION_META[key].hint
  }))
}

function sortDimensionEntries(dimensions = {}, direction = 'desc') {
  const entries = buildDimensionsArray(dimensions)
  return entries.sort((a, b) => (
    direction === 'asc'
      ? a.value - b.value
      : b.value - a.value
  ))
}

function isNearDemo(overallScore, weakestValue) {
  return overallScore >= 98 && weakestValue >= 95
}

function isStrongPublish(overallScore, weakestValue) {
  return overallScore >= 92 && weakestValue >= 88
}

function summarizeIssueText(line = {}, weakest = []) {
  const existing = Array.isArray(line?.deductions)
    ? line.deductions.map((item) => safeText(item)).filter(Boolean)
    : []
  if (existing.length) return existing.slice(0, 2)

  const weakestValue = weakest[0]?.value || 0
  const overall = clampScore(line?.overall, 0)
  if (isNearDemo(overall, weakestValue)) {
    return ['这一句完成度很稳，可以直接作为示范句保留。']
  }
  if (isStrongPublish(overall, weakestValue)) {
    return [`这一句整体很稳，若还想更讲究，可再润一下${weakest[0]?.label || '细节'}。`]
  }
  if (!weakest.length) return ['这一句数据还不够稳定，建议回到慢练。']
  return weakest.map((item) => `${item.label}偏弱，${item.hint}`)
}

function buildLineDiagnostics(lines = []) {
  if (!Array.isArray(lines)) return []
  return lines.map((line, index) => {
    const scores = normalizeDimensionsMap(line?.scores || {})
    const strongest = sortDimensionEntries(scores, 'desc')[0] || null
    const weakest = sortDimensionEntries(scores, 'asc').slice(0, 2)
    const issues = summarizeIssueText(line, weakest)
    const overall = clampScore(line?.overall, 0)
    const weakestValue = weakest[0]?.value || 0
    const positiveLine = isNearDemo(overall, weakestValue)
      ? '这一句完成度很稳，可以直接作为示范句保留。'
      : isStrongPublish(overall, weakestValue)
        ? `这一句整体很稳，若还想更讲究，可再润一下${weakest[0]?.label || '细节'}。`
        : ''

    return {
      lineIndex: Number.isInteger(line?.lineIndex) ? line.lineIndex : index,
      lineText: safeText(line?.lineText, `第 ${index + 1} 句`),
      overall,
      grade: safeText(line?.grade, 'C'),
      gradeLabel: safeText(line?.gradeLabel, safeText(line?.grade, 'C')),
      sampleCount: Math.max(0, Math.round(Number(line?.sampleCount || 0))),
      durationMs: Math.max(0, Math.round(Number(line?.durationMs || 0))),
      scores,
      strongestAspect: strongest?.key || '',
      weakestAspect: weakest[0]?.key || '',
      strongestLabel: strongest?.label || '',
      weakestLabel: weakest[0]?.label || '',
      objectiveDiagnosis: positiveLine || issues[0] || '这句完成度一般，建议先稳句尾。',
      issues,
      trainingHint: positiveLine
        ? '保持当前气口和句尾收束即可。'
        : weakest[0]?.hint || '先慢练再整句连接。',
      deductions: Array.isArray(line?.deductions)
        ? line.deductions.map((item) => safeText(item)).filter(Boolean)
        : []
    }
  })
}

function computeConfidence({ lineDiagnostics = [], scoreRefSummary = {} } = {}) {
  if (!lineDiagnostics.length) return 0
  const voicedLines = lineDiagnostics.filter((line) => line.sampleCount > 0).length
  const averageSamples = lineDiagnostics.reduce((sum, line) => sum + Number(line.sampleCount || 0), 0) / lineDiagnostics.length
  const sampleScore = Math.max(0, Math.min(1, averageSamples / 28))
  const voicedScore = voicedLines / lineDiagnostics.length
  const referenceScore = scoreRefSummary?.available ? 1 : 0.72
  return clampFloat((sampleScore * 0.45) + (voicedScore * 0.35) + (referenceScore * 0.20), 0)
}

function buildScoreRefSummary(scoreRef = null, fallback = {}) {
  if (!scoreRef || typeof scoreRef !== 'object') {
    return {
      available: Boolean(fallback?.available),
      version: Number.isFinite(Number(fallback?.version)) ? Number(fallback.version) : null,
      lineCount: Math.max(0, Math.round(Number(fallback?.lineCount || 0))),
      source: safeText(fallback?.source),
      generatedAt: safeText(fallback?.generatedAt)
    }
  }
  return {
    available: true,
    version: Number.isFinite(Number(scoreRef.version)) ? Number(scoreRef.version) : null,
    lineCount: Array.isArray(scoreRef.lines) ? scoreRef.lines.length : 0,
    source: safeText(scoreRef.source),
    generatedAt: safeText(scoreRef.generatedAt)
  }
}

function buildTrainingSuggestions(dimensions = {}, lineDiagnostics = [], overallScore = 0) {
  const weakest = sortDimensionEntries(dimensions, 'asc').slice(0, 3)
  const weakestValue = weakest[0]?.value || 0
  const weakestLine = [...lineDiagnostics].sort((a, b) => a.overall - b.overall)[0] || null

  if (isNearDemo(overallScore, weakestValue)) {
    return [
      {
        id: 'publish-direct',
        aspect: 'publish',
        label: '可以直接发布',
        value: overallScore,
        note: '当前版本已接近示范演唱水准',
        hint: '保持当前状态即可。',
        drill: '这一遍已经接近示范演唱，建议直接发布或作为示范版本保存。'
      },
      {
        id: 'keep-tone',
        aspect: 'tone',
        label: '保持行腔',
        value: weakestValue,
        note: '继续维持当前句头句尾的抻收和气口控制',
        hint: '保持当前气口和句尾收束即可。',
        drill: '若继续录新版本，重点保持当前行腔味道和收束稳定度，不必为了找问题而找问题。'
      }
    ]
  }

  if (isStrongPublish(overallScore, weakestValue)) {
    return [
      {
        id: 'publish-ready',
        aspect: 'publish',
        label: '已经能发',
        value: overallScore,
        note: '当前版本已具备发布完成度',
        hint: '可以直接发布。',
        drill: '这一遍已经足够成熟，可以直接发布；如果还想更讲究，再润一下最弱维度即可。'
      },
      ...weakest.slice(0, 2).map((item, index) => ({
        id: `${item.key}-${index}`,
        aspect: item.key,
        label: `细修${item.label}`,
        value: item.value,
        note: item.note,
        hint: item.hint,
        drill: weakestLine
          ? `如果还想继续精修，就回到“${weakestLine.lineText}”，轻微润一下${item.label}。${item.hint}`
          : `如果还想继续精修，可轻微润一下${item.label}。${item.hint}`
      }))
    ].slice(0, 3)
  }

  return weakest.map((item, index) => ({
    id: `${item.key}-${index}`,
    aspect: item.key,
    label: item.label,
    value: item.value,
    note: item.note,
    hint: item.hint,
    drill: weakestLine
      ? `先重练“${weakestLine.lineText}”，重点看${item.label}。${item.hint}`
      : item.hint
  }))
}

function buildObjectiveDiagnosis(dimensions = {}, lineDiagnostics = [], overallScore = 0) {
  const strongest = sortDimensionEntries(dimensions, 'desc')[0] || null
  const weakest = sortDimensionEntries(dimensions, 'asc')[0] || null
  const weakestValue = weakest?.value || 0
  const unstableLines = [...lineDiagnostics]
    .filter((line) => line.overall < 75)
    .sort((a, b) => a.overall - b.overall)
    .slice(0, 2)

  if (isNearDemo(overallScore, weakestValue)) {
    return [
      `${strongest?.label || '整体控制'}和整段完成度都很稳，这一遍已经达到示范级水准。`,
      `六维最低项也在${weakestValue}分以上，可以直接发布或作为示范版本保存。`
    ]
  }

  if (isStrongPublish(overallScore, weakestValue)) {
    return [
      `${strongest?.label || '整体控制'}表现突出，这一遍已经具备很强的发布完成度。`,
      `整体没有明显短板，若还想继续精修，可优先润一下${weakest?.label || '细节层次'}。`
    ]
  }

  const findings = []
  if (strongest) {
    findings.push(`${strongest.label}是当前最稳的维度，说明这一遍的基本状态已经立住。`)
  }
  if (weakest) {
    findings.push(`${weakest.label}是当前最薄弱的环节，建议优先补这一项，再考虑覆盖发布。`)
  }
  unstableLines.forEach((line) => {
    findings.push(`“${line.lineText}”完成度偏低，主要问题在${line.weakestLabel || '句内稳定度'}。`)
  })
  return findings.slice(0, 4)
}

function buildAiSummary(overallScore, strongest, weakest) {
  const weakestValue = weakest?.value || 0
  if (isNearDemo(overallScore, weakestValue)) {
    return '这一遍已经接近示范演唱，六维都很稳，可以直接发布。'
  }
  if (isStrongPublish(overallScore, weakestValue)) {
    return `这一遍整体已经很成熟，${strongest?.label || '整体控制'}尤其出色，直接发布没有问题。`
  }
  if (overallScore >= 88) {
    return `这一遍已经具备发布水准，${strongest?.label || '整体状态'}比较突出，补齐${weakest?.label || '细节'}会更完整。`
  }
  if (overallScore >= 76) {
    return `整体状态可用，但${weakest?.label || '薄弱项'}还会拖住完成度，建议先做一轮针对性补练。`
  }
  return `当前更适合作为练习版本，先把${weakest?.label || '基础项'}稳住，再追求完整表达。`
}

export function normalizeAnalysisV2(input = {}) {
  const dimensionSource = Array.isArray(input?.dimensions)
    ? Object.fromEntries(input.dimensions.map((item) => [normalizeDimensionKey(item?.key), item?.value]))
    : (input?.dimensions || input?.dimensionMap || input?.breakdown || input?.scores || {})
  const dimensions = normalizeDimensionsMap(dimensionSource)
  const lineDiagnostics = buildLineDiagnostics(input?.lineDiagnostics || [])
  const scoreRefSummary = buildScoreRefSummary(null, input?.scoreRefSummary || {})
  const strongest = sortDimensionEntries(dimensions, 'desc')[0] || null
  const weakest = sortDimensionEntries(dimensions, 'asc')[0] || null
  const overallScore = clampScore(input?.overallScore ?? input?.summary?.score, 0)
  const confidence = clampFloat(
    input?.confidence,
    computeConfidence({ lineDiagnostics, scoreRefSummary })
  )

  return {
    version: 'analysis-v2',
    audioAnalysisVersion: safeText(input?.audioAnalysisVersion, 'hmx-audio-v2'),
    generatedAt: Number.isFinite(Number(input?.generatedAt)) ? Number(input.generatedAt) : Date.now(),
    overallScore,
    overallGrade: safeText(input?.overallGrade, safeText(input?.summary?.grade, 'C')),
    confidence,
    dimensions: buildDimensionsArray(dimensions),
    dimensionMap: dimensions,
    scoreRefSummary,
    lineDiagnostics,
    objectiveDiagnosis: Array.isArray(input?.objectiveDiagnosis) && input.objectiveDiagnosis.length
      ? input.objectiveDiagnosis.map((item) => safeText(item)).filter(Boolean).slice(0, 4)
      : buildObjectiveDiagnosis(dimensions, lineDiagnostics, overallScore),
    trainingSuggestions: Array.isArray(input?.trainingSuggestions) && input.trainingSuggestions.length
      ? input.trainingSuggestions
      : buildTrainingSuggestions(dimensions, lineDiagnostics, overallScore),
    aiSummary: safeText(input?.aiSummary, buildAiSummary(overallScore, strongest, weakest))
  }
}

export function buildAnalysisV2FromKaraoke(options = {}) {
  const huangmei = options?.huangmei || {}
  const lineDiagnostics = buildLineDiagnostics(options?.lineScores || huangmei?.lines || [])
  const dimensions = normalizeDimensionsMap(huangmei?.breakdown || options?.breakdown || {})
  const overallScore = clampScore(huangmei?.averageScore ?? options?.averageScore, 0)
  const overallGrade = safeText(huangmei?.grade || options?.grade, 'C')
  const scoreRefSummary = buildScoreRefSummary(options?.scoreRef || null, options?.scoreRefSummary || {})

  return normalizeAnalysisV2({
    audioAnalysisVersion: 'hmx-audio-v2',
    generatedAt: Date.now(),
    overallScore,
    overallGrade,
    dimensions,
    lineDiagnostics,
    scoreRefSummary
  })
}

export function getAnalysisDimensions(analysisV2) {
  return normalizeAnalysisV2(analysisV2).dimensions
}

export function getWeakAnalysisDimensions(analysisV2, count = 3) {
  const normalized = normalizeAnalysisV2(analysisV2)
  return sortDimensionEntries(normalized.dimensionMap, 'asc').slice(0, Math.max(1, count))
}

export function getStrongAnalysisDimensions(analysisV2, count = 2) {
  const normalized = normalizeAnalysisV2(analysisV2)
  return sortDimensionEntries(normalized.dimensionMap, 'desc').slice(0, Math.max(1, count))
}

export function getLegacyBreakdownFromAnalysis(analysisV2) {
  const normalized = normalizeAnalysisV2(analysisV2)
  return {
    voiceActivity: clampScore(normalized.dimensionMap.breath, 0),
    pitchAccuracy: clampScore(normalized.dimensionMap.pitch, 0),
    pitch: clampScore(normalized.dimensionMap.pitch, 0),
    rhythm: clampScore(normalized.dimensionMap.rhythm, 0),
    articulation: clampScore(normalized.dimensionMap.articulation, 0),
    style: clampScore(normalized.dimensionMap.style, 0),
    breath: clampScore(normalized.dimensionMap.breath, 0),
    emotion: clampScore(normalized.dimensionMap.emotion, 0)
  }
}
