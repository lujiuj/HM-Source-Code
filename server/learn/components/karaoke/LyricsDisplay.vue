<template>
  <div class="lyrics-display" ref="containerRef">
    <div class="lyrics-content" :style="contentStyle">
      <div
        v-for="(lyric, index) in safeLyrics"
        :key="index"
        :data-line-index="index"
        :ref="(el) => setLineRef(el, index)"
        class="lyric-line"
        :class="{ 
          'current': index === activeLineIndex,
          'past': index < activeLineIndex,
          'future': index > activeLineIndex
        }"
        @click="onLineClick(index)"
      >
        <div class="line-content">
          <span
            class="lyric-text-render"
            :class="{ 'is-active': index === activeLineIndex }"
            :style="index === activeLineIndex ? gradientStyle : {}"
          >
            {{ lyric.text }}
          </span>
        </div>
      </div>
      
      <div v-if="!safeLyrics.length" class="empty-state">
        暂无歌词
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  lyrics: {
    type: Array,
    default: () => []
  },
  currentLineIndex: {
    type: Number,
    default: -1
  },
  currentTimeMs: {
    type: Number,
    default: 0
  },
  fontSize: {
    type: String,
    default: '24px'
  },
  highlightColor: {
    type: String,
    default: 'var(--color-primary-dark)'
  }
})

const emit = defineEmits(['seek'])

const containerRef = ref(null)
const lineRefs = ref([])
const edgePaddingPx = ref(120)
let pendingScrollRaf = 0
let pendingRetryTimer = null

const safeLyrics = computed(() => (Array.isArray(props.lyrics) ? props.lyrics : []))

const derivedLineIndex = computed(() => {
  const lines = safeLyrics.value
  if (!lines.length) return -1

  const currentMs = Number.isFinite(props.currentTimeMs) ? props.currentTimeMs : 0
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const lineTime = Number(lines[i]?.time || 0)
    if (currentMs >= lineTime) return i
  }
  return 0
})

const activeLineIndex = computed(() => {
  // Prefer parent's index if valid
  if (typeof props.currentLineIndex === 'number' && props.currentLineIndex >= 0) {
    return props.currentLineIndex
  }
  return derivedLineIndex.value
})

const contentStyle = computed(() => ({
  paddingTop: `${edgePaddingPx.value}px`,
  paddingBottom: `${edgePaddingPx.value}px`
}))

function setLineRef(el, index) {
  if (!el) return
  lineRefs.value[index] = el
}

function getAutoScrollIndex() {
  const lines = safeLyrics.value
  if (!lines.length) return -1
  return activeLineIndex.value >= 0 ? activeLineIndex.value : 0
}

function scrollToIndex(index, behavior = 'smooth', retry = 0) {
  const container = containerRef.value
  if (!container || index < 0) return

  const line = lineRefs.value[index] || container.querySelector(`[data-line-index="${index}"]`)
  if (!line) {
    if (retry < 5) {
      setTimeout(() => scrollToIndex(index, behavior, retry + 1), 50)
    }
    return
  }

  const containerHeight = container.clientHeight
  const lineTop = line.offsetTop
  const lineHeight = line.clientHeight
  // Center the line more vertically (approx 40% from top for KTV feel)
  const anchor = containerHeight * 0.42
  const targetTop = Math.max(0, lineTop - anchor + (lineHeight / 2))

  if (behavior === 'auto') {
    container.scrollTop = targetTop
    return
  }
  
  container.scrollTo({ top: targetTop, behavior })
}

function updateEdgePadding() {
  const container = containerRef.value
  if (!container) return
  edgePaddingPx.value = container.clientHeight * 0.42
}

function cancelPendingScroll() {
  if (pendingScrollRaf) {
    cancelAnimationFrame(pendingScrollRaf)
    pendingScrollRaf = 0
  }
}

function cancelPendingRetry() {
  if (pendingRetryTimer) {
    clearTimeout(pendingRetryTimer)
    pendingRetryTimer = null
  }
}

function scheduleScroll(index, behavior = 'smooth') {
  cancelPendingScroll()
  pendingScrollRaf = requestAnimationFrame(() => {
    scrollToIndex(index, behavior)
    pendingScrollRaf = 0
  })
}

