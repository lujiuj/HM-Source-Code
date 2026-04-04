/**
 * Qwen Embedding / Rerank provider stub for Learn-AI — Retrieval Pool.
 *
 * Uses DashScope OpenAI-compatible endpoint with embedding and rerank models.
 * Configured only when DASHSCOPE_API_KEY (or aliases) is present.
 *
 * This is a P2 stub — the request path returns structured placeholders
 * so that callers can integrate without waiting for full retrieval.
 */

const EMBEDDING_POOL_MODELS = new Set([
  'text-embedding-v4',
  'text-embedding-v3'
])

const RERANK_POOL_MODELS = new Set([
  'qwen3-rerank',
  'gte-rerank-v2'
])

const EMBEDDING_FALLBACK_ORDER = ['text-embedding-v4', 'text-embedding-v3']
const RERANK_FALLBACK_ORDER = ['qwen3-rerank', 'gte-rerank-v2']

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-v4'
const DEFAULT_RERANK_MODEL = 'qwen3-rerank'

const MASTER_RECALL_BANK = {
  'tianxianpei-fuqishuangshuang': {
    fragments: [
      {
        title: '先唱关系，再唱甜味',
        excerpt: '这段不是单纯唱甜，而是把董永与七仙女并肩回家的安稳感先唱出来。',
        focus: '人物关系',
        drill: '每四句先用念白读顺夫妻对答口气，再回到旋律。'
      },
      {
        title: '句尾要兜住',
        excerpt: '“笑颜、发间、家还”这些句尾都要轻轻往里含住，不能提前松掉。',
        focus: '句尾收束',
        drill: '把每句尾字单独拉长半拍，确认收腔不散再连句。'
      }
    ],
    recommendations: [
      '先稳住“成双对、带笑颜、把家还”三个句尾，再回到整段。',
      '用念白先把夫妻对唱的口吻读顺，再带旋律唱。',
      '甜味来自人物关系，不要用表面用力去堆情绪。'
    ]
  },
  'nvfuma-weijiulilang': {
    fragments: [
      {
        title: '字头要立，叙事要推',
        excerpt: '这段看的是冯素珍往前赶情节的劲，不是单句漂亮就够。',
        focus: '字头与叙事',
        drill: '先用中速把每句字头念实，再按剧情推进顺序连起来。'
      },
      {
        title: '快里不能乱',
        excerpt: '越是明快段落，越要把板眼和换气点钉牢。',
        focus: '节奏与换气',
        drill: '把长句切成两段练，固定换气位置后再恢复原速。'
      }
    ],
    recommendations: [
      '先抓字头和板眼，再补人物气势。',
      '每两句连练一次，检查叙事推进有没有断。',
      '尾字不要虚，尤其赶考类叙事句要有落点。'
    ]
  }
}

const WEAK_DIMENSION_HINTS = {
  pitch: '优先用慢速跟音把句尾落音唱准，再回原速。',
  rhythm: '先把板眼和换气点钉住，再追求流动感。',
  articulation: '先念白再上旋律，把字头和尾字都唱清。',
  style: '多模仿名师句头句尾的抻收，补足黄梅戏韵味。',
  breath: '把长句拆成两段，固定换气位置后再整句连唱。',
  emotion: '先定人物关系和情境，再让情绪往外走。'
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function resolveApiKey(env = process.env) {
  return (
    safeText(env.DASHSCOPE_API_KEY)
    || safeText(env.QWEN_API_KEY)
    || safeText(env.LEARN_QWEN_API_KEY)
  )
}

export function resolveEmbeddingModel(model) {
  const normalized = safeText(model, DEFAULT_EMBEDDING_MODEL).toLowerCase()
  if (EMBEDDING_POOL_MODELS.has(normalized)) return normalized
  return DEFAULT_EMBEDDING_MODEL
}

export function resolveRerankModel(model) {
  const normalized = safeText(model, DEFAULT_RERANK_MODEL).toLowerCase()
  if (RERANK_POOL_MODELS.has(normalized)) return normalized
  return DEFAULT_RERANK_MODEL
}

export function isRetrievalConfigured() {
  return Boolean(resolveApiKey())
}

/**
 * Stub: retrieve relevant master fragments for a given query context.
 *
 * In full implementation this would embed the query, search a vector store,
 * and rerank results. For now it returns a structured "not-available" result.
 */
export async function requestMasterRecall(options = {}) {
  const raw = options?.payload && typeof options.payload === 'object' ? options.payload : options
  const apiKey = resolveApiKey()
  const songId = safeText(raw.songId)

  if (!songId) {
    return {
      ok: false,
      available: false,
      reason: 'missing-song-id',
      fragments: [],
      recommendations: []
    }
  }

  const embeddingModel = resolveEmbeddingModel(
    safeText(options.preferredEmbeddingModel || process.env.QWEN_EMBEDDING_MODEL)
  )
  const rerankModel = resolveRerankModel(
    safeText(options.preferredRerankModel || process.env.QWEN_RERANK_MODEL)
  )

  const weakDimensions = Array.isArray(raw.weakDimensions)
    ? raw.weakDimensions.map((item) => safeText(typeof item === 'string' ? item : item?.key)).filter(Boolean)
    : []
  const query = safeText(raw.query)
  const issueNotes = Array.isArray(raw.lineIssues)
    ? raw.lineIssues.map((item) => safeText(typeof item === 'string' ? item : item?.issue || item?.lineText)).filter(Boolean)
    : []

  const bank = MASTER_RECALL_BANK[songId] || {
    fragments: [
      {
        title: '先立句法，再补神态',
        excerpt: '黄梅戏先求句法顺，再求人物气口和韵味。',
        focus: '句法',
        drill: '先按句群念白，再带旋律整合。'
      }
    ],
    recommendations: []
  }

  const fragments = [...bank.fragments]
  if (weakDimensions.length) {
    fragments.push(...weakDimensions.slice(0, 2).map((key) => ({
      title: `针对${key}补强`,
      excerpt: WEAK_DIMENSION_HINTS[key] || '先拆句慢练，再回到整段。',
      focus: key,
      drill: WEAK_DIMENSION_HINTS[key] || '先拆句慢练，再回到整段。'
    })))
  }

  const recommendations = [
    ...bank.recommendations,
    ...weakDimensions.slice(0, 2).map((key) => WEAK_DIMENSION_HINTS[key]).filter(Boolean),
    ...issueNotes.slice(0, 1).map((item) => `优先回到“${item}”对应句子，先把最明显的问题改干净。`),
    query ? `围绕“${query}”去听名师处理，保持同一种人物口气与句法。` : ''
  ].filter(Boolean).slice(0, 4)

  return {
    ok: true,
    available: true,
    embeddingModel,
    rerankModel,
    reason: apiKey ? 'catalog-recall' : 'catalog-recall-no-remote',
    fragments: fragments.slice(0, 4),
    recommendations
  }
}

export function buildRetrievalHealthModels() {
  const apiKey = resolveApiKey()
  return {
    configured: Boolean(apiKey),
    embeddingModel: resolveEmbeddingModel(),
    rerankModel: resolveRerankModel(),
    embeddingPoolModels: Array.from(EMBEDDING_POOL_MODELS),
    rerankPoolModels: Array.from(RERANK_POOL_MODELS),
    embeddingFallbackOrder: [...EMBEDDING_FALLBACK_ORDER],
    rerankFallbackOrder: [...RERANK_FALLBACK_ORDER]
  }
}
