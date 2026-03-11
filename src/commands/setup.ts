import chalk from 'chalk'
import { expandHome, getPassword, loadGlobalConfig, loadServers } from '../core/config.js'
import { pullRepo } from '../core/git.js'
import { decryptAllKeys, updateSSHConfig } from '../core/ssh.js'

export async function setup(): Promise<void> {
  const config = await loadGlobalConfig()
  if (!config) {
    console.log(chalk.red('Please run "essh init" first to initialize config'))
    process.exit(1)
  }

  console.log(chalk.green('Pulling latest config...'))
  await pullRepo()

  console.log(chalk.green('Decrypting keys...'))
  const password = await getPassword()
  const repoPath = expandHome(config.repoPath)

  try {
    await decryptAllKeys(repoPath, password)
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(chalk.red(`Failed: ${errorMsg}`))
    process.exit(1)
  }

  console.log(chalk.green('Generating SSH config...'))
  const servers = await loadServers()
  await updateSSHConfig(servers)

  console.log(chalk.green('Setting file permissions...'))

  console.log(chalk.cyan('\nAvailable servers:'))
  for (const server of servers) {
    console.log(`  - ${server.name} (${server.host})${server.label ? ` - ${server.label}` : ''}`)
  }

  console.log(chalk.cyan('\nRun "essh connect" to connect'))
}
