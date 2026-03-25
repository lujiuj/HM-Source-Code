<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import { getJourneyQuiz, submitJourneyQuiz, syncJourneyProgress } from '../utils/studyProgress.js'
import { getJourneyVisuals } from '../utils/learnVisuals.js'

const route = useRoute()
const router = useRouter()
const infra = getInfra()
const journeyVisuals = getJourneyVisuals()

const loading = ref(true)
const studySummary = ref(null)
const activeStageId = ref('')
const quizDrawerOpen = ref(false)
const quizAnswers = ref({})
const quizSubmitting = ref(false)
const quizResult = ref(null)

const mapPositions = [
  { left: 10, top: 84 },
  { left: 25, top: 62 },
  { left: 42, top: 78 },
  { left: 57, top: 46 },
  { left: 72, top: 62 },
  { left: 85, top: 30 },
  { left: 92, top: 74 }
]

const stages = computed(() => studySummary.value?.journey?.stages || [])
const activeStage = computed(() => stages.value.find((stage) => stage.id === activeStageId.value) || studySummary.value?.journey?.activeStage || stages.value[0] || null)
const clearedStages = computed(() => stages.value.filter((stage) => stage.isCleared))
const progressPercent = computed(() => (stages.value.length ? Math.round((clearedStages.value.length / stages.value.length) * 100) : 0))
const quizData = computed(() => getJourneyQuiz(activeStage.value?.id))
const quizPassCount = computed(() => Number(quizData.value?.passCount || quizData.value?.questions?.length || 0))
const quizDrawerTitle = computed(() => activeStage.value ? `${activeStage.value.title} · 理论闯关` : '理论闯关')
const quizQuestionResults = computed(() => quizResult.value?.questionResults || [])
const quizQuestionResultMap = computed(() => new Map(quizQuestionResults.value.map((item) => [item.id, item])))
const quizScoreSummary = computed(() => {
  const total = Number(quizQuestionResults.value.length || quizData.value?.questions?.length || 0)
  const correct = quizQuestionResults.value.filter((item) => item.isCorrect).length
  return { total, correct }
})
const quizPassed = computed(() => Boolean(quizResult.value?.passed))
const journeyStyle = computed(() => ({
  backgroundImage: [
    'linear-gradient(180deg, rgba(254,249,241,0.92), rgba(245,234,216,0.76))',
    `url(${journeyVisuals.backdropImage})`
  ].join(', '),
  backgroundSize: 'cover, cover',
  backgroundPosition: 'center center, center center'
}))
const mapCanvasStyle = computed(() => ({
  backgroundImage: [
    'linear-gradient(180deg, rgba(255, 253, 247, 0.18), rgba(255, 246, 232, 0.26))',
    `url(${journeyVisuals.mapOverlayImage || journeyVisuals.scrollImage})`
  ].join(', '),
  backgroundSize: 'cover, cover',
  backgroundPosition: 'center center, center center'
}))
const stageBannerImage = computed(() => journeyVisuals.bannerImage || journeyVisuals.scrollImage || journeyVisuals.backdropImage)

function stageMapPosition(index) {
  return mapPositions[index] || mapPositions[mapPositions.length - 1]
}

function stageNodeStyle(index) {
  const position = stageMapPosition(index)
  return { left: `${position.left}%`, top: `${position.top}%` }
}

