<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { buildJourneyTrackPath, canSelectJourneyStage, getJourneyStageLayout } from '../utils/journeyMapLayout.js'

const props = defineProps({
  summary: { type: Object, required: true },
  selectedStageId: { type: String, default: '' }
})

const emit = defineEmits(['selectStage'])

/* ── Dynamic turbulence seed animation ── */
const turbulenceRef = ref(null)
let turbulenceSeed = 7
let lastSeedTime = 0
let rafId = null

function tickTurbulence(timestamp) {
  if (timestamp - lastSeedTime >= 500) {
    lastSeedTime = timestamp
    turbulenceSeed = (turbulenceSeed % 999) + 1
    if (turbulenceRef.value) {
      turbulenceRef.value.setAttribute('seed', String(turbulenceSeed))
    }
  }
  rafId = requestAnimationFrame(tickTurbulence)
}

onMounted(() => {
  rafId = requestAnimationFrame(tickTurbulence)
})

onBeforeUnmount(() => {
  if (rafId != null) cancelAnimationFrame(rafId)
})

function resolveStageIcon(stage) {
  if (stage.status === 'cleared') return 'check_circle'
  if (stage.taskType === 'quiz') return 'psychology_alt'
  if (stage.taskType === 'analysis') return 'headphones'
  if (stage.taskType === 'publish') return 'ios_share'
  return 'mic'
}

const styledStages = computed(() => {
  const stages = props.summary?.journey?.stages || []
  return stages.map((stage, index) => {
    const layout = getJourneyStageLayout(stage.id, index)
    return {
      ...stage,
      ...layout,
      displayIcon: resolveStageIcon(stage),
      selectable: canSelectJourneyStage(stage),
      isSelected: props.selectedStageId === stage.id
    }
  })
})

const trackPath = computed(() => buildJourneyTrackPath(styledStages.value))
const activeTrackPath = computed(() => buildJourneyTrackPath(styledStages.value.filter((stage) => stage.status !== 'locked')))
const fogClusters = computed(() => styledStages.value.filter((stage) => stage.status === 'locked'))

function selectStage(stage) {
  if (!canSelectJourneyStage(stage)) return
  emit('selectStage', stage)
}
</script>

<template>
  <div class="journey-map">
    <svg class="fog-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <filter id="journey-fog-distort" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence ref="turbulenceRef" type="fractalNoise" baseFrequency="0.024 0.034" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="journey-fog-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
    </svg>

    <div class="map-backdrop">
      <div class="backdrop-glow glow-a"></div>
      <div class="backdrop-glow glow-b"></div>
      <div class="backdrop-ridge ridge-a"></div>
      <div class="backdrop-ridge ridge-b"></div>
      <div class="terrain terrain-a"></div>
      <div class="terrain terrain-b"></div>
      <div class="terrain terrain-c"></div>
      <div class="map-grid"></div>
    </div>

    <div class="map-canvas">
      <svg class="track-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path v-if="trackPath" :d="trackPath" class="track-base"></path>
        <path v-if="trackPath" :d="trackPath" class="track-dash dash-flow"></path>
        <path v-if="activeTrackPath" :d="activeTrackPath" class="track-active"></path>
      </svg>

      <button
        v-for="(stage, index) in styledStages"
        :key="stage.id"
        type="button"
        class="stage-node"
        :class="[
          `is-${stage.status}`,
          {
            'is-selectable': stage.selectable,
            'is-selected': stage.isSelected,
            'is-obscured': stage.status === 'locked'
          }
        ]"
        :style="{ left: `${stage.left}%`, top: `${stage.top}%` }"
        :disabled="!stage.selectable"
        @click="selectStage(stage)"
      >
        <div class="stage-shadow"></div>
        <div v-if="stage.status === 'active'" class="stage-halo node-breathe"></div>
        <div class="stage-orbit"></div>
        <div class="stage-core">
          <span class="stage-order">{{ index + 1 }}</span>
          <span class="material-symbols-outlined stage-icon">{{ stage.displayIcon }}</span>
        </div>
        <div class="stage-label">
          <p class="stage-title">{{ stage.title }}</p>
          <p class="stage-caption">
            {{
              stage.status === 'cleared'
                ? '已通关'
                : stage.status === 'active'
                  ? '当前可挑战'
                  : '迷雾未开'
            }}
          </p>
        </div>
      </button>

      <div
        v-for="stage in fogClusters"
        :key="`fog-${stage.id}`"
        class="fog-cluster"
        :style="{ left: `${stage.left}%`, top: `${stage.top}%`, width: `${stage.fogSize + 120}px`, height: `${stage.fogSize + 120}px` }"
      >
        <div class="fog-edge-dissolve">
          <div class="fog-layer layer-a"></div>
          <div class="fog-layer layer-b"></div>
          <div class="fog-layer layer-c"></div>
          <div class="fog-layer layer-d"></div>
        </div>
        <div class="fog-sheen"></div>
        <span class="sparkle-dot sparkle-1"></span>
        <span class="sparkle-dot sparkle-2"></span>
        <span class="sparkle-dot sparkle-3"></span>
        <span class="sparkle-dot sparkle-4"></span>
        <span class="sparkle-dot sparkle-5"></span>
        <span class="sparkle-dot sparkle-6"></span>
        <div class="fog-title">迷雾封锁</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.journey-map {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 16%, rgba(210, 186, 142, 0.6), transparent 30%),
    radial-gradient(circle at 84% 20%, rgba(188, 152, 92, 0.4), transparent 24%),
    radial-gradient(circle at 46% 88%, rgba(170, 142, 106, 0.22), transparent 28%),
    linear-gradient(180deg, #f0e4cc 0%, #ddd0b4 54%, #c7b898 100%);
  border: 1px solid rgba(162, 128, 68, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -18px 40px rgba(90, 62, 32, 0.1),
    inset 8px 0 24px rgba(90, 62, 32, 0.04),
    inset -8px 0 24px rgba(90, 62, 32, 0.04);
}

.map-backdrop,
.map-canvas {
  position: absolute;
  inset: 0;
}

.map-backdrop {
  pointer-events: none;
}

.fog-defs {
  position: absolute;
  pointer-events: none;
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(118, 84, 47, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(118, 84, 47, 0.08) 1px, transparent 1px);
  background-size: 58px 58px;
  opacity: 0.38;
}

.backdrop-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(14px);
}

