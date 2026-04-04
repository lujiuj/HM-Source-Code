<template>
  <div class="leaderboard relative w-full">
    <div v-if="isLoading" class="flex flex-col items-center gap-2.5 p-8 text-[#736D61]/50">
      <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-[#D4AF37]/20 border-t-[#D4AF37]"></div>
      正在加载榜单
    </div>

    <div v-else-if="!scores.length" class="flex flex-col items-center px-5 py-12 text-center">
      <div class="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#a34135]/8">
        <span class="material-symbols-outlined text-5xl text-[#a34135]/40">emoji_events</span>
      </div>
      <h3 class="text-xl font-bold text-slate-700">暂无榜单数据</h3>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-[#736D61]/60">当前曲目暂时没有真实作品，系统会在空数据时自动展示示例榜单，方便继续浏览。</p>
      <button
        class="mt-6 rounded-full bg-gradient-to-br from-[#D4AF37]/90 to-[#c49b3c]/90 px-8 py-3 text-base font-bold text-[#FFFAF0] shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(212,175,55,0.4)]"
        type="button"
        @click="goPractice"
      >
        去练唱
      </button>
    </div>

    <div v-else class="flex flex-col gap-4">
      <section v-if="showPodium && podiumSlots.length" class="mx-auto mb-12 flex w-full max-w-4xl items-end justify-center gap-3 text-center md:gap-6">
        <template v-for="displaySlot in ['second', 'first', 'third']" :key="displaySlot">
          <div
            v-if="getPodiumSlot(displaySlot)"
            class="podium-slot flex min-w-0 flex-1 flex-col items-center"
            :class="{
              'md:-translate-y-6': displaySlot === 'first',
              'md:translate-y-3': displaySlot === 'second' || displaySlot === 'third'
            }"
          >
            <span v-if="displaySlot === 'first'" class="material-symbols-outlined mb-3 text-5xl text-[#D4AF37]">workspace_premium</span>
            <div class="relative mb-6">
              <div
                class="overflow-hidden rounded-full border-4 bg-white p-1 shadow-lg"
                :class="{
                  'size-32 md:size-40 border-[#D4AF37] shadow-[#D4AF37]/30': displaySlot === 'first',
                  'size-24 md:size-28 border-slate-300': displaySlot === 'second',
                  'size-24 md:size-28 border-orange-700/60': displaySlot === 'third'
                }"
              >
                <div class="h-full w-full overflow-hidden rounded-full bg-slate-100">
                  <img
                    v-if="getPodiumSlot(displaySlot).item.portrait || getPodiumSlot(displaySlot).item.coverUrl || getPodiumSlot(displaySlot).item.heroImage || getPodiumSlot(displaySlot).item.bannerImage"
                    :src="getPodiumSlot(displaySlot).item.portrait || getPodiumSlot(displaySlot).item.coverUrl || getPodiumSlot(displaySlot).item.heroImage || getPodiumSlot(displaySlot).item.bannerImage"
                    :alt="getPodiumSlot(displaySlot).item.songName || getPodiumSlot(displaySlot).item.username"
                    class="h-full w-full object-cover"
                  >
                  <div v-else class="flex h-full w-full items-center justify-center text-3xl font-black text-[#736D61]/80">
                    {{ (getPodiumSlot(displaySlot).item.username || '戏').slice(0, 1) }}
                  </div>
                </div>
              </div>
              <div
                class="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-sm border border-white font-black tracking-widest text-white shadow-md"
                :class="{
                  'bg-[#D4AF37] px-5 py-1.5 text-xs': displaySlot === 'first',
                  'bg-slate-400 px-4 py-1 text-[10px]': displaySlot === 'second',
                  'bg-orange-800/80 px-4 py-1 text-[10px]': displaySlot === 'third'
                }"
              >
                {{ displaySlot === 'first' ? '第 1 名' : displaySlot === 'second' ? '第 2 名' : '第 3 名' }}
              </div>
            </div>
            <h3 class="w-full max-w-[160px] truncate font-bold text-slate-800 shufa" :class="displaySlot === 'first' ? 'text-xl' : 'text-lg'">
              {{ getPodiumSlot(displaySlot).item.username || '匿名戏友' }}
            </h3>
            <p class="font-serif font-bold text-[#a34135]" :class="displaySlot === 'first' ? 'text-2xl font-black' : ''">
              {{ getPodiumSlot(displaySlot).item.displayTotal }}
              <span :class="displaySlot === 'first' ? 'text-sm' : 'text-xs'">（{{ getPodiumSlot(displaySlot).item.displayGrade }}）</span>
            </p>
            <div
              class="mt-5 flex w-full items-end justify-center rounded-t-[22px] border border-white/70 bg-gradient-to-b from-white/96 to-[#f2e0ca]/88 shadow-[0_18px_30px_rgba(92,59,35,0.08)]"
              :class="{
                'h-28 max-w-[168px]': displaySlot === 'first',
                'h-20 max-w-[144px]': displaySlot === 'second',
                'h-16 max-w-[136px]': displaySlot === 'third'
              }"
            >
              <span class="mb-4 text-[10px] font-bold tracking-[0.28em] text-[#8f7762]/62">黄梅榜</span>
            </div>
          </div>
        </template>
      </section>

      <div
        v-if="showPodium && derivedCurrentUserEntry"
        class="sticky top-20 z-10 mb-8"
        :class="{ 'cursor-pointer': Boolean(derivedCurrentUserEntry.workId) }"
        @click="goWorkDetail(derivedCurrentUserEntry.workId)"
      >
        <div class="silk-border relative flex items-center justify-between overflow-hidden rounded-sm bg-[#a34135] p-5 text-white shadow-2xl shadow-[#a34135]/20 md:px-8">
          <div class="absolute inset-0 opacity-12" :style="{ backgroundImage: `url(${currentBarTexture})` }"></div>
          <div class="relative z-10 flex items-center gap-6">
            <div class="shufa flex size-14 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl font-bold">
              #{{ currentUserRank || '--' }}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h4 class="truncate shufa text-xl font-bold">{{ currentUserName || derivedCurrentUserEntry.username || '我的成绩' }}</h4>
                <span class="rounded-sm border border-white/20 bg-[#D4AF37]/90 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white">当前关注</span>
                <span v-if="isDemoMode" class="rounded-sm border border-white/20 bg-white/15 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white">示例</span>
              </div>
              <p class="mt-1 font-serif text-xs tracking-wider text-white/70">
                分数 <span class="font-bold text-white">{{ derivedCurrentUserEntry.displayTotal }}</span>｜
                等级 <span class="font-bold text-white">{{ derivedCurrentUserEntry.displayGrade }}</span>
              </p>
            </div>
          </div>
          <button class="relative z-10 rounded-sm border border-white/20 bg-white px-7 py-2.5 text-xs font-bold tracking-[0.2em] text-[#a34135] shadow-lg transition-all hover:bg-[#D4AF37] hover:text-white" @click.stop="goPractice">
            再练一次
          </button>
        </div>
      </div>

      <div class="card-texture mb-8 overflow-hidden rounded-sm border border-[#D4AF37]/20 bg-white/85 shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left font-serif">
            <thead>
              <tr class="bg-[#a34135]/5 text-[10px] font-bold tracking-[0.2em] text-[#736D61]/60">
                <th class="px-8 py-5">名次</th>
                <th class="px-8 py-5">学员</th>
                <th class="px-8 py-5">分数</th>
                <th class="px-8 py-5">等级</th>
                <th class="px-8 py-5">时间</th>
                <th class="px-8 py-5 text-right">查看</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D4AF37]/10">
              <tr
                v-for="(item, index) in listScores"
                :key="item.entryId"
                class="group transition-colors hover:bg-[#a34135]/5"
                :class="{ 'bg-[#D4AF37]/5': item.isCurrentUser, 'cursor-pointer': Boolean(item.workId) }"
                @click="goWorkDetail(item.workId)"
              >
                <td class="px-8 py-5">
                  <span class="shufa text-lg font-bold text-[#736D61]/40">#{{ index + 1 + listRankOffset }}</span>
                </td>
                <td class="px-8 py-5">
                  <div class="flex items-center gap-4">
                    <div class="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/10 bg-slate-100">
                      <img
                        v-if="item.portrait || item.coverUrl || item.heroImage || item.bannerImage"
                        :src="item.portrait || item.coverUrl || item.heroImage || item.bannerImage"
                        :alt="item.username"
                        class="h-full w-full object-cover"
                      >
                      <span v-else class="font-bold text-[#736D61]/50">{{ (item.username || '戏').slice(0, 1) }}</span>
                    </div>
                    <span class="font-medium text-slate-800">{{ item.username || '匿名戏友' }}</span>
                  </div>
                </td>
                <td class="px-8 py-5 font-bold text-[#a34135]">{{ item.displayTotal }}</td>
                <td class="px-8 py-5">
                  <span
                    class="rounded-sm border px-3 py-1 text-[10px] font-bold tracking-widest"
                    :class="item.displayGrade === 'S' || item.displayGrade === 'SS' || item.displayGrade === 'SSS' ? 'border-[#a34135]/20 bg-[#a34135]/10 text-[#a34135]' : (item.displayGrade === 'A' ? 'border-indigo-900/20 bg-indigo-900/5 text-indigo-900' : 'border-[#736D61]/20 bg-[#736D61]/10 text-[#736D61]')"
                  >
                    {{ item.displayGrade }}
                  </span>
                </td>
                <td class="px-8 py-5 text-[11px] tracking-tighter text-[#736D61]/50">{{ formatDate(item.timestamp) }}</td>
                <td class="px-8 py-5 text-right">
                  <span class="material-symbols-outlined cursor-pointer text-[#736D61]/30 transition-colors hover:text-[#a34135]">more_horiz</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getInfra } from '../../../shared/infra/index.js'
