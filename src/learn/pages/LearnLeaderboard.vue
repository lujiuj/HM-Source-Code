<template>
  <div class="leaderboard-page min-h-full font-display text-slate-900">
    <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
      <header class="page-banner flex flex-col justify-between gap-6 lg:flex-row lg:items-end" :style="{ '--leaderboard-banner': `url(${communityVisuals.spotlightImage})` }">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="seal-title text-4xl shufa text-[#a34135]">同曲排行</h2>
          </div>
          <p class="mt-2 text-sm font-serif tracking-wide text-[#736D61]/70">看看谁唱得最好，和戏友们一较高下。</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative min-w-[260px]">
            <select
              v-model="songId"
              class="w-full appearance-none rounded-xl border border-[rgba(180,140,94,0.24)] bg-[linear-gradient(180deg,rgba(255,250,243,0.92),rgba(246,233,214,0.82))] px-4 py-3 text-sm outline-none shadow-[0_10px_24px_rgba(92,59,35,0.05)] transition-all focus:border-[#a34135] focus:ring-1 focus:ring-[#a34135]/30"
            >
              <option v-for="song in selectableSongs" :key="song.id" :value="song.id">
                {{ song.operaName }} · {{ song.excerptName }}
              </option>
            </select>
            <span class="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-lg text-[#736D61]/40">expand_more</span>
          </div>

          <div class="flex items-center gap-2 rounded-xl border border-[#a34135]/20 bg-[#a34135]/10 px-5 py-2.5 text-xs font-bold text-[#a34135]">
            <span class="material-symbols-outlined text-sm">edit</span>
            <input
              v-model="displayName"
              maxlength="12"
              class="w-[108px] bg-transparent text-sm font-bold placeholder:opacity-60 outline-none"
              placeholder="榜单昵称"
              @blur="saveDisplayName"
              @keyup.enter="saveDisplayName"
            />
          </div>
        </div>
      </header>

      <section v-if="selectedSong" class="flex items-center gap-5 rounded-2xl border border-[rgba(255,245,232,0.78)] bg-[linear-gradient(180deg,rgba(255,249,239,0.88),rgba(243,232,214,0.8))] px-6 py-4 shadow-[0_18px_48px_rgba(92,59,35,0.08)] backdrop-blur-xl">
        <img
          :src="selectedSong.galleryCover || selectedSong.cover || selectedSong.bannerImage"
          :alt="selectedSong.title"
          class="h-16 w-16 rounded-xl object-cover shadow-sm"
          :style="{ objectPosition: selectedSong.objectPosition || 'center center' }"
        />
        <div class="min-w-0 flex-1">
          <h3 class="text-lg font-bold text-slate-900 truncate">{{ selectedSong.title }}</h3>
          <p class="mt-0.5 text-sm text-[#736D61]">{{ selectedSong.singer }} · {{ selectedSong.type }}</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="tag in (selectedSong.tags || []).slice(0, 3)" :key="tag" class="rounded-full border border-[#a34135]/10 bg-[#a34135]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#a34135]">{{ tag }}</span>
        </div>
      </section>

      <div class="relative z-10 w-full">
        <Leaderboard
          v-if="songId"
          :song-id="songId"
          :song-title="songTitle"
          :limit="50"
          :show-podium="true"
          :fallback-works="fallbackWorks"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import Leaderboard from '../components/karaoke/Leaderboard.vue'
import { useDisplayName } from '../composables/useDisplayName.js'
import { resolveDemoWorksBySongId } from '../utils/learnDemoResolvers.js'
import { getLearnSongs } from '../utils/learnCatalog.js'
import { getCommunityVisuals } from '../utils/learnVisuals.js'

const infra = getInfra()
const route = useRoute()
const communityVisuals = getCommunityVisuals()

const selectableSongs = computed(() => getLearnSongs())
const defaultSong = computed(() => selectableSongs.value[0] || null)

const initialSongId = (() => {
  const fromQuery = String(route.query.songId || '')
  if (fromQuery && getLearnSongs().some((song) => song.id === fromQuery)) return fromQuery
  return getLearnSongs()[0]?.id || ''
})()

const songId = ref(initialSongId)
const { displayName, loadDisplayName, saveDisplayName } = useDisplayName({ identity: infra.identity })
loadDisplayName({ ensureFallback: true, silent: true })

const selectedSong = computed(() => {
  return selectableSongs.value.find((item) => item.id === songId.value) || defaultSong.value || null
})

const songTitle = computed(() => {
  if (!selectedSong.value) return ''
  return `${selectedSong.value.operaName}·${selectedSong.value.excerptName}`
})

const fallbackWorks = computed(() => resolveDemoWorksBySongId(songId.value || defaultSong.value?.id || ''))

watch(
  () => route.query.songId,
  (value) => {
    const next = String(value || '')
    if (!next) return
    if (!selectableSongs.value.some((song) => song.id === next)) return
    songId.value = next
  }
)
</script>

<style scoped lang="less">
.leaderboard-page {
  background: transparent;
}

.page-banner {
  position: relative;
  overflow: hidden;
  padding: 1.4rem 1.5rem;
  border-radius: var(--learn-radius-card, 12px);
  border: 1px solid rgba(255, 248, 235, 0.5);
  background:
    linear-gradient(90deg, rgba(255, 251, 244, 0.94) 0%, rgba(255, 248, 240, 0.84) 38%, rgba(255, 248, 240, 0.24) 100%),
    linear-gradient(180deg, rgba(16, 10, 7, 0.18), rgba(16, 10, 7, 0.28)),
    var(--leaderboard-banner) center/cover no-repeat;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 24px 56px rgba(92, 59, 35, 0.12);
}

.page-banner h2,
.page-banner p {
  color: #201815;
}

.seal-title::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 1.5rem;
  background-color: #a34135;
  margin-right: 0.75rem;
  vertical-align: middle;
}

:deep(.leaderboard) {
  width: 100%;
  max-width: none;
  margin: 0;
}
</style>
