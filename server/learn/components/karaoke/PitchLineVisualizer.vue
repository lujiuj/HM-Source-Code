<template>
  <div class="pitch-line-visualizer" ref="containerRef" aria-hidden="true">
    <canvas ref="canvasRef" class="visualizer-canvas"></canvas>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { hzToMidiNumber } from '../../../shared/domain/pitch/pitchMath.js'
import { getExpectedPitchForLine } from '../../../shared/utils/scoreRef.js'

const props = defineProps({
  scoreRef: { type: Object, default: null },
  lineIndex: { type: Number, default: -1 },
  lineDurationMs: { type: Number, default: 2400 },
  lineText: { type: String, default: '' },
  relTimeMs: { type: Number, default: 0 },
  pitch: { type: Number, default: null },
  noteInfo: { type: Object, default: null },
  pitchTrail: { type: Array, default: () => [] },
  windowMs: { type: Number, default: 2000 },
  preRollMs: { type: Number, default: 900 },
  stepMs: { type: Number, default: 40 },
  hitLineRatio: { type: Number, default: 0.3 },
  noteStyle: { type: String, default: 'b' }
})

const containerRef = ref(null)
const canvasRef = ref(null)
const canvasCtx = ref(null)
let canvasDpr = 1

const ROW_H = 14.5
const VISUAL_PAD_Y = 34
const MIN_MIDI_VISIBLE_RANGE = 9.2

const NOTE_INACTIVE_FILL = 'rgba(212, 175, 55, 0.45)'
const NOTE_INACTIVE_STROKE = 'rgba(212, 175, 55, 0.6)'
const NOTE_ACTIVE_FILL = 'rgba(138, 46, 46, 0.95)'
const NOTE_ACTIVE_STROKE = 'rgba(138, 46, 46, 1)'
const NOTE_HELD_FILL = 'rgba(212, 175, 55, 0.85)'
const NOTE_HELD_STROKE = 'rgba(212, 175, 55, 1)'

const USER_DOT_IDLE_FILL = 'rgba(138, 46, 46, 1)'
const USER_DOT_IDLE_GLOW = 'rgba(138, 46, 46, 0.5)'
const USER_DOT_HIT_FILL = 'rgba(212, 175, 55, 1)'
const USER_DOT_HIT_GLOW = 'rgba(212, 175, 55, 0.8)'

const targetCenterMidi = ref(60)
const targetVisibleRange = ref(MIN_MIDI_VISIBLE_RANGE)
let smoothCenterMidi = 60
let smoothVisibleRange = MIN_MIDI_VISIBLE_RANGE
let lastLineKey = null

let smoothedCurrentY = null
const CURRENT_Y_ALPHA = 0.14

const hitSegmentExpiryMs = new Map()
const segmentFillProgress = new Map()
const segmentPlaybackProgress = new Map()
let smoothedUserMidi = null

// Hit-state smoothing
const HIT_ENTER_DIFF = 1.6
const HIT_EXIT_DIFF = 2.8
const HIT_HOLD_MS = 500
let hitHoldUntilMs = 0
let smoothedIsHit = false
let hitBlend = 0
let hitPulse = 0

const noteStyle = computed(() => {
  return 'b' // Always use premium style
})

const hitLineRatio = computed(() => {
  return 0.25 // Standard KTV feel (25% lead)
})

const startT = computed(() => {
  const t = props.relTimeMs || 0
  const windowMs = props.windowMs || 2000
  const lead = windowMs * hitLineRatio.value
  // Keep timeline moving from the very beginning; do not clamp to 0.
  return Math.floor(t - lead)
})

function updateCenterMidi() {
  const currentKey = `${props.lineIndex}_${props.lineText}`
  if (currentKey === lastLineKey) return
  lastLineKey = currentKey
  hitSegmentExpiryMs.clear()
  segmentFillProgress.clear()
  segmentPlaybackProgress.clear()

  if (props.scoreRef && props.lineIndex >= 0) {
    const duration = Math.max(1200, Math.min(9000, props.lineDurationMs || 2400))
    const step = 120
    const values = []
    for (let t = 0; t <= duration; t += step) {
      const hz = getExpectedPitchForLine(props.scoreRef, props.lineIndex, t)
      if (hz > 0) values.push(hzToMidiNumber(hz))
    }
    if (values.length) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      targetCenterMidi.value = Math.round(mean)
      targetVisibleRange.value = Math.max(MIN_MIDI_VISIBLE_RANGE, ((max - min) / 2) + 2.8)
      return
    }
  }

  targetCenterMidi.value = 60
  targetVisibleRange.value = MIN_MIDI_VISIBLE_RANGE
}

