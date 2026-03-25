import { getGradeByScore } from '../../utils/grades.js'

export const DEFAULT_GRADE_LABELS = {
  SSS: '宗师',
  SS: '名家',
  S: '高手',
  A: '优秀',
  B: '良好',
  C: '加油'
}

export const DEFAULT_BASELINE_OPTIONS = {
  floorScore: 0,
  alignThreshold: 0.7,
  penaltySlope: 120,
  maxPenalty: 35,
  minLineVoicedMs: 500
}

function clampNumber(value, min, max) {
  const v = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(min, Math.min(max, v))
}

export function computeOffWindowPenalty(voicedInMs, voicedOutMs, options = DEFAULT_BASELINE_OPTIONS) {
  const opts = { ...DEFAULT_BASELINE_OPTIONS, ...(options || {}) }
  const inMs = clampNumber(voicedInMs, 0, Number.POSITIVE_INFINITY)
  const outMs = clampNumber(voicedOutMs, 0, Number.POSITIVE_INFINITY)
  const total = inMs + outMs
  if (total <= 0) return 0

  const align = inMs / total
  const raw = Math.round((opts.alignThreshold - align) * opts.penaltySlope)
  return Math.max(0, Math.min(opts.maxPenalty, raw))
}

export function applyBaselineToLine(
  line,
  voicedMs,
  options = DEFAULT_BASELINE_OPTIONS,
  gradeLabels = DEFAULT_GRADE_LABELS
) {
  const opts = { ...DEFAULT_BASELINE_OPTIONS, ...(options || {}) }
  if (!line || typeof line.lineIndex !== 'number') return line
  const v = clampNumber(voicedMs, 0, Number.POSITIVE_INFINITY)
  if (v < opts.minLineVoicedMs) return line

  const rawOverall = typeof line.overall === 'number' ? line.overall : 0
  const overall = Math.max(rawOverall, opts.floorScore)
  if (overall === rawOverall) return line

  const grade = getGradeByScore(overall)
  const gradeLabel = gradeLabels[grade] || grade
  return { ...line, overall, grade, gradeLabel }
}

export function applyBaselineToFinal(
  final,
  state,
  options = DEFAULT_BASELINE_OPTIONS,
  gradeLabels = DEFAULT_GRADE_LABELS
) {
  const opts = { ...DEFAULT_BASELINE_OPTIONS, ...(options || {}) }
  if (!final) return final

  const voicedInMs = clampNumber(state?.voicedInMs, 0, Number.POSITIVE_INFINITY)
  const voicedOutMs = clampNumber(state?.voicedOutMs, 0, Number.POSITIVE_INFINITY)
  const lineVoicedMs = state?.lineVoicedMs

  const penalty = computeOffWindowPenalty(voicedInMs, voicedOutMs, opts)
  const hasAlignedVoice = voicedInMs >= opts.minLineVoicedMs

  const rawOverall = typeof final.overall === 'number' ? final.overall : 0
  const base = hasAlignedVoice ? Math.max(rawOverall, opts.floorScore) : rawOverall
  const overall = Math.round(clampNumber(base - penalty, 0, 100))

  const grade = getGradeByScore(overall)
  const gradeLabel = gradeLabels[grade] || grade

  const lines = Array.isArray(final.lines)
    ? final.lines.map((line) => {
        const v =
          lineVoicedMs && typeof line?.lineIndex === 'number'
            ? (lineVoicedMs.get ? lineVoicedMs.get(line.lineIndex) : lineVoicedMs[line.lineIndex])
            : 0
        return applyBaselineToLine(line, v, opts, gradeLabels)
      })
    : []

  return {
    ...final,
    overall,
    grade,
    gradeLabel,
    breakdown: { ...(final.breakdown || {}), overall },
    lines
  }
}
