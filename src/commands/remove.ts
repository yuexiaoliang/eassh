import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { getCacheDir, loadServers, saveServers } from '../core/config.js'
import { addAndCommit, pushRepo } from '../core/git.js'

export async function remove(name: string): Promise<void> {
  const servers = await loadServers()

  if (servers.length === 0) {
    console.log(chalk.red('没有可用的服务器'))
    process.exit(1)
  }

  let serverToRemove
  if (name) {
    serverToRemove = servers.find(s => s.name === name)
    if (!serverToRemove) {
      console.log(chalk.red(`未找到服务器: ${name}`))
      process.exit(1)
    }
  }
  else {
    const { server } = await inquirer.prompt([
      {
        type: 'list',
        name: 'server',
        message: '选择要删除的服务器',
        choices: servers.map(s => ({
          name: `${s.name} (${s.host})${s.label ? ` - ${s.label}` : ''}`,
          value: s.name,
        })),
      },
    ])
    serverToRemove = servers.find(s => s.name === server)
  }

  if (!serverToRemove)
    return

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认删除服务器 ${serverToRemove.name}？`,
      default: false,
    },
  ])

  if (!confirm)
    return

  const cacheDir = getCacheDir()
  const keysDir = path.join(cacheDir, 'keys')

  if (serverToRemove.key) {
    const keyPath = path.join(cacheDir, serverToRemove.key)
    const keyExists = await fs.pathExists(keyPath)
    if (keyExists) {
      await fs.remove(keyPath)
      console.log(chalk.green(`✓ 已删除密钥文件`))
    }
  }

  const newServers = servers.filter(s => s.name !== serverToRemove!.name)
  await saveServers(newServers)

  console.log(chalk.green('✓ 服务器已从 servers.json 移除'))

  await addAndCommit(cacheDir, `Remove server ${serverToRemove.name}`)
  await pushRepo(cacheDir)

  console.log(chalk.green('✓ 推送到远程仓库'))
}
