import type { GlobalConfig, ServersData } from '../core/types.js'
import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { ensureConfigDir, expandHome, getCacheDir, loadGlobalConfig, saveGlobalConfig } from '../core/config.js'
import { cloneRepo } from '../core/git.js'

export interface InitOptions {
  dir?: string
}

export async function init(options?: InitOptions): Promise<void> {
  const existingConfig = await loadGlobalConfig()
  if (existingConfig) {
    console.log(chalk.yellow('配置文件已存在'))
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: '是否覆盖现有配置？',
        default: false,
      },
    ])
    if (!overwrite)
      return
  }

  const { repoUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'repoUrl',
      message: '请输入你的私有配置仓库地址 (GitHub/GitLab)',
      validate: (input: string) => {
        if (!input)
          return '请输入仓库地址'
        if (!input.includes('github.com') && !input.includes('gitlab.com')) {
          return '请输入有效的 GitHub 或 GitLab 仓库地址'
        }
        return true
      },
    },
  ])

  // 确定目标目录
  let targetPath: string
  if (options?.dir) {
    targetPath = expandHome(options.dir)
    console.log(chalk.green(`✓ 正在创建配置目录：${targetPath}...`))
    await fs.ensureDir(targetPath)
  }
  else {
    targetPath = getCacheDir()
    console.log(chalk.green('✓ 正在创建配置目录...'))
    await ensureConfigDir()
  }

  console.log(chalk.green('✓ 正在克隆配置仓库...'))
  await cloneRepo(repoUrl, targetPath)

  // 生成默认配置文件（如果不存在）
  console.log(chalk.green('✓ 正在检查配置文件...'))
  await generateDefaultConfig(targetPath)

  const config: GlobalConfig = {
    repoUrl,
    repoPath: options?.dir ? targetPath : '~/.eassh/cache',
    encrypted: true,
  }

  await saveGlobalConfig(config)

  console.log(chalk.green('✓ 设置完成！'))
  console.log(chalk.cyan('\n现在可以运行 \'eassh setup\' 来解密密钥'))
}

/**
 * 生成默认配置文件（如果不存在）
 */
async function generateDefaultConfig(targetPath: string): Promise<void> {
  const serversFile = path.join(targetPath, 'servers.json')
  const readmeFile = path.join(targetPath, 'README.md')
  const keysDir = path.join(targetPath, 'keys')

  // 生成 servers.json
  const serversExists = await fs.pathExists(serversFile)
  if (!serversExists) {
    const defaultServers: ServersData = {
      servers: [],
    }
    await fs.writeJson(serversFile, defaultServers, { spaces: 2 })
    console.log(chalk.green('✓ 已生成默认 servers.json'))
  }

  // 生成 README.md
  const readmeExists = await fs.pathExists(readmeFile)
  if (!readmeExists) {
    const defaultReadme = `# 我的服务器配置

## 快速开始

### 新机器初始化

\`\`\`bash
# 1. 安装 Node.js
# 2. 运行初始化
npx eassh init

# 3. 解密配置
npx eassh setup

# 4. 连接服务器
npx eassh connect
\`\`\`

## 添加新服务器

\`\`\`bash
npx eassh add
\`\`\`

## 安全说明

- 所有密钥已用 age 加密
- 解密密码存储在密码管理器中
- 私钥永远不会以明文形式提交到 Git
`
    await fs.writeFile(readmeFile, defaultReadme, 'utf-8')
    console.log(chalk.green('✓ 已生成默认 README.md'))
  }

  // 创建 keys 目录
  const keysExists = await fs.pathExists(keysDir)
  if (!keysExists) {
    await fs.ensureDir(keysDir)
    console.log(chalk.green('✓ 已创建 keys 目录'))
  }
}