import { getGradeByScore } from '../../../shared/utils/grades.js'
import { buildWorksLeaderboard } from '../../../shared/utils/worksLeaderboard.js'
import { cloneDemo, demoCurrentUserId } from '../../utils/learnDemoFixtures.js'

const props = defineProps({
  songId: {
    type: String,
    required: true
  },
  songTitle: {
    type: String,
    default: ''
  },
  limit: {
    type: Number,
    default: 10
  },
  showPodium: {
    type: Boolean,
    default: false
  },
  currentUserScore: {
    type: Number,
    default: null
  },
  currentUserName: {
    type: String,
    default: ''
  },
  fallbackWorks: {
    type: Array,
    default: () => []
  }
})

const scores = ref([])
const isLoading = ref(true)
const currentUserRank = ref(null)
const derivedCurrentUserEntry = ref(null)
const profileState = ref(null)
const router = useRouter()
const isDemoMode = ref(false)

const effectiveLimit = computed(() => {
  return Number.isFinite(props.limit) ? Math.max(1, Math.floor(props.limit)) : 10
})

const currentBarTexture = '/assets/learn-real/downloaded/huangmei_theatre.jpg'

let gsapCtx = null
onUnmounted(() => {
  if (gsapCtx) gsapCtx.revert()
})

watch(
  () => isLoading.value,
  async (loading) => {
    if (!loading && props.showPodium && podiumSlots.value.length) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion) return

      await nextTick()
      import('gsap')
        .then(({ gsap }) => {
          if (gsapCtx) gsapCtx.revert()
          gsapCtx = gsap.context(() => {
            gsap.fromTo(
              '.podium-slot',
              { y: 60, opacity: 0, scale: 0.9 },
              { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.5)', clearProps: 'all' }
            )
          })
        })
        .catch(() => {})
    }
  }
)

