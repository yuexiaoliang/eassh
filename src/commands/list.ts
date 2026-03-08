import chalk from 'chalk'
import { loadServers } from '../core/config.js'

export async function list(): Promise<void> {
  const servers = await loadServers()

  if (servers.length === 0) {
    console.log(chalk.yellow('没有可用的服务器'))
    return
  }

  console.log(chalk.cyan(`服务器列表 (共 ${servers.length} 个):\n`))

  console.log(
    chalk.gray('  NAME    ')
    + chalk.gray('HOST              ')
    + chalk.gray('USER    ')
    + chalk.gray('PORT    ')
    + chalk.gray('LABEL'),
  )

  for (const server of servers) {
    const name = server.name.padEnd(7)
    const host = server.host.padEnd(17)
    const user = server.user.padEnd(7)
    const port = String(server.port).padEnd(7)
    const label = server.label || ''

    console.log(`  ${name} ${host} ${user} ${port} ${label}`)
  }
}
