import type { GlobalConfig, ServerConfig, ServersData } from './types.js'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

const CONFIG_DIR = path.join(os.homedir(), '.eassh')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const CACHE_DIR = path.join(CONFIG_DIR, 'cache')
const SSH_DIR = path.join(os.homedir(), '.ssh')
const EASSH_SSH_DIR = path.join(SSH_DIR, 'eassh')

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getCacheDir(): string {
  return CACHE_DIR
}

export function getSshDir(): string {
  return SSH_DIR
}

export function getEasshSshDir(): string {
  return EASSH_SSH_DIR
}

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR)
  await fs.ensureDir(CACHE_DIR)
  await fs.ensureDir(SSH_DIR)
  await fs.ensureDir(EASSH_SSH_DIR)
}

export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  try {
    const exists = await fs.pathExists(CONFIG_FILE)
    if (!exists)
      return null
    const content = await fs.readJson(CONFIG_FILE)
    return content as GlobalConfig
  }
  catch {
    return null
  }
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 })
}

export async function loadServers(): Promise<ServerConfig[]> {
  const serversFile = path.join(CACHE_DIR, 'servers.json')
  try {
    const exists = await fs.pathExists(serversFile)
    if (!exists)
      return []
    const data = await fs.readJson(serversFile) as ServersData
    return data.servers || []
  }
  catch {
    return []
  }
}

export async function saveServers(servers: ServerConfig[]): Promise<void> {
  const serversFile = path.join(CACHE_DIR, 'servers.json')
  const data: ServersData = { servers }
  await fs.writeJson(serversFile, data, { spaces: 2 })
}

export async function getPassword(): Promise<string> {
  const envPassword = process.env.EASSH_PASSWORD
  if (envPassword)
    return envPassword
  const inquirer = await import('inquirer')
  const { password } = await inquirer.default.prompt([
    {
      type: 'password',
      name: 'password',
      message: '请输入加密密码：',
      mask: '*',
    },
  ])
  return password
}

export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return filepath.replace(/^~/, os.homedir())
  }
  return filepath
}
