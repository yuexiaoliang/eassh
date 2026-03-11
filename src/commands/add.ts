import { execSync } from 'node:child_process'
import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { expandHome, getCacheDir, getEsshSshDir, getPassword, loadServers, saveServers } from '../core/config.js'
import { decryptFile, encryptFile } from '../core/crypto.js'
import { addAndCommit, pullRepo, pushRepo } from '../core/git.js'
import { updateSSHConfig } from '../core/ssh.js'

// Reserved names that cannot be used as server names
const RESERVED_NAMES = ['init', 'setup', 'connect', 'list', 'add', 'encrypt', 'remove', 'help', '-v', '--version']

export async function add(): Promise<void> {
  const cacheDir = getCacheDir()

  // Pull latest changes first to avoid conflicts between devices
  console.log(chalk.cyan('Syncing remote repository...'))
  try {
    await pullRepo(cacheDir)
    console.log(chalk.green('Synced latest config'))
  }
  catch {
    console.log(chalk.yellow('Failed to sync remote, using local config'))
  }

  const servers = await loadServers()

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Server name (English identifier)',
      validate: (input: string) => {
        if (!input)
          return 'Please enter a server name'
        if (servers.some(s => s.name === input))
          return 'Server name already exists'
        if (RESERVED_NAMES.includes(input.toLowerCase()))
          return 'Cannot use built-in command name as server name'
        if (!/^[a-z0-9-]+$/.test(input))
          return 'Only lowercase letters, numbers and hyphens allowed'
        return true
      },
    },
  ])

  const { host } = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'Server address (IP or domain)',
      validate: (input: string) => {
        if (!input)
          return 'Please enter server address'
        return true
      },
    },
  ])

  const { user } = await inquirer.prompt([
    {
      type: 'input',
      name: 'user',
      message: 'SSH username',
      validate: (input: string) => {
        if (!input)
          return 'Please enter SSH username'
        return true
      },
    },
  ])

  const { port } = await inquirer.prompt([
    {
      type: 'input',
      name: 'port',
      message: 'SSH port (default 22)',
      default: '22',
      validate: (input: string) => {
        const portNum = Number.parseInt(input, 10)
        if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
          return 'Please enter a valid port number (1-65535)'
        }
        return true
      },
    },
  ])

  const { label } = await inquirer.prompt([
    {
      type: 'input',
      name: 'label',
      message: 'Server description/label',
    },
  ])

  const { keyOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'keyOption',
      message: 'Key option',
      choices: [
        { name: 'Generate new key (recommended)', value: 'generate' },
        { name: 'Use existing key', value: 'existing' },
      ],
    },
  ])

  const keysDir = path.join(cacheDir, 'keys')
  await fs.ensureDir(keysDir)

  const keyFileName = `${name}.key`
  const privateKeyPath = path.join(keysDir, keyFileName)
  const publicKeyPath = `${privateKeyPath}.pub`
  const encryptedKeyPath = `${privateKeyPath}.age`

  if (keyOption === 'generate') {
    console.log(chalk.cyan('Generating SSH key...'))
    try {
      execSync(`ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -C "essh-${name}"`, { stdio: 'inherit' })
      console.log(chalk.green('SSH key generated'))
    }
    catch (error) {
      console.error(chalk.red('Failed to generate key'), error)
      return
    }
  }
  else {
    const { existingKeyPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'existingKeyPath',
        message: 'Path to existing private key',
        validate: async (input: string) => {
          const expandedPath = expandHome(input)
          const exists = await fs.pathExists(expandedPath)
          if (!exists)
            return 'File does not exist'
          return true
        },
      },
    ])

    const expandedKeyPath = expandHome(existingKeyPath)
    await fs.copy(expandedKeyPath, privateKeyPath)
    console.log(chalk.green('Private key copied'))

    const sourcePubKeyPath = `${expandedKeyPath}.pub`
    const pubKeyExists = await fs.pathExists(sourcePubKeyPath)
    if (pubKeyExists) {
      await fs.copy(sourcePubKeyPath, publicKeyPath)
      console.log(chalk.green('Public key copied'))
    }
  }

  console.log(chalk.cyan('Encrypting private key...'))
  const password = await getPassword()
  await encryptFile(privateKeyPath, password)
  await fs.remove(privateKeyPath)
  console.log(chalk.green('Private key encrypted and saved'))

  if (await fs.pathExists(publicKeyPath)) {
    console.log(chalk.cyan('\nPublic key content (add to server ~/.ssh/authorized_keys):'))
    const pubKeyContent = await fs.readFile(publicKeyPath, 'utf-8')
    console.log(chalk.yellow(pubKeyContent.trim()))
    console.log(chalk.cyan('\nWays to add public key to server:'))
    console.log(chalk.white(`Method 1 (recommended): ssh-copy-id -f -i ~/.essh/cache/keys/${keyFileName}.pub ${user}@${host}`))
    console.log(chalk.white(`Method 2: Login to server and run: echo "${pubKeyContent.trim()}" >> ~/.ssh/authorized_keys`))
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

  console.log(chalk.green('Server added to servers.json'))

  await addAndCommit(cacheDir, `Add server ${name}`)
  await pushRepo(cacheDir)

  console.log(chalk.green('Pushed to remote repository'))

  console.log(chalk.cyan('\nDecrypting key and configuring SSH...'))
  const esshDir = getEsshSshDir()
  await fs.ensureDir(esshDir)
  const decryptedKeyPath = path.join(esshDir, keyFileName)
  await decryptFile(encryptedKeyPath, password, decryptedKeyPath)
  await fs.chmod(decryptedKeyPath, 0o600)

  await updateSSHConfig(servers)

  console.log(chalk.green('Local config updated'))

  // Read public key content for display
  let pubKeyContent = ''
  if (await fs.pathExists(publicKeyPath)) {
    pubKeyContent = await fs.readFile(publicKeyPath, 'utf-8')
  }

  // Ask if user wants to automatically add public key to server
  const { shouldAddKey } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldAddKey',
      message: 'Automatically add public key to server?',
      default: true,
    },
  ])

  if (shouldAddKey) {
    const { serverPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'serverPassword',
        message: `Enter password for ${user}@${host}:`,
        mask: '*',
      },
    ])

    console.log(chalk.cyan('Adding public key to server...'))
    try {
      // Use sshpass to automate ssh-copy-id with password
      const { execSync } = await import('node:child_process')
      const sshCopyIdCmd = `sshpass -p '${serverPassword}' ssh-copy-id -f -o StrictHostKeyChecking=no -i ${publicKeyPath} ${user}@${host}`
      execSync(sshCopyIdCmd, { stdio: 'inherit' })
      console.log(chalk.green('Public key added to server'))
      console.log(chalk.cyan('\nYou can now run "essh connect" to connect without password'))
    }
    catch {
      console.log(chalk.yellow('Auto-add failed, please add public key manually:'))
      console.log(chalk.white(`Method 1: ssh-copy-id -f -i ~/.essh/cache/keys/${keyFileName}.pub ${user}@${host}`))
      console.log(chalk.white(`Method 2: Login to server and run: echo "${pubKeyContent.trim()}" >> ~/.ssh/authorized_keys`))
    }
  }
  else {
    console.log(chalk.cyan('\nYou can run "essh connect" to connect (password required for first time)'))
    console.log(chalk.cyan('\nOr add public key to server manually:'))
    console.log(chalk.white(`Method 1: ssh-copy-id -f -i ~/.essh/cache/keys/${keyFileName}.pub ${user}@${host}`))
    console.log(chalk.white(`Method 2: Login to server and run: echo "${pubKeyContent.trim()}" >> ~/.ssh/authorized_keys`))
  }
}
