<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getLearnSongs, masterProfiles } from '../utils/learnCatalog.js'

const router = useRouter()
const searchQuery = ref('')
const selectedMasterId = ref(masterProfiles[0]?.id || '')

const masters = computed(() => masterProfiles)
const songs = computed(() => getLearnSongs())

const activeMaster = computed(() => masters.value.find((item) => item.id === selectedMasterId.value) || masters.value[0] || null)
const activeMasterVisual = computed(() => (
  activeMaster.value?.portrait
  || activeMaster.value?.avatar
  || activeMaster.value?.bannerImage
  || activeMaster.value?.heroImage
  || activeMaster.value?.galleryCover
  || '/images/learn/master-bg.png'
))
const activeMasterVisualPosition = computed(() => (
  activeMaster.value?.avatarObjectPosition
  || activeMaster.value?.bannerObjectPosition
  || activeMaster.value?.heroObjectPosition
  || 'center center'
))
const activeSongs = computed(() => songs.value.filter((song) => song.masterId === activeMaster.value?.id))
const filteredSongs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return activeSongs.value
    .filter((song) => {
      if (!query) return true
      return [song.title, song.singer, song.operaName, song.excerptName, ...(song.tags || [])]
        .some((item) => String(item || '').toLowerCase().includes(query))
    })
    .sort((a, b) => (a.difficulty || 99) - (b.difficulty || 99))
})

function enterAnalysis(song) {
  if (song?.id) router.push(`/learn/analysis/${song.id}`)
}
</script>

<template>
  <div class="master-library min-h-full overflow-x-hidden overflow-y-auto">
    <div class="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-6 lg:px-8">
      <header
        class="top-hero"
        :style="{
          '--master-hero-image': `url(${activeMasterVisual})`,
          '--master-hero-position': activeMasterVisualPosition
        }"
      >
        <div class="top-hero__copy">
          <p class="eyebrow">名师库</p>
          <h1 style="font-family: 'LXGW WenKai', 'STKaiti', cursive">从名师进入唱段</h1>
          <p>选一位名师，看代表唱段，从赏析到练唱只差一步。</p>
        </div>
        <div class="top-hero__side">
          <div class="top-hero__masters">
            <button
              v-for="master in masters"
              :key="master.id"
              class="top-hero__master"
              :class="selectedMasterId === master.id ? 'is-active' : ''"
              @click="selectedMasterId = master.id"
            >
              <img :src="master.avatar" :alt="master.name" :style="{ objectPosition: master.avatarObjectPosition || 'center center' }" />
              <span>{{ master.name }}</span>
            </button>
          </div>
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input v-model.trim="searchQuery" placeholder="搜索名师、曲目、唱段" />
          </div>
        </div>
      </header>

      <section class="master-strip">
        <button
          v-for="master in masters"
          :key="master.id"
          class="master-chip"
          :class="selectedMasterId === master.id ? 'is-active' : ''"
          @click="selectedMasterId = master.id"
        >
          <img :src="master.avatar" :alt="master.name" :style="{ objectPosition: master.avatarObjectPosition || 'center center' }" />
          <span>{{ master.name }}</span>
        </button>
      </section>

      <section class="profile-grid">
        <article class="profile-card">
          <img
            :src="activeMasterVisual"
            :alt="activeMaster?.name"
            :style="{ objectPosition: activeMasterVisualPosition }"
          />
          <div class="profile-card__mask"></div>
          <div class="profile-card__content">
            <p class="eyebrow eyebrow--light">名师主视觉</p>
            <div>
              <h2>{{ activeMaster?.name }}</h2>
              <p class="profile-title">{{ activeMaster?.shortTitle || '黄梅戏名师' }}</p>
            </div>
          </div>
        </article>

        <article class="info-card">
          <p class="eyebrow">名师简介</p>
          <h3>{{ activeMaster?.title }}</h3>
          <p class="info-copy">{{ activeMaster?.intro }}</p>
          <div class="focus-row">
            <span v-for="tag in activeMaster?.focus || []" :key="tag">{{ tag }}</span>
          </div>
          <div class="stats-grid">
            <div>
              <p>主打唱法</p>
              <strong>{{ activeMaster?.signatureStyle }}</strong>
            </div>
            <div>
              <p>代表作</p>
              <strong>{{ (activeMaster?.representativeWorks || []).join('、') }}</strong>
            </div>
            <div>
              <p>教学风格</p>
              <strong>{{ activeMaster?.teachingStyle }}</strong>
            </div>
          </div>
          <div class="detail-grid">
            <article>
              <p>声音特征</p>
              <strong>{{ activeMaster?.vocalStyle }}</strong>
            </article>
            <article>
              <p>适合模仿</p>
              <strong>{{ (activeMaster?.focus || []).join('、') }}</strong>
            </article>
          </div>
        </article>
      </section>

      <section class="repertoire-section">
        <div class="section-head">
          <h2>代表唱段</h2>
          <span>{{ filteredSongs.length }} 段</span>
        </div>

        <div v-if="filteredSongs.length" class="song-grid">
          <button v-for="song in filteredSongs" :key="song.id" class="song-card" @click="enterAnalysis(song)">
            <div class="song-card__media">
              <img :src="song.bannerImage || song.heroImage || song.galleryCover || song.cover || activeMaster?.galleryCover" :alt="song.title" :style="{ objectPosition: song.bannerObjectPosition || song.heroObjectPosition || song.objectPosition || 'center center' }" />
              <div class="song-card__veil"></div>
            </div>
            <div class="song-card__body">
              <div class="song-card__meta">
                <span class="chip">{{ song.excerptName }}</span>
                <span class="score">{{ song.difficultyText }}</span>
              </div>
              <h3>{{ song.title }}</h3>
              <p class="song-card__desc">{{ song.summary }}</p>
              <div class="song-card__foot">
                <span>{{ song.singer }}</span>
                <span>进入赏析</span>
              </div>
            </div>
          </button>
        </div>

        <div v-else class="empty-state">
          <span class="material-symbols-outlined">music_off</span>
          <p>暂无匹配唱段</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.master-library {
  background: transparent;
}

