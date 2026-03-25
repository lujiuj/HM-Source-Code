const LS_PROFILE_KEY = 'hmx_learn_profile_v2'

export const LEARN_AVATAR_PRESETS = [
  {
    id: 'camellia',
    label: '茶花',
    bgStart: '#f7dfd7',
    bgEnd: '#ecd2c2',
    glow: '#fff3ef',
    ring: '#d48f6e',
    shadow: 'rgba(110, 67, 49, 0.2)',
    outerRobe: '#bb5b45',
    innerRobe: '#f3ddcf',
    collar: '#f5c585',
    skin: '#f8dfd0',
    hair: '#312523',
    hairShade: '#523731',
    ornament: '#f0b869',
    pattern: '#e7a66d',
    bun: 'double',
    ornamentType: 'plum',
    motif: 'petal',
    hairPath: 'M31 44 C 33 23, 45 14, 50 14 C 55 14, 67 23, 69 44 C 66 37, 59 32, 50 32 C 41 32, 34 37, 31 44 Z',
    fringePath: 'M35 44 C 36 30, 43 24, 50 24 C 57 24, 64 30, 65 44 C 60 39, 56 37, 50 37 C 44 37, 40 39, 35 44 Z'
  },
  {
    id: 'amber',
    label: '金穗',
    bgStart: '#f4e0a8',
    bgEnd: '#e2c97d',
    glow: '#fff8da',
    ring: '#c39834',
    shadow: 'rgba(132, 101, 27, 0.22)',
    outerRobe: '#8d2b25',
    innerRobe: '#f7edcd',
    collar: '#dcb15d',
    skin: '#f6dccb',
    hair: '#2f241c',
    hairShade: '#564134',
    ornament: '#fff2c8',
    pattern: '#d4932d',
    bun: 'single',
    ornamentType: 'fan',
    motif: 'lantern',
    hairPath: 'M30 44 C 31 25, 42 15, 50 15 C 58 15, 69 25, 70 44 C 65 35, 58 31, 50 31 C 42 31, 35 35, 30 44 Z',
    fringePath: 'M36 43 C 37 31, 43 26, 50 26 C 57 26, 63 31, 64 43 C 59 38, 55 35, 50 35 C 45 35, 41 38, 36 43 Z'
  },
  {
    id: 'ink',
    label: '墨韵',
    bgStart: '#dde2eb',
    bgEnd: '#c3cad8',
    glow: '#f3f7ff',
    ring: '#5a6477',
    shadow: 'rgba(46, 55, 69, 0.22)',
    outerRobe: '#364459',
    innerRobe: '#e8edf7',
    collar: '#aab7d2',
    skin: '#f4d9cb',
    hair: '#1f232d',
    hairShade: '#363d4d',
    ornament: '#c3d1eb',
    pattern: '#7d8cab',
    bun: 'double',
    ornamentType: 'moon',
    motif: 'wave',
    hairPath: 'M29 44 C 31 24, 41 14, 50 14 C 59 14, 69 24, 71 44 C 65 34, 58 30, 50 30 C 42 30, 35 34, 29 44 Z',
    fringePath: 'M34 43 C 35 32, 42 25, 50 25 C 58 25, 65 32, 66 43 C 61 37, 56 34, 50 34 C 44 34, 39 37, 34 43 Z'
  },
  {
    id: 'jade',
    label: '青岚',
    bgStart: '#d6efe5',
    bgEnd: '#bddfce',
    glow: '#eefbf5',
    ring: '#4c8a74',
    shadow: 'rgba(53, 97, 82, 0.22)',
    outerRobe: '#2f7f69',
    innerRobe: '#dff4ea',
    collar: '#9dd7bc',
    skin: '#f5ddcf',
    hair: '#223731',
    hairShade: '#39564c',
    ornament: '#cde7db',
    pattern: '#5fa187',
    bun: 'single',
    ornamentType: 'ribbon',
    motif: 'cloud',
    hairPath: 'M30 44 C 32 24, 42 14, 50 14 C 58 14, 68 24, 70 44 C 64 35, 58 31, 50 31 C 42 31, 36 35, 30 44 Z',
    fringePath: 'M35 43 C 36 30, 43 24, 50 24 C 57 24, 64 30, 65 43 C 60 38, 55 36, 50 36 C 45 36, 40 38, 35 43 Z'
  },
  {
    id: 'plum',
    label: '梅影',
    bgStart: '#f0d6de',
    bgEnd: '#dfb9c7',
    glow: '#fff2f5',
    ring: '#a65d76',
    shadow: 'rgba(104, 53, 67, 0.22)',
    outerRobe: '#6d3049',
    innerRobe: '#efd9df',
    collar: '#d791a6',
    skin: '#f7e0d3',
    hair: '#251e23',
    hairShade: '#4b3742',
    ornament: '#f5c3cf',
    pattern: '#c46d86',
    bun: 'double',
    ornamentType: 'plum',
    motif: 'petal',
    hairPath: 'M30 45 C 31 25, 41 15, 50 15 C 59 15, 69 25, 70 45 C 64 36, 58 32, 50 32 C 42 32, 36 36, 30 45 Z',
    fringePath: 'M35 44 C 36 31, 42 25, 50 25 C 58 25, 64 31, 65 44 C 60 39, 55 36, 50 36 C 45 36, 40 39, 35 44 Z'
  },
  {
    id: 'willow',
    label: '柳烟',
    bgStart: '#dce9c8',
    bgEnd: '#c8ddab',
    glow: '#f5fbea',
    ring: '#8dad53',
    shadow: 'rgba(88, 108, 46, 0.22)',
    outerRobe: '#6d8c41',
    innerRobe: '#eef5dd',
    collar: '#c5d98e',
    skin: '#f7e0d2',
    hair: '#25301f',
    hairShade: '#45573a',
    ornament: '#e7f0bf',
    pattern: '#98b55e',
    bun: 'single',
    ornamentType: 'pearl',
    motif: 'cloud',
    hairPath: 'M31 44 C 33 25, 42 15, 50 15 C 58 15, 67 25, 69 44 C 63 36, 57 31, 50 31 C 43 31, 37 36, 31 44 Z',
    fringePath: 'M36 43 C 37 31, 43 25, 50 25 C 57 25, 63 31, 64 43 C 59 38, 55 35, 50 35 C 45 35, 41 38, 36 43 Z'
  },
  {
    id: 'porcelain',
    label: '瓷青',
    bgStart: '#e4eef2',
    bgEnd: '#cedfe8',
    glow: '#f6fbff',
    ring: '#7ca3b4',
    shadow: 'rgba(75, 103, 114, 0.2)',
    outerRobe: '#4b7189',
    innerRobe: '#f0f7fb',
    collar: '#aac9d6',
    skin: '#f5ddcf',
    hair: '#27313a',
    hairShade: '#455768',
    ornament: '#d7edf7',
    pattern: '#7ba9bb',
    bun: 'double',
    ornamentType: 'fan',
    motif: 'wave',
    hairPath: 'M30 45 C 31 26, 41 15, 50 15 C 59 15, 69 26, 70 45 C 64 36, 58 32, 50 32 C 42 32, 36 36, 30 45 Z',
    fringePath: 'M35 44 C 36 31, 42 26, 50 26 C 58 26, 64 31, 65 44 C 60 39, 55 36, 50 36 C 45 36, 40 39, 35 44 Z'
  },
  {
    id: 'cinnabar',
    label: '朱砂',
    bgStart: '#f0d2c8',
    bgEnd: '#e2b8aa',
    glow: '#fff0eb',
    ring: '#bb684e',
    shadow: 'rgba(117, 60, 42, 0.22)',
    outerRobe: '#9d3128',
    innerRobe: '#f5dfd7',
    collar: '#e6a46e',
    skin: '#f7decf',
    hair: '#2b201c',
    hairShade: '#513831',
    ornament: '#f3cf88',
    pattern: '#d47a4e',
    bun: 'single',
    ornamentType: 'ribbon',
    motif: 'lantern',
    hairPath: 'M30 44 C 31 24, 41 14, 50 14 C 59 14, 69 24, 70 44 C 64 35, 58 30, 50 30 C 42 30, 36 35, 30 44 Z',
    fringePath: 'M35 43 C 36 30, 42 24, 50 24 C 58 24, 64 30, 65 43 C 60 38, 55 35, 50 35 C 45 35, 40 38, 35 43 Z'
  },
  {
    id: 'moon',
    label: '月白',
    bgStart: '#f1ede6',
    bgEnd: '#ddd5ca',
    glow: '#fffaf2',
    ring: '#ab9a7f',
    shadow: 'rgba(96, 84, 64, 0.18)',
    outerRobe: '#7b6450',
    innerRobe: '#f3ede4',
    collar: '#d6c1a5',
    skin: '#f6dfd2',
    hair: '#2b2624',
    hairShade: '#4a413d',
    ornament: '#efe4c9',
    pattern: '#baa57b',
    bun: 'double',
    ornamentType: 'moon',
    motif: 'lotus',
    hairPath: 'M31 44 C 32 25, 42 15, 50 15 C 58 15, 68 25, 69 44 C 63 36, 57 31, 50 31 C 43 31, 37 36, 31 44 Z',
    fringePath: 'M36 43 C 37 31, 43 25, 50 25 C 57 25, 63 31, 64 43 C 59 38, 55 36, 50 36 C 45 36, 41 38, 36 43 Z'
  },
  {
    id: 'orchid',
    label: '兰汀',
    bgStart: '#e4d9f4',
    bgEnd: '#ccbce8',
    glow: '#f6f2ff',
    ring: '#8f7ab3',
    shadow: 'rgba(88, 70, 120, 0.2)',
    outerRobe: '#635186',
    innerRobe: '#ece4f8',
    collar: '#b6a1da',
    skin: '#f6dfd2',
    hair: '#241f2f',
    hairShade: '#413754',
    ornament: '#d8c6f4',
    pattern: '#8f79bc',
    bun: 'single',
    ornamentType: 'pearl',
    motif: 'cloud',
    hairPath: 'M30 44 C 31 25, 41 15, 50 15 C 59 15, 69 25, 70 44 C 64 35, 58 31, 50 31 C 42 31, 36 35, 30 44 Z',
    fringePath: 'M35 43 C 36 30, 42 24, 50 24 C 58 24, 64 30, 65 43 C 60 38, 55 35, 50 35 C 45 35, 40 38, 35 43 Z'
  }
]

