import express from 'express'
import { createServer } from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

import { createLearnAiService } from './learn-ai/adviceService.js'
import { requestTtsSynthesize } from './learn-ai/providers/ttsClient.js'
import {
  buildAudioAnalysisResponse,
  buildAudioAnalysisUnavailable,
  canBuildAudioAnalysis,
  getAudioAnalysisContext,
  hasAudioInsightInput
} from './learn-ai/audioAnalysisService.js'
import { loadLocalEnvFiles, resolveLearnAiEnv } from './learn-ai/envResolver.js'

/* -------------------------------------------------------
   Utils
------------------------------------------------------- */

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizePayload(body = {}) {
  return body.payload &&
    typeof body.payload === 'object' &&
    !Array.isArray(body.payload)
    ? body.payload
    : body
}

function normalizeList(value, limit = 4) {
  if (!Array.isArray(value)) return []
  return value.map((item) => safeText(item)).filter(Boolean).slice(0, limit)
}

function normalizeMasterRecall(masterRecall) {
  if (!masterRecall || typeof masterRecall !== 'object') {
    return {
      available: false,
      reason: 'not-requested',
      embeddingModel: null,
      rerankModel: null,
      fragments: [],
      recommendations: []
    }
  }

  return {
    available: Boolean(
      masterRecall.ok
      || masterRecall.available
      || (Array.isArray(masterRecall.fragments) && masterRecall.fragments.length)
    ),
    reason: safeText(masterRecall.reason, masterRecall.ok ? '' : 'not-available'),
    embeddingModel: safeText(masterRecall.embeddingModel) || null,
    rerankModel: safeText(masterRecall.rerankModel) || null,
    fragments: Array.isArray(masterRecall.fragments) ? masterRecall.fragments.slice(0, 4) : [],
    recommendations: normalizeList(masterRecall.recommendations, 4)
  }
}

function slugifySegment(value, fallback = 'voice') {
  const raw = safeText(value, fallback)
  return raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40)
    .replace(/^_+|_+$/g, '') || fallback
}

function hashText(text) {
  return crypto.createHash('sha1').update(String(text || ''), 'utf8').digest('hex').slice(0, 12)
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function findReferenceAudio(voiceDir, voiceStyle) {
  const base = slugifySegment(voiceStyle, '')
  if (!base) return null

  const candidates = [
    `${base}.wav`,
    `${base}.mp3`,
    `${base}.m4a`,
    `${base}.ogg`,
    `${base}.flac`
  ].map((name) => path.join(voiceDir, name))

  for (const p of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await fileExists(p)) return p
  }
  return null
}

/* -------------------------------------------------------
   ✅ Production-Grade CORS
------------------------------------------------------- */

function getAllowedOrigins() {
  const raw = safeText(process.env.ALLOWED_ORIGINS)
  if (!raw) return []
  return raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin) {
  const value = safeText(origin)

  // ✅ Allow no-origin (Postman / curl / mobile app)
  if (!value) return true

  // ✅ Dev mode: allow everything
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const whitelist = getAllowedOrigins()

  // ✅ If no whitelist configured → allow (fail-open)
  if (!whitelist.length) return true

  return whitelist.includes(value)
}

function applyCors(req, res) {
  const origin = req.headers.origin

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'content-type, authorization'
  )
  res.setHeader('Access-Control-Max-Age', '86400')
}

/* -------------------------------------------------------
   AI Service Factory
------------------------------------------------------- */