.top-hero,
.master-strip,
.profile-grid,
.repertoire-section {
  margin-bottom: 1.4rem;
}

.top-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.35rem 1.4rem;
  border-radius: var(--learn-radius-card, 12px);
  border: 1px solid rgba(182, 149, 106, 0.2);
  background:
    linear-gradient(120deg, rgba(21, 13, 9, 0.78) 0%, rgba(21, 13, 9, 0.48) 44%, rgba(21, 13, 9, 0.14) 100%),
    var(--master-hero-image);
  background-position: var(--master-hero-position, center center);
  background-size: cover;
  box-shadow: 0 8px 24px rgba(92, 59, 35, 0.08);
}

.top-hero__copy {
  flex: 1 1 360px;
}

.top-hero__side {
  display: grid;
  gap: 1rem;
  min-width: min(100%, 430px);
}

.top-hero__masters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.top-hero__master {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.42rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  padding: 0.55rem 0.68rem;
  color: rgba(255, 244, 226, 0.8);
  backdrop-filter: blur(12px);
}

.top-hero__master img {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  object-fit: cover;
}

.top-hero__master span {
  font-size: 11px;
  font-weight: 700;
}

.top-hero__master.is-active {
  border-color: rgba(255, 236, 196, 0.72);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
}

.top-hero > * {
  position: relative;
  z-index: 1;
}

.top-hero .eyebrow {
  color: rgba(255, 240, 208, 0.82);
}

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: rgba(163, 65, 53, 0.72);
}

.eyebrow--light {
  color: rgba(255, 255, 255, 0.8);
}

.top-hero h1 {
  margin-top: 0.4rem;
  font-size: clamp(1.9rem, 2.8vw, 2.45rem);
  font-weight: 800;
  font-family: var(--learn-font-display);
  color: #fff;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
}

.top-hero p {
  margin-top: 0.5rem;
  max-width: 38rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.84);
}

.search-box {
  position: relative;
  min-width: min(100%, 380px);
}

.search-box span {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(115, 109, 97, 0.4);
}

.search-box input {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.92);
  padding: 0.85rem 1rem 0.85rem 2.75rem;
  outline: none;
}

.master-strip {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  overflow-x: auto;
  padding: 0.1rem 0 0.4rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.master-strip::-webkit-scrollbar {
  display: none;
}

@media (min-width: 1100px) {
  .master-strip {
    display: none;
  }
}

.master-chip {
  display: inline-flex;
  min-width: 92px;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.78);
  padding: 0.65rem 0.7rem;
  box-shadow: 0 12px 28px rgba(92, 59, 35, 0.06);
}

.master-chip.is-active {
  border-color: rgba(163, 65, 53, 0.35);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(163, 65, 53, 0.12), 0 0 0 3px rgba(212, 175, 55, 0.2);
}

