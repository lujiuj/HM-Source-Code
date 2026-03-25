function normalizeOneSource(src) {
  if (!src) return null

  if (typeof src === 'string') {
    const url = src.trim()
    if (!url) return null
    return { title: url, url }
  }

  if (typeof src !== 'object') return null

  const url = typeof src.url === 'string' ? src.url.trim() : ''
  if (!url) return null

  const title = typeof src.title === 'string' && src.title.trim() ? src.title.trim() : url
  return { title, url }
}

export function normalizeSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return []
  return sources.map(normalizeOneSource).filter(Boolean)
}
