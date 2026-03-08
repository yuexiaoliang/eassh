import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { expandHome, getCacheDir, getPassword, loadServers, saveServers } from '../core/config.js'
import { encryptFile } from '../core/crypto.js'
import { addAndCommit, pushRepo } from '../core/git.js'

export async function add(): Promise<void> {
  const servers = await loadServers()

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '服务器名称 (英文标识)',
      validate: (input: string) => {
        if (!input)
          return '请输入服务器名称'
        if (servers.some(s => s.name === input))
          return '服务器名称已存在'
        if (!/^[a-z0-9-]+$/.test(input))
          return '只能使用小写字母、数字和连字符'
        return true
      },
    },
  ])

  const { host } = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: '服务器地址 (IP 或域名)',
      validate: (input: string) => {
        if (!input)
          return '请输入服务器地址'
        return true
      },
    },
  ])

  const { user } = await inquirer.prompt([
    {
      type: 'input',
      name: 'user',
      message: 'SSH 用户名',
      validate: (input: string) => {
        if (!input)
          return '请输入 SSH 用户名'
        return true
      },
    },
  ])

  const { port } = await inquirer.prompt([
    {
      type: 'input',
      name: 'port',
      message: 'SSH 端口 (默认 22)',
      default: '22',
      validate: (input: string) => {
        const portNum = Number.parseInt(input, 10)
        if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
          return '请输入有效的端口号 (1-65535)'
        }
        return true
      },
    },
  ])

  const { label } = await inquirer.prompt([
    {
      type: 'input',
      name: 'label',
      message: '服务器描述/标签',
    },
  ])

  const { keyPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyPath',
      message: '私钥文件路径',
      validate: async (input: string) => {
        const expandedPath = expandHome(input)
        const exists = await fs.pathExists(expandedPath)
        if (!exists)
          return '文件不存在'
        return true
      },
    },
  ])

  const { uploadKey } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'uploadKey',
      message: '是否现在上传私钥？',
      default: true,
    },
  ])

  const cacheDir = getCacheDir()
  const keysDir = path.join(cacheDir, 'keys')
  await fs.ensureDir(keysDir)

  let keyRelativePath = ''
  if (uploadKey) {
    const expandedKeyPath = expandHome(keyPath)
    const keyFileName = path.basename(expandedKeyPath)
    const encryptedPath = path.join(keysDir, `${keyFileName}.age`)
    const pubKeyPath = `${expandedKeyPath}.pub`
    const pubKeyDest = path.join(keysDir, `${keyFileName}.pub`)

    const password = await getPassword()
    await encryptFile(expandedKeyPath, password)
    await fs.move(expandedKeyPath, encryptedPath, { overwrite: true })

    // 同时复制公钥到 keys 目录（公钥不需要加密）
    const pubKeyExists = await fs.pathExists(pubKeyPath)
    if (pubKeyExists) {
      await fs.copy(pubKeyPath, pubKeyDest, { overwrite: true })
      console.log(chalk.green('✓ 公钥已复制到 keys 目录'))
    }

    keyRelativePath = `keys/${keyFileName}.age`
  }

  const newServer = {
    name,
    host,
    user,
    port: Number.parseInt(port, 10),
    key: keyRelativePath,
    label: label || undefined,
  }

  servers.push(newServer)
  await saveServers(servers)

  console.log(chalk.green('✓ 服务器已添加到 servers.json'))

  if (uploadKey) {
    console.log(chalk.green('✓ 私钥已加密并保存'))

    await addAndCommit(cacheDir, `Add server ${name}`)
    await pushRepo(cacheDir)

    console.log(chalk.green('✓ 推送到远程仓库'))
  }

  console.log(chalk.cyan('\n运行 \'eassh setup\' 更新本地配置'))
}