watch(() => [props.lineIndex, props.scoreRef, props.lineText], updateCenterMidi, { immediate: true })

let lineSegmentsCache = null
let lineSegmentsCacheKey = null

function getLineDurationMs() {
  const raw = Number.isFinite(props.lineDurationMs) ? props.lineDurationMs : 2400
  return Math.max(1200, Math.min(9000, raw))
}

function normalizeSegments(rawSegments, durationMs) {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) return []

  const sorted = [...rawSegments]
    .filter((seg) => Number.isFinite(seg?.startMs) && Number.isFinite(seg?.endMs) && Number.isFinite(seg?.midi))
    .sort((a, b) => a.startMs - b.startMs)

  if (!sorted.length) return []

  const merged = []
  for (const seg of sorted) {
    const startMs = Math.max(0, Math.min(durationMs, Math.round(seg.startMs)))
    const endMs = Math.max(startMs + 40, Math.min(durationMs, Math.round(seg.endMs)))
    const midi = Number(seg.midi)

    const prev = merged[merged.length - 1]
    if (prev) {
      const gap = startMs - prev.endMs
      const midiDiff = Math.abs(prev.midi - midi)
      if (gap <= 90 && midiDiff <= 0.9) {
        const prevLen = prev.endMs - prev.startMs
        const curLen = endMs - startMs
        const totalLen = prevLen + curLen
        prev.endMs = Math.max(prev.endMs, endMs)
        prev.midi = totalLen > 0
          ? ((prev.midi * prevLen) + (midi * curLen)) / totalLen
          : midi
        continue
      }
    }

    merged.push({ startMs, endMs, midi })
  }

  return merged
    .map((seg) => {
      const len = seg.endMs - seg.startMs
      if (len >= 136) return seg
      const expand = Math.floor((136 - len) / 2)
      return {
        ...seg,
        startMs: Math.max(0, seg.startMs - expand),
        endMs: Math.min(durationMs, seg.endMs + expand)
      }
    })
    .map((seg) => ({
      ...seg,
      midi: Math.round(seg.midi * 2) / 2
    }))
}

function getLineSegments() {
  if (props.lineIndex < 0) {
    lineSegmentsCache = []
    lineSegmentsCacheKey = null
    return lineSegmentsCache
  }

  const duration = getLineDurationMs()
  const key = `${props.lineIndex}_${props.lineText}_${duration}_${props.stepMs}_${props.scoreRef ? 'with-score-ref' : 'no-score-ref'}`
  if (lineSegmentsCache && lineSegmentsCacheKey === key) return lineSegmentsCache

  const segs = []
  const step = Math.max(70, props.stepMs || 70)

  if (!props.scoreRef) {
    const chars = Math.max(3, Math.min(10, props.lineText?.replace(/\s+/g, '').length || 4))
    const chunk = duration / chars
    const center = targetCenterMidi.value

    for (let i = 0; i < chars; i++) {
      const startMs = Math.round(i * chunk)
      const endMs = Math.round(Math.min(duration, startMs + chunk * 0.88))
      segs.push({ startMs, endMs, midi: center })
    }
  } else {
    const points = []
    for (let t = 0; t <= duration; t += step) {
      const hz = getExpectedPitchForLine(props.scoreRef, props.lineIndex, t)
      points.push({ t, midi: hz > 0 ? hzToMidiNumber(hz) : null })
    }

    let segStart = null
    let segMidi = null

    for (const p of points) {
      if (p.midi === null) {
        if (segStart !== null) {
          segs.push({ startMs: segStart, endMs: p.t, midi: segMidi })
          segStart = null
          segMidi = null
        }
        continue
      }

      if (segStart === null) {
        segStart = p.t
        segMidi = p.midi
      } else if (Math.abs(p.midi - segMidi) > 1.1) {
        segs.push({ startMs: segStart, endMs: p.t, midi: segMidi })
        segStart = p.t
        segMidi = p.midi
      }
    }

    if (segStart !== null) {
      segs.push({ startMs: segStart, endMs: duration, midi: segMidi })
    }
  }

  lineSegmentsCache = normalizeSegments(segs, duration)
  lineSegmentsCacheKey = key
  return lineSegmentsCache
}

