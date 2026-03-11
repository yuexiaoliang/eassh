import path from 'node:path'
import chalk from 'chalk'
import fs from 'fs-extra'
import { getCacheDir, getPassword } from '../core/config.js'
import { encryptFile } from '../core/crypto.js'
import { addAndCommit, pushRepo } from '../core/git.js'

export async function encrypt(): Promise<void> {
  const cacheDir = getCacheDir()
  const keysDir = path.join(cacheDir, 'keys')

  const exists = await fs.pathExists(keysDir)
  if (!exists) {
    console.log(chalk.yellow('No key files to encrypt'))
    return
  }

  const files = await fs.readdir(keysDir)
  // Only encrypt private key files (files not ending with .pub and .age)
  const keyFiles = files.filter(f => !f.endsWith('.age') && !f.endsWith('.pub') && !f.startsWith('.'))

  if (keyFiles.length === 0) {
    console.log(chalk.yellow('No key files to encrypt'))
    return
  }

  const password = await getPassword()

  console.log(chalk.green(`Encrypting ${keyFiles.length} key files`))

  for (const file of keyFiles) {
    const inputPath = path.join(keysDir, file)
    await encryptFile(inputPath, password)
    await fs.remove(inputPath)
  }

  await addAndCommit(cacheDir, 'Encrypt keys')
  await pushRepo(cacheDir)

  console.log(chalk.green('Committed changes locally'))
  console.log(chalk.green('Pushed to remote repository'))
}
