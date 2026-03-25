<template>
  <div ref="containerRef" class="danmaku-container">
    <span
      v-for="item in activeItems"
      :key="item._uid"
      class="danmaku-item"
      :style="item.style"
    >{{ item.text }}</span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  danmakus: { type: Array, default: () => [] }
})

const TRACK_COUNT = 4
const DURATION_SEC = 8
const containerRef = ref(null)
const firedSet = ref(new Set())
const activeItems = ref([])
const lastTimeMs = ref(0)
let uidCounter = 0

const sortedDanmakus = computed(() =>
  [...props.danmakus].sort((a, b) => Number(a.timeMs || 0) - Number(b.timeMs || 0))
)

watch(
  () => props.currentTime,
  (now) => {
    const nowMs = now * 1000
    if (nowMs < lastTimeMs.value - 800) {
      const nextFired = new Set()
      for (const item of sortedDanmakus.value) {
        const tMs = Number(item.timeMs || 0)
        if (tMs < nowMs - 600) {
          nextFired.add(item.id || `${tMs}:${item.text || item.content || ''}`)
        }
      }
      firedSet.value = nextFired
      activeItems.value = []
    }
    lastTimeMs.value = nowMs
    if (!props.isPlaying) return
    for (const d of sortedDanmakus.value) {
      const tMs = Number(d.timeMs || 0)
      if (tMs > nowMs) break
      if (tMs < nowMs - 600) continue
      const dKey = d.id || `${tMs}:${d.text || d.content || ''}`
      if (firedSet.value.has(dKey)) continue
      firedSet.value.add(dKey)
      spawnDanmaku(d)
    }
  }
)

watch(
  () => props.danmakus,
  () => {
    lastTimeMs.value = props.currentTime * 1000
  }
)

function spawnDanmaku(d) {
  const track = (uidCounter++) % TRACK_COUNT
  const topPercent = 8 + track * (80 / TRACK_COUNT)
  const uid = `dm_${uidCounter}`
  const item = {
    _uid: uid,
    text: d.text || d.content || '',
    style: {
      top: `${topPercent}%`,
      animationDuration: `${DURATION_SEC}s`
    }
  }
  activeItems.value = [...activeItems.value, item]
  setTimeout(() => {
    activeItems.value = activeItems.value.filter((i) => i._uid !== uid)
  }, DURATION_SEC * 1000 + 200)
}

onBeforeUnmount(() => {
  activeItems.value = []
})
</script>

<style scoped>
.danmaku-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.danmaku-item {
  position: absolute;
  right: 0;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-shadow:
    0 0 4px rgba(0, 0, 0, 0.8),
    0 1px 2px rgba(0, 0, 0, 0.6);
  animation: danmaku-slide linear forwards;
  will-change: transform;
  padding: 2px 6px;
  border-radius: 4px;
}

@keyframes danmaku-slide {
  from {
    transform: translateX(20%);
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  to {
    transform: translateX(calc(-100vw - 100%));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .danmaku-item {
    animation: none;
    position: static;
    display: inline-block;
    margin: 2px 8px;
  }
}
</style>