function buildMapPath() {
  if (!stages.value.length) return ''
  const points = stages.value.map((stage, index) => stageMapPosition(index))
  if (points.length === 1) return `M ${points[0].left} ${points[0].top}`
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.left} ${point.top}`
    const previous = points[index - 1]
    const deltaX = point.left - previous.left
    const controlStartX = previous.left + deltaX * 0.36
    const controlEndX = previous.left + deltaX * 0.68
    return `${path} C ${controlStartX} ${previous.top}, ${controlEndX} ${point.top}, ${point.left} ${point.top}`
  }, '')
}

function stageStatusLabel(stage) {
  if (!stage) return '未解锁'
  if (stage.isCleared) return '已完成'
  if (stage.isUnlocked) return '进行中'
  return '未解锁'
}

function stageTaskLabel(stage) {
  if (stage?.taskType === 'quiz') return '理论闯关'
  if (stage?.taskType === 'publish') return '发布作品'
  return '继续练唱'
}

function stageDisplayTitle(stage) {
  if (!stage) return '待启封'
  return stage.isUnlocked ? stage.title : '待启封'
}

function stageDisplayObjective(stage) {
  if (!stage) return '关卡内容将在你推进学习后逐步展开。'
  if (stage.isUnlocked && stage.taskType === 'quiz') {
    const totalQuestions = Number(stage?.quiz?.questions?.length || 0)
    return totalQuestions
      ? `完成 ${totalQuestions} 道理论题，必须全部答对才算通关。`
      : '完成本关理论题，必须全部答对才算通关。'
  }
  if (stage.isUnlocked) return stage.objective
  return '先完成当前关卡，这一段的任务与提示才会显现。'
}

function resetQuizState() {
  quizAnswers.value = {}
  quizResult.value = null
}

async function loadJourney() {
  loading.value = true
  try {
    const summary = await syncJourneyProgress(infra.identity, infra)
    studySummary.value = summary
    const persistedStageId = String(activeStageId.value || '')
    const preferredStageId = route.query.stageId
      ? String(route.query.stageId)
      : (summary?.journey?.stages?.some((stage) => stage.id === persistedStageId)
          ? persistedStageId
          : (summary?.journey?.activeStage?.id || summary?.journey?.stages?.[0]?.id || ''))
    activeStageId.value = preferredStageId
    if (route.query.action === 'quiz') {
      const targetStage = summary?.journey?.stages?.find((stage) => stage.id === activeStageId.value)
      if (targetStage?.taskType === 'quiz' && targetStage.isUnlocked) quizDrawerOpen.value = true
    }
  } finally {
    loading.value = false
  }
}

function selectStage(stage) {
  if (!stage?.isUnlocked) return
  activeStageId.value = stage.id
  if (quizDrawerOpen.value && stage.taskType !== 'quiz') quizDrawerOpen.value = false
  resetQuizState()
}

function openStageAction(stage) {
  if (!stage?.isUnlocked) return
  if (stage.taskType === 'quiz') {
    activeStageId.value = stage.id
    quizDrawerOpen.value = true
    resetQuizState()
    return
  }
  if (stage.route) router.push(stage.route)
}

function openSupport(stage) {
  if (stage?.supportRoute) router.push(stage.supportRoute)
}

async function submitQuiz() {
  if (!activeStage.value?.id || !quizData.value || quizSubmitting.value) return
  quizSubmitting.value = true
  try {
    const result = await submitJourneyQuiz(infra.identity, activeStage.value.id, quizAnswers.value)
    quizResult.value = result
    await loadJourney()
    quizDrawerOpen.value = true
  } finally {
    quizSubmitting.value = false
  }
}

function isQuestionCorrect(questionId) {
  return Boolean(quizQuestionResultMap.value.get(questionId)?.isCorrect)
}

function resultForQuestion(questionId) {
  return quizQuestionResultMap.value.get(questionId) || null
}

function answerLabel(question, optionId) {
  return question?.options?.find((item) => item.id === optionId)?.label || '未作答'
}

function optionResultClass(question, option) {
  if (!quizResult.value) return quizAnswers.value[question.id] === option.id ? 'is-selected' : ''
  if (option.id === question.correctAnswer) return 'is-correct'
  if (quizAnswers.value[question.id] === option.id && option.id !== question.correctAnswer) return 'is-wrong'
  return quizAnswers.value[question.id] === option.id ? 'is-selected' : ''
}

watch(activeStage, (stage) => {
  if (!stage) return
  if (stage.taskType !== 'quiz') {
    quizDrawerOpen.value = false
    return
  }
  if (!quizDrawerOpen.value && route.query.action === 'quiz' && route.query.stageId === stage.id) {
    quizDrawerOpen.value = true
  }
})

onMounted(() => { void loadJourney() })
</script>

<template>
  <div class="journey-page min-h-full text-slate-900">
    <div v-if="loading" class="loading-state">
      <span class="material-symbols-outlined text-3xl animate-pulse">hourglass_top</span>
      正在整理学习地图
    </div>

    <main v-else class="page-shell">
      <aside class="sidebar">
        <article class="side-card side-card--progress">
          <p class="eyebrow">当前进度</p>
          <h1 class="shufa" style="font-family: 'LXGW WenKai', 'STKaiti', cursive">{{ activeStage?.title || '闯关之路' }}</h1>
          <div class="progress-bar"><i :style="{ width: `${progressPercent}%` }"></i></div>
          <p class="side-copy">{{ progressPercent }}% · {{ clearedStages.length }}/{{ stages.length }} 关已完成</p>
          <div class="side-chip-row">
            <span>{{ stageStatusLabel(activeStage) }}</span>
            <span>{{ stageTaskLabel(activeStage) }}</span>
            <span>+{{ activeStage?.rewardExp || 0 }} EXP</span>
          </div>
          <div class="side-focus">
            <strong>本关目标</strong>
            <p>{{ stageDisplayObjective(activeStage) }}</p>
          </div>
          <button class="primary-btn" @click="openStageAction(activeStage)">
            {{ activeStage?.taskType === 'quiz' ? '开始答题' : activeStage?.taskType === 'publish' ? '去发布' : '继续闯关' }}
          </button>
        </article>

        <article class="side-card side-card--image">
          <img :src="stageBannerImage" alt="长卷背景" />
          <div class="side-card__mask"></div>
          <div class="side-card__content">
            <p class="eyebrow eyebrow--light">山水长卷</p>
            <h2>把练唱、赏析、答题和发布串成一条完整路径</h2>
            <div class="side-card__tags">
              <span>练唱</span>
              <span>解构</span>
              <span>答题</span>
              <span>发布</span>
            </div>
          </div>
        </article>
      </aside>

      <section class="map-wrap" :style="journeyStyle">
        <div class="map-head">
          <div>
            <p class="eyebrow">学习地图</p>
            <h2 style="font-family: 'LXGW WenKai', 'STKaiti', cursive">从练唱到发布，一步一步走完</h2>
          </div>
          <p class="map-copy">{{ clearedStages.length }}/{{ stages.length }} 关已点亮，推进后新关卡会继续显现。</p>
        </div>

        <div class="stage-board">
          <div class="map-canvas" :style="mapCanvasStyle">
            <svg class="path-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path :d="buildMapPath()" fill="none" stroke="rgba(160, 102, 46, 0.16)" stroke-width="2.4" />
              <path :d="buildMapPath()" fill="none" stroke="rgba(212, 175, 55, 0.72)" stroke-width="1.18" stroke-linecap="round" />
              <path :d="buildMapPath()" fill="none" stroke="rgba(255, 244, 214, 0.88)" stroke-width="0.34" stroke-dasharray="1.4 1.1" />
            </svg>
            <div class="map-canvas__texture" :style="{ backgroundImage: `url(${journeyVisuals.textureImage})` }"></div>
            <div class="fog-layer"></div>

            <div class="stage-layer">
              <button
                v-for="(stage, index) in stages"
                :key="stage.id"
                class="stage-node"
                :class="[
                  stage.isCleared ? 'is-cleared' : '',
                  stage.isUnlocked && activeStage?.id === stage.id ? 'is-active' : '',
                  stage.isUnlocked ? '' : 'is-locked'
                ]"
                :style="stageNodeStyle(index)"
                @click="selectStage(stage)"
              >
                <span class="stage-node__icon material-symbols-outlined">
                  {{ stage.isCleared ? 'check_circle' : stage.taskType === 'quiz' ? 'school' : stage.taskType === 'publish' ? 'publish' : 'mic' }}
                </span>
                <strong>{{ stageDisplayTitle(stage) }}</strong>
              </button>
            </div>
          </div>

          <article class="active-stage-card" :class="activeStage?.isUnlocked ? '' : 'is-locked'">
            <div class="active-stage-card__head">
              <div>
                <p class="eyebrow">{{ stageStatusLabel(activeStage) }}</p>
                <h3>{{ stageDisplayTitle(activeStage) }}</h3>
              </div>
              <span class="active-stage-card__reward">{{ activeStage?.rewardExp || 0 }} 经验</span>
            </div>
            <p class="active-stage-card__copy">{{ stageDisplayObjective(activeStage) }}</p>
            <div class="active-stage-card__meta">
              <span>{{ stageTaskLabel(activeStage) }}</span>
              <span v-if="activeStage?.supportRoute && activeStage?.isUnlocked">附带示范</span>
              <span v-if="activeStage && !activeStage.isUnlocked">内容未揭晓</span>
            </div>
            <div class="active-stage-card__actions">
              <button class="ghost-btn" :disabled="!activeStage?.isUnlocked || !activeStage?.supportRoute" @click="openSupport(activeStage)">看示范</button>
              <button class="primary-btn" :disabled="!activeStage?.isUnlocked" @click="openStageAction(activeStage)">
                {{ activeStage?.taskType === 'quiz' ? '去答题' : activeStage?.taskType === 'publish' ? '去发布' : '去练唱' }}
              </button>
            </div>
            <div class="active-stage-card__steps">
              <button
                v-for="(stage, index) in stages"
                :key="`${stage.id}-step`"
                class="stage-step"
                :class="[
                  stage.isCleared ? 'is-cleared' : '',
                  activeStage?.id === stage.id ? 'is-active' : '',
                  stage.isUnlocked ? '' : 'is-locked'
                ]"
                @click="selectStage(stage)"
              >
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <strong>{{ stage.isUnlocked ? stage.title : '待启封' }}</strong>
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="quizDrawerOpen && activeStage?.taskType === 'quiz'" class="drawer-backdrop" @click="quizDrawerOpen = false"></div>
    <section v-if="quizDrawerOpen && activeStage?.taskType === 'quiz'" class="drawer" @click.stop>
      <div class="drawer__head">
        <div>
          <p class="eyebrow">理论闯关</p>
          <h3>{{ quizDrawerTitle }}</h3>
          <p class="side-copy">需要全部答对才算通关</p>
        </div>
        <button class="drawer__close" @click="quizDrawerOpen = false"><span class="material-symbols-outlined">close</span></button>
      </div>

      <div class="quiz-list">
        <article v-for="(question, index) in quizData?.questions || []" :key="question.id" class="quiz-card">
          <p class="eyebrow">第 {{ index + 1 }} 题</p>
          <h4>{{ question.prompt }}</h4>
          <div class="option-list">
            <label v-for="option in question.options" :key="option.id" class="option-item" :class="optionResultClass(question, option)">
              <input v-model="quizAnswers[question.id]" type="radio" :name="question.id" :value="option.id" />
              <span>{{ option.label }}</span>
            </label>
          </div>
          <p v-if="quizResult" class="result-tip" :class="isQuestionCorrect(question.id) ? 'is-right' : 'is-wrong'">
            {{ isQuestionCorrect(question.id) ? '回答正确' : '回答错误' }} · {{ resultForQuestion(question.id)?.explanation }}
          </p>
          <p v-if="quizResult" class="result-answer">
            你的答案：{{ answerLabel(question, quizAnswers[question.id]) }} · 正确答案：{{ answerLabel(question, question.correctAnswer) }}
          </p>
        </article>
      </div>

      <div class="drawer__foot">
        <div v-if="quizResult" class="quiz-summary" :class="quizPassed ? 'is-pass' : 'is-fail'">
          <strong>{{ quizPassed ? '已通关' : '还差一点' }}</strong>
          <span>{{ quizScoreSummary.correct }}/{{ quizScoreSummary.total }} 题答对，{{ quizPassed ? '本关已点亮' : '本关需要全部答对才算通关' }}</span>
        </div>
        <button class="primary-btn" :disabled="quizSubmitting" @click="submitQuiz">
          {{ quizSubmitting ? '正在提交' : '提交答案' }}
        </button>
        <button class="ghost-btn ghost-btn--dark" @click="resetQuizState">重置</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.journey-page {
  background: transparent;
}

.loading-state {
  min-height: 56vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #a34135;
}

.page-shell {
  max-width: 1700px;
  margin: 0 auto;
  padding: 1.1rem 0.8rem 1.5rem;
  display: grid;
  gap: 1.2rem;
  grid-template-columns: 304px minmax(0, 1fr);
}

.sidebar {
  display: grid;
  gap: 1rem;
}

.side-card,
.map-wrap,
.drawer {
  border-radius: 32px;
  border: 1px solid rgba(182, 149, 106, 0.18);
  background: rgba(255, 252, 246, 0.92);
  box-shadow: 0 26px 60px rgba(92, 59, 35, 0.1);
}

.side-card {
  position: relative;
  overflow: hidden;
  padding: 1.2rem;
}

.side-card--progress {
  background:
    linear-gradient(180deg, rgba(255, 251, 246, 0.98), rgba(246, 236, 219, 0.92)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.08), transparent 34%);
}

.side-card--image {
  min-height: 220px;
  padding: 0;
  color: #fff;
}

.side-card--image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.side-card__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(19, 11, 8, 0.08) 0%, rgba(19, 11, 8, 0.72) 100%);
}

.side-card__content {
  position: relative;
  z-index: 1;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.1rem;
}

.side-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.side-card__tags span,
.side-chip-row span,
.active-stage-card__meta span {
  border-radius: 999px;
  padding: 0.34rem 0.72rem;
  font-size: 11px;
  font-weight: 700;
}

.side-card__tags span {
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 245, 230, 0.88);
}

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: rgba(163, 65, 53, 0.72);
}

.eyebrow--light {
  color: rgba(255, 255, 255, 0.82);
}

.side-card h1,
.side-card h2,
.side-card h3 {
  margin-top: 0.35rem;
  font-weight: 700;
}

.side-card h1 {
  font-size: clamp(1.8rem, 2.6vw, 2.3rem);
}

.side-card h2 {
  font-size: 1.3rem;
  line-height: 1.6;
}

.progress-bar {
  margin-top: 1rem;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(115, 109, 97, 0.12);
}

.progress-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a34135, #d4af37);
}

.side-copy {
  margin-top: 0.75rem;
  font-size: 12px;
  line-height: 1.8;
  color: #736d61;
}

.side-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

.side-chip-row span,
.active-stage-card__meta span {
  background: rgba(163, 65, 53, 0.08);
  color: #8b3232;
}

.side-focus {
  margin-top: 1rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.66);
  padding: 0.95rem 1rem;
}

.side-focus strong {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #8d7c69;
}

.side-focus p {
  margin-top: 0.4rem;
  font-size: 13px;
  line-height: 1.8;
  color: #5d5248;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.9rem 1.25rem;
  font-size: 13px;
  font-weight: 700;
}

.primary-btn {
  background: linear-gradient(135deg, #a34135, #c57e43);
  color: #fff;
  box-shadow: 0 18px 28px rgba(163, 65, 53, 0.18);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.72);
  color: #62564b;
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.side-card--progress .primary-btn {
  margin-top: 1rem;
  width: 100%;
}

.map-wrap {
  padding: 1.2rem;
  background:
    linear-gradient(180deg, rgba(255, 252, 246, 0.96), rgba(249, 241, 228, 0.9)),
    radial-gradient(circle at top right, rgba(212, 175, 55, 0.14), transparent 30%);
}

.map-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.map-head h2 {
  margin-top: 0.35rem;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  font-weight: 700;
  color: #2b2622;
}

.map-copy {
  max-width: 24rem;
  font-size: 13px;
  line-height: 1.85;
  color: #6e6256;
}

.stage-board {
  display: grid;
  gap: 1.05rem;
  grid-template-columns: minmax(0, 1.3fr) minmax(340px, 0.78fr);
  align-items: start;
}

.map-canvas {
  position: relative;
  min-height: 690px;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  background-color: rgba(255, 251, 246, 0.56);
}

.path-layer,
.fog-layer,
.map-canvas__texture,
.stage-layer {
  position: absolute;
  inset: 2.25rem 2.9rem;
}

.path-layer {
  z-index: 1;
  width: calc(100% - 5.8rem);
  height: calc(100% - 4.5rem);
}

.map-canvas__texture {
  background-size: 320px auto;
  background-repeat: repeat;
  mix-blend-mode: multiply;
  opacity: 0.12;
  z-index: 0;
}

.fog-layer {
  background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.36), transparent 24%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.28), transparent 22%), radial-gradient(circle at 60% 76%, rgba(255,255,255,0.24), transparent 20%);
  z-index: 2;
}

.stage-layer {
  z-index: 3;
}

.stage-node {
  position: absolute;
  min-width: 164px;
  transform: translate(-50%, -50%);
  border-radius: 24px;
  border: 1px solid rgba(182, 149, 106, 0.16);
  background: rgba(255, 255, 255, 0.82);
  padding: 1rem 1.1rem;
  text-align: center;
  box-shadow: 0 18px 24px rgba(92, 59, 35, 0.08);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.stage-node strong {
  display: block;
  margin-top: 0.38rem;
  font-size: 14px;
  font-weight: 700;
  color: #2b2622;
}

.stage-node__icon {
  color: #a34135;
  font-size: 1.35rem;
}

.stage-node.is-active {
  border-color: rgba(163, 65, 53, 0.26);
  box-shadow: 0 22px 32px rgba(163, 65, 53, 0.14);
  transform: translate(-50%, -54%);
}

.stage-node.is-cleared {
  background: linear-gradient(180deg, rgba(255, 251, 240, 0.96), rgba(250, 239, 214, 0.92));
}

.stage-node.is-locked {
  opacity: 0.5;
  cursor: default;
}

.active-stage-card {
  border-radius: 30px;
  background: rgba(255, 252, 246, 0.9);
  border: 1px solid rgba(182, 149, 106, 0.18);
  padding: 1.2rem;
  position: sticky;
  top: 100px;
}

.active-stage-card.is-locked {
  opacity: 0.7;
}

.active-stage-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.active-stage-card__head h3 {
  margin-top: 0.3rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: #2b2622;
}

.active-stage-card__reward {
  border-radius: 999px;
  background: rgba(212, 175, 55, 0.14);
  padding: 0.42rem 0.8rem;
  font-size: 11px;
  font-weight: 700;
  color: #8f6d1b;
}

.active-stage-card__copy {
  margin-top: 0.9rem;
  font-size: 14px;
  line-height: 1.9;
  color: #6a5f54;
}

.active-stage-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.95rem;
}

.active-stage-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.active-stage-card__steps {
  display: grid;
  gap: 0.7rem;
  margin-top: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.stage-step {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.82rem 0.9rem;
  text-align: left;
}

.stage-step span {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8b3232;
  font-weight: 800;
}

.stage-step strong {
  color: #2b2622;
  font-size: 13px;
}

.stage-step.is-active {
  border: 1px solid rgba(163, 65, 53, 0.18);
}

.stage-step.is-locked {
  opacity: 0.48;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px);
  z-index: 60;
}

.drawer {
  position: fixed;
  right: 1rem;
  top: 1rem;
  bottom: 1rem;
  width: min(92vw, 480px);
  z-index: 70;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.drawer__head,
.drawer__foot {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

.drawer__close {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255,255,255,0.72);
}

.quiz-list {
  display: grid;
  gap: 0.8rem;
  margin: 1rem 0;
  overflow-y: auto;
}

.quiz-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  padding: 1rem;
}

.quiz-card h4 {
  margin-top: 0.35rem;
  font-size: 15px;
  font-weight: 700;
  color: #2b2622;
  line-height: 1.8;
}

.option-list {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.option-item {
  border-radius: 16px;
  border: 1px solid rgba(182, 149, 106, 0.16);
  background: rgba(255,255,255,0.84);
  padding: 0.82rem 0.9rem;
  display: flex;
  gap: 0.65rem;
}

.option-item.is-selected {
  border-color: rgba(163, 65, 53, 0.26);
  background: rgba(163, 65, 53, 0.06);
}

.option-item.is-correct {
  border-color: rgba(21, 128, 61, 0.28);
  background: rgba(34, 197, 94, 0.1);
}

.option-item.is-wrong {
  border-color: rgba(185, 28, 28, 0.24);
  background: rgba(239, 68, 68, 0.08);
}

.option-item input {
  margin-top: 0.25rem;
}

.result-tip {
  margin-top: 0.8rem;
  font-size: 12px;
  line-height: 1.8;
}

.result-answer {
  margin-top: 0.3rem;
  font-size: 12px;
  line-height: 1.7;
  color: #7a6c61;
}

.result-tip.is-right {
  color: #15803d;
}

.result-tip.is-wrong {
  color: #b91c1c;
}

.quiz-summary {
  flex: 1;
  border-radius: 18px;
  padding: 0.8rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
}

.quiz-summary strong {
  font-size: 13px;
  font-weight: 800;
}

.quiz-summary span {
  font-size: 12px;
  line-height: 1.6;
}

.quiz-summary.is-pass {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.quiz-summary.is-fail {
  background: rgba(239, 68, 68, 0.08);
  color: #9f1239;
}

@media (max-width: 1180px) {
  .page-shell,
  .stage-board {
    grid-template-columns: 1fr;
  }

  .map-canvas {
    min-height: 640px;
  }

  .active-stage-card {
    position: static;
  }
}

@media (max-width: 768px) {
  .page-shell {
    padding: 0.9rem 0.8rem 1rem;
  }

  .map-wrap,
  .side-card,
  .active-stage-card,
  .drawer {
    border-radius: 24px;
  }

  .map-canvas {
    min-height: 560px;
  }

  .stage-node {
    min-width: 120px;
    padding: 0.78rem 0.86rem;
  }

  .active-stage-card__actions {
    grid-template-columns: 1fr;
  }

  .drawer {
    left: 0.8rem;
    right: 0.8rem;
    top: auto;
    bottom: 0.8rem;
    width: auto;
    max-height: calc(100vh - 1.6rem);
  }
}
</style>
