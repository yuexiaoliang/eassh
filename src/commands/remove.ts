import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { getCacheDir, getEsshSshDir, loadServers, saveServers } from '../core/config.js'
import { addAndCommit, pushRepo } from '../core/git.js'

export async function remove(name: string): Promise<void> {
  const servers = await loadServers()

  if (servers.length === 0) {
    console.log(chalk.red('No servers available'))
    process.exit(1)
  }

  let serverToRemove
  if (name) {
    serverToRemove = servers.find(s => s.name === name)
    if (!serverToRemove) {
      console.log(chalk.red(`Server not found: ${name}`))
      process.exit(1)
    }
  }
  else {
    const { server } = await inquirer.prompt([
      {
        type: 'list',
        name: 'server',
        message: 'Select server to remove',
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
      message: `Confirm removing server ${serverToRemove.name}?`,
      default: false,
    },
  ])

  if (!confirm)
    return

  const cacheDir = getCacheDir()
  const keysDir = path.join(cacheDir, 'keys')
  const esshDir = getEsshSshDir()

  if (serverToRemove.key) {
    const keyPath = path.join(cacheDir, serverToRemove.key)
    const keyName = path.basename(serverToRemove.key, '.age')
    const pubKeyPath = path.join(keysDir, `${keyName}.pub`)
    const localKeyPath = path.join(esshDir, keyName)

    // Delete encrypted key file
    const keyExists = await fs.pathExists(keyPath)
    if (keyExists) {
      await fs.remove(keyPath)
      console.log(chalk.green('Deleted encrypted key file'))
    }

    // Delete public key file
    const pubKeyExists = await fs.pathExists(pubKeyPath)
    if (pubKeyExists) {
      await fs.remove(pubKeyPath)
      console.log(chalk.green('Deleted public key file'))
    }

    // Delete local decrypted key
    const localKeyExists = await fs.pathExists(localKeyPath)
    if (localKeyExists) {
      await fs.remove(localKeyPath)
      console.log(chalk.green('Deleted local decrypted key'))
    }
  }

  const newServers = servers.filter(s => s.name !== serverToRemove!.name)
  await saveServers(newServers)

  console.log(chalk.green('Server removed from servers.json'))

  await addAndCommit(cacheDir, `Remove server ${serverToRemove.name}`)
  await pushRepo(cacheDir)

  console.log(chalk.green('Pushed to remote repository'))
}
