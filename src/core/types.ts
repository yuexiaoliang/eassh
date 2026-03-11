export interface GlobalConfig {
  repoUrl: string
  repoPath: string
  encrypted: boolean
  branch: string
}

export interface ServerConfig {
  name: string
  host: string
  user: string
  port: number
  key: string
  label?: string
  proxyJump?: string
}

export interface ServersData {
  servers: ServerConfig[]
}

export interface ServerHistory {
  lastConnected: string
  count: number
}

export interface HistoryData {
  [serverName: string]: ServerHistory
}
