<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import { formatRelativeTime, getLearnSongById } from '../utils/learnCatalog.js'
import { getCommunityVisuals } from '../utils/learnVisuals.js'
import {
  demoCurrentUserId,
  resolveDemoWorks,
  resolveDemoWorksBySongId
} from '../utils/learnDemoResolvers.js'

const router = useRouter()
const route = useRoute()
const infra = getInfra()
const uid = infra.identity.getUid()
const communityVisuals = getCommunityVisuals()

const loading = ref(true)
const works = ref([])
const searchQuery = ref('')
const currentFilter = ref('all')
const playingWork = ref(null)
const audioUrl = ref('')
const toastText = ref('')
const isDemoWorks = ref(false)
const profileState = ref(infra.identity.getProfile())
let toastTimer = 0

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '我的作品', value: 'mine' },
  { label: '高分作品', value: 'sss' },
  { label: '最新发布', value: 'latest' }
]

const sourceSongId = computed(() => String(route.query.songId || ''))

function enrichWork(work, options = {}) {
  const song = getLearnSongById(work.songId)
  return {
    ...work,
    isDemo: Boolean(options.isDemo || work.isDemo),
    isMine: Boolean(options.isMine || work.isMine || work.userId === uid || work.userId === demoCurrentUserId),
    songName: work.songName || song?.title || '黄梅戏唱段',
    score: Number(work.score || work.averageScore || 0),
    coverUrl: work.coverUrl || song?.cover || '',
    heroImage: work.heroImage || song?.heroImage || song?.bannerImage || song?.cover || '',
    bannerImage: work.bannerImage || song?.bannerImage || song?.heroImage || song?.cover || '',
    timelineCover: work.timelineCover || song?.timelineCover || song?.bannerImage || song?.heroImage || song?.cover || '',
    galleryCover: work.galleryCover || song?.galleryCover || song?.heroImage || song?.bannerImage || song?.cover || '/images/learn/works-bg.png',
    portrait: work.portrait || song?.portrait || '',
    summaryCopy: song?.summary || song?.description || '这是一条本地作品卡，供作品广场与详情页展示。'
  }
}

function currentDisplayName() {
  return profileState.value?.displayName || infra.identity.getProfile()?.displayName || '戏友'
}

function displayWorkUsername(work) {
  if (work?.isMine || work?.userId === uid) return currentDisplayName()
  return work?.username || '匿名戏友'
}

function handleProfileUpdated(event) {
  const next = event?.detail && typeof event.detail === 'object' ? event.detail : infra.identity.getProfile()
  profileState.value = { ...profileState.value, ...next }
  works.value = works.value.map((work) => (
    work?.isMine || work?.userId === uid
      ? { ...work, username: next?.displayName || work.username }
      : work
  ))
}

function handleProfileStorage(event) {
  if (event?.key && event.key !== 'hmx_learn_profile_v2' && event.key !== 'karaoke_display_name') return
  handleProfileUpdated({ detail: infra.identity.getProfile() })
}

const filteredWorks = computed(() => {
  let list = [...works.value]
  const query = searchQuery.value.trim().toLowerCase()

  if (query) {
    list = list.filter((work) => (
      String(work.songName || '').toLowerCase().includes(query)
      || String(work.username || '').toLowerCase().includes(query)
    ))
  }

  if (currentFilter.value === 'mine') {
    list = list.filter((work) => work.userId === uid || work.userId === demoCurrentUserId || work.isMine)
  } else if (currentFilter.value === 'sss') {
    list = list.filter((work) => ['SSS', 'SS'].includes(work.grade))
  }

  if (currentFilter.value === 'latest') {
    list.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
  } else {
    list.sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
  }

  return list
})

const featuredWork = computed(() => filteredWorks.value[0] || works.value[0] || null)
const spotlightWorks = computed(() => filteredWorks.value.slice(0, 3))
const worksStats = computed(() => {
  const mine = works.value.filter((work) => work.isMine || work.userId === uid)
  const highScoreCount = works.value.filter((work) => Number(work.score || 0) >= 90).length
  return [
    { label: '作品数', value: String(works.value.length || 0) },
    { label: '我的上墙', value: String(mine.length || 0) },
    { label: '90+ 高分', value: String(highScoreCount || 0) }
  ]
})
const featuredVisual = computed(() => {
  const work = featuredWork.value
  if (!work) return '/images/learn/works-bg.png'
  return work.bannerImage || work.heroImage || work.galleryCover || work.timelineCover || work.coverUrl || '/images/learn/works-bg.png'
})