function getVisibleSegments() {
  const viewStart = Math.max(0, startT.value - 260)
  const viewEnd = startT.value + (props.windowMs || 2000) + 260
  const segs = getLineSegments()
  const visible = segs.filter((seg) => seg.endMs >= viewStart && seg.startMs <= viewEnd)
  if (visible.length <= 84) return visible
  const stride = Math.ceil(visible.length / 84)
  return visible.filter((_, idx) => idx % stride === 0)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvasDpr = dpr

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }) || canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
  canvasCtx.value = ctx
}

function timeToX(t, width) {
  const start = startT.value
  const w = props.windowMs || 2000
  return ((t - start) / w) * width
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function midiToY(midi, height, barHeight = ROW_H) {
  const range = Math.max(MIN_MIDI_VISIBLE_RANGE, smoothVisibleRange)
  const padTop = VISUAL_PAD_Y + barHeight * 0.62
  const padBottom = VISUAL_PAD_Y + barHeight * 0.62
  const usable = Math.max(120, height - padTop - padBottom)
  const centerY = padTop + usable / 2
  const semitoneH = usable / (range * 2)
  const y = centerY + (smoothCenterMidi - midi) * semitoneH
  return clamp(y, padTop, height - padBottom)
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
    return
  }
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
}

function mixColor(from, to, t) {
  const tt = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(from.r + (to.r - from.r) * tt),
    g: Math.round(from.g + (to.g - from.g) * tt),
    b: Math.round(from.b + (to.b - from.b) * tt),
    a: from.a + (to.a - from.a) * tt
  }
}

