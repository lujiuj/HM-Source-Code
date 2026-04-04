const LRC_TIME_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g

function parseFraction(rawFraction) {
  const fracRaw = String(rawFraction || '0')
  if (fracRaw.length === 2) return Number(fracRaw) / 100
  return Number(fracRaw.padEnd(3, '0')) / 1000
}

function shouldSkipMetaLine(lineText) {
  return /^(作词|作曲|编曲|演唱|词|曲|制作|翻唱|原唱|监制|录音|混音|封面)/i.test(String(lineText || '').trim())
}

export function parseLrcText(text, options = {}) {
  const defaultDurationSec = Number.isFinite(Number(options.defaultDurationSec))
    ? Math.max(0.5, Number(options.defaultDurationSec))
    : 3.4
  const skipMeta = options.skipMeta !== false

  if (!text) return []

  const rows = []
  String(text)
    .split('\n')
    .forEach((raw) => {
      const matches = [...raw.matchAll(LRC_TIME_RE)]
      const lineText = raw.replace(/\[[^\]]+\]/g, '').trim()
      if (!matches.length || !lineText) return
      if (skipMeta && shouldSkipMetaLine(lineText)) return

      for (const match of matches) {
        const min = Number(match[1] || 0)
        const sec = Number(match[2] || 0)
        const frac = parseFraction(match[3])
        rows.push({
          text: lineText,
          startSec: min * 60 + sec + frac
        })
      }
    })

  rows.sort((a, b) => a.startSec - b.startSec)

  return rows.map((item, idx) => {
    const next = rows[idx + 1]
    const endSec = next ? next.startSec : item.startSec + defaultDurationSec
    const durationSec = Math.max(0.6, endSec - item.startSec)
    return {
      ...item,
      startMs: Math.round(item.startSec * 1000),
      endSec,
      durationSec
    }
  })
}

export async function loadLrcLines(lrcPath, options = {}) {
  if (!lrcPath) return []
  const response = await fetch(lrcPath)
  if (!response.ok) return []
  const text = await response.text()
  return parseLrcText(text, options)
}
