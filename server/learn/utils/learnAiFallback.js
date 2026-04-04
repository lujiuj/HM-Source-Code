function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function resolveSongHint(options = {}) {
  const operaName = safeText(options.operaName)
  const excerptName = safeText(options.excerptName || options.songName)
  const singer = safeText(options.singer)
  const style = safeText(options.style)
  const title = (() => {
    if (operaName && excerptName) return `《${operaName}》选段《${excerptName}》`
    if (excerptName) return `《${excerptName}》`
    if (operaName) return `《${operaName}》`
    return ''
  })()
  const pieces = [title, singer ? `示范：${singer}` : '', style ? `侧重：${style}` : ''].filter(Boolean)
  return {
    title,
    hint: pieces.join('，')
  }
}

function pickLowestDimension(dimensions) {
  if (!Array.isArray(dimensions) || !dimensions.length) return null
  let lowest = null
  for (const item of dimensions) {
    if (!item) continue
    const value = Number(item.value)
    if (!Number.isFinite(value)) continue
    if (!lowest || value < lowest.value) {
      lowest = { label: String(item.label || ''), value }
    }
  }
  return lowest && lowest.label ? lowest : null
}

function scoreTier(score) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100)
  if (value >= 92) return 'excellent'
  if (value >= 85) return 'good'
  if (value >= 75) return 'ok'
  if (value >= 60) return 'keep'
  return 'warmup'
}

function buildPracticeItemByDimension(label) {
  const key = String(label || '').trim()
  if (key.includes('音准')) return '先回听最飘的一句，做 2 轮滑音找音高，再回到原速。'
  if (key.includes('节拍')) return '先打拍不唱，确认每句落点，再带字慢唱一遍。'
  if (key.includes('咬字')) return '把字头单独读清，再用同一口型带回旋律。'
  if (key.includes('韵味')) return '先把尾韵拖稳，再补转音，不要一上来就追求花腔。'
  if (key.includes('气息')) return '先标出换气点，做一轮吸停吐，再回到整句。'
  return '挑最不稳的一句做“慢速 2 遍 + 原速 1 遍”的小循环。'
}

export function buildPublishAdviceFallback(options = {}) {
  const averageScore = Number(options.averageScore)
  const totalScore = Number(options.totalScore)
  const lineCount = Number(options.lineCount)
  const dimensions = options.dimensions

  const score = Number.isFinite(totalScore) ? totalScore : averageScore
  const safeScore = clamp(Math.round(score || 0), 0, 100)
  const safeLineCount = clamp(Math.round(lineCount || 1), 1, 999)
  const weakest = pickLowestDimension(dimensions)
  const song = resolveSongHint(options)
  const tier = scoreTier(safeScore)

  const headline = weakest
    ? `${song.title ? `${song.title}：` : ''}优先补 ${weakest.label}`
    : (tier === 'excellent' ? '可以直接发布' : '发布前再打磨一轮会更稳')

  const summary = (() => {
    if (tier === 'excellent') return `这次 ${safeScore} 分（${safeLineCount} 句），完整度已经够高，可以直接发布。`
    if (tier === 'good') return `这次 ${safeScore} 分（${safeLineCount} 句），整体已经很稳；再补一下${weakest?.label || '细节'}会更出彩。`
    if (tier === 'ok') return `这次 ${safeScore} 分（${safeLineCount} 句），基础达标；建议围绕${weakest?.label || '弱项'}再做一轮针对练习。`
    if (tier === 'keep') return `这次 ${safeScore} 分（${safeLineCount} 句），建议先练稳再发，把${weakest?.label || '核心动作'}补到不跑。`
    return `这次 ${safeScore} 分（${safeLineCount} 句），更适合作为练习记录；先按下面 3 个动作补一轮。`
  })()

  return {
    source: 'ai-fallback',
    headline,
    summary,
    items: [
      buildPracticeItemByDimension(weakest?.label),
      '把最容易飘或抢的一句单独循环：慢速 2 遍，再原速 1 遍。',
      '回到名师分析对照同一句，修完再录一遍，确认后再覆盖发布。'
    ]
  }
}
