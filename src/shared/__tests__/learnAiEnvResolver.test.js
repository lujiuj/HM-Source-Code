import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadLocalEnvFiles, resolveLearnAiEnv } from '../../../server/learn-ai/envResolver.js'

const ENV_KEYS = [
  'GLM_API_KEY',
  'ZHIPU_API_KEY',
  'LEARN_GLM_API_KEY',
  'VITE_GLM_API_KEY',
  'VITE_ZHIPU_API_KEY',
  'GLM_MODEL',
  'LEARN_GLM_MODEL',
  'VITE_GLM_MODEL'
]

function snapshotEnv(keys) {
  const out = {}
  for (const key of keys) out[key] = process.env[key]
  return out
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === 'undefined') {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('learn-ai env resolver', () => {
  it('uses stable priority for key and model sources', () => {
    const resolved = resolveLearnAiEnv({
      GLM_API_KEY: 'primary-key',
      ZHIPU_API_KEY: 'secondary-key',
      VITE_GLM_API_KEY: 'vite-key',
      LEARN_GLM_MODEL: 'glm-4.6v-flash'
    })

    expect(resolved.apiKey).toBe('primary-key')
    expect(resolved.keySource).toBe('GLM_API_KEY')
    expect(resolved.requestedModel).toBe('glm-4.6v-flash')
    expect(resolved.modelSource).toBe('LEARN_GLM_MODEL')
  })

  it('loads local .env files and resolves VITE fallback key', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hmx-learn-env-'))
    const snapshot = snapshotEnv(ENV_KEYS)

    try {
      for (const key of ENV_KEYS) delete process.env[key]

      await fs.writeFile(
        path.join(tmpDir, '.env.local'),
        [
          'VITE_GLM_API_KEY=test-vite-key',
          'VITE_GLM_MODEL=glm-4.7-flash',
          ''
        ].join('\n'),
        'utf8'
      )

      const loaded = loadLocalEnvFiles({
        cwd: tmpDir,
        files: ['.env.local']
      })

      const resolved = resolveLearnAiEnv()
      expect(loaded.length).toBe(1)
      expect(resolved.apiKey).toBe('test-vite-key')
      expect(resolved.keySource).toBe('VITE_GLM_API_KEY')
      expect(resolved.requestedModel).toBe('glm-4.7-flash')
      expect(resolved.modelSource).toBe('VITE_GLM_MODEL')
    } finally {
      restoreEnv(snapshot)
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })
})

