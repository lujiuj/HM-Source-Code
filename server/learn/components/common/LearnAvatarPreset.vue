<script setup>
import { computed } from 'vue'
import { avatarPresetById } from '../../../shared/infra/profileUtils.js'

const props = defineProps({
  value: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: Number, default: 42 },
  framed: { type: Boolean, default: false }
})

const avatarUid = Math.random().toString(36).slice(2, 10)
const gradientId = `learn-avatar-gradient-${avatarUid}`
const haloId = `learn-avatar-halo-${avatarUid}`

const preset = computed(() => avatarPresetById(props.value))
const initial = computed(() => {
  const text = String(props.name || '').trim()
  return text.slice(0, 1) || '戏'
})

const rootStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  '--avatar-ring': preset.value.ring,
  '--avatar-shadow': preset.value.shadow || 'rgba(61, 42, 28, 0.16)'
}))

const badgeScale = computed(() => (props.size >= 64 ? 1 : props.size >= 48 ? 0.92 : 0.82))
</script>

<template>
  <div class="learn-avatar" :class="{ 'is-framed': framed }" :style="rootStyle">
    <svg class="learn-avatar-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="gradientId" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" :stop-color="preset.bgStart" />
          <stop offset="100%" :stop-color="preset.bgEnd" />
        </linearGradient>
        <radialGradient :id="haloId" cx="50%" cy="32%" r="52%">
          <stop offset="0%" :stop-color="preset.glow" stop-opacity="0.9" />
          <stop offset="100%" :stop-color="preset.glow" stop-opacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="49" :fill="`url(#${gradientId})`" />
      <circle cx="50" cy="34" r="28" :fill="`url(#${haloId})`" />
      <circle cx="50" cy="50" r="47.5" fill="none" :stroke="preset.ring" stroke-width="2" opacity="0.78" />

      <g opacity="0.22" :fill="preset.pattern">
        <circle cx="22" cy="24" r="5" />
        <circle cx="81" cy="18" r="3.6" />
        <circle cx="77" cy="34" r="2.8" />
        <path d="M16 68 C 28 58, 40 58, 48 68 C 36 72, 24 74, 16 68 Z" />
        <path d="M62 18 C 70 10, 84 11, 89 23 C 79 25, 69 24, 62 18 Z" />
      </g>

      <path d="M18 96 C 26 72, 40 60, 50 60 C 60 60, 74 72, 82 96 Z" :fill="preset.outerRobe" />
      <path d="M28 96 C 31 76, 41 65, 50 65 C 59 65, 69 76, 72 96 Z" :fill="preset.innerRobe" />
      <path d="M37 74 L 50 62 L 63 74 L 57 96 L 43 96 Z" :fill="preset.collar" opacity="0.92" />

      <circle cx="50" cy="43" r="15.5" :fill="preset.skin" />
      <path :d="preset.hairPath" :fill="preset.hair" />
      <path :d="preset.fringePath" :fill="preset.hairShade" />

      <g :fill="preset.hair">
        <circle v-if="preset.bun === 'double'" cx="34" cy="30" r="5.8" />
        <circle v-if="preset.bun === 'double'" cx="66" cy="30" r="5.8" />
        <circle v-if="preset.bun === 'single'" cx="50" cy="24" r="8.2" />
      </g>

      <g :fill="preset.ornament">
        <template v-if="preset.ornamentType === 'pearl'">
          <circle cx="50" cy="23" r="4" />
          <circle cx="38" cy="28" r="2.3" />
          <circle cx="62" cy="28" r="2.3" />
        </template>
        <template v-else-if="preset.ornamentType === 'fan'">
          <path d="M36 28 C 44 16, 56 16, 64 28 C 55 31, 45 31, 36 28 Z" />
          <rect x="48" y="28" width="4" height="9" rx="2" />
        </template>
        <template v-else-if="preset.ornamentType === 'plum'">
          <circle cx="50" cy="23.5" r="2.5" />
          <circle cx="45.5" cy="25.5" r="2.5" />
          <circle cx="54.5" cy="25.5" r="2.5" />
          <circle cx="47.2" cy="20.2" r="2.5" />
          <circle cx="52.8" cy="20.2" r="2.5" />
        </template>
        <template v-else-if="preset.ornamentType === 'ribbon'">
          <path d="M39 23 L 50 17 L 61 23 L 58 31 L 50 27 L 42 31 Z" />
          <path d="M43 29 L 39 37 L 46 34 Z" />
          <path d="M57 29 L 61 37 L 54 34 Z" />
        </template>
        <template v-else-if="preset.ornamentType === 'moon'">
          <path d="M56 18 C 50 18, 45 23, 45 29 C 45 35, 50 40, 56 40 C 52 36, 50 32, 50 29 C 50 26, 52 22, 56 18 Z" />
        </template>
        <template v-else>
          <path d="M50 17 L 57 27 L 50 32 L 43 27 Z" />
          <circle cx="50" cy="22" r="2.4" :fill="preset.pattern" />
        </template>
      </g>

      <g :fill="preset.pattern" opacity="0.92">
        <template v-if="preset.motif === 'petal'">
          <path d="M18 73 C 22 67, 28 66, 32 73 C 28 76, 22 76, 18 73 Z" />
          <path d="M68 79 C 73 72, 80 72, 84 79 C 79 82, 72 82, 68 79 Z" />
        </template>
        <template v-else-if="preset.motif === 'cloud'">
          <path d="M18 77 C 22 69, 32 69, 36 77 C 33 83, 22 84, 18 77 Z" />
          <path d="M66 72 C 72 66, 82 67, 85 74 C 81 79, 71 79, 66 72 Z" />
        </template>
        <template v-else-if="preset.motif === 'wave'">
          <path d="M16 77 C 22 72, 28 72, 34 77 C 28 82, 22 82, 16 77 Z" />
          <path d="M64 78 C 70 73, 77 73, 84 78 C 77 83, 70 83, 64 78 Z" />
        </template>
        <template v-else-if="preset.motif === 'lotus'">
          <path d="M50 86 L 43 78 L 47 72 L 50 76 L 53 72 L 57 78 Z" />
        </template>
        <template v-else-if="preset.motif === 'lantern'">
          <path d="M22 76 L 26 68 L 34 68 L 38 76 L 30 84 Z" />
        </template>
      </g>
    </svg>

    <div class="avatar-initial" :style="{ transform: `scale(${badgeScale})` }">
      {{ initial }}
    </div>
  </div>
</template>

<style scoped>
.learn-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 250, 240, 0.92);
  box-shadow: 0 12px 24px -16px var(--avatar-shadow);
}

.learn-avatar.is-framed {
  box-shadow:
    0 12px 24px -16px var(--avatar-shadow),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.learn-avatar::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  pointer-events: none;
}

.learn-avatar-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.avatar-initial {
  position: absolute;
  right: 5%;
  bottom: 5%;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 252, 246, 0.9);
  border: 1px solid rgba(115, 84, 50, 0.16);
  color: rgba(93, 64, 55, 0.92);
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 6px 14px -10px rgba(37, 31, 24, 0.45);
  transform-origin: bottom right;
  pointer-events: none;
}
</style>
