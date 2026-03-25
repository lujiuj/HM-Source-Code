import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const API_PORT = 3000
const VITE_CANDIDATE_PORTS = [5173, 5174, 5175, 5176, 5177, 5178]
const children = []

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function probePort(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host })
    const close = (busy) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(busy)
    }

    socket.setTimeout(700)
    socket.once('connect', () => close(true))
    socket.once('timeout', () => close(false))
    socket.once('error', (error) => {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'EHOSTUNREACH') {
        close(false)
        return
      }
      close(true)
    })
  })
}

async function isPortBusy(port) {
  const [ipv4Busy, ipv6Busy] = await Promise.all([
    probePort(port, '127.0.0.1'),
    probePort(port, '::1')
  ])
  return ipv4Busy || ipv6Busy
}

async function probeJson(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function probeText(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return ''
    return await response.text()
  } catch {
    return ''
  }
}

function spawnChild(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false
  })

  child.on('exit', (code, signal) => {
    shutdown(name)
    if (signal) process.exit(0)
    process.exit(typeof code === 'number' ? code : 0)
  })

  children.push({ child, name })
  return child
}

function shutdown(skipName = '') {
  for (const item of children) {
    if (skipName && item.name === skipName) continue
    try {
      item.child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
}

async function describePortConflict(port) {
  if (process.platform !== 'win32') {
    return `port ${port} is busy`
  }

  const script = [
    `$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1`,
    'if (-not $conn) { return }',
    '$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)"',
    '[PSCustomObject]@{',
    '  Port = $conn.LocalPort',
    '  ProcessId = $conn.OwningProcess',
    '  CommandLine = $proc.CommandLine',
    '} | ConvertTo-Json -Compress'
  ].join('; ')

  return await new Promise((resolve) => {
    const powershell = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false
    })

    let stdout = ''
    powershell.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })

    powershell.on('exit', () => {
      const raw = safeText(stdout)
      if (!raw) {
        resolve(`port ${port} is busy`)
        return
      }
      try {
        const info = JSON.parse(raw)
        resolve(`port ${port} is busy by PID ${info.ProcessId}: ${safeText(info.CommandLine, 'unknown process')}`)
      } catch {
        resolve(`port ${port} is busy`)
      }
    })
  })
}

async function resolveApiState() {
  const busy = await isPortBusy(API_PORT)
  if (!busy) {
    return {
      mode: 'spawn',
      detail: `starting learn api on :${API_PORT}`
    }
  }

  const health = await probeJson(`http://127.0.0.1:${API_PORT}/api/health`)
  if (health && typeof health === 'object') {
    return {
      mode: 'reuse',
      detail: `reusing existing learn api on :${API_PORT}`
    }
  }

  return {
    mode: 'conflict',
    detail: await describePortConflict(API_PORT)
  }
}

async function resolveViteState() {
  for (const port of VITE_CANDIDATE_PORTS) {
    if (!(await isPortBusy(port))) continue
    const html = await probeText(`http://127.0.0.1:${port}`)
    const looksLikeVite = html.includes('<div id="app"></div>') || html.includes('/src/main.js')
    const looksLikeThisProject = html.includes('<title>yellow-play</title>')
      && html.includes('<div id="app"></div>')
      && html.includes('/src/main.js')
    if (looksLikeVite && looksLikeThisProject) {
      return {
        mode: 'reuse',
        detail: `reusing existing vite dev server on :${port}`,
        url: `http://localhost:${port}`
      }
    }
  }

  return {
    mode: 'spawn',
    detail: 'starting vite on the next available port',
    url: ''
  }
}

async function waitForViteUrl() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const port of VITE_CANDIDATE_PORTS) {
      const html = await probeText(`http://127.0.0.1:${port}`)
      if (html.includes('<div id="app"></div>') || html.includes('/src/main.js')) {
        return `http://localhost:${port}`
      }
    }
    await wait(500)
  }
  return ''
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

const apiState = await resolveApiState()
if (apiState.mode === 'conflict') {
  console.error('[dev:learn] backend conflict')
  console.error(`[dev:learn] ${apiState.detail}`)
  process.exit(1)
}

const viteState = await resolveViteState()

console.log('[dev:learn] service summary')
console.log(`[dev:learn] ${apiState.detail}`)
console.log(`[dev:learn] ${viteState.detail}`)

if (apiState.mode === 'spawn') {
  spawnChild(process.execPath, ['server/server.js'], 'learn-api')
}

if (viteState.mode === 'spawn') {
  spawnChild(process.execPath, [viteBin, '--host', '127.0.0.1'], 'vite')
  const resolvedUrl = await waitForViteUrl()
  if (resolvedUrl) {
    console.log(`[dev:learn] frontend ready at ${resolvedUrl}`)
  }
} else {
  console.log(`[dev:learn] frontend ready at ${viteState.url}`)
}