const LEGACY_PRESET_ALIASES = {
  jadeite: 'jade',
  'porcelain-blue': 'porcelain'
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => safeText(item))
    .filter(Boolean)
}

function normalizePositiveInt(value, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.floor(number))
}

function defaultAvatarPreset() {
  return `preset:${LEARN_AVATAR_PRESETS[0].id}`
}

function normalizeAvatarValue(value, fallback = defaultAvatarPreset()) {
  const raw = safeText(value, fallback)
  if (!raw.startsWith('preset:')) return raw
  const presetId = raw.replace(/^preset:/, '')
  const normalizedId = LEGACY_PRESET_ALIASES[presetId] || presetId
  return `preset:${normalizedId}`
}

export function createDefaultLearnProfile({ uid = '', displayName = '' } = {}) {
  return {
    uid: safeText(uid),
    displayName: safeText(displayName),
    avatar: defaultAvatarPreset(),
    studyDays: 0,
    lastStudyVisitOn: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    notifications: {
      lastReadAt: 0
    },
    unreadInteractionCount: 0,
    preferences: {
      viewMode: 'grid'
    },
    giftBalance: 0,
    dailyGiftCap: 24,
    perSendCap: 6,
    lifetimeEarned: 0,
    giftLedgerSummary: {
      earned: 0,
      spent: 0,
      journey: 0,
      quiz: 0,
      repertoire: 0,
      level: 0,
      publish: 0
    },
    dailyGiftUsage: {
      dateKey: '',
      sentCount: 0
    },
    journey: {
      clearedStageIds: [],
      quizPassStageIds: [],
      quizPassLog: [],
      lastStageId: '',
      viewedAnalysisSongIds: [],
      analysisVisitLog: []
    }
  }
}