async function loadWorks() {
  loading.value = true
  try {
    const realWorks = await infra.works.listWorks({
      songId: sourceSongId.value || undefined,
      includeDeleted: false
    })

    if (Array.isArray(realWorks) && realWorks.length) {
      isDemoWorks.value = false
      works.value = realWorks
        .filter((work) => !work.deletedAt)
        .map((work) => enrichWork(work))
      return
    }

    isDemoWorks.value = true
    const demoList = sourceSongId.value
      ? resolveDemoWorksBySongId(sourceSongId.value)
      : resolveDemoWorks()
    works.value = demoList.map((work) => enrichWork(work, {
      isDemo: true,
      isMine: work.userId === demoCurrentUserId
    }))
  } finally {
    loading.value = false
  }
}

function openDetail(work) {
  router.push(`/learn/works/${work.id}`)
}

function goLearn() {
  router.push('/learn/practice')
}

function goLeaderboard() {
  const songId = String(route.query.songId || featuredWork.value?.songId || '')
  router.push({
    path: '/learn/practice/leaderboard',
    query: songId ? { songId } : {}
  })
}

function showToast(text) {
  toastText.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 2200)
}

async function playWork(work) {
  if (playingWork.value?.id === work.id) {
    playingWork.value = null
    audioUrl.value = ''
    return
  }
  if (!work?.mediaUrl) {
    showToast('这条作品暂时没有可试听的音频。')
    return
  }
  playingWork.value = work
  audioUrl.value = work.mediaUrl
}

async function softDelete(work) {
  if (!work || work.isDemo || isDemoWorks.value) return
  if (!window.confirm(`确认删除《${work.songName || '这条作品'}》吗？`)) return
  await infra.works.softDeleteWork(work.id, Date.now())
  if (playingWork.value?.id === work.id) {
    playingWork.value = null
    audioUrl.value = ''
  }
  await loadWorks()
}

onMounted(() => {
  window.addEventListener('learn-profile-updated', handleProfileUpdated)
  window.addEventListener('storage', handleProfileStorage)
  void loadWorks()
})

onBeforeUnmount(() => {
  window.removeEventListener('learn-profile-updated', handleProfileUpdated)
  window.removeEventListener('storage', handleProfileStorage)
})
</script>

