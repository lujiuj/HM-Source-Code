import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FORBIDDEN_PATTERNS = [
  '/learn/demo',
  '?demo=',
  'runLearnDemoSeed',
  'hmx_learn_demo_seeded_v1',
  'hmx_learn_demo_results_v1'
]

const thisFileDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(thisFileDir, '..', '..')
const learnModulesDir = path.join(projectRoot, 'src', 'modules', 'learn')
const routerFile = path.join(projectRoot, 'src', 'router', 'index.js')
const packageFile = path.join(projectRoot, 'package.json')

async function collectLearnFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const nested = await collectLearnFiles(fullPath)
      files.push(...nested)
      continue
    }

    if (entry.isFile() && /\.(vue|js|less)$/i.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('learn real-user safety', () => {
  it('removes demo-only hooks from learn module sources', async () => {
    const files = await collectLearnFiles(learnModulesDir)
    const offenders = []

    for (const filePath of files) {
      const text = await fs.readFile(filePath, 'utf8')
      if (FORBIDDEN_PATTERNS.some((pattern) => text.includes(pattern))) {
        offenders.push(path.relative(projectRoot, filePath))
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps router free of /learn/demo route entries', async () => {
    const routerText = await fs.readFile(routerFile, 'utf8')
    expect(routerText.includes('/learn/demo')).toBe(false)
  })

  it('keeps package scripts free of demo tooling', async () => {
    const packageText = await fs.readFile(packageFile, 'utf8')
    expect(packageText.includes('demo:capture')).toBe(false)
    expect(packageText.includes('learn-demo-capture')).toBe(false)
  })
})
