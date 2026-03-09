import { execSync } from 'node:child_process'
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

  const { keyOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'keyOption',
      message: '密钥选项',
      choices: [
        { name: '生成新密钥 (推荐)', value: 'generate' },
        { name: '使用现有密钥', value: 'existing' },
      ],
    },
  ])

  const cacheDir = getCacheDir()
  const keysDir = path.join(cacheDir, 'keys')
  await fs.ensureDir(keysDir)

  const keyFileName = `${name}.key`
  const privateKeyPath = path.join(keysDir, keyFileName)
  const publicKeyPath = `${privateKeyPath}.pub`
  const encryptedKeyPath = `${privateKeyPath}.age`

  if (keyOption === 'generate') {
    console.log(chalk.cyan('正在生成 SSH 密钥...'))
    try {
      execSync(`ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -C "eassh-${name}"`, { stdio: 'inherit' })
      console.log(chalk.green('✓ SSH 密钥已生成'))
    }
    catch (error) {
      console.error(chalk.red('生成密钥失败'), error)
      return
    }
  }
  else {
    const { existingKeyPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'existingKeyPath',
        message: '现有私钥文件路径',
        validate: async (input: string) => {
          const expandedPath = expandHome(input)
          const exists = await fs.pathExists(expandedPath)
          if (!exists)
            return '文件不存在'
          return true
        },
      },
    ])

    const expandedKeyPath = expandHome(existingKeyPath)
    await fs.copy(expandedKeyPath, privateKeyPath)
    console.log(chalk.green('✓ 私钥已复制'))

    const sourcePubKeyPath = `${expandedKeyPath}.pub`
    const pubKeyExists = await fs.pathExists(sourcePubKeyPath)
    if (pubKeyExists) {
      await fs.copy(sourcePubKeyPath, publicKeyPath)
      console.log(chalk.green('✓ 公钥已复制'))
    }
  }

  console.log(chalk.cyan('正在加密私钥...'))
  const password = await getPassword()
  await encryptFile(privateKeyPath, password)
  await fs.remove(privateKeyPath)
  console.log(chalk.green('✓ 私钥已加密并保存'))

  if (await fs.pathExists(publicKeyPath)) {
    console.log(chalk.cyan('\n公钥内容 (需要添加到服务器的 ~/.ssh/authorized_keys):'))
    const pubKeyContent = await fs.readFile(publicKeyPath, 'utf-8')
    console.log(chalk.yellow(pubKeyContent.trim()))
  }

  const newServer = {
    name,
    host,
    user,
    port: Number.parseInt(port, 10),
    key: `keys/${keyFileName}.age`,
    label: label || undefined,
  }

  servers.push(newServer)
  await saveServers(servers)

  console.log(chalk.green('✓ 服务器已添加到 servers.json'))

  await addAndCommit(cacheDir, `Add server ${name}`)
  await pushRepo(cacheDir)

  console.log(chalk.green('✓ 推送到远程仓库'))
  console.log(chalk.cyan('\n运行 \'eassh setup\' 更新本地配置'))
}