.glow-a {
  inset: auto auto 12% 10%;
  width: 240px;
  height: 240px;
  background: rgba(250, 240, 215, 0.7);
}

.glow-b {
  inset: 10% 6% auto auto;
  width: 180px;
  height: 180px;
  background: rgba(228, 193, 123, 0.28);
}

.backdrop-ridge {
  position: absolute;
  border-radius: 999px;
  opacity: 0.28;
  background: linear-gradient(90deg, transparent, rgba(108, 76, 38, 0.55), transparent);
}

.ridge-a {
  left: -10%;
  right: 30%;
  bottom: 18%;
  height: 150px;
  transform: rotate(-8deg);
}

.ridge-b {
  left: 42%;
  right: -6%;
  top: 12%;
  height: 120px;
  transform: rotate(18deg);
}

.terrain {
  position: absolute;
  border-radius: 999px;
  opacity: 0.35;
  filter: blur(3px);
}

.terrain-a {
  left: 6%;
  top: 56%;
  width: 34%;
  height: 16%;
  background: linear-gradient(90deg, rgba(150, 118, 78, 0.2), rgba(108, 76, 42, 0.46), rgba(150, 118, 78, 0.18));
  transform: rotate(-7deg);
}

.terrain-b {
  left: 44%;
  top: 18%;
  width: 44%;
  height: 14%;
  background: linear-gradient(90deg, rgba(150, 118, 78, 0.12), rgba(108, 76, 42, 0.38), rgba(150, 118, 78, 0.12));
  transform: rotate(14deg);
}

.terrain-c {
  right: -6%;
  bottom: 12%;
  width: 38%;
  height: 18%;
  background: linear-gradient(90deg, rgba(150, 118, 78, 0.12), rgba(108, 76, 42, 0.34), rgba(150, 118, 78, 0.12));
  transform: rotate(-12deg);
}

.map-canvas {
  padding: 30px 34px;
}

.track-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.track-base,
.track-dash,
.track-active {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.track-base {
  stroke: rgba(112, 84, 54, 0.12);
  stroke-width: 8;
}

.track-dash {
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1.5;
  stroke-dasharray: 1.4 3.8;
}

.dash-flow {
  animation: dash-flow 12s linear infinite;
}

.track-active {
  stroke: rgba(214, 166, 65, 1);
  stroke-width: 5;
  filter: drop-shadow(0 0 18px rgba(214, 166, 65, 0.5));
}

.stage-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 156px;
  background: transparent;
  border: 0;
  padding: 0;
  z-index: 20;
}

