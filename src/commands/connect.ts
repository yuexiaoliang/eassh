import chalk from 'chalk'
import inquirer from 'inquirer'
import { expandHome, loadServers } from '../core/config.js'
import { connect as sshConnect } from '../core/ssh.js'

export async function connect(name?: string): Promise<void> {
  const servers = await loadServers()

  if (servers.length === 0) {
    console.log(chalk.red('没有可用的服务器，请先运行 eassh add 添加服务器'))
    process.exit(1)
  }

  let selectedServer

  if (name) {
    selectedServer = servers.find(s => s.name === name)
    if (!selectedServer) {
      console.log(chalk.red(`未找到服务器: ${name}`))
      process.exit(1)
    }
  }
  else {
    const { server } = await inquirer.prompt([
      {
        type: 'list',
        name: 'server',
        message: '选择要连接的服务器',
        choices: servers.map(s => ({
          name: `${s.name} (${s.host})${s.label ? ` - ${s.label}` : ''}`,
          value: s.name,
        })),
      },
    ])
    selectedServer = servers.find(s => s.name === server)
  }

  if (selectedServer) {
    const keyPath = expandHome(selectedServer.key.replace('.age', ''))
    await sshConnect(selectedServer, keyPath)
  }
}
