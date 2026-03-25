<script setup>
import { computed } from 'vue'

const props = defineProps({
  dimensions: { type: Array, default: () => [] },
  comparisonDimensions: { type: Array, default: () => [] },
  score: { type: Number, default: 0 },
  title: { type: String, default: '六维评估' },
  subtitle: { type: String, default: '多维结构分析' },
  primaryLegend: { type: String, default: '当前表现' },
  comparisonLegend: { type: String, default: '参考轮廓' },
  size: { type: Number, default: 360 }
})

function clampNumber(value, min = 0, max = 100) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.round(number)))
}

function toDimensionMap(list = []) {
  const map = new Map()
  ;(Array.isArray(list) ? list : []).slice(0, 6).forEach((item, index) => {
    map.set(String(item?.key || `dimension-${index}`), {
      key: item?.key || `dimension-${index}`,
      label: String(item?.label || `维度 ${index + 1}`),
      value: clampNumber(item?.value, 0, 100)
    })
  })
  return map
}

const normalizedDimensions = computed(() => {
  return Array.from(toDimensionMap(props.dimensions).values())
})

const normalizedComparison = computed(() => {
  const comparisonMap = toDimensionMap(props.comparisonDimensions)
  return normalizedDimensions.value.map((item, index) => {
    const matched = comparisonMap.get(item.key) || Array.from(comparisonMap.values())[index]
    return {
      key: item.key,
      label: item.label,
      value: clampNumber(matched?.value, 0, 100)
    }
  })
})

const hasComparison = computed(() => normalizedComparison.value.some((item) => Number(item?.value || 0) > 0))
const center = computed(() => Number(props.size || 360) / 2)
const radarRadius = computed(() => center.value * 0.56)
const labelRadius = computed(() => center.value * 0.82)

function pointAt(index, ratio = 1) {
  const length = radarRadius.value * ratio
  const angle = (-90 + index * 60) * (Math.PI / 180)
  return {
    x: center.value + Math.cos(angle) * length,
    y: center.value + Math.sin(angle) * length
  }
}

function labelPointAt(index) {
  const angle = (-90 + index * 60) * (Math.PI / 180)
  return {
    x: center.value + Math.cos(angle) * labelRadius.value,
    y: center.value + Math.sin(angle) * labelRadius.value
  }
}

const gridLevels = computed(() => [0.25, 0.5, 0.75, 1].map((level) => ({
  level,
  points: normalizedDimensions.value
    .map((_, index) => pointAt(index, level))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
})))

const axes = computed(() => normalizedDimensions.value.map((_, index) => ({
  key: `axis-${index}`,
  ...pointAt(index, 1)
})))

function polygonFrom(list = []) {
  return list
    .map((item, index) => pointAt(index, Number(item?.value || 0) / 100))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
}

const primaryPolygonPoints = computed(() => polygonFrom(normalizedDimensions.value))
const comparisonPolygonPoints = computed(() => polygonFrom(normalizedComparison.value))
const labelPoints = computed(() => normalizedDimensions.value.map((item, index) => ({
  ...item,
  ...labelPointAt(index)
})))
const displayScore = computed(() => clampNumber(props.score, 0, 100))
</script>

<template>
  <div class="six-radar" :style="{ '--radar-size': `${size}px` }">
    <div class="six-radar__meta">
      <p class="six-radar__subtitle">{{ subtitle }}</p>
      <h3 class="six-radar__title">{{ title }}</h3>
    </div>

    <div class="six-radar__canvas">
      <svg class="six-radar__svg" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
        <defs>
          <linearGradient id="six-radar-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(163, 65, 53, 0.38)" />
            <stop offset="100%" stop-color="rgba(212, 175, 55, 0.16)" />
          </linearGradient>
          <linearGradient id="six-radar-comparison" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(25, 86, 126, 0.16)" />
            <stop offset="100%" stop-color="rgba(71, 136, 178, 0.05)" />
          </linearGradient>
        </defs>

        <polygon
          v-for="item in gridLevels"
          :key="`grid-${item.level}`"
          class="six-radar__grid"
          :points="item.points"
        />
        <line
          v-for="axis in axes"
          :key="axis.key"
          class="six-radar__axis"
          :x1="center"
          :y1="center"
          :x2="axis.x"
          :y2="axis.y"
        />
        <polygon
          v-if="hasComparison"
          class="six-radar__comparison-fill"
          :points="comparisonPolygonPoints"
        />
        <polyline
          v-if="hasComparison"
          class="six-radar__comparison-stroke"
          :points="comparisonPolygonPoints"
        />
        <polygon class="six-radar__fill" :points="primaryPolygonPoints" />
        <polyline class="six-radar__stroke" :points="primaryPolygonPoints" />
        <circle class="six-radar__center" :cx="center" :cy="center" r="6" />
      </svg>

      <div class="six-radar__score">
        <span class="six-radar__score-number">{{ displayScore }}</span>
        <span class="six-radar__score-label">综合分</span>
      </div>

      <div
        v-for="item in labelPoints"
        :key="item.key"
        class="six-radar__label"
        :style="{ left: `${item.x}px`, top: `${item.y}px` }"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.value }}</span>
      </div>
    </div>

    <div class="six-radar__legend">
      <span class="six-radar__legend-item">
        <i class="is-primary"></i>{{ primaryLegend }}
      </span>
      <span v-if="hasComparison" class="six-radar__legend-item">
        <i class="is-comparison"></i>{{ comparisonLegend }}
      </span>
    </div>
  </div>