.stage-node.is-obscured {
  z-index: 8;
}

.stage-node:disabled {
  cursor: default;
}

.stage-shadow {
  position: absolute;
  inset: 16px 28px auto;
  height: 34px;
  border-radius: 999px;
  background: rgba(68, 46, 27, 0.16);
  filter: blur(12px);
  transform: translateY(58px);
}

.stage-halo {
  position: absolute;
  inset: -26px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(239, 191, 78, 0.38) 0%, rgba(239, 191, 78, 0) 72%);
  animation: node-pulse 2.3s ease-in-out infinite;
}

.stage-orbit {
  position: absolute;
  inset: -8px;
  border-radius: 36px;
  border: 1px solid rgba(214, 166, 65, 0.14);
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
}

.stage-core {
  position: relative;
  display: flex;
  height: 94px;
  width: 94px;
  align-items: center;
  justify-content: center;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 253, 247, 0.98), rgba(250, 242, 225, 0.96));
  border: 1px solid rgba(204, 166, 98, 0.24);
  box-shadow: 0 18px 30px rgba(66, 46, 28, 0.16);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, opacity 0.24s ease;
}

.stage-node.is-active .stage-core {
  background: linear-gradient(180deg, rgba(245, 205, 104, 0.98), rgba(231, 179, 62, 0.95));
  border-color: rgba(185, 129, 22, 0.42);
  box-shadow: 0 20px 32px rgba(144, 98, 24, 0.22);
}

.stage-node.is-cleared .stage-core {
  background: linear-gradient(180deg, rgba(255, 251, 241, 0.98), rgba(240, 232, 214, 0.96));
}

.stage-node.is-selected:not(.is-obscured) .stage-core {
  transform: translateY(-2px);
  box-shadow: 0 22px 36px rgba(66, 46, 28, 0.18);
  border-color: rgba(160, 92, 42, 0.42);
}

.stage-node.is-locked .stage-core {
  background: linear-gradient(180deg, rgba(238, 233, 223, 0.96), rgba(221, 214, 203, 0.94));
  border-color: rgba(140, 127, 110, 0.18);
  box-shadow: 0 12px 22px rgba(66, 46, 28, 0.08);
}

.stage-node.is-obscured .stage-core {
  opacity: 0.32;
  filter: grayscale(0.3) blur(2px);
  transform: scale(0.9);
}

.stage-node.is-selectable:hover .stage-core {
  transform: translateY(-3px);
  box-shadow: 0 22px 34px rgba(66, 46, 28, 0.16);
}

.stage-order {
  position: absolute;
  left: 8px;
  top: 8px;
  display: inline-flex;
  min-width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(93, 64, 55, 0.14);
  font-size: 11px;
  font-weight: 900;
  color: #6d4d2f;
}

.stage-icon {
  font-size: 38px;
  color: #9c6827;
}

.stage-node.is-locked .stage-icon {
  color: rgba(110, 97, 80, 0.9);
}

.stage-label {
  min-width: 126px;
  max-width: 148px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  background: rgba(255, 253, 248, 0.92);
  padding: 9px 12px;
  text-align: center;
  box-shadow: 0 10px 24px rgba(66, 46, 28, 0.1);
  backdrop-filter: blur(8px);
  transition: opacity 0.24s ease;
}

.stage-node.is-obscured .stage-label {
  opacity: 0.4;
  filter: blur(1.5px);
  background: rgba(220, 210, 192, 0.6);
}

.stage-node.is-selected:not(.is-obscured) .stage-label {
  border-color: rgba(221, 181, 93, 0.34);
  background: rgba(255, 250, 239, 0.95);
}

.stage-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #2d241c;
  line-height: 1.4;
}

.stage-caption {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(93, 64, 55, 0.72);
}

.fog-cluster {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 28;
  mix-blend-mode: multiply;
}

.fog-edge-dissolve {
  position: absolute;
  inset: 0;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
}