function rgba(c) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a.toFixed(3)})`
}

let lastDrawTime = 0

function draw() {
  const nowTime = performance.now()
  // 60fps for silky-smooth animation
  if (nowTime - lastDrawTime < 16) return
  lastDrawTime = nowTime

  const canvas = canvasRef.value
  const ctx = canvasCtx.value
  if (!canvas || !ctx) return

  const width = canvas.width / canvasDpr
  const height = canvas.height / canvasDpr

  ctx.clearRect(0, 0, width, height)

  // Smooth center pitch without making the lane feel twitchy.
  const centerDiff = targetCenterMidi.value - smoothCenterMidi
  if (Math.abs(centerDiff) > 0.5) {
    smoothCenterMidi += centerDiff * 0.08
  } else if (Math.abs(centerDiff) > 0.01) {
    smoothCenterMidi += centerDiff * 0.025
  } else {
    smoothCenterMidi = targetCenterMidi.value
  }

  const rangeDiff = targetVisibleRange.value - smoothVisibleRange
  if (Math.abs(rangeDiff) > 0.28) {
    smoothVisibleRange += rangeDiff * 0.07
  } else if (Math.abs(rangeDiff) > 0.03) {
    smoothVisibleRange += rangeDiff * 0.03
  } else {
    smoothVisibleRange = targetVisibleRange.value
  }

  const now = props.relTimeMs || 0
  const nowX = Math.round(width * hitLineRatio.value)
  const currentTime = Date.now()

  // Hit state
  let userMidi = null
  let pitchDiff = null
  let expMidi = null
  if (props.pitch > 0 && props.scoreRef) {
    const expected = getExpectedPitchForLine(props.scoreRef, props.lineIndex, now)
    if (expected > 0) {
      expMidi = hzToMidiNumber(expected)
      userMidi = hzToMidiNumber(props.pitch)
      pitchDiff = Math.abs(userMidi - expMidi)
    }
  }

  const rawVisualHit = typeof pitchDiff === 'number' && pitchDiff < HIT_ENTER_DIFF
  if (rawVisualHit) hitHoldUntilMs = currentTime + HIT_HOLD_MS

  if (smoothedIsHit) {
    const canRelease = currentTime > hitHoldUntilMs
    const clearlyMiss = typeof pitchDiff === 'number' ? pitchDiff > HIT_EXIT_DIFF : true
    if (canRelease && clearlyMiss) smoothedIsHit = false
  } else {
    if (rawVisualHit) smoothedIsHit = true
  }
  
  const blendSpeed = smoothedIsHit ? 0.16 : 0.05
  hitBlend += ((smoothedIsHit ? 1 : 0) - hitBlend) * blendSpeed
  hitPulse += 0.1

    // Draw horizontal grid lines (subtle pitch markers) - ONLY OCTAVES for clarity
    const startMidi = Math.floor(smoothCenterMidi - smoothVisibleRange / 2)
    const endMidi = Math.ceil(smoothCenterMidi + smoothVisibleRange / 2)
    ctx.save()
    ctx.lineWidth = 0.5
    for (let m = startMidi; m <= endMidi; m++) {
      if (m % 12 !== 0) continue // Show octaves only or make others ultra-faint
      const gy = midiToY(m, height, ROW_H)
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(width, gy)
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)'
      ctx.stroke()
    }
    ctx.restore()

    // Target notes
    const segments = getVisibleSegments()
    for (const seg of segments) {
      if (seg.endMs < now - 200) continue

      const clippedStart = Math.max(seg.startMs, startT.value - 120)
      const clippedEnd = Math.min(seg.endMs, startT.value + (props.windowMs || 2000) + 120)
      if (clippedEnd <= clippedStart) continue

      const x = timeToX(clippedStart, width)
      const endX = timeToX(clippedEnd, width)
      const rawBarWidth = Math.max(noteStyle.value === 'b' ? 30 : 24, endX - x)
      const barWidth = Math.max(10, rawBarWidth - 7) // Keep clearer spacing between adjacent notes
      const barHeight = noteStyle.value === 'b' ? ROW_H - 1.6 : ROW_H - 2.2
      const y = midiToY(seg.midi, height, barHeight)

      const isOverlapping = now >= seg.startMs && now <= seg.endMs
      const segKey = `${seg.startMs}_${Math.round(seg.midi * 10)}`
      const segDuration = Math.max(120, seg.endMs - seg.startMs)
      const playbackProgress = clamp((now - seg.startMs) / segDuration, 0, 1)
      const previousFill = segmentFillProgress.get(segKey) || 0
      let filledProgress = previousFill

      const segExpire = hitSegmentExpiryMs.get(seg.startMs)
      const segIsHeld = typeof segExpire === 'number' && currentTime < segExpire

      if (isOverlapping && smoothedIsHit) {
        // 命中时按播放头推进填充，避免“整条瞬亮”
        hitSegmentExpiryMs.set(seg.startMs, currentTime + 280)
        filledProgress = Math.max(previousFill, Math.min(1, playbackProgress))
      } else if (segExpire && !segIsHeld && now > seg.endMs + 200) {
        hitSegmentExpiryMs.delete(seg.startMs)
      }
      segmentPlaybackProgress.set(segKey, playbackProgress)

      if (filledProgress > previousFill) {
        segmentFillProgress.set(segKey, filledProgress)
      } else if (filledProgress <= 0 && now > seg.endMs + 300) {
        segmentFillProgress.delete(segKey)
        segmentPlaybackProgress.delete(segKey)
      }

      const effectiveFill = segmentFillProgress.get(segKey) || filledProgress
      const strokeStyle = (effectiveFill > 0.02 || segIsHeld) ? NOTE_ACTIVE_STROKE : NOTE_INACTIVE_STROKE

      const rx = Math.round(x)
      const ry = Math.round(y - barHeight / 2)
      const rw = Math.round(barWidth)
      const rh = Math.round(barHeight)

      ctx.save()
      const radius = noteStyle.value === 'b' ? rh * 0.86 : rh * 0.6
      
      // Base bar: always visible (track)
      roundedRectPath(ctx, rx, ry, rw, rh, radius)
      ctx.fillStyle = NOTE_INACTIVE_FILL
    ctx.shadowBlur = 1.8
    ctx.shadowColor = 'rgba(93, 64, 55, 0.12)'
    ctx.fill()
    
    // Border for inactive bar to give it a "box" look
    ctx.strokeStyle = NOTE_INACTIVE_STROKE
    ctx.lineWidth = 0.6
    ctx.stroke()

    // Progressive active fill: follows playback + pitch hit state
    if (effectiveFill > 0.02) {
      const fillWidth = Math.max(4, Math.round(rw * clamp(effectiveFill, 0, 1)))
      roundedRectPath(ctx, rx, ry, fillWidth, rh, radius)
      const activeGradient = ctx.createLinearGradient(rx, ry, rx + rw, ry)
      activeGradient.addColorStop(0, 'rgba(160, 58, 58, 0.96)')
      activeGradient.addColorStop(0.42, 'rgba(138, 46, 46, 0.98)')
      activeGradient.addColorStop(1, 'rgba(212, 175, 55, 0.9)')
      ctx.fillStyle = activeGradient
      ctx.shadowBlur = segIsHeld || (isOverlapping && hitBlend > 0.18) ? (12 + hitBlend * 13) : 8
      ctx.shadowColor = segIsHeld
        ? 'rgba(160, 58, 58, 0.42)'
        : 'rgba(160, 58, 58, 0.58)'
      ctx.fill()
    }

    if (noteStyle.value === 'b') {
      ctx.save()
      roundedRectPath(ctx, rx + 1, ry + 1, Math.max(4, rw - 2), Math.max(2.8, rh * 0.36), Math.max(2, radius * 0.74))
      if (effectiveFill > 0.02) {
        const sheenWidth = Math.max(4, Math.round((rw - 2) * clamp(effectiveFill, 0, 1)))
        roundedRectPath(ctx, rx + 1, ry + 1, sheenWidth, Math.max(2.8, rh * 0.36), Math.max(2, radius * 0.74))
        ctx.fillStyle = `rgba(247, 244, 235, ${(0.22 + 0.34 * hitBlend).toFixed(3)})`
      } else {
        ctx.fillStyle = 'rgba(247, 244, 235, 0.12)'
      }
      ctx.fill()
      ctx.restore()
    }

    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = noteStyle.value === 'b' ? 0.82 : 1
    ctx.stroke()
    ctx.restore()

    // Keep this for pulse continuity when user continues to hit the phrase.
    if (isOverlapping && smoothedIsHit) {
      hitSegmentExpiryMs.set(seg.startMs, currentTime + 280)
    } else if (!segIsHeld && now > seg.endMs + 460) {
      hitSegmentExpiryMs.delete(seg.startMs)
      if (effectiveFill <= 0.02) {
        segmentFillProgress.delete(segKey)
        segmentPlaybackProgress.delete(segKey)
      }
    }

    // 让“命中头”跟随白点前进，体现拉长音过程。
    if (effectiveFill > 0.02 && rw > 10) {
      const tipX = rx + Math.round(rw * clamp(effectiveFill, 0, 1))
      const tipY = ry + rh / 2
      ctx.save()
      ctx.shadowBlur = 16
      ctx.shadowColor = 'rgba(160, 58, 58, 0.52)'
      ctx.fillStyle = 'rgba(247, 244, 235, 0.85)'
      ctx.beginPath()
      ctx.arc(tipX, tipY, Math.max(2.2, rh * 0.18), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // Single moving pitch dot (no secondary static dot)
  const hasUserPitch = props.pitch > 0

  if (hasUserPitch) {
    let userMidiRaw = hzToMidiNumber(props.pitch)
    // When hit, snap almost entirely to expected pitch so the dot
    // appears perfectly aligned with the note bar (95% snap)
    if (smoothedIsHit && expMidi !== null) {
      userMidiRaw = userMidiRaw * 0.05 + expMidi * 0.95
    }
    
    if (smoothedUserMidi === null) {
      smoothedUserMidi = userMidiRaw
    } else {
      // Lower tracking gain makes the pitch marker move more fluidly.
      const trackAlpha = smoothedIsHit ? 0.2 : 0.12
      smoothedUserMidi = smoothedUserMidi * (1 - trackAlpha) + userMidiRaw * trackAlpha
    }
  } else {
    smoothedUserMidi = null
  }

  // 白点代表“用户音高”。未检测到稳定人声时，不能跟随谱面中心/目标音高漂移；
  // 否则用户会误以为“没唱也在动”。这里在静音时冻结屏幕坐标，只在检测到人声时才更新。
  let targetY = null
  if (hasUserPitch) {
    let dotMidi = smoothedUserMidi ?? hzToMidiNumber(props.pitch)
    // When hit, lock the dot's Y to the exact note position
    if (smoothedIsHit && expMidi !== null && hitBlend > 0.2) {
      const snapStrength = Math.min(1, hitBlend * 1.2)
      dotMidi = dotMidi * (1 - snapStrength) + expMidi * snapStrength
    }
    targetY = midiToY(dotMidi, height, ROW_H)
  } else {
    targetY = Math.round(height * 0.5)
  }

  if (smoothedCurrentY === null) {
    smoothedCurrentY = targetY
  } else if (hasUserPitch) {
      const alpha = smoothedIsHit ? 0.24 : CURRENT_Y_ALPHA
    smoothedCurrentY = smoothedCurrentY * (1 - alpha) + targetY * alpha
  } else {
    smoothedCurrentY = smoothedCurrentY * 0.9 + targetY * 0.1
  }

  const pulse = 0.5 + 0.5 * Math.sin(hitPulse * 2.1)
  const dotMix = hasUserPitch ? Math.max(0, Math.min(1, hitBlend * 0.9)) : 0
  const outerRadius = 6.8 + dotMix * 2.4 + pulse * dotMix * 0.9
  const innerRadius = 2.8 + dotMix * 1.4
  const idleAlpha = hasUserPitch ? 1 : 0.6
  const dotColor = mixColor(
    { r: 255, g: 255, b: 255, a: idleAlpha },
    { r: 255, g: 80, b: 0, a: 1 },
    dotMix
  )

  ctx.save()
  ctx.shadowBlur = 18 + dotMix * 20
  ctx.shadowColor = dotMix > 0.08
    ? `rgba(255, 80, 0, ${(0.5 + dotMix * 0.4).toFixed(3)})`
    : USER_DOT_IDLE_GLOW
  ctx.fillStyle = rgba(dotColor)
  ctx.beginPath()
  ctx.arc(nowX, smoothedCurrentY, outerRadius, 0, Math.PI * 2)
  ctx.fill()
  // Bright ring outline for extra visibility
  ctx.strokeStyle = dotMix > 0.3
    ? `rgba(255, 200, 50, ${(0.6 + dotMix * 0.3).toFixed(3)})`
    : 'rgba(255, 255, 255, 0.7)'
  ctx.lineWidth = 1.6
  ctx.stroke()
  const innerAlpha = hasUserPitch ? 1 : 0.7
  ctx.fillStyle = `rgba(255, 255, 255, ${innerAlpha.toFixed(3)})`
  ctx.beginPath()
  ctx.arc(nowX, smoothedCurrentY, innerRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (!hasUserPitch) hitBlend *= 0.84
}

let rafId = null
let isActive = false

function startLoop() {
  if (isActive) return
  isActive = true
  const loop = () => {
    if (!isActive) return
    draw()
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

function stopLoop() {
  isActive = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
}

watch(() => props.relTimeMs, () => {
  if (!isActive) startLoop()
})

watch(
  () => [props.lineIndex, props.lineText, props.lineDurationMs, props.scoreRef, props.stepMs],
  () => {
    lineSegmentsCache = null
    lineSegmentsCacheKey = null
    hitSegmentExpiryMs.clear()
    segmentFillProgress.clear()
    segmentPlaybackProgress.clear()
    hitHoldUntilMs = 0
    smoothedIsHit = false
    hitBlend = 0
    smoothedUserMidi = null
    smoothedCurrentY = null
  },
  { deep: false }
)

function handleResize() {
  resizeCanvas()
  draw()
}

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    startLoop()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="less">
.pitch-line-visualizer {
  position: relative;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(to bottom, rgba(247, 244, 235, 0.1), rgba(212, 175, 55, 0.1));
  contain: layout paint size;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.visualizer-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  will-change: transform;
}
</style>
