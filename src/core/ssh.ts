import type { ServerConfig } from './types.js'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { expandHome, getEsshSshDir, getSshDir } from './config.js'

export function generateSSHConfig(servers: ServerConfig[]): string {
  const lines: string[] = []

  for (const server of servers) {
    const keyPath = expandHome(server.key.replace('~/.ssh/', ''))
    const hostName = `essh-${server.name}`

    lines.push(`Host ${hostName}`)
    lines.push(`    HostName ${server.host}`)
    lines.push(`    User ${server.user}`)
    lines.push(`    Port ${server.port}`)
    lines.push(`    IdentityFile ~/.ssh/essh/${path.basename(server.key.replace('.age', ''))}`)

    if (server.proxyJump) {
      lines.push(`    ProxyJump essh-${server.proxyJump}`)
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
    const esshStart = existingConfig.indexOf('# === essh start ===')
    const esshEnd = existingConfig.indexOf('# === essh end ===')

    if (esshStart !== -1 && esshEnd !== -1) {
      existingConfig = existingConfig.slice(0, esshStart) + existingConfig.slice(esshEnd + '# === essh end ==='.length)
    }
  }

  const newConfig = generateSSHConfig(servers)
  const finalConfig = `${existingConfig.trim()}\n\n# === essh start ===\n${newConfig}# === essh end ===\n`

  await fs.writeFile(sshConfigPath, finalConfig)
  await fs.chmod(sshConfigPath, 0o600)
}

export async function connect(server: ServerConfig, keyPath: string): Promise<void> {
  const hostName = `essh-${server.name}`
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
  const esshDir = getEsshSshDir()

  await fs.ensureDir(esshDir)

  const exists = await fs.pathExists(keysDir)
  if (!exists) {
    console.log('Keys directory not found')
    return
  }

  const files = await fs.readdir(keysDir)
  const ageFiles = files.filter(f => f.endsWith('.age'))

  if (ageFiles.length === 0) {
    console.log('No encrypted key files found')
    return
  }

  const { decryptFile } = await import('./crypto.js')

  let successCount = 0
  for (const file of ageFiles) {
    const inputPath = path.join(keysDir, file)
    const keyName = file.replace('.age', '')
    const outputPath = path.join(esshDir, keyName)

    try {
      await decryptFile(inputPath, password, outputPath)
      await setFilePermissions(outputPath)
      successCount++
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('no identity matched')) {
        throw new Error('Wrong password, unable to decrypt key')
      }
      throw new Error(`Failed to decrypt ${file}: ${errorMsg}`)
    }
  }

  console.log(`Successfully decrypted ${successCount} keys`)
}
