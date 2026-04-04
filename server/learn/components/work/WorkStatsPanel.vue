<template>
  <div class="rounded-[24px] border border-[#a34135]/12 bg-learn-surface-1 p-5">
    <!-- Stats Row -->
    <div class="flex items-center gap-6 flex-wrap">
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-black tracking-tighter text-[#a34135]">{{ displayScore }}</span>
        <span class="text-sm font-bold text-slate-400">综合评分</span>
      </div>
      <div class="h-8 w-px bg-[#a34135]/10 hidden sm:block"></div>
      <div v-if="playDuration" class="flex flex-col">
        <span class="text-[10px] tracking-[0.2em] text-slate-400 font-bold">时长</span>
        <span class="text-sm font-black text-slate-700">{{ formattedDuration }}</span>
      </div>
      <div v-if="publishTime" class="flex flex-col">
        <span class="text-[10px] tracking-[0.2em] text-slate-400 font-bold">发布时间</span>
        <span class="text-sm font-black text-slate-700">{{ formattedDate }}</span>
      </div>
    </div>

    <!-- Dimension Bars -->
    <div v-if="normalizedDimensions.length" class="mt-5 space-y-3">
      <div v-for="dim in normalizedDimensions" :key="dim.key || dim.label" class="flex items-center gap-3">
        <span class="w-14 text-[11px] font-bold text-slate-500 text-right shrink-0">{{ dim.label }}</span>
        <div class="flex-1 h-2 rounded-full bg-[#a34135]/15 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :class="dim.value >= 70 ? 'bg-[#a34135]' : 'bg-red-400'"
            :style="{ width: dim.value + '%' }"
          ></div>
        </div>
        <span class="w-8 text-xs font-black tabular-nums text-right" :class="dim.value >= 70 ? 'text-slate-700' : 'text-red-500'">{{ dim.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  playDuration: { type: Number, default: 0 },
  publishTime: { type: Number, default: 0 },
  dimensions: { type: Array, default: () => [] }
})

const displayScore = computed(() => Math.round(Number(props.score || 0)))

const formattedDuration = computed(() => {
  const total = Math.max(0, Math.floor(Number(props.playDuration || 0) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const formattedDate = computed(() => {
  if (!props.publishTime) return ''
  try {
    return new Date(props.publishTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
})

const normalizedDimensions = computed(() => {
  if (!Array.isArray(props.dimensions)) return []
  return props.dimensions.map((d) => ({
    key: d.key || d.label,
    label: d.label || d.key || '?',
    value: Math.max(0, Math.min(100, Math.round(Number(d.value || 0))))
  }))
})
</script>
