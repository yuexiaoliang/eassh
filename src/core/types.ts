export interface GlobalConfig {
  repoUrl: string
  repoPath: string
  encrypted: boolean
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
