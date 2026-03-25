function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function clampInt(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.round(number)))
}

function normalizeActorSnapshot(actor = {}) {
  return {
    userId: safeText(actor?.userId),
    username: safeText(actor?.username, '戏友'),
    avatar: safeText(actor?.avatar)
  }
}

export function buildInteractionEvent(type, payload = {}) {
  const timestamp = clampInt(payload?.timestamp, 0, Number.MAX_SAFE_INTEGER) || Date.now()
  const actorSnapshot = normalizeActorSnapshot(payload?.actorSnapshot || payload)
  const giftCount = clampInt(payload?.giftCount ?? payload?.count, 0)
  const commentText = safeText(payload?.commentText ?? payload?.text)

  return {
    type: safeText(type),
    targetUserId: safeText(payload?.targetUserId),
    workId: safeText(payload?.workId),
    timestamp,
    readAt: payload?.readAt ? clampInt(payload.readAt, 0, Number.MAX_SAFE_INTEGER) : null,
    actorSnapshot,
    commentText,
    giftType: safeText(payload?.giftType ?? payload?.type),
    giftCount,
    preview: safeText(
      payload?.preview,
      type === 'gift_sent'
        ? `${actorSnapshot.username} 送出了 ${giftCount || 1} 份礼物`
        : `${actorSnapshot.username} 评论了你的作品`
    )
  }
}

export function normalizeInteractionEvent(record = {}, id = '') {
  const normalized = buildInteractionEvent(record?.type, record)
  return {
    ...normalized,
    id: safeText(record?.id, id)
  }
}