</template>

<script>
export default { name: 'SixDimensionRadar' }
</script>

<style scoped lang="less">
.six-radar {
  display: grid;
  gap: 1rem;
}

.six-radar__meta {
  text-align: center;
}

.six-radar__subtitle {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: rgba(115, 109, 97, 0.72);
}

.six-radar__title {
  margin-top: 0.35rem;
  font-size: 1.12rem;
  font-weight: 700;
  color: #2b2622;
}

.six-radar__canvas {
  position: relative;
  width: min(100%, var(--radar-size));
  aspect-ratio: 1;
  margin: 0 auto;
}

.six-radar__svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 24px 40px rgba(92, 59, 35, 0.12));
}

.six-radar__grid,
.six-radar__axis {
  fill: none;
  stroke: rgba(115, 109, 97, 0.18);
  stroke-width: 1;
}

.six-radar__comparison-fill {
  fill: url(#six-radar-comparison);
}

.six-radar__comparison-stroke {
  fill: none;
  stroke: rgba(35, 101, 141, 0.72);
  stroke-width: 2;
  stroke-dasharray: 8 6;
  stroke-linejoin: round;
}

.six-radar__fill {
  fill: url(#six-radar-fill);
}

.six-radar__stroke {
  fill: none;
  stroke: rgba(163, 65, 53, 0.92);
  stroke-width: 2.4;
  stroke-linejoin: round;
}

.six-radar__center {
  fill: #a34135;
}

.six-radar__score {
  position: absolute;
  inset: 50% auto auto 50%;
  display: flex;
  width: 96px;
  height: 96px;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.1rem;
  border-radius: 999px;
  border: 1px solid rgba(163, 65, 53, 0.18);
  background: linear-gradient(180deg, rgba(255, 249, 241, 0.96), rgba(249, 238, 222, 0.92));
  box-shadow: 0 16px 28px rgba(92, 59, 35, 0.12);
  backdrop-filter: blur(16px);
}

.six-radar__score-number {
  font-size: 2rem;
  font-weight: 800;
  color: #a34135;
  line-height: 1;
}

.six-radar__score-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(115, 109, 97, 0.78);
}

.six-radar__label {
  position: absolute;
  min-width: 74px;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.six-radar__label strong,
.six-radar__label span {
  display: block;
}

.six-radar__label strong {
  font-size: 12px;
  font-weight: 700;
  color: #2b2622;
}

.six-radar__label span {
  margin-top: 0.2rem;
  font-size: 11px;
  font-weight: 700;
  color: rgba(163, 65, 53, 0.9);
}

.six-radar__legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.85rem 1.2rem;
}

.six-radar__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 12px;
  font-weight: 700;
  color: #6f655d;
}

.six-radar__legend-item i {
  display: inline-flex;
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.six-radar__legend-item .is-primary {
  background: linear-gradient(135deg, #a34135, #d4af37);
}

.six-radar__legend-item .is-comparison {
  background: rgba(35, 101, 141, 0.72);
}

@media (max-width: 768px) {
  .six-radar__score {
    width: 82px;
    height: 82px;
  }

  .six-radar__score-number {
    font-size: 1.65rem;
  }

  .six-radar__label {
    min-width: 64px;
  }

  .six-radar__label strong {
    font-size: 11px;
  }

  .six-radar__label span {
    font-size: 10px;
  }
}
</style>