watch(
  () => safeLyrics.value.length,
  async (newLen) => {
    lineRefs.value = []
    if (!newLen) return
    await nextTick()
    updateEdgePadding()
    scheduleScroll(getAutoScrollIndex(), 'auto')
  },
  { immediate: true, flush: 'post' }
)

watch(
  activeLineIndex,
  (newIndex) => {
    if (newIndex >= 0) {
      scheduleScroll(newIndex, 'smooth')
    }
  },
  { flush: 'post' }
)

const currentLineProgress = computed(() => {
  const currentIndex = activeLineIndex.value
  const lines = safeLyrics.value
  if (currentIndex < 0 || !lines[currentIndex]) return 0
  
  const currentLine = lines[currentIndex]
  const nextLine = lines[currentIndex + 1]
  
  const startTime = currentLine.time || 0
  // Estimate end time if no next line
  const endTime = nextLine ? (nextLine.time || startTime + 2000) : (startTime + 3500)
  const duration = endTime - startTime
  
  if (duration <= 0) return 0
  
  const progress = (props.currentTimeMs - startTime) / duration
  return Math.max(0, Math.min(1, progress))
})

const gradientStyle = computed(() => {
  const percent = currentLineProgress.value * 100
  return {
    background: `linear-gradient(90deg,
      var(--color-cinnabar) 0%,
      var(--color-primary-dark) ${percent}%,
      rgba(62, 39, 35, 0.3) ${percent}%,
      rgba(62, 39, 35, 0.3) 100%)`,
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    'color': 'transparent'
  }
})

function onLineClick(index) {
  const lyric = safeLyrics.value[index]
  if (lyric && lyric.time !== undefined) {
    emit('seek', lyric.time / 1000)
  }
}

// Used in <template> (Biome doesn't analyze template bindings)
const __templateBindings = {
  containerRef,
  lineRefs,
  safeLyrics,
  activeLineIndex,
  contentStyle,
  gradientStyle,
  onLineClick,
  setLineRef
}

void __templateBindings

onMounted(() => {
  updateEdgePadding()
  scheduleScroll(getAutoScrollIndex(), 'auto')
  window.addEventListener('resize', updateEdgePadding)
})

onUnmounted(() => {
  cancelPendingScroll()
  cancelPendingRetry()
  window.removeEventListener('resize', updateEdgePadding)
})
</script>

<style scoped lang="less">
.lyrics-display {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 0;
  box-sizing: border-box;
  position: relative;
  touch-action: pan-y;
  scroll-behavior: smooth;
  overflow-anchor: none;
  overscroll-behavior: contain;
  
  /* Hide scrollbar */
  &::-webkit-scrollbar {
    width: 0;
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.lyrics-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  width: 100%;
}

.lyric-line {
  font-size: v-bind(fontSize); /* Controlled by parent */
  font-weight: 500;
  font-family: var(--font-serif);
  text-align: center;
  padding: 18px 24px;
  margin: 8px 0;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  line-height: 1.8;
  max-width: 90%;
  cursor: pointer;
  user-select: none;
  transform: scale(0.88);
  opacity: 0.45;
  filter: blur(0.5px);
  
  &:hover {
    background: rgba(212, 175, 55, 0.1);
    border-radius: 12px;
    opacity: 0.7;
    filter: none;
  }
  
  &.current {
    transform: scale(1.18);
    font-weight: 700;
    opacity: 1;
    filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.4));

    // Smooth golden glow around the entire currently sung line
    text-shadow: 0 4px 16px rgba(212, 175, 55, 0.25);
    background-image: none;
  }
}
.line-content {
  position: relative;
  display: inline-block;
  white-space: pre-wrap;
}

.lyric-text-render {
  color: rgba(62, 39, 35, 0.5);
  transition: all 0.3s ease;
  display: inline-block;

  &.is-active {
    color: var(--color-cinnabar);
    filter: drop-shadow(0 2px 4px rgba(138, 46, 46, 0.45));
  }
}

.empty-state {
  color: rgba(62, 39, 35, 0.5);
  font-size: 24px;
  font-family: var(--font-serif);
  margin-top: 100px;
}

/* Responsive */
@media (max-width: 768px) {
  .lyric-line {
    padding: 10px 15px;
  }

  .lyrics-content {
    padding-top: 130px;
    padding-bottom: 130px;
  }
}
</style>
