<template>
  <div class="gift-overlay pointer-events-none absolute inset-0 overflow-hidden">
    <div
      v-for="burst in bursts"
      :key="burst.id"
      class="burst-layer"
      :class="[
        `burst-${burst.type}`,
        { 'burst-mega': burst.mega, 'burst-big': burst.big && !burst.mega }
      ]"
    >
      <!-- Main particles from bottom-right -->
      <span
        v-for="(particle, index) in particleCount(burst.count)"
        :key="`${burst.id}:${index}`"
        class="burst-particle material-symbols-outlined"
        :style="particleStyle(index, burst.count)"
      >
        {{ iconName(burst.type) }}
      </span>

      <!-- Mega: corner particles from all 4 corners -->
      <template v-if="burst.mega">
        <span
          v-for="(_, ci) in 4"
          :key="`${burst.id}:corner:${ci}`"
          class="burst-corner material-symbols-outlined"
          :style="{ '--corner': ci }"
        >{{ iconName(burst.type) }}</span>
      </template>

      <!-- Counter badge -->
      <div class="burst-counter" :class="{ large: burst.count >= 9, mega: burst.mega }">
        <span class="material-symbols-outlined text-[18px]">{{ iconName(burst.type) }}</span>
        <strong>x{{ burst.count }}</strong>
      </div>

      <!-- Banner -->
      <div class="burst-banner" :class="{ 'banner-mega': burst.mega, 'banner-big': burst.big && !burst.mega }">
        <span class="material-symbols-outlined text-[18px]">{{ iconName(burst.type) }}</span>
        <strong>{{ burst.label || giftLabel(burst.type) }}</strong>
        <span>x{{ burst.count }}</span>
      </div>

      <!-- Combo indicator -->
      <div v-if="burst.combo >= 2" class="burst-combo">
        <strong>{{ burst.combo }}连击</strong>
      </div>

      <!-- Primary ring -->
      <span class="burst-ring" :class="{ 'ring-big': burst.big }"></span>
      <!-- Second ring for big/mega -->
      <span v-if="burst.big" class="burst-ring burst-ring-outer"></span>

      <!-- Flash overlay for 5+ combo or big amounts -->
      <div v-if="burst.combo >= 5 || burst.mega" class="burst-flash"></div>

      <!-- Screen shake trigger for 10+ combo -->
      <div v-if="burst.combo >= 10" class="burst-shake-zone"></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  bursts: {
    type: Array,
    default: () => []
  }
})

function iconName(type) {
  if (type === 'flower') return 'local_florist'
  if (type === 'tea') return 'emoji_food_beverage'
  return 'celebration'
}

function giftLabel(type) {
  if (type === 'flower') return '鲜花'
  if (type === 'tea') return '敬茶'
  return '喝彩'
}

function particleCount(count) {
  const total = Number(count || 1)
  if (total <= 1) return Array.from({ length: 1 }, (_, index) => index)
  if (total <= 9) return Array.from({ length: total }, (_, index) => index)
  if (total >= 50) return Array.from({ length: 18 }, (_, index) => index)
  return Array.from({ length: 12 }, (_, index) => index)
}

function particleStyle(index, count) {
  const spread = count >= 50 ? 52 : count <= 9 ? 28 : 44
  const offset = (index - 4) * spread
  const delay = `${Math.min(index * 0.08, 0.64)}s`
  const scale = count >= 99 ? 1.28 : count >= 50 ? 1.2 : count >= 9 ? 1.08 : 1
  return {
    '--offset-x': `${offset}px`,
    '--delay': delay,
    '--scale': scale
  }
}
</script>

<style scoped lang="less">
.gift-overlay {
  z-index: 35;
}

.burst-layer {
  position: absolute;
  inset: 0;
}

