import fs from 'node:fs'
import path from 'node:path'

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function parseEnvValue(rawValue) {
  const value = String(rawValue ?? '').trim()
  if (!value) return ''

  const quote = value[0]
  if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
    const inner = value.slice(1, -1)
    return quote === '"' ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : inner
  }
  return value
}

function parseEnvFile(content) {
  const entries = {}
  const lines = String(content ?? '').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const index = normalized.indexOf('=')
    if (index <= 0) continue

    const key = normalized.slice(0, index).trim()
    const rawValue = normalized.slice(index + 1)
    if (!key) continue
    entries[key] = parseEnvValue(rawValue)
  }

  return entries
}

export function loadLocalEnvFiles(options = {}) {
  const cwd = options.cwd || process.cwd()
  const files = Array.isArray(options.files) && options.files.length
    ? options.files
    : ['.env.local', '.env', 'server/.env.local', 'server/.env']
  const override = Boolean(options.override)
  const loadedFiles = []

  for (const file of files) {
    const absolute = path.resolve(cwd, file)
    if (!fs.existsSync(absolute)) continue

    try {
      const content = fs.readFileSync(absolute, 'utf8')
      const parsed = parseEnvFile(content)
      for (const [key, value] of Object.entries(parsed)) {
        if (override || !safeText(process.env[key])) {
          process.env[key] = value
        }
      }
      loadedFiles.push(absolute)
    } catch {
      // ignore malformed local env files and continue
    }
  }

  return loadedFiles
}

export function resolveLearnAiEnv(env = process.env) {
  const keyCandidates = [
    ['GLM_API_KEY', env.GLM_API_KEY],
    ['ZHIPU_API_KEY', env.ZHIPU_API_KEY],
    ['LEARN_GLM_API_KEY', env.LEARN_GLM_API_KEY],
    ['VITE_GLM_API_KEY', env.VITE_GLM_API_KEY],
    ['VITE_ZHIPU_API_KEY', env.VITE_ZHIPU_API_KEY]
  ]

  const modelCandidates = [
    ['GLM_MODEL', env.GLM_MODEL],
    ['LEARN_GLM_MODEL', env.LEARN_GLM_MODEL],
    ['VITE_GLM_MODEL', env.VITE_GLM_MODEL]
  ]

  const qwenKeyCandidates = [
    ['DASHSCOPE_API_KEY', env.DASHSCOPE_API_KEY],
    ['QWEN_API_KEY', env.QWEN_API_KEY],
    ['LEARN_QWEN_API_KEY', env.LEARN_QWEN_API_KEY]
  ]

  let apiKey = ''
  let keySource = null
  for (const [name, value] of keyCandidates) {
    const parsed = safeText(value)
    if (!parsed) continue
    apiKey = parsed
    keySource = name
    break
  }

  let requestedModel = ''
  let modelSource = null
  for (const [name, value] of modelCandidates) {
    const parsed = safeText(value)
    if (!parsed) continue
    requestedModel = parsed
    modelSource = name
    break
  }

  let qwenApiKey = ''
  let qwenKeySource = null
  for (const [name, value] of qwenKeyCandidates) {
    const parsed = safeText(value)
    if (!parsed) continue
    qwenApiKey = parsed
    qwenKeySource = name
    break
  }

  return {
    apiKey,
    keySource,
    requestedModel,
    modelSource,
    qwenApiKey,
    qwenKeySource
  }
}

