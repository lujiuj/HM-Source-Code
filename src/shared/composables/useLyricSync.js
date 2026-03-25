import { ref, computed, onUnmounted } from 'vue'

/**
 * Parse LRC format lyrics
 * @param {string} lrcText - Raw LRC file content
 * @returns {Array} Parsed lyrics array with time and text
 */
function parseLRC(lrcText) {
  const lines = lrcText.split('\n')
  const lyrics = []
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    if (line.match(/^\[[a-z]+:/i)) continue
    
    const matches = [...line.matchAll(timeRegex)]
    if (matches.length === 0) continue
    
    const text = line.replace(timeRegex, '').trim()
    if (!text) continue
    
    for (const match of matches) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const ms = parseInt(match[3].padEnd(3, '0'), 10)
      const time = minutes * 60000 + seconds * 1000 + ms
      
      lyrics.push({ time, text })
    }
  }
  
  lyrics.sort((a, b) => a.time - b.time)
  
  return lyrics
}

/**
 * Find the current line index for a given time
 * @param {Array} lyrics - Parsed lyrics array
 * @param {number} timeMs - Current time in milliseconds
 * @returns {number} Current line index (-1 if before first line)
 */
function findCurrentLineIndex(lyrics, timeMs) {
  if (!lyrics.length || timeMs < lyrics[0].time) return -1
  
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (timeMs >= lyrics[i].time) return i
  }
  return -1
}

/**
 * Composable for lyrics synchronization
 * @param {string} lrcPath - Path to LRC file
 * @returns {Object} Reactive lyrics state and controls
 */
export function useLyricSync(lrcPath = null) {
  const lrcContent = ref('')
  const lyrics = ref([])
  const offsetMs = ref(0)
  const currentTime = ref(0)
  const currentLineIndex = ref(-1)
  const isLoading = ref(false)
  const error = ref(null)
  const isPlaying = ref(false)
  
  let startTimestamp = 0
  let pausedTime = 0
  let animationFrameId = null

  function setOffset(ms) {
    offsetMs.value = ms
  }
  
  const currentLine = computed(() => {
    if (currentLineIndex.value >= 0 && currentLineIndex.value < lyrics.value.length) {
      return lyrics.value[currentLineIndex.value]
    }
    return null
  })
  
  const currentLineText = computed(() => currentLine.value?.text || '')
  
  const nextLine = computed(() => {
    const nextIdx = currentLineIndex.value + 1
    if (nextIdx >= 0 && nextIdx < lyrics.value.length) {
      return lyrics.value[nextIdx]
    }
    return null
  })
  
  const progress = computed(() => {
    if (!lyrics.value.length) return 0
    const lastTime = lyrics.value[lyrics.value.length - 1].time
    return Math.min(1, currentTime.value / lastTime)
  })
  
  function resolveLrcPath(path) {
    const raw = String(path || '').trim()
    if (!raw) return null
    const encoded = encodeURI(raw)
    try {
      return new URL(encoded, window.location.origin).toString()
    } catch {
      return encoded
    }
  }

  async function loadLRC(path) {
    const resolvedPath = resolveLrcPath(path)
    if (!resolvedPath) return
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(resolvedPath)
      if (!response.ok) {
        throw new Error(`Failed to load LRC: ${response.status}`)
      }
      lrcContent.value = await response.text()
      lyrics.value = parseLRC(lrcContent.value)
      currentLineIndex.value = -1
      currentTime.value = 0
    } catch (e) {
      error.value = e.message
      console.warn('[useLyricSync] Failed to load LRC', { path: resolvedPath, error: e })
      lyrics.value = []
    } finally {
      isLoading.value = false
    }
  }
  
  function updateCurrentLine() {
    currentLineIndex.value = findCurrentLineIndex(lyrics.value, currentTime.value)
  }
  
  function tick() {
    if (!isPlaying.value) return
    
    currentTime.value = pausedTime + (performance.now() - startTimestamp)
    updateCurrentLine()
    
    animationFrameId = requestAnimationFrame(tick)
  }
  
  function play() {
    if (isPlaying.value) return
    
    isPlaying.value = true
    startTimestamp = performance.now()
    tick()
  }
  
  function pause() {
    if (!isPlaying.value) return
    
    isPlaying.value = false
    pausedTime = currentTime.value
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
  
  function stop() {
    pause()
    currentTime.value = 0
    pausedTime = 0
    currentLineIndex.value = -1
  }
  
  function seek(timeMs) {
    currentTime.value = Math.max(0, timeMs)
    pausedTime = currentTime.value
    if (isPlaying.value) {
      startTimestamp = performance.now()
    }
    updateCurrentLine()
  }
  
  function syncWithMedia(mediaElement) {
    if (!mediaElement) return
    
    const onTimeUpdate = () => {
      currentTime.value = (mediaElement.currentTime * 1000) + offsetMs.value
      updateCurrentLine()
    }
    
    const onPlay = () => {
      isPlaying.value = true
    }
    
    const onPause = () => {
      isPlaying.value = false
    }
    
    mediaElement.addEventListener('timeupdate', onTimeUpdate)
    mediaElement.addEventListener('play', onPlay)
    mediaElement.addEventListener('pause', onPause)
    
    return () => {
      mediaElement.removeEventListener('timeupdate', onTimeUpdate)
      mediaElement.removeEventListener('play', onPlay)
      mediaElement.removeEventListener('pause', onPause)
    }
  }
  
  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })
  
  if (lrcPath) {
    loadLRC(lrcPath)
  }
  
  return {
    lyrics,
    currentTime,
    currentLineIndex,
    currentLine,
    currentLineText,
    nextLine,
    progress,
    isLoading,
    error,
    isPlaying,
    offsetMs,
    setOffset,
    loadLRC,
    play,
    pause,
    stop,
    seek,
    syncWithMedia
  }
}

export { parseLRC, findCurrentLineIndex }
