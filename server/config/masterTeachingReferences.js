function dedupeSources(list) {
  const seen = new Set()
  const out = []
  for (const item of list || []) {
    if (!item || !item.url) continue
    if (seen.has(item.url)) continue
    seen.add(item.url)
    out.push({ title: item.title || item.url, url: item.url })
  }
  return out
}

const sharedSources = {
  huangmeiOrigin: [
    { title: '维基百科：黄梅戏', url: 'https://zh.wikipedia.org/wiki/%E9%BB%84%E6%A2%85%E6%88%8F' },
    { title: '维基百科：天仙配', url: 'https://zh.wikipedia.org/wiki/%E5%A4%A9%E4%BB%99%E9%85%8D' }
  ],
  hanProfile: [
    { title: 'Wikipedia: Han Zaifen', url: 'https://en.wikipedia.org/wiki/Han_Zaifen' },
    { title: '维基百科：严凤英', url: 'https://zh.wikipedia.org/wiki/%E4%B8%A5%E5%87%A4%E8%8B%B1' }
  ],
  repertoireContext: [
    { title: '维基百科：天仙配（剧目背景）', url: 'https://zh.wikipedia.org/wiki/%E5%A4%A9%E4%BB%99%E9%85%8D' }
  ]
}

const enhancementBySong = {
  'tianxianpei-fuqishuangshuang': {
    insights: [
      {
        title: '名家演唱优势',
        text: '名家版本通常把“字清、腔圆、气稳”放在同一层级处理：先立字头，再给腔体留出呼吸空间，句尾收束干净。',
        sources: dedupeSources([
          ...sharedSources.hanProfile,
          ...sharedSources.huangmeiOrigin
        ])
      },
      {
        title: '《天仙配》段落处理',
        text: '《夫妻双双把家还》偏叙事抒情，演唱时更强调平稳的节拍推进与连贯行腔，不追求夸张起伏而重在细腻韵味。',
        sources: dedupeSources([
          ...sharedSources.repertoireContext,
          ...sharedSources.huangmeiOrigin
        ])
      }
    ],
    teachingPoints: [
      {
        type: 'rhythm',
        extraDescription: '建议把强拍放在“关键词”字头，弱拍保持口型与气息连贯，避免抢拍。',
        sources: dedupeSources([
          ...sharedSources.huangmeiOrigin,
          ...sharedSources.repertoireContext
        ])
      },
      {
        type: 'breath',
        extraDescription: '长句优先用“短偷气+不断句”的方式，尾音收束时保留共鸣位置。',
        sources: dedupeSources([
          ...sharedSources.hanProfile,
          ...sharedSources.huangmeiOrigin
        ])
      },
      {
        type: 'emotion',
        extraDescription: '情绪推进以“温婉、含蓄”为主，强弱变化不要抢过词义本身。',
        sources: dedupeSources([
          ...sharedSources.hanProfile
        ])
      }
    ],
    fallbackTeachingPoints: [
      {
        time: 12,
        type: 'rhythm',
        title: '叙事段稳拍',
        description: '本段以叙事抒情为主，建议在稳拍前提下做细微行腔。',
        difficulty: 2,
        sources: dedupeSources([
          ...sharedSources.repertoireContext,
          ...sharedSources.huangmeiOrigin
        ])
      },
      {
        time: 27,
        type: 'breath',
        title: '长句换气策略',
        description: '尽量在语义分组边界换气，避免把词义切断。',
        difficulty: 3,
        sources: dedupeSources([
          ...sharedSources.hanProfile
        ])
      },
      {
        time: 45,
        type: 'emotion',
        title: '含蓄表达',
        description: '控制动态峰值，让语气“亮而不炸”，更贴近黄梅戏审美。',
        difficulty: 2,
        sources: dedupeSources([
          ...sharedSources.hanProfile,
          ...sharedSources.huangmeiOrigin
        ])
      }
    ]
  }
}

function mergeTeachingPoints(songConfig, rawPoints) {
  const original = Array.isArray(rawPoints) ? rawPoints : []
  const result = original.map((tip) => ({ ...tip, sources: dedupeSources(tip?.sources || []) }))
  const rules = Array.isArray(songConfig?.teachingPoints) ? songConfig.teachingPoints : []

  for (const rule of rules) {
    const matchIdx = result.findIndex((tip) => tip?.type === rule.type)
    if (matchIdx === -1) continue
    const cur = result[matchIdx]
    const mergedSources = dedupeSources([...(cur.sources || []), ...(rule.sources || [])])
    const mergedDesc = rule.extraDescription
      ? `${String(cur.description || '').trim()} ${rule.extraDescription}`.trim()
      : cur.description
    result[matchIdx] = {
      ...cur,
      description: mergedDesc,
      sources: mergedSources
    }
  }

  if (result.length === 0 && Array.isArray(songConfig?.fallbackTeachingPoints)) {
    return songConfig.fallbackTeachingPoints.map((tip) => ({ ...tip, sources: dedupeSources(tip.sources || []) }))
  }

  return result
}

export function enrichMasterAnalysisData(songId, analysisData) {
  if (!analysisData || !songId) return analysisData
  const songConfig = enhancementBySong[songId]
  if (!songConfig) return analysisData

  return {
    ...analysisData,
    teachingPoints: mergeTeachingPoints(songConfig, analysisData.teachingPoints)
  }
}

export function getMasterOnlineInsights(songId) {
  const songConfig = enhancementBySong[songId]
  if (!songConfig) return []
  return Array.isArray(songConfig.insights) ? songConfig.insights : []
}
