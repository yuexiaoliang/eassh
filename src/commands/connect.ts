import type { ServerConfig } from '../core/types.js'
import chalk from 'chalk'
import { expandHome, loadHistory, loadServers, updateServerHistory } from '../core/config.js'
import { connect as sshConnect } from '../core/ssh.js'

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1)
    return 'just now'
  if (minutes < 60)
    return `${minutes}m ago`
  if (hours < 24)
    return `${hours}h ago`
  if (days < 7)
    return `${days}d ago`
  return date.toLocaleDateString('en-US')
}

function sortServersByHistory(servers: ServerConfig[], history: Record<string, { lastConnected: string, count: number }>): ServerConfig[] {
  return [...servers].sort((a, b) => {
    const historyA = history[a.name]
    const historyB = history[b.name]

    if (historyA && !historyB)
      return -1
    if (!historyA && historyB)
      return 1
    if (historyA && historyB) {
      return new Date(historyB.lastConnected).getTime() - new Date(historyA.lastConnected).getTime()
    }
    return a.name.localeCompare(b.name)
  })
}

function formatServerChoice(server: ServerConfig, history: Record<string, { lastConnected: string, count: number }>, index: number): string {
  const serverHistory = history[server.name]
  const hasHistory = !!serverHistory

  let label = `${index + 1}. `
  if (hasHistory) {
    label += `⭐ ${server.name} (${server.host})`
  }
  else {
    label += `${server.name} (${server.host})`
  }

  if (server.label) {
    label += ` - ${server.label}`
  }

  if (hasHistory) {
    label += ` - ${formatTimeAgo(serverHistory.lastConnected)}`
  }

  return label
}

export async function connect(name?: string): Promise<void> {
  if (name) {
    const servers = await loadServers()
    const server = servers.find(s => s.name === name)
    if (!server) {
      console.log(chalk.red(`Server not found: ${name}`))
      process.exit(1)
    }
    const keyPath = expandHome(server.key.replace('.age', ''))
    await sshConnect(server, keyPath)
    await updateServerHistory(server.name)
    return
  }

  const servers = await loadServers()

  if (servers.length === 0) {
    console.log(chalk.red('No servers available. Run "essh add" to add a server first'))
    process.exit(1)
  }

  const history = await loadHistory()
  const sortedServers = sortServersByHistory(servers, history)

  const choices = sortedServers.map((server, index) => ({
    name: formatServerChoice(server, history, index),
    value: server.name,
    server,
  }))

  const enquirerModule = await import('enquirer')
  const Enquirer = enquirerModule.default
  const enquirer = new Enquirer()

  let answer: Record<string, string>
  try {
    answer = await enquirer.prompt({
      type: 'autocomplete',
      name: 'server',
      message: 'Select a server (type to search, Enter to connect)',
      choices,
      initial: 0,
    }) as Record<string, string>
  }
  catch {
    // User pressed Ctrl+C, exit gracefully
    process.exit(0)
  }

  const selected = answer.server
  const selectedServer = sortedServers.find(s => s.name === selected)

  if (selectedServer) {
    const keyPath = expandHome(selectedServer.key.replace('.age', ''))
    await sshConnect(selectedServer, keyPath)
    await updateServerHistory(selectedServer.name)
  }
}