/* ── Main particles ── */
.burst-particle {
  position: absolute;
  bottom: 52px;
  right: calc(12% + var(--offset-x));
  display: inline-flex;
  font-size: 38px;
  opacity: 0;
  transform: translate3d(0, 0, 0) scale(var(--scale));
  animation: burst-rise 2s var(--delay) cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.burst-mega .burst-particle {
  font-size: 46px;
  animation-duration: 3.2s;
}

/* ── Corner particles (mega only) ── */
.burst-corner {
  position: absolute;
  font-size: 32px;
  opacity: 0;
  animation: corner-burst 2.8s ease-out forwards;
}
.burst-corner[style*="--corner: 0"] { top: 10%; left: 8%; }
.burst-corner[style*="--corner: 1"] { top: 10%; right: 8%; animation-delay: 0.08s; }
.burst-corner[style*="--corner: 2"] { bottom: 16%; left: 8%; animation-delay: 0.16s; }
.burst-corner[style*="--corner: 3"] { bottom: 16%; right: 8%; animation-delay: 0.24s; }

/* ── Counter badge ── */
.burst-counter {
  position: absolute;
  right: 16%;
  bottom: 18%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  padding: 10px 16px;
  color: var(--gift-counter-color, #7b4931);
  box-shadow: 0 18px 32px rgba(45, 32, 22, 0.18);
  opacity: 0;
  animation: counter-pop 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  strong {
    font-size: 24px;
    font-weight: 900;
  }

  &.large strong {
    font-size: 30px;
  }

  &.mega {
    padding: 14px 22px;
    box-shadow: 0 24px 48px rgba(45, 32, 22, 0.28);

    strong {
      font-size: 38px;
    }
  }
}

/* ── Banner ── */
.burst-banner {
  position: absolute;
  left: 50%;
  top: 28%;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transform: translate(-50%, 12px) scale(0.92);
  border-radius: 999px;
  background: rgba(30, 20, 12, 0.85);
  padding: 12px 18px;
  color: #fff5dd;
  box-shadow: 0 20px 48px rgba(19, 14, 10, 0.28);
  opacity: 0;
  animation: banner-pop 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  strong {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  span:last-child {
    font-size: 14px;
    font-weight: 800;
    color: #ffd77b;
  }

  &.banner-big {
    padding: 16px 26px;
    strong { font-size: 20px; }
    span:last-child { font-size: 18px; }
  }

  &.banner-mega {
    padding: 20px 36px;
    background: linear-gradient(135deg, rgba(30, 20, 12, 0.92), rgba(60, 36, 14, 0.92));
    box-shadow:
      0 24px 60px rgba(19, 14, 10, 0.38),
      0 0 40px rgba(212, 175, 55, 0.2);
    animation: banner-pop-mega 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;

    strong {
      font-size: 26px;
      text-shadow: 0 0 20px rgba(242, 199, 90, 0.8);
    }
    span:last-child {
      font-size: 22px;
      text-shadow: 0 0 12px rgba(242, 199, 90, 0.5);
    }
  }
}

/* ── Combo indicator ── */
.burst-combo {
  position: absolute;
  right: 16%;
  bottom: 28%;
  opacity: 0;
  animation: combo-pop 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  strong {
    display: inline-block;
    font-size: 18px;
    font-weight: 900;
    color: #f2c75a;
    text-shadow:
      0 0 12px rgba(242, 199, 90, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.4);
    letter-spacing: 0.08em;
  }
}

/* ── Ring ── */
.burst-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  height: 18px;
  width: 18px;
  border-radius: 999px;
  border: 4px solid rgba(212, 175, 55, 0.5);
  opacity: 0;
  animation: burst-ring 1.2s ease-out forwards;
}

.burst-ring.ring-big {
  animation: burst-ring-big 1.6s ease-out forwards;
}

.burst-ring-outer {
  animation: burst-ring-outer 1.8s 0.15s ease-out forwards !important;
  border-color: rgba(242, 199, 90, 0.3);
  border-width: 2px;
}

/* ── Flash overlay ── */
.burst-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(242, 199, 90, 0.25) 0%, transparent 70%);
  opacity: 0;
  animation: flash-pulse 0.4s ease-out forwards;
}

.burst-mega .burst-flash {
  background: radial-gradient(ellipse at center, rgba(242, 199, 90, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation-duration: 0.6s;
}

/* ── Screen shake trigger ── */
.burst-shake-zone {
  position: absolute;
  inset: 0;
  animation: screen-shake 0.15s ease-in-out 3;
}

/* ── Type colors ── */
.burst-flower {
  .burst-particle,
  .burst-counter,
  .burst-corner {
    color: #b84a5a;
  }
}

.burst-tea {
  .burst-particle,
  .burst-counter,
  .burst-corner {
    color: #8a5a2b;
  }
}

.burst-cheer {
  .burst-particle,
  .burst-counter,
  .burst-corner {
    color: #b58112;
  }
}

/* ── Keyframes ── */
@keyframes burst-rise {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.65);
  }
  18% {
    opacity: 1;
  }
  70% {
    opacity: 1;
    transform: translate3d(calc((var(--offset-x) * -0.34) - 180px), -270px, 0) scale(calc(var(--scale) + 0.12));
  }
  100% {
    opacity: 0;
    transform: translate3d(calc((var(--offset-x) * -0.42) - 220px), -340px, 0) scale(calc(var(--scale) + 0.18));
  }
}

@keyframes counter-pop {
  0% {
    opacity: 0;
    transform: translateY(14px) scale(0.88);
  }
  20%, 70% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-180px, -70px) scale(1.06);
  }
}

@keyframes banner-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, 24px) scale(0.88);
  }
  18%, 72% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -18px) scale(1.04);
  }
}

@keyframes banner-pop-mega {
  0% {
    opacity: 0;
    transform: translate(-50%, 30px) scale(0.8);
  }
  12% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1.06);
  }
  18% {
    transform: translate(-50%, 0) scale(1);
  }
  78% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -24px) scale(1.06);
  }
}

@keyframes burst-ring {
  0% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(24);
  }
}

@keyframes burst-ring-big {
  0% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(30);
  }
}

@keyframes burst-ring-outer {
  0% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(36);
  }
}

@keyframes corner-burst {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  15% {
    opacity: 1;
    transform: scale(1.2);
  }
  30% {
    transform: scale(1);
  }
  75% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: scale(0.6) translateY(-30px);
  }
}

@keyframes combo-pop {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(10px);
  }
  20% {
    opacity: 1;
    transform: scale(1.15);
  }
  35% {
    transform: scale(1);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes flash-pulse {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes screen-shake {
  0%, 100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-2px, 1px);
  }
  50% {
    transform: translate(2px, -1px);
  }
  75% {
    transform: translate(-1px, 2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .burst-particle,
  .burst-corner,
  .burst-counter,
  .burst-banner,
  .burst-ring,
  .burst-combo,
  .burst-flash,
  .burst-shake-zone {
    animation: none !important;
  }
}
</style>