export function normalizeLearnProfile(input = {}, context = {}) {
  const base = createDefaultLearnProfile(context)
  const raw = input && typeof input === 'object' ? input : {}

  const createdAt = Number(raw.createdAt)
  const updatedAt = Number(raw.updatedAt)
  const studyDays = Number(raw.studyDays)
  const lastReadAt = Number(raw?.notifications?.lastReadAt)
  const giftLedgerSummary = raw?.giftLedgerSummary && typeof raw.giftLedgerSummary === 'object'
    ? raw.giftLedgerSummary
    : {}
  const dailyGiftUsage = raw?.dailyGiftUsage && typeof raw.dailyGiftUsage === 'object'
    ? raw.dailyGiftUsage
    : {}

  return {
    uid: safeText(raw.uid, base.uid),
    displayName: safeText(raw.displayName, safeText(context.displayName, base.displayName)),
    avatar: normalizeAvatarValue(raw.avatar, base.avatar),
    studyDays: Number.isFinite(studyDays) ? Math.max(0, Math.floor(studyDays)) : base.studyDays,
    lastStudyVisitOn: safeText(raw.lastStudyVisitOn),
    createdAt: Number.isFinite(createdAt) ? createdAt : base.createdAt,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : base.updatedAt,
    notifications: {
      lastReadAt: Number.isFinite(lastReadAt) ? Math.max(0, Math.floor(lastReadAt)) : base.notifications.lastReadAt
    },
    unreadInteractionCount: normalizePositiveInt(raw.unreadInteractionCount, base.unreadInteractionCount),
    preferences: {
      viewMode: safeText(raw?.preferences?.viewMode, base.preferences.viewMode) === 'list' ? 'list' : 'grid'
    },
    giftBalance: normalizePositiveInt(raw.giftBalance, base.giftBalance),
    dailyGiftCap: normalizePositiveInt(raw.dailyGiftCap, base.dailyGiftCap),
    perSendCap: normalizePositiveInt(raw.perSendCap, base.perSendCap),
    lifetimeEarned: normalizePositiveInt(raw.lifetimeEarned, base.lifetimeEarned),
    giftLedgerSummary: {
      earned: normalizePositiveInt(giftLedgerSummary.earned, base.giftLedgerSummary.earned),
      spent: normalizePositiveInt(giftLedgerSummary.spent, base.giftLedgerSummary.spent),
      journey: normalizePositiveInt(giftLedgerSummary.journey, base.giftLedgerSummary.journey),
      quiz: normalizePositiveInt(giftLedgerSummary.quiz, base.giftLedgerSummary.quiz),
      repertoire: normalizePositiveInt(giftLedgerSummary.repertoire, base.giftLedgerSummary.repertoire),
      level: normalizePositiveInt(giftLedgerSummary.level, base.giftLedgerSummary.level),
      publish: normalizePositiveInt(giftLedgerSummary.publish, base.giftLedgerSummary.publish)
    },
    dailyGiftUsage: {
      dateKey: safeText(dailyGiftUsage.dateKey),
      sentCount: normalizePositiveInt(dailyGiftUsage.sentCount, base.dailyGiftUsage.sentCount)
    },
    journey: {
      clearedStageIds: normalizeStringArray(raw?.journey?.clearedStageIds),
      quizPassStageIds: normalizeStringArray(raw?.journey?.quizPassStageIds),
      quizPassLog: normalizeStringArray(raw?.journey?.quizPassLog),
      lastStageId: safeText(raw?.journey?.lastStageId),
      viewedAnalysisSongIds: normalizeStringArray(raw?.journey?.viewedAnalysisSongIds),
      analysisVisitLog: normalizeStringArray(raw?.journey?.analysisVisitLog)
    }
  }
}

export function mergeLearnProfile(baseProfile, patch, context = {}) {
  const base = normalizeLearnProfile(baseProfile, context)
  const delta = patch && typeof patch === 'object' ? patch : {}

  return normalizeLearnProfile({
    ...base,
    ...delta,
    notifications: {
      ...base.notifications,
      ...(delta.notifications || {})
    },
    preferences: {
      ...base.preferences,
      ...(delta.preferences || {})
    },
    journey: {
      ...base.journey,
      ...(delta.journey || {})
    }
  }, context)
}

export function readLearnProfile(uid = '', displayName = '') {
  try {
    const raw = localStorage.getItem(LS_PROFILE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return normalizeLearnProfile(parsed, { uid, displayName })
  } catch {
    return createDefaultLearnProfile({ uid, displayName })
  }
}

export function writeLearnProfile(profile) {
  const normalized = normalizeLearnProfile(profile)
  try {
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore localStorage quota errors.
  }
  return normalized
}

export function avatarPresetById(value) {
  const normalized = normalizeAvatarValue(value)
  const presetId = normalized.replace(/^preset:/, '')
  return LEARN_AVATAR_PRESETS.find((item) => item.id === presetId) || LEARN_AVATAR_PRESETS[0]
}