const podiumTake = computed(() => (props.showPodium ? Math.min(3, scores.value.length) : 0))
const podiumScores = computed(() => (podiumTake.value ? scores.value.slice(0, podiumTake.value) : []))
const listScores = computed(() => (props.showPodium ? scores.value.slice(podiumTake.value) : scores.value))
const listRankOffset = computed(() => (props.showPodium ? podiumTake.value : 0))

const podiumSlots = computed(() => {
  if (!props.showPodium) return []
  const items = podiumScores.value
  const first = items[0] ? { rank: 1, item: items[0], slot: 'first' } : null
  const second = items[1] ? { rank: 2, item: items[1], slot: 'second' } : null
  const third = items[2] ? { rank: 3, item: items[2], slot: 'third' } : null

  const slots = []
  if (second) slots.push(second)
  if (first) slots.push(first)
  if (third) slots.push(third)
  return slots
})

function getPodiumSlot(displaySlot) {
  return podiumSlots.value.find((slot) => slot.slot === displaySlot) || null
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString('zh-CN')
}

function processEntry(item, uid, markAsCurrent = false) {
  const rawTotalScore = typeof item?.totalScore === 'number'
    ? item.totalScore
    : (typeof item?.score === 'number' ? item.score : 0)
  const totalScore = Number.isFinite(rawTotalScore) ? Math.max(0, Math.round(rawTotalScore)) : 0

  const rawLineCount = typeof item?.lineCount === 'number'
    ? item.lineCount
    : (typeof item?.maxTotalScore === 'number' ? item.maxTotalScore / 100 : null)
  const lineCount = Number.isFinite(rawLineCount) ? Math.max(0, Math.floor(rawLineCount)) : null
  const safeLineCount = lineCount && lineCount > 0 ? lineCount : null

  const rawAverageScore = typeof item?.averageScore === 'number'
    ? item.averageScore
    : (safeLineCount ? totalScore / safeLineCount : null)
  const averageScore = rawAverageScore === null
    ? null
    : (Number.isFinite(rawAverageScore) ? Math.max(0, Math.min(100, Math.round(rawAverageScore))) : null)

  const rawGrade = typeof item?.grade === 'string' ? item.grade : ''
  const grade = ['SSS', 'SS', 'S', 'A', 'B', 'C'].includes(rawGrade)
    ? rawGrade
    : (averageScore === null ? '--' : getGradeByScore(averageScore))

  const isCurrentUser = markAsCurrent || item.userId === uid || item.userId === demoCurrentUserId || Boolean(item.isMine)
  const liveUsername = isCurrentUser
    ? (profileState.value?.displayName || item.username || '戏友')
    : item.username

  return {
    entryId: `${item.userId || 'anon'}_${item.workId || item.id || item.timestamp || 0}`,
    id: item.userId,
    workId: item.workId || item.id || null,
    ...item,
    username: liveUsername,
    isCurrentUser,
    displayTotal: totalScore,
    displayAverage: averageScore === null ? '--' : averageScore,
    displayGrade: grade
  }
}