function buildLearnAiServiceFromEnv() {
  const loadedEnvFiles = loadLocalEnvFiles()
  const aiEnv = resolveLearnAiEnv()
  const cacheDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'cache'
  )

  return createLearnAiService({
    apiKey: aiEnv.apiKey,
    requestedModel: aiEnv.requestedModel,
    keySource: aiEnv.keySource || aiEnv.qwenKeySource,
    modelSource: aiEnv.modelSource,
    loadedEnvFiles,
    cacheDir,
    cooldownMs: Number(process.env.AI_BUSY_COOLDOWN_MS || 20_000),
    defaultCacheTtlMs: Number(process.env.AI_CACHE_TTL_MS || 12 * 60_000),
    cacheTtlByMode: {
      publish: Number(process.env.AI_CACHE_TTL_PUBLISH_MS || 45 * 60_000),
      'work-detail': Number(
        process.env.AI_CACHE_TTL_WORK_DETAIL_MS || 45 * 60_000
      ),
      'practice-encourage': Number(
        process.env.AI_CACHE_TTL_PRACTICE_MS || 15 * 60_000
      )
    }
  })
}

/* -------------------------------------------------------
   App Factory
------------------------------------------------------- */

export function createApp(options = {}) {
  const app = express()
  const learnAi = options.learnAi || buildLearnAiServiceFromEnv()

  app.use(express.json({ limit: '512kb' }))
  app.use('/voice-clone', express.static(path.join(process.cwd(), 'public', 'voice-clone')))

  // ✅ Global CORS middleware
  app.use((req, res, next) => {
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  })

  /* ---------------- Health ---------------- */

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      ai: learnAi.getHealth()
    })
  })

  /* ---------------- Audio Analysis ---------------- */

  app.post('/api/learn/audio-analysis', async (req, res) => {
    const payload = normalizePayload(req.body || {})
    const context = getAudioAnalysisContext(payload)

    try {
      if (!canBuildAudioAnalysis(payload, context)) {
        return res.status(422).json(
          buildAudioAnalysisUnavailable(
            '当前练习记录缺少完整评分数据，请重新完成一次练唱。',
            {
              context,
              errorCode: 'INSUFFICIENT_ANALYSIS',
              status: 422
            }
          )
        )
      }

      const [adviceResult, audioInsightsResult, masterRecallResult] = await Promise.allSettled([
        learnAi.getAdvice({
          mode: context,
          payload,
          stream: false
        }),
        (context === 'work-detail' && hasAudioInsightInput(payload) && typeof learnAi.getAudioInsights === 'function')
          ? learnAi.getAudioInsights({ payload })
          : Promise.resolve(null),
        (context === 'work-detail' && typeof learnAi.getMasterRecall === 'function')
          ? learnAi.getMasterRecall({ payload: payload?.masterRecallPayload || payload?.masterRecall || payload })
          : Promise.resolve(null)
      ])

      const result = adviceResult.status === 'fulfilled' ? adviceResult.value : null
      const audioInsights = audioInsightsResult.status === 'fulfilled' ? audioInsightsResult.value : null
      const masterRecall = masterRecallResult.status === 'fulfilled' ? masterRecallResult.value : null

      if (audioInsightsResult.status === 'rejected') {
        console.warn('[learn] audioInsights failed:', audioInsightsResult.reason?.message || audioInsightsResult.reason)
      }
      if (masterRecallResult.status === 'rejected') {
        console.warn('[learn] masterRecall failed:', masterRecallResult.reason?.message || masterRecallResult.reason)
      }

      const resultMeta = result?.meta
      const resultData = result?.data

      if (!resultMeta || resultMeta.status >= 400) {
        return res.status(resultMeta?.status || 503).json(
          buildAudioAnalysisUnavailable(
            '分析服务暂时不可用，请稍后再试。',
            {
              context,
              errorCode: safeText(resultMeta?.errorCode, 'REQUEST_FAILED'),
              status: resultMeta?.status || 503
            }
          )
        )
      }

      res.json(
        buildAudioAnalysisResponse(payload, resultData, { context, audioInsights, masterRecall })
      )
    } catch (error) {
      res.status(500).json(
        buildAudioAnalysisUnavailable(
          safeText(error?.message, 'Audio analysis failed.'),
          { context, errorCode: 'SERVER_ERROR', status: 500 }
        )
      )
    }
  })

  /* ---------------- Master Recall ---------------- */

  app.post('/api/learn/master-recall', async (req, res) => {
    const payload = normalizePayload(req.body || {})

    if (typeof learnAi.getMasterRecall !== 'function') {
      return res.status(503).json({
        source: 'master-recall',
        ...normalizeMasterRecall(null)
      })
    }

    try {
      const result = await learnAi.getMasterRecall({ payload })
      return res.json({
        source: 'master-recall',
        ...normalizeMasterRecall(result)
      })
    } catch (error) {
      return res.status(503).json({
        source: 'master-recall',
        ...normalizeMasterRecall({
          ok: false,
          available: false,
          reason: 'request-failed',
          fragments: [],
          recommendations: []
        }),
        error: safeText(error?.message, 'Master recall request failed.')
      })
    }
  })

  /* ---------------- TTS (wav persistence) ---------------- */

  app.post('/api/learn/tts', async (req, res) => {
    const body = req.body || {}
    const payload = normalizePayload(body)

    const text = safeText(payload?.finalAdvice || payload?.text)
    const voiceStyle = safeText(payload?.voiceStyle || payload?.speaker || payload?.voice, 'narrator')

    if (!text) {
      return res.status(422).json({
        ok: false,
        available: false,
        reason: 'missing-text',
        audioUrl: null
      })
    }

    const voiceDir = path.join(process.cwd(), 'public', 'voice-clone')
    await fs.mkdir(voiceDir, { recursive: true })

    // 每句台词一个文件：speaker + hash(text)
    const speakerSlug = slugifySegment(voiceStyle, 'voice')
    const outFile = `${speakerSlug}_${hashText(text)}.wav`
    const outPath = path.join(voiceDir, outFile)

    // 已生成过则直接复用（同步语义：存在即“已落盘”）
    if (await fileExists(outPath)) {
      return res.json({
        ok: true,
        available: true,
        reason: 'reused',
        voiceStyle,
        audioUrl: `/voice-clone/${outFile}`,
        fileName: outFile
      })
    }

    // 是否存在参考音频（供 cosyvoice / 未来扩展）
    const referencePath = await findReferenceAudio(voiceDir, voiceStyle)

    // 当前仓库内未集成 cosyvoice 推理脚本，因此先走 Qwen TTS；
    // 但会把 referencePath 的存在情况保留在 reason 里，便于你后续接入 cosyvoice 时替换这里。
    const ttsResult = await requestTtsSynthesize({
      finalAdvice: text,
      voiceStyle,
      format: 'wav',
      responseFormat: 'wav'
    })

    if (!ttsResult?.ok || !ttsResult.audioBuffer) {
      return res.status(503).json({
        ok: false,
        available: false,
        reason: safeText(ttsResult?.reason, 'not-available'),
        error: safeText(ttsResult?.error, 'TTS not available'),
        voiceStyle,
        audioUrl: null
      })
    }

    // 同步落盘：必须 await 写入 + 再 access 一次确认存在
    await fs.writeFile(outPath, ttsResult.audioBuffer)
    await fs.access(outPath)

    return res.json({
      ok: true,
      available: true,
      reason: referencePath ? 'tts-generated-reference-present' : 'tts-generated',
      voiceStyle,
      audioUrl: `/voice-clone/${outFile}`,
      fileName: outFile
    })
  })

  return app
}

/* -------------------------------------------------------
   Server + Socket.io
------------------------------------------------------- */

export function startServer(options = {}) {
  const app = createApp(options)
  const server = createServer(app)

  const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true)
        } else {
          callback(new Error('CORS origin not allowed'))
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('✅ socket connected:', socket.id)

    socket.on('sendMessage', (data) => {
      socket.broadcast.emit('chatMessage', data)
    })

    socket.on('operaMessage', (data) => {
      socket.broadcast.emit('responseMessage', data)
    })
  })

  const port = Number(options.port || process.env.PORT || 3000)

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${port}`)
  })

  return { app, server, io }
}

/* -------------------------------------------------------
   CLI Boot
------------------------------------------------------- */

const currentFile = fileURLToPath(import.meta.url)
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === currentFile

if (isMain) {
  startServer()
}