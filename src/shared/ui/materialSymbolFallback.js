const MATERIAL_SYMBOL_FALLBACKS = {
  analytics: '析',
  arrow_back: '←',
  arrow_outward: '↗',
  auto_awesome: '妙',
  auto_fix_high: '亮',
  air: '气',
  bolt: '⚡',
  celebration: '彩',
  chat_bubble: '评',
  chevron_right: '›',
  close: '×',
  delete: '删',
  edit: '改',
  emoji_events: '榜',
  emoji_food_beverage: '茶',
  error_outline: '!',
  exercise: '练',
  expand_less: '^',
  expand_more: 'v',
  fitness_center: '练',
  folder_open: '开',
  forum: '评',
  format_quote: '“',
  headphones: '听',
  history: '↺',
  hourglass_top: '时',
  leaderboard: '榜',
  library_music: '曲',
  lightbulb: '悟',
  local_florist: '花',
  lock: '锁',
  lyrics: '词',
  map: '图',
  mic: '麦',
  mic_external_on: '唱',
  more_horiz: '…',
  music_note: '♪',
  music_off: '止',
  notifications: '铃',
  palette: '色',
  pause: '⏸',
  payments: '礼',
  person: '人',
  play_arrow: '▶',
  play_circle: '▶',
  progress_activity: '◌',
  psychiatry: '析',
  psychology: '析',
  psychology_alt: '析',
  publish: '发',
  redeem: '礼',
  record_voice_over: '声',
  replay: '↺',
  school: '学',
  search: '搜',
  search_off: '空',
  star: '★',
  task_alt: '✓',
  theater_comedy: '戏',
  thumb_up: '赞',
  trending_up: '升',
  tune: '调',
  visibility: '看',
  warning: '警',
  upload: '↑',
  volume_off: '静',
  check: '✓',
  check_circle: '✓',
  graphic_eq: '波',
  grid_view: '宫',
  upload_file: '↑',
  view_list: '列',
  workspace_premium: '冠'
}

function applyFallbackToElement(element) {
  if (!(element instanceof HTMLElement)) return
  if (!element.classList.contains('material-symbols-outlined')) return
  const raw = String(element.textContent || '').trim()
  const fallback = MATERIAL_SYMBOL_FALLBACKS[raw]
  if (!fallback) return
  element.dataset.materialIcon = raw
  element.dataset.materialFallback = 'true'
  element.textContent = fallback
  if (!element.getAttribute('aria-label')) {
    element.setAttribute('aria-label', raw.replace(/_/g, ' '))
  }
}

function hasMaterialSymbolFont(element) {
  if (!(element instanceof HTMLElement) || typeof window === 'undefined') return false
  const fontFamily = window.getComputedStyle(element).fontFamily || ''
  return /Material Symbols Outlined/i.test(fontFamily)
}

export function enableMaterialSymbolFallback() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const scan = (root = document) => {
    root.querySelectorAll?.('.material-symbols-outlined').forEach((element) => {
      if (!hasMaterialSymbolFont(element)) applyFallbackToElement(element)
    })
    if (root instanceof HTMLElement && !hasMaterialSymbolFont(root)) applyFallbackToElement(root)
  }

  const scheduleScan = () => {
    window.requestAnimationFrame(() => {
      scan(document)
    })
  }

  scheduleScan()
  window.setTimeout(scheduleScan, 300)
  window.setTimeout(scheduleScan, 1200)
  window.addEventListener('load', scheduleScan, { once: true })
  document.fonts?.ready?.then(scheduleScan).catch(() => {})

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' && mutation.target?.parentElement) {
        if (!hasMaterialSymbolFont(mutation.target.parentElement)) {
          applyFallbackToElement(mutation.target.parentElement)
        }
        return
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) scan(node)
      })
    })
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true
  })
}