.fog-layer {
  position: absolute;
  inset: -12%;
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 30%, rgba(220, 208, 186, 0.98), transparent 32%),
    radial-gradient(circle at 72% 40%, rgba(210, 196, 170, 0.96), transparent 38%),
    radial-gradient(circle at 44% 64%, rgba(196, 180, 156, 0.97), transparent 48%),
    radial-gradient(circle at 56% 32%, rgba(180, 164, 140, 0.6), transparent 56%);
  filter: url("#journey-fog-distort") blur(18px);
  opacity: 0.94;
}

.fog-sheen {
  position: absolute;
  inset: 6%;
  border-radius: 999px;
  background:
    conic-gradient(from 120deg at 40% 45%, rgba(220, 200, 160, 0.25), transparent 30%, rgba(200, 180, 150, 0.2), transparent 60%, rgba(210, 190, 160, 0.18), transparent),
    radial-gradient(circle at 50% 50%, rgba(230, 218, 196, 0.55), transparent 52%);
  filter: url("#journey-fog-soft");
  opacity: 0.92;
  animation: fog-swirl 40s linear infinite;
}

.fog-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(82, 64, 47, 0.2);
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(72, 51, 32, 0.78);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.layer-a {
  animation: fog-drift-a 16s linear infinite;
  opacity: 0.3;
}

.layer-b {
  inset: 8% 6% 4% 10%;
  opacity: 0.6;
  animation: fog-drift-b 22s ease-in-out infinite;
}

.layer-c {
  inset: 16% 10% 10% 18%;
  opacity: 0.5;
  filter: url("#journey-fog-distort") blur(12px);
  animation: fog-drift-c 28s ease-in-out infinite;
}

.layer-d {
  inset: 20% 12% 18% 8%;
  opacity: 0.4;
  filter: url("#journey-fog-distort") blur(20px);
  animation: fog-drift-d 34s ease-in-out infinite;
}

@keyframes fog-drift-a {
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-5%, 3%) scale(1.06); }
  66% { transform: translate(3%, -4%) scale(1.1); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes fog-drift-b {
  0% { transform: translate(0, 0) scale(1.02); }
  50% { transform: translate(4%, -5%) scale(1.1); }
  100% { transform: translate(0, 0) scale(1.02); }
}

@keyframes fog-drift-c {
  0% { transform: translate(0, 0) scale(0.98); }
  33% { transform: translate(3%, -2%) scale(1.04); }
  66% { transform: translate(-4%, 3%) scale(1.08); }
  100% { transform: translate(0, 0) scale(0.98); }
}

@keyframes fog-drift-d {
  0% { transform: translate(0, 0) scale(0.96); }
  50% { transform: translate(5%, 3%) scale(1.1); }
  100% { transform: translate(0, 0) scale(0.96); }
}

@keyframes fog-swirl {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes node-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.65; }
  50% { transform: scale(1.08); opacity: 1; }
}

/* ── Gold sparkle dots ── */
.sparkle-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(242, 199, 90, 0.8), transparent);
  pointer-events: none;
  animation: sparkle-twinkle 3s ease-in-out infinite;
}

.sparkle-1 { left: 18%; top: 22%; animation-delay: 0s; }
.sparkle-2 { left: 72%; top: 30%; animation-delay: 0.5s; }
.sparkle-3 { left: 38%; top: 68%; animation-delay: 1.1s; }
.sparkle-4 { left: 82%; top: 58%; animation-delay: 1.7s; }
.sparkle-5 { left: 55%; top: 16%; animation-delay: 2.3s; }
.sparkle-6 { left: 26%; top: 52%; animation-delay: 0.8s; }

@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* ── Connection line flowing dash ── */
@keyframes dash-flow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -60; }
}

/* ── Current node breathing glow ── */
.node-breathe {
  animation: node-breathe 2.5s ease-in-out infinite;
}

@keyframes node-breathe {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.4)); }
  50% { filter: drop-shadow(0 0 16px rgba(212, 175, 55, 0.7)); }
}

@media (max-width: 900px) {
  .map-canvas {
    padding: 24px 20px;
  }

  .stage-node {
    min-width: 136px;
    gap: 12px;
  }

  .stage-core {
    height: 82px;
    width: 82px;
  }

  .stage-icon {
    font-size: 34px;
  }

  .stage-label {
    min-width: 114px;
    max-width: 134px;
    padding: 8px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fog-layer,
  .fog-sheen,
  .stage-halo,
  .sparkle-dot,
  .node-breathe,
  .dash-flow,
  .fog-swirl {
    animation: none !important;
  }
}
</style>
