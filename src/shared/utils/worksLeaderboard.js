export function buildWorksLeaderboard(works, limit = 10) {
  const list = Array.isArray(works) ? works : []
  const bestByUser = new Map()

  for (const w of list) {
    if (!w || typeof w !== 'object') continue
    if (!w.userId) continue
    if (w.deletedAt) continue

    const rawTotalScore = typeof w.totalScore === 'number'
      ? w.totalScore
      : (typeof w.score === 'number' ? w.score : 0)
    const totalScore = Number.isFinite(rawTotalScore) ? rawTotalScore : 0

    const timestamp = typeof w.timestamp === 'number' && Number.isFinite(w.timestamp) ? w.timestamp : 0

    const existing = bestByUser.get(w.userId)
    if (!existing) {
      bestByUser.set(w.userId, { ...w, totalScore, timestamp })
      continue
    }

    if (totalScore > existing.totalScore) {
      bestByUser.set(w.userId, { ...w, totalScore, timestamp })
      continue
    }

    if (totalScore === existing.totalScore && timestamp > existing.timestamp) {
      bestByUser.set(w.userId, { ...w, totalScore, timestamp })
    }
  }

  const all = Array.from(bestByUser.values())
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      return (b.timestamp || 0) - (a.timestamp || 0)
    })

  return {
    all,
    top: all.slice(0, limit)
  }
}
