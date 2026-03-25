export const FLAGS = {
  SCORING_V2: 'karaoke_scoring_v2'
}

export function isFlagEnabled(flagName) {
  const localValue = localStorage.getItem(flagName)
  if (localValue === '1') return true
  if (localValue === '0') return false

  if (flagName === FLAGS.SCORING_V2) {
    if (import.meta.env.VITE_KARAOKE_SCORING_V2 === '1') return true
  }

  return false
}
