<template>
  <div v-if="hasPitchData" class="border-t border-[#a34135]/10 bg-learn-surface-1 px-5 py-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="material-symbols-outlined text-base text-[#a34135]">graphic_eq</span>
      <span class="text-sm font-bold text-slate-700">音高表现</span>
    </div>
    <svg class="w-full h-16" viewBox="0 0 200 40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="perf-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary-dark)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--color-primary-dark)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polygon :points="areaPoints" fill="url(#perf-grad)" />
      <polyline :points="linePoints" fill="none" stroke="var(--color-primary-dark)" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Playhead -->
      <line v-if="playheadX >= 0" :x1="playheadX" y1="0" :x2="playheadX" y2="40" stroke="var(--color-primary-dark)" stroke-width="0.4" stroke-dasharray="1,1" opacity="0.6" />
    </svg>
  </div>
  <div v-else-if="showPlaceholder" class="border-t border-[#a34135]/10 bg-learn-surface-1 px-5 py-4 flex items-center gap-2">
    <span class="material-symbols-outlined text-base text-slate-300">graphic_eq</span>
    <span class="text-sm text-slate-400">音高分析功能开发中</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pitchRecords: { type: Array, default: () => [] },
  videoTime: { type: Number, default: 0 },
  videoDuration: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  songMeta: { type: Object, default: () => null }
})

const hasPitchData = computed(() => Array.isArray(props.pitchRecords) && props.pitchRecords.length > 2)
const showPlaceholder = computed(() => !hasPitchData.value && props.songMeta?.isScorable)

const linePoints = computed(() => {
  if (!hasPitchData.value) return ''
  const records = props.pitchRecords
  const maxTime = props.videoDuration || records[records.length - 1]?.time || 1
  return records.map((r) => {
    const x = ((Number(r.time || 0) / maxTime) * 200).toFixed(1)
    const norm = Math.max(0, Math.min(1, Number(r.pitch || r.value || 0) / 100))
    const y = (40 - norm * 36).toFixed(1)
    return `${x},${y}`
  }).join(' ')
})

const areaPoints = computed(() => {
  if (!linePoints.value) return ''
  return `0,40 ${linePoints.value} 200,40`
})

const playheadX = computed(() => {
  if (!props.videoDuration || !props.isPlaying) return -1
  return (props.videoTime / props.videoDuration) * 200
})
</script>
