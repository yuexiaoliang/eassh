import chalk from 'chalk'
import { getPassword, loadGlobalConfig, loadServers } from '../core/config.js'
import { pullRepo } from '../core/git.js'
import { decryptAllKeys, updateSSHConfig } from '../core/ssh.js'

export async function setup(): Promise<void> {
  const config = await loadGlobalConfig()
  if (!config) {
    console.log(chalk.red('请先运行 eassh init 初始化配置'))
    process.exit(1)
  }

  console.log(chalk.green('✓ 正在拉取最新配置...'))
  await pullRepo()

  console.log(chalk.green('✓ 正在解密密钥...'))
  const password = await getPassword()
  await decryptAllKeys(config.repoPath, password)

  console.log(chalk.green('✓ 正在生成 SSH config...'))
  const servers = await loadServers()
  await updateSSHConfig(servers)

  console.log(chalk.green('✓ 设置文件权限...'))

  console.log(chalk.cyan('\n可用服务器：'))
  for (const server of servers) {
    console.log(`  - ${server.name} (${server.host})${server.label ? ` - ${server.label}` : ''}`)
  }

  console.log(chalk.cyan('\n运行 \'eassh connect\' 开始连接'))
}
