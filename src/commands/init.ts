import type { GlobalConfig, ServersData } from '../core/types.js'
import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import simpleGit from 'simple-git'
import { ensureConfigDir, expandHome, getCacheDir, loadGlobalConfig, saveGlobalConfig } from '../core/config.js'
import { cloneRepo } from '../core/git.js'

export interface InitOptions {
  dir?: string
}

export async function init(options?: InitOptions): Promise<void> {
  const existingConfig = await loadGlobalConfig()
  if (existingConfig) {
    console.log(chalk.yellow('Config file already exists'))
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite existing config?',
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
      message: 'Enter your private config repository URL (GitHub/GitLab)',
      validate: (input: string) => {
        if (!input)
          return 'Please enter repository URL'
        if (!input.includes('github.com') && !input.includes('gitlab.com')) {
          return 'Please enter a valid GitHub or GitLab repository URL'
        }
        return true
      },
    },
  ])

  // Determine target directory
  let targetPath: string
  if (options?.dir) {
    targetPath = expandHome(options.dir)
    console.log(chalk.green(`Creating config directory: ${targetPath}...`))
    await fs.ensureDir(targetPath)
  }
  else {
    targetPath = getCacheDir()
    console.log(chalk.green('Creating config directory...'))
    await ensureConfigDir()
  }

  console.log(chalk.green('Cloning config repository...'))
  await cloneRepo(repoUrl, targetPath)

  // Detect main branch
  console.log(chalk.green('Detecting main branch...'))
  const branch = await detectMainBranch(targetPath)
  console.log(chalk.green(`Main branch: ${branch}`))

  // Generate default config files if not exists
  console.log(chalk.green('Checking config files...'))
  await generateDefaultConfig(targetPath)

  const config: GlobalConfig = {
    repoUrl,
    repoPath: options?.dir ? targetPath : '~/.essh/cache',
    encrypted: true,
    branch,
  }

  await saveGlobalConfig(config)

  console.log(chalk.green('Setup complete!'))
  console.log(chalk.cyan('\nNow you can run "essh setup" to decrypt keys'))
}

/**
 * Detect the main branch of the repository
 */
async function detectMainBranch(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath)
  const branches = await git.branch(['-a'])

  // Check local branches first
  if (branches.current) {
    return branches.current
  }

  // Check remote branches
  const hasRemoteMain = branches.all.includes('remotes/origin/main')
  const hasRemoteMaster = branches.all.includes('remotes/origin/master')

  if (hasRemoteMain) {
    // Checkout main branch
    await git.checkout(['-b', 'main', '--track', 'origin/main'])
    return 'main'
  }

  if (hasRemoteMaster) {
    // Checkout master branch
    await git.checkout(['-b', 'master', '--track', 'origin/master'])
    return 'master'
  }

  // Default to main
  return 'main'
}

/**
 * Generate default config files if not exists
 */
async function generateDefaultConfig(targetPath: string): Promise<void> {
  const serversFile = path.join(targetPath, 'servers.json')
  const readmeFile = path.join(targetPath, 'README.md')
  const keysDir = path.join(targetPath, 'keys')

  // Generate servers.json
  const serversExists = await fs.pathExists(serversFile)
  if (!serversExists) {
    const defaultServers: ServersData = {
      servers: [],
    }
    await fs.writeJson(serversFile, defaultServers, { spaces: 2 })
    console.log(chalk.green('Generated default servers.json'))
  }

  // Generate README.md
  const readmeExists = await fs.pathExists(readmeFile)
  if (!readmeExists) {
    const defaultReadme = `# ESSH - SSH Config Manager

## Quick Start

### New Machine Setup

\`\`\`bash
# 1. Install Node.js
# 2. Run initialization
npx essh init

# 3. Decrypt config
npx essh setup

# 4. Connect to servers
npx essh connect
\`\`\`

## Add New Server

\`\`\`bash
npx essh add
\`\`\`

## Security

- All keys are encrypted with age
- Decryption password is stored in password manager
- Private keys are never committed to Git in plain text
`
    await fs.writeFile(readmeFile, defaultReadme, 'utf-8')
    console.log(chalk.green('Generated default README.md'))
  }

  // Create keys directory
  const keysExists = await fs.pathExists(keysDir)
  if (!keysExists) {
    await fs.ensureDir(keysDir)
    console.log(chalk.green('Created keys directory'))
  }
}
