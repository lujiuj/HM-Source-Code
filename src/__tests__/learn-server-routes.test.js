import { createServer, request as httpRequest } from 'node:http'

import { afterEach, describe, expect, it } from 'vitest'

import { createApp } from '../../server/server.js'

const runningServers = []

async function startApp(learnAi) {
  const app = createApp({ learnAi })
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  runningServers.push(server)
  const { port } = server.address()
  return { hostname: '127.0.0.1', port }
}

function postJson(target, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        resolve({
          status: Number(res.statusCode || 0),
          json: raw ? JSON.parse(raw) : null
        })
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

afterEach(async () => {
  while (runningServers.length) {
    const server = runningServers.pop()
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})

describe('learn backend routes', () => {
  it('returns work-detail audio analysis for owner review', async () => {
    const target = await startApp({
      getHealth: () => ({ ok: true }),
      getAdvice: async () => ({
        meta: { status: 200 },
        data: {
          overallJudgement: '优先回到第一句的音准。',
          weakestDimension: {
            key: 'pitch',
            label: '音准',
            reason: '第一句起音偏高。',
            suggestion: '先慢练再回原速。'
          },
          lineIssues: [{ lineIndex: 0, lineText: '第一句', issue: '起音偏高', tip: '先半速找音高' }],
          nextSteps: ['回练第一句', '稳住句尾', '再完整唱一遍'],
          voiceoverText: '先把第一句音准和句尾稳住。'
        }
      }),
      getAudioInsights: async () => ({
        ok: false,
        reason: 'stub-not-implemented',
        model: 'qwen-omni-turbo',
        insights: null
      }),
      synthesizeTts: async () => ({ ok: false, reason: 'unused' }),
      getMasterRecall: async () => ({ ok: false, reason: 'unused', fragments: [], recommendations: [] })
    })

    const response = await postJson(target, '/api/learn/audio-analysis', {
      payload: {
        context: 'work-detail',
        workId: 'work-1',
        songId: 'song-1',
        audioUrl: 'https://example.com/demo.mp3',
        lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 71 }],
        analysisV2: {
          overallScore: 81,
          overallGrade: 'B',
          dimensions: {
            pitch: 72,
            rhythm: 84,
            articulation: 80,
            style: 78,
            breath: 79,
            emotion: 77
          },
          lineDiagnostics: [
            {
              lineIndex: 0,
              lineText: '第一句',
              overall: 71,
              scores: {
                pitch: 68,
                rhythm: 83,
                articulation: 80,
                style: 77,
                breath: 79,
                emotion: 76
              }
            }
          ]
        }
      }
    })

    expect(response.status).toBe(200)
    expect(response.json.context).toBe('work-detail')
    expect(response.json.workId).toBe('work-1')
    expect(response.json.objectiveAnalysis.overallScore).toBe(81)
    expect(response.json.finalAdvice.overallJudgement).toContain('第一句')
    expect(response.json.audioInsights.reason).toBe('stub-not-implemented')
  })

  it('validates missing tts text', async () => {
    const target = await startApp({
      getHealth: () => ({ ok: true }),
      getAdvice: async () => ({ meta: { status: 200 }, data: {} }),
      getAudioInsights: async () => ({ ok: false, reason: 'unused' }),
      synthesizeTts: async () => ({ ok: false, reason: 'unused' }),
      getMasterRecall: async () => ({ ok: false, reason: 'unused', fragments: [], recommendations: [] })
    })

    const response = await postJson(target, '/api/learn/tts', { payload: {} })

    expect(response.status).toBe(422)
    expect(response.json.reason).toBe('missing-text')
  })

  it('returns structured master recall payload', async () => {
    const target = await startApp({
      getHealth: () => ({ ok: true }),
      getAdvice: async () => ({ meta: { status: 200 }, data: {} }),
      getAudioInsights: async () => ({ ok: false, reason: 'unused' }),
      synthesizeTts: async () => ({ ok: false, reason: 'unused' }),
      getMasterRecall: async () => ({
        ok: false,
        reason: 'stub-not-implemented',
        embeddingModel: 'text-embedding-v4',
        rerankModel: 'qwen3-rerank',
        fragments: [],
        recommendations: []
      })
    })

    const response = await postJson(target, '/api/learn/master-recall', {
      payload: {
        songId: 'song-1',
        weakDimensions: ['pitch'],
        lineIssues: ['第一句音准偏高'],
        query: '找一个音准处理示范'
      }
    })

    expect(response.status).toBe(200)
    expect(response.json.source).toBe('master-recall')
    expect(response.json.available).toBe(false)
    expect(response.json.embeddingModel).toBe('text-embedding-v4')
    expect(response.json.rerankModel).toBe('qwen3-rerank')
  })
})
