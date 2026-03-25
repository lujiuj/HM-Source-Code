export const DEFAULT_GRADE_THRESHOLDS = {
  SSS: 95,
  SS: 90,
  S: 85,
  A: 75,
  B: 60
}

export function getGradeByScore(score, thresholds = DEFAULT_GRADE_THRESHOLDS) {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 0

  if (s >= thresholds.SSS) return 'SSS'
  if (s >= thresholds.SS) return 'SS'
  if (s >= thresholds.S) return 'S'
  if (s >= thresholds.A) return 'A'
  if (s >= thresholds.B) return 'B'
  return 'C'
}
