export function scorePreviousLineOnChange({ previousIndex, currentIndex, lyrics, scoreLine }) {
  if (!Number.isInteger(previousIndex) || previousIndex < 0) return null
  if (previousIndex === currentIndex) return null
  if (typeof scoreLine !== 'function') return null

  const lineText = Array.isArray(lyrics) ? (lyrics[previousIndex]?.text || '') : ''
  return scoreLine(previousIndex, lineText)
}
