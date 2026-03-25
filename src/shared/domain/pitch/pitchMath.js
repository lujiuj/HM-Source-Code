function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function hzToMidiNumber(hz) {
  if (!isFiniteNumber(hz) || hz <= 0) return null
  const midi = 12 * Math.log2(hz / 440) + 69
  return Math.round(midi)
}

export function centsDiffHz(pitchHz, expectedHz) {
  if (!isFiniteNumber(pitchHz) || !isFiniteNumber(expectedHz)) return null
  if (pitchHz <= 0 || expectedHz <= 0) return null
  return 1200 * Math.log2(pitchHz / expectedHz)
}

export function isPitchHit(pitchHz, expectedHz, toleranceCents = 50) {
  const diff = centsDiffHz(pitchHz, expectedHz)
  if (diff === null) return false
  const tol = isFiniteNumber(toleranceCents) ? Math.abs(toleranceCents) : 50
  // Floating point guard: boundary values (e.g., exactly 50 cents) may compute as 50.0000000001
  return Math.abs(diff) <= tol + 1e-6
}