<template>
  <div class="works-page min-h-full font-display text-slate-900">
    <audio v-if="audioUrl" :src="audioUrl" autoplay @ended="audioUrl = ''; playingWork = null"></audio>

    <main class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
      <header class="page-banner flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" :style="{ '--works-banner': `url(${communityVisuals.plazaImage})` }">
        <div class="page-banner__copy">
          <div class="flex items-center gap-3">
            <h1 class="font-serif text-3xl font-bold tracking-tight text-slate-900 md:text-4xl" style="font-family: 'LXGW WenKai', 'STKaiti', cursive">作品广场</h1>
            <span v-if="isDemoWorks" class="rounded-full border border-[#a34135]/20 bg-[#a34135]/8 px-3 py-1 text-[11px] font-bold tracking-widest text-[#a34135]">示例</span>
          </div>
          <p class="mt-2 max-w-2xl text-sm font-serif tracking-wide text-[#736D61]/72">每一次练唱都值得被听到。这里不只是列表，而是你和戏友们轮番登台、被看见、被回应的广场。</p>
          <div class="page-banner__stats">
            <div v-for="item in worksStats" :key="item.label" class="page-banner__stat">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="goLeaderboard"
            class="flex h-11 items-center gap-2 rounded-full border border-[rgba(163,65,53,0.3)] bg-[linear-gradient(180deg,rgba(163,65,53,0.9),rgba(140,55,45,0.8))] px-5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(163,65,53,0.2)] transition-all hover:scale-[1.02] active:scale-95"
          >
            <span class="material-symbols-outlined text-lg">leaderboard</span>
            排行榜
          </button>
          <button
            @click="goLearn"
            class="flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span class="material-symbols-outlined text-xl">mic</span>
            去练唱
          </button>
        </div>
      </header>

      <section v-if="featuredWork && !loading" class="spotlight-panel">
        <button class="spotlight-panel__hero" @click="openDetail(featuredWork)">
          <img :src="featuredVisual" :alt="featuredWork.songName" class="spotlight-panel__hero-image" />
          <div class="spotlight-panel__hero-mask"></div>
          <div class="spotlight-panel__hero-copy">
            <div class="flex flex-wrap gap-2 text-[11px] font-bold tracking-[0.12em]">
              <span class="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-white/90">今日聚光</span>
              <span class="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/18 px-3 py-1 text-[#fff0c4]">{{ featuredWork.grade || 'A' }}</span>
              <span v-if="featuredWork.isDemo" class="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-white/78">示例</span>
            </div>
            <div>
              <h2>{{ featuredWork.songName }}</h2>
              <p>{{ displayWorkUsername(featuredWork) }} · {{ featuredWork.score }} 分 · {{ formatRelativeTime(featuredWork.timestamp) }}</p>
            </div>
          </div>
        </button>
        <div class="spotlight-panel__aside">
          <button
            v-for="work in spotlightWorks.slice(0, 3)"
            :key="`spotlight-${work.id}`"
            class="spotlight-mini"
            @click="openDetail(work)"
          >
            <img :src="work.galleryCover || work.bannerImage || work.heroImage || '/images/learn/works-bg.png'" :alt="work.songName" />
            <div class="spotlight-mini__mask"></div>
            <div class="spotlight-mini__copy">
              <strong>{{ work.songName }}</strong>
              <span>{{ displayWorkUsername(work) }} · {{ work.score }} 分</span>
            </div>
          </button>
        </div>
      </section>

      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#a34135]/20 pb-4">
        <div class="flex gap-4 md:gap-6">
          <button
            v-for="filter in filterOptions"
            :key="filter.value"
            class="relative px-5 py-2 rounded-full border border-[#a34135]/30 font-serif text-base transition-all"
            :class="currentFilter === filter.value ? 'bg-[#a34135] text-white font-bold shadow-lg shadow-[#a34135]/20' : 'bg-[#fff8ee] text-[#a34135] hover:bg-[#a34135]/10'"
            @click="currentFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="flex-shrink-0">
          <label class="group relative flex items-center">
            <div class="absolute left-4 text-[#a34135]/60 transition-colors group-focus-within:text-[#a34135]">
              <span class="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              v-model.trim="searchQuery"
              class="w-full rounded-full border border-[#a34135]/30 bg-[#fff8ee] pl-12 pr-4 py-2 text-sm outline-none transition-all placeholder:text-[#a34135]/50 focus:border-[#a34135] focus:ring-0 md:w-64"
              placeholder="搜索曲目或唱者"
            />
          </label>
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="n in 6" :key="n" class="flex flex-col gap-4">
          <div class="aspect-[16/10] animate-pulse rounded-[28px] bg-primary/8"></div>
          <div class="h-4 w-3/4 animate-pulse rounded bg-primary/8"></div>
          <div class="h-3 w-1/2 animate-pulse rounded bg-primary/5"></div>
        </div>
      </div>

      <div v-else-if="filteredWorks.length" class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="work in filteredWorks"
          :key="work.id"
          class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[rgba(255,244,228,0.72)] bg-[linear-gradient(180deg,rgba(255,250,243,0.84),rgba(242,231,214,0.78))] shadow-[0_14px_34px_rgba(92,59,35,0.08)] transition-all hover:-translate-y-1 hover:border-[#a34135]/18 hover:shadow-[0_22px_52px_rgba(92,59,35,0.12)]"
          @click="openDetail(work)"
        >
          <div class="relative aspect-[16/10] overflow-hidden">
            <img
              :src="work.bannerImage || work.heroImage || work.timelineCover || work.coverUrl || '/images/learn/works-bg.png'"
              :alt="work.songName"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,11,8,0.08),rgba(19,11,8,0.76))]"></div>
            <div class="absolute left-4 top-4 rounded-full border border-[rgba(255,248,238,0.82)] bg-[linear-gradient(180deg,rgba(255,251,246,0.94),rgba(247,235,217,0.88))] px-3 py-1 text-[11px] font-bold text-[#a34135] shadow-sm">
              {{ work.score }} 分
            </div>
            <button
              class="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-[#a34135]"
              @click.stop="playWork(work)"
            >
              <span class="material-symbols-outlined text-2xl">{{ playingWork?.id === work.id ? 'pause' : 'play_arrow' }}</span>
            </button>
            <div class="absolute inset-x-0 bottom-0 p-5 text-white">
              <p class="text-[11px] font-bold tracking-[0.18em] text-white/70">{{ work.grade || 'A' }} {{ work.isDemo ? '· 示例' : '' }}</p>
              <h3 class="mt-1 text-2xl font-bold leading-tight">{{ work.songName }}</h3>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-4 p-5">
            <p class="text-sm leading-7 text-[#736D61]">{{ work.summaryCopy }}</p>
            <div class="mt-auto flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-900">{{ displayWorkUsername(work) }}</p>
                <p class="mt-1 text-xs text-[#736D61]">{{ formatRelativeTime(work.timestamp) }}</p>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="!isDemoWorks && !work.isDemo && (work.userId === uid || work.isMine)"
                  class="flex size-10 items-center justify-center rounded-full border border-[#a34135]/12 bg-[#a34135]/5 text-[#a34135] transition-colors hover:bg-[#a34135] hover:text-white"
                  @click.stop="softDelete(work)"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <span class="rounded-full border border-[#D4AF37]/15 bg-[#fff8ee] px-3 py-1 text-[11px] font-bold text-[#736D61]">{{ work.grade || 'A' }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="flex min-h-[400px] flex-col items-center justify-center py-16 text-center">
        <div class="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-primary/5">
          <span class="material-symbols-outlined text-6xl text-primary/30">library_music</span>
        </div>
        <h3 class="mb-3 text-xl font-serif font-bold text-slate-700">暂无作品</h3>
        <p class="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">先去练唱一段，完成后再回到这里查看你的作品。</p>
        <button
          @click="goLearn"
          class="flex items-center gap-2 rounded-full bg-primary px-10 py-3.5 font-bold text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95"
        >
          <span class="material-symbols-outlined text-xl">mic</span>
          去练唱
        </button>
      </div>
    </main>

    <transition name="fade">
      <div v-if="toastText" class="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-background-dark px-6 py-3 text-sm font-medium text-white shadow-xl">
        {{ toastText }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.works-page {
  background: transparent;
}

.page-banner {
  position: relative;
  overflow: hidden;
  padding: 1.7rem 1.6rem;
  border-radius: 30px;
  border: 1px solid rgba(255, 248, 235, 0.58);
  background:
    linear-gradient(90deg, rgba(255, 251, 244, 0.94) 0%, rgba(255, 248, 240, 0.84) 38%, rgba(255, 248, 240, 0.22) 100%),
    linear-gradient(180deg, rgba(16, 10, 7, 0.16), rgba(16, 10, 7, 0.26)),
    var(--works-banner) center/cover no-repeat;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 26px 60px rgba(92, 59, 35, 0.12);
}

.page-banner h1,
.page-banner p {
  color: #201815;
}

.page-banner__copy {
  display: grid;
  gap: 0.9rem;
}

.page-banner__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.page-banner__stat {
  min-width: 108px;
  border-radius: 18px;
  border: 1px solid rgba(163, 65, 53, 0.08);
  background: rgba(255, 255, 255, 0.68);
  padding: 0.8rem 0.9rem;
}

.page-banner__stat span,
.page-banner__stat strong {
  display: block;
}

.page-banner__stat span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: rgba(115, 109, 97, 0.72);
}

.page-banner__stat strong {
  margin-top: 0.36rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #2b2622;
}

.spotlight-panel {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.72fr);
}

