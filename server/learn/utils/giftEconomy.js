function clampInt(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.round(number)))
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toDateKey(input = Date.now()) {
  const date = new Date(input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeLedgerSummary(input = {}) {
  return {
    earned: clampInt(input?.earned, 0),
    spent: clampInt(input?.spent, 0),
    journey: clampInt(input?.journey, 0),
    quiz: clampInt(input?.quiz, 0),
    repertoire: clampInt(input?.repertoire, 0),
    level: clampInt(input?.level, 0),
    publish: clampInt(input?.publish, 0)
  }
}

function normalizeDailyUsage(input = {}, now = Date.now()) {
  return {
    dateKey: safeText(input?.dateKey, toDateKey(now)),
    sentCount: clampInt(input?.sentCount, 0)
  }
}

export function buildGiftEntitlements(summary = {}) {
  const clearedCount = Array.isArray(summary?.journey?.clearedStageIds) ? summary.journey.clearedStageIds.length : 0
  const quizPassCount = Array.isArray(summary?.journey?.quizPassStageIds) ? summary.journey.quizPassStageIds.length : 0
  const repertoireCount = Array.isArray(summary?.scoredSongIds) ? summary.scoredSongIds.length : 0
  const publishedWorksCount = clampInt(summary?.publishedWorksCount, 0)
  const level = clampInt(summary?.level, 1)

  const journeyEarned = clearedCount * 18
  const quizEarned = quizPassCount * 8
  const repertoireEarned = repertoireCount * 15
  const levelEarned = Math.max(0, level - 1) * 12
  const publishEarned = publishedWorksCount * 10
  const earned = journeyEarned + quizEarned + repertoireEarned + levelEarned + publishEarned

  const dailyGiftCap = clampInt(24 + (level * 8) + (clearedCount * 2), 24, 360)
  const perSendCap = clampInt(6 + (level * 4) + quizPassCount, 6, 199)

  return {
    giftBalance: earned,
    dailyGiftCap,
    perSendCap,
    lifetimeEarned: earned,
    giftLedgerSummary: {
      earned,
      spent: 0,
      journey: journeyEarned,
      quiz: quizEarned,
      repertoire: repertoireEarned,
      level: levelEarned,
      publish: publishEarned
    }
  }
}

export function applyGiftEntitlements(profile = {}, entitlements = {}, now = Date.now()) {
  const baseLedger = normalizeLedgerSummary(profile?.giftLedgerSummary)
  const nextLedger = normalizeLedgerSummary({
    ...baseLedger,
    ...(entitlements?.giftLedgerSummary || {})
  })
  nextLedger.spent = baseLedger.spent

  const dailyGiftUsage = normalizeDailyUsage(profile?.dailyGiftUsage, now)
  if (dailyGiftUsage.dateKey !== toDateKey(now)) {
    dailyGiftUsage.dateKey = toDateKey(now)
    dailyGiftUsage.sentCount = 0
  }

  const lifetimeEarned = clampInt(entitlements?.lifetimeEarned ?? nextLedger.earned, 0)
  const giftBalance = clampInt(lifetimeEarned - nextLedger.spent, 0)

  return {
    giftBalance,
    dailyGiftCap: clampInt(entitlements?.dailyGiftCap ?? profile?.dailyGiftCap, 24, 360),
    perSendCap: clampInt(entitlements?.perSendCap ?? profile?.perSendCap, 6, 199),
    lifetimeEarned,
    giftLedgerSummary: {
      ...nextLedger,
      earned: lifetimeEarned,
      spent: clampInt(baseLedger.spent, 0)
    },
    dailyGiftUsage
  }
}

export function canSendGift(profile = {}, count = 1, now = Date.now()) {
  const normalizedCount = clampInt(count, 0)
  const dailyGiftUsage = normalizeDailyUsage(profile?.dailyGiftUsage, now)
  const sameDayUsage = dailyGiftUsage.dateKey === toDateKey(now) ? dailyGiftUsage.sentCount : 0
  const balance = clampInt(profile?.giftBalance, 0)
  const perSendCap = clampInt(profile?.perSendCap, 6, 199)
  const dailyGiftCap = clampInt(profile?.dailyGiftCap, 24, 360)

  if (!normalizedCount) {
    return { ok: false, reason: '请输入大于 0 的礼物数量。', allowedCount: 0 }
  }
  if (normalizedCount > perSendCap) {
    return { ok: false, reason: `单次最多赠送 ${perSendCap} 份。`, allowedCount: perSendCap }
  }
  if (normalizedCount > balance) {
    return { ok: false, reason: `当前喝彩值余额不足，剩余 ${balance}。`, allowedCount: balance }
  }
  if ((sameDayUsage + normalizedCount) > dailyGiftCap) {
    return {
      ok: false,
      reason: `今日最多可送 ${dailyGiftCap} 份，已送 ${sameDayUsage} 份。`,
      allowedCount: Math.max(0, dailyGiftCap - sameDayUsage)
    }
  }
  return { ok: true, reason: '', allowedCount: normalizedCount }
}

export function consumeGiftBalance(profile = {}, count = 1, now = Date.now()) {
  const verdict = canSendGift(profile, count, now)
  if (!verdict.ok) {
    return { ok: false, reason: verdict.reason, profile }
  }

  const next = applyGiftEntitlements(profile, {}, now)
  next.giftBalance = clampInt(next.giftBalance - verdict.allowedCount, 0)
  next.giftLedgerSummary = {
    ...next.giftLedgerSummary,
    spent: clampInt((next.giftLedgerSummary?.spent || 0) + verdict.allowedCount, 0)
  }
  next.dailyGiftUsage = {
    dateKey: toDateKey(now),
    sentCount: clampInt((next.dailyGiftUsage?.sentCount || 0) + verdict.allowedCount, 0)
  }

  return { ok: true, reason: '', profile: next, consumed: verdict.allowedCount }
}
