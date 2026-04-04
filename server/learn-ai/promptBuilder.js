import { getSongById } from '../config/karaokeLibrary.js'
import { normalizeMode } from './responseSchema.js'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function resolveSongContext(payload = {}) {
  const songId = safeText(payload.songId)
  const song = songId ? getSongById(songId) : null

  return {
    operaName: safeText(payload.operaName || song?.operaName, '黄梅戏'),
    excerptName: safeText(payload.songName || payload.excerptName || song?.excerptName, '当前唱段'),
    singer: safeText(payload.singer || song?.singer, '未知演唱者'),
    style: safeText(payload.style || song?.style, '未提供')
  }
}

function buildPublishShape() {
  return {
    headline: '发布前建议标题',
    summary: '发布建议摘要',
    items: ['动作 1', '动作 2', '动作 3']
  }
}

function buildWorkDetailShape() {
  return {
    overallJudgement: '一句话说明这次作品最值得复盘的判断',
    weakestDimension: {
      key: 'pitch',
      label: '音准',
      reason: '为什么这是当前最弱的一维',
      suggestion: '一句最直接的修正建议'
    },
    lineIssues: [
      {
        lineIndex: 0,
        lineText: '需要回练的那一句',
        issue: '这一句最主要的问题',
        tip: '下一轮怎么改'
      }
    ],
    nextSteps: ['下一轮第一个动作', '下一轮第二个动作', '下一轮第三个动作'],
    voiceoverText: '给作者播放的老师口播文案'
  }
}

function buildPracticeEncourageShape() {
  return {
    summary: '一句结论',
    focusPoint: '当前最该改的一个点',
    nextStep: '下一轮怎么练',
    lineIssues: [
      {
        lineIndex: 0,
        lineText: '最需要回练的那一句',
        issue: '问题',
        tip: '怎么改'
      }
    ]
  }
}

function buildSystemPrompt(mode) {
  if (mode === 'work-detail') {
    return [
      '你是黄梅戏作品详情页的作者复盘助手。',
      '你的任务是基于真实评分数据，输出严谨、可执行、只面向作者本人的复盘建议。',
      '禁止虚构输入中没有的事实，禁止夸张鼓励，禁止输出公开评价口吻。',
      '只返回 JSON 对象，不要输出 JSON 之外的任何文字。'
    ].join('\n')
  }

  if (mode === 'practice-encourage') {
    return [
      '你是黄梅戏练唱结果页的即时点评助手。',
      '你的任务是把点评压缩成一句结论、一个最该改的点、以及下一轮怎么练。',
      '只返回 JSON 对象，不要输出 JSON 之外的任何文字。'
    ].join('\n')
  }

  return [
    '你是黄梅戏练唱模块的发布前复盘助手。',
    '你的任务是根据真实评分数据，生成简洁、可信、可执行的中文发布建议。',
    '不要虚构输入里没有的事实，不要给空话套话。',
    '只返回 JSON 对象，不要输出 JSON 之外的任何文字。'
  ].join('\n')
}

function buildUserPrompt(mode, payload = {}) {
  const song = resolveSongContext(payload)
  const outputShape = mode === 'work-detail'
    ? buildWorkDetailShape()
    : mode === 'practice-encourage'
      ? buildPracticeEncourageShape()
      : buildPublishShape()

  const sceneDescription = mode === 'work-detail'
    ? '场景：作品详情页作者复盘'
    : mode === 'practice-encourage'
      ? '场景：练唱结束后的即时点评'
      : '场景：发布页的发布前建议卡片'

  return [
    sceneDescription,
    `模式：${mode}`,
    `曲目：${song.operaName} / ${song.excerptName} / ${song.singer}`,
    `风格：${song.style}`,
    '输入数据：',
    JSON.stringify(payload || {}, null, 2),
    '',
    '输出 JSON 模板（字段必须完整，值必须替换为实际内容）：',
    JSON.stringify(outputShape, null, 2),
    '严格按模板返回，不要增加模板外字段。'
  ].join('\n')
}

export function buildModePrompt(mode, payload = {}) {
  const normalizedMode = normalizeMode(mode)
  return {
    system: buildSystemPrompt(normalizedMode),
    user: buildUserPrompt(normalizedMode, payload)
  }
}

export function getModeMaxTokens(mode) {
  const normalizedMode = normalizeMode(mode)
  if (normalizedMode === 'work-detail') return 1100
  if (normalizedMode === 'practice-encourage') return 700
  return 850
}