.spotlight-panel__hero,
.spotlight-mini {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(255, 245, 232, 0.78);
  box-shadow: 0 18px 48px rgba(92, 59, 35, 0.08);
}

.spotlight-panel__hero {
  min-height: 320px;
  text-align: left;
}

.spotlight-panel__hero-image,
.spotlight-mini img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spotlight-panel__hero-mask,
.spotlight-mini__mask {
  position: absolute;
  inset: 0;
}

.spotlight-panel__hero-mask {
  background:
    linear-gradient(120deg, rgba(22, 14, 10, 0.76), rgba(22, 14, 10, 0.26) 58%, rgba(22, 14, 10, 0.68)),
    linear-gradient(180deg, rgba(212, 175, 55, 0.08), transparent 42%);
}

.spotlight-panel__hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  color: #fff8ef;
}

.spotlight-panel__hero-copy h2 {
  margin-top: 0.75rem;
  font-size: clamp(2rem, 3vw, 2.75rem);
  font-weight: 800;
  line-height: 1.08;
  font-family: var(--learn-font-display);
}

.spotlight-panel__hero-copy p {
  margin-top: 0.5rem;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 246, 233, 0.82);
}

.spotlight-panel__aside {
  display: grid;
  gap: 0.9rem;
}

.spotlight-mini {
  min-height: 100px;
  text-align: left;
}

.spotlight-mini__mask {
  background: linear-gradient(90deg, rgba(23, 14, 10, 0.78), rgba(23, 14, 10, 0.14) 76%);
}

.spotlight-mini__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.35rem;
  height: 100%;
  align-content: end;
  padding: 1rem 1rem 1.05rem;
  color: #fff8ef;
}

.spotlight-mini__copy strong {
  font-size: 1rem;
  font-weight: 800;
}

.spotlight-mini__copy span {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 244, 230, 0.82);
}

.page-banner button:first-child {
  background: linear-gradient(180deg, rgba(255, 251, 246, 0.94), rgba(246, 234, 214, 0.86));
}

.page-banner button:last-child {
  box-shadow: 0 10px 24px rgba(163, 65, 53, 0.18);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .spotlight-panel {
    grid-template-columns: 1fr;
  }

  .spotlight-panel__aside {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-banner {
    padding: 1.25rem;
    border-radius: 24px;
  }

  .spotlight-panel__hero {
    min-height: 280px;
  }

  .spotlight-panel__hero-copy {
    padding: 1.15rem;
  }

  .spotlight-panel__aside {
    grid-template-columns: 1fr;
  }
}
</style>
