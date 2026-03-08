import type { ServerConfig } from './types.js'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { expandHome, getEasshSshDir, getSshDir } from './config.js'

export function generateSSHConfig(servers: ServerConfig[]): string {
  const lines: string[] = []

  for (const server of servers) {
    const keyPath = expandHome(server.key.replace('~/.ssh/', ''))
    const hostName = `eassh-${server.name}`

    lines.push(`Host ${hostName}`)
    lines.push(`    HostName ${server.host}`)
    lines.push(`    User ${server.user}`)
    lines.push(`    Port ${server.port}`)
    lines.push(`    IdentityFile ~/.ssh/eassh/${path.basename(server.key.replace('.age', ''))}`)

    if (server.proxyJump) {
      lines.push(`    ProxyJump eassh-${server.proxyJump}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export async function updateSSHConfig(servers: ServerConfig[]): Promise<void> {
  const sshConfigPath = path.join(getSshDir(), 'config')
  let existingConfig = ''

  const exists = await fs.pathExists(sshConfigPath)
  if (exists) {
    existingConfig = await fs.readFile(sshConfigPath, 'utf-8')
    const easshStart = existingConfig.indexOf('# === eassh start ===')
    const easshEnd = existingConfig.indexOf('# === eassh end ===')

    if (easshStart !== -1 && easshEnd !== -1) {
      existingConfig = existingConfig.slice(0, easshStart) + existingConfig.slice(easshEnd + '# === eassh end ==='.length)
    }
  }

  const newConfig = generateSSHConfig(servers)
  const finalConfig = `${existingConfig.trim()}\n\n# === eassh start ===\n${newConfig}# === eassh end ===\n`

  await fs.writeFile(sshConfigPath, finalConfig)
  await fs.chmod(sshConfigPath, 0o600)
}

export async function connect(server: ServerConfig, keyPath: string): Promise<void> {
  const hostName = `eassh-${server.name}`
  const command = `ssh ${hostName}`

  console.log(`Connecting to ${server.name} (${server.host})...`)

  const child = spawn('ssh', [hostName], {
    cwd: os.homedir(),
    stdio: 'inherit',
  })

  child.on('error', (error: Error) => {
    console.error('Connection error:', error)
    process.exit(1)
  })

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

export async function setFilePermissions(keyPath: string): Promise<void> {
  await fs.chmod(keyPath, 0o600)
}

export async function decryptAllKeys(cacheDir: string, password: string): Promise<void> {
  const keysDir = path.join(cacheDir, 'keys')
  const easshDir = getEasshSshDir()

  await fs.ensureDir(easshDir)

  const exists = await fs.pathExists(keysDir)
  if (!exists)
    return

  const files = await fs.readdir(keysDir)
  const ageFiles = files.filter(f => f.endsWith('.age'))

  const { decryptFile } = await import('./crypto.js')

  for (const file of ageFiles) {
    const inputPath = path.join(keysDir, file)
    const keyName = file.replace('.age', '')
    const outputPath = path.join(easshDir, keyName)

    try {
      await decryptFile(inputPath, password, outputPath)
      await setFilePermissions(outputPath)
    }
    catch (error) {
      console.error(`Failed to decrypt ${file}:`, error)
    }
  }
}
