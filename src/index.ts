#!/usr/bin/env node

import { createRequire } from 'node:module'
import { Command } from 'commander'
import { add, connect, encrypt, init, list, remove, setup } from './commands/index.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nExited')
  process.exit(0)
})

const program = new Command()

program
  .name('essh')
  .description('SSH Config Manager - Manage SSH keys and server configurations')
  .version(version, '-v, --version')

// If no arguments, default to connect
if (process.argv.length === 2) {
  process.argv.push('connect')
}

program
  .command('init')
  .description('Initialize config, clone private repository')
  .option('-d, --dir <path>', 'Specify config repo clone directory (default: ~/.essh/cache)')
  .action(init)

program
  .command('setup')
  .description('Decrypt keys and configure SSH')
  .action(setup)

program
  .command('connect [name]')
  .description('Connect to a server')
  .action(connect)

program
  .command('list')
  .description('List all servers')
  .action(list)

program
  .command('add')
  .description('Add a new server')
  .action(add)

program
  .command('encrypt')
  .description('Re-encrypt and push')
  .action(encrypt)

program
  .command('remove [name]')
  .description('Remove a server')
  .action(remove)

program.on('command:*', async (operands) => {
  const command = operands[0]
  if (command) {
    // Unknown command treated as server name, try to connect
    await connect(command)
  }
})

program.parse()