function goWorkDetail(workId) {
  if (!workId) return
  router.push(`/learn/works/${workId}`)
}

function goPractice() {
  if (!props.songId) {
    router.push('/learn/practice')
    return
  }
  router.push(`/learn/practice/karaoke?songId=${encodeURIComponent(props.songId)}`)
}

function handleProfileUpdated(event) {
  const infra = getInfra()
  const next = event?.detail && typeof event.detail === 'object' ? event.detail : infra.identity.getProfile()
  profileState.value = { ...profileState.value, ...next }
  scores.value = scores.value.map((item) => (
    item.isCurrentUser ? { ...item, username: profileState.value?.displayName || item.username } : item
  ))
  if (derivedCurrentUserEntry.value) {
    derivedCurrentUserEntry.value = {
      ...derivedCurrentUserEntry.value,
      username: profileState.value?.displayName || derivedCurrentUserEntry.value.username
    }
  }
}

function handleProfileStorage(event) {
  if (event?.key && event.key !== 'hmx_learn_profile_v2' && event.key !== 'karaoke_display_name') return
  handleProfileUpdated({ detail: getInfra().identity.getProfile() })
}

async function loadLeaderboard() {
  if (!props.songId) {
    isLoading.value = false
    return
  }

  isLoading.value = true

  try {
    const infra = getInfra()
    const uid = infra.identity.getUid()
    profileState.value = infra.identity.getProfile()
    const works = await infra.works.listWorks({ songId: props.songId, includeDeleted: false })
    const realWorks = Array.isArray(works) ? works.filter((item) => !item.deletedAt) : []
    const sourceWorks = realWorks.length ? realWorks : cloneDemo(props.fallbackWorks || [])

    isDemoMode.value = !realWorks.length && sourceWorks.length > 0

    const { all, top } = buildWorksLeaderboard(sourceWorks, effectiveLimit.value)
    const currentUserId = realWorks.length ? uid : demoCurrentUserId

    scores.value = top.map((item) => processEntry(item, uid, item.userId === currentUserId))

    const rankIndex = all.findIndex((item) => item.userId === currentUserId)
    if (rankIndex !== -1) {
      currentUserRank.value = rankIndex + 1
      derivedCurrentUserEntry.value = processEntry(all[rankIndex], uid, true)
    } else if (!realWorks.length && all.length) {
      currentUserRank.value = 1
      derivedCurrentUserEntry.value = processEntry(all[0], uid, true)
    } else {
      currentUserRank.value = null
      derivedCurrentUserEntry.value = null
    }
  } catch (error) {
    console.error('加载榜单失败', error)
    scores.value = []
    currentUserRank.value = null
    derivedCurrentUserEntry.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('learn-profile-updated', handleProfileUpdated)
  window.addEventListener('storage', handleProfileStorage)
})

watch(
  () => [props.songId, props.fallbackWorks],
  () => {
    void loadLeaderboard()
  },
  { immediate: true, deep: true }
)

onUnmounted(() => {
  window.removeEventListener('learn-profile-updated', handleProfileUpdated)
  window.removeEventListener('storage', handleProfileStorage)
})
</script>

<style scoped lang="less">
.leaderboard {
  background: rgba(255, 252, 248, 0.76);
  border-radius: 15px;
  width: 100%;
  max-width: none;
  padding: 24px;
  margin: 0;
  border: 1px solid rgba(210, 180, 140, 0.4);
  box-shadow: 0 2px 12px rgba(93, 64, 55, 0.06);
}

.card-texture {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.silk-border {
  position: relative;
}

@media (max-width: 768px) {
  .leaderboard {
    padding: 18px;
  }
}
</style>
