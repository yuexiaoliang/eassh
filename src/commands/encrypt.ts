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
    console.log(chalk.yellow('没有密钥文件需要加密'))
    return
  }

  const files = await fs.readdir(keysDir)
  // 只加密私钥文件（不以 .pub 和 .age 结尾的文件）
  const keyFiles = files.filter(f => !f.endsWith('.age') && !f.endsWith('.pub') && !f.startsWith('.'))

  if (keyFiles.length === 0) {
    console.log(chalk.yellow('没有密钥文件需要加密'))
    return
  }

  const password = await getPassword()

  console.log(chalk.green(`✓ 加密 ${keyFiles.length} 个密钥文件`))

  for (const file of keyFiles) {
    const inputPath = path.join(keysDir, file)
    await encryptFile(inputPath, password)
    await fs.remove(inputPath)
  }

  await addAndCommit(cacheDir, 'Encrypt keys')
  await pushRepo(cacheDir)

  console.log(chalk.green('✓ 提交更改到本地仓库'))
  console.log(chalk.green('✓ 推送到远程仓库'))
}