.master-chip img {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  object-fit: cover;
  transition: filter 0.24s ease, transform 0.24s ease;
}

.master-chip:not(.is-active) img {
  filter: grayscale(1) saturate(0.12) brightness(1.04);
}

.master-chip:not(.is-active) span {
  color: #b4aa9b;
}

.master-chip.is-active img {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.4);
  border-radius: 999px;
}

.master-chip span {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.profile-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 0.94fr 1.06fr;
}

.profile-card,
.info-card,
.song-card,
.empty-state {
  border-radius: var(--learn-radius-card, 12px);
  border: 1px solid rgba(182, 149, 106, 0.16);
  background: rgba(255, 253, 248, 0.88);
  box-shadow: 0 16px 40px rgba(92, 59, 35, 0.07);
}

.profile-card {
  position: relative;
  overflow: hidden;
  min-height: 360px;
}

.profile-card img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-card__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 10, 7, 0.12) 0%, rgba(15, 10, 7, 0.82) 100%);
}

.profile-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 360px;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.35rem;
  color: #fff;
}

.profile-card__content h2 {
  font-size: clamp(2rem, 2.8vw, 2.6rem);
  font-weight: 800;
  font-family: var(--learn-font-display);
  text-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.profile-title {
  margin-top: 0.35rem;
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.78);
}

.info-card {
  padding: 1.5rem;
}

.info-card h3 {
  margin-top: 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.info-copy {
  margin-top: 0.7rem;
  line-height: 1.8;
  color: #736d61;
}

.focus-row {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.focus-row span,
.chip,
.score {
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.focus-row span,
.chip {
  background: linear-gradient(135deg, #f6efe1, #ede4d1);
  color: #736d61;
  border: 1px solid rgba(212, 175, 55, 0.15);
}

.score {
  background: linear-gradient(135deg, #a34135, #982f2f);
  color: #fff;
}

.stats-grid {
  margin-top: 1.1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stats-grid > div {
  border-radius: 20px;
  border: 1px solid rgba(216, 199, 164, 0.22);
  background: #faf6ee;
  padding: 0.9rem;
}

.stats-grid p {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(115, 109, 97, 0.7);
}

.stats-grid strong {
  display: block;
  margin-top: 0.45rem;
  line-height: 1.6;
  color: #111827;
}

.repertoire-section {
  padding: 1.2rem;
  border-radius: var(--learn-radius-card, 12px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 44px rgba(92, 59, 35, 0.08);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-head h2 {
  font-size: 1.5rem;
  font-weight: 700;
}

.section-head span {
  font-size: 12px;
  font-weight: 700;
  color: rgba(115, 109, 97, 0.7);
}

.song-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.song-card {
  overflow: hidden;
  padding: 0;
  text-align: left;
  cursor: pointer;
  transition: all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.song-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 22px 52px rgba(92, 59, 35, 0.16);
  border-color: rgba(163, 65, 53, 0.2);
}

.song-card__media {
  position: relative;
  height: 188px;
  overflow: hidden;
}

.song-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-card__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 10, 7, 0.02) 0%, rgba(15, 10, 7, 0.42) 100%);
}

.song-card__body {
  padding: 1rem 1rem 1.1rem;
}

.song-card__meta,
.song-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.song-card__body h3 {
  margin-top: 0.75rem;
  font-size: 1.05rem;
  font-weight: 700;
  transition: color 0.2s ease;
}

.song-card:hover .song-card__body h3 {
  color: #a34135;
}

.song-card__desc {
  margin-top: 0.5rem;
  line-height: 1.7;
  color: #736d61;
}

.song-card__foot {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(216, 199, 164, 0.15);
  font-size: 12px;
  color: rgba(115, 109, 97, 0.82);
}

.empty-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.5rem;
  color: rgba(115, 109, 97, 0.58);
}

.detail-grid {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-grid article {
  border-radius: 20px;
  border: 1px solid rgba(216, 199, 164, 0.22);
  background: linear-gradient(180deg, rgba(250, 246, 238, 0.96), rgba(245, 238, 226, 0.92));
  padding: 0.9rem;
}

.detail-grid p {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(115, 109, 97, 0.7);
}

.detail-grid strong {
  display: block;
  margin-top: 0.45rem;
  line-height: 1.7;
  color: #111827;
}

@media (max-width: 1024px) {
  .top-hero__masters {
    justify-content: flex-start;
  }

  .top-hero__side {
    min-width: 100%;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .master-chip,
  .song-card {
    transition: none !important;
  }
}
</style>
