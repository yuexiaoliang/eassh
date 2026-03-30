import fs from 'fs-extra'
import simpleGit from 'simple-git'
import { getCacheDir, loadGlobalConfig } from './config.js'

export async function cloneRepo(url: string, repoPath?: string): Promise<void> {
  const targetPath = repoPath || getCacheDir()
  const git = simpleGit()

  const exists = await fs.pathExists(targetPath)
  if (exists) {
    await fs.remove(targetPath)
  }

  await fs.ensureDir(targetPath)
  await git.clone(url, targetPath)
}

export async function pullRepo(repoPath?: string): Promise<void> {
  const targetPath = repoPath || getCacheDir()
  const git = simpleGit(targetPath)
  const config = await loadGlobalConfig()
  const branch = config?.branch || 'main'

  // 先获取远程更新
  await git.fetch(['origin'])

  // 检查远程是否有指定的分支
  const branches = await git.branch(['-a'])
  const remoteBranch = `remotes/origin/${branch}`
  const remoteBranchExists = branches.all.includes(remoteBranch)

  if (!remoteBranchExists) {
    console.log(`Remote branch '${branch}' not found, skipping pull`)
    return
  }

  // 检查是否在正确的分支上
  const status = await git.status()
  if (status.current !== branch) {
    const localBranchExists = branches.all.includes(branch)

    if (localBranchExists) {
      await git.checkout(branch)
    }
    else {
      await git.checkout(['-b', branch, '--track', remoteBranch])
    }
  }

  // 拉取更新
  await git.pull('origin', branch)
}

export async function pushRepo(repoPath?: string): Promise<void> {
  const targetPath = repoPath || getCacheDir()
  const git = simpleGit(targetPath)
  const config = await loadGlobalConfig()
  const branch = config?.branch || 'main'

  // 检查是否在正确的分支上
  const status = await git.status()
  if (status.current !== branch) {
    // 尝试切换到配置的分支
    const branches = await git.branch(['-a'])
    const localBranchExists = branches.all.includes(branch)
    const remoteBranch = `remotes/origin/${branch}`
    const remoteBranchExists = branches.all.includes(remoteBranch)

    if (localBranchExists) {
      await git.checkout(branch)
    }
    else if (remoteBranchExists) {
      await git.checkout(['-b', branch, '--track', remoteBranch])
    }
    else {
      // 创建本地分支并设置上游
      await git.checkout(['-b', branch])
    }
  }

  await git.push('origin', branch)
}

export async function addAndCommit(repoPath: string, message: string): Promise<void> {
  const git = simpleGit(repoPath)
  await git.add('.')
  await git.commit(message)
}

export async function getRemoteUrl(repoPath?: string): Promise<string | null> {
  const targetPath = repoPath || getCacheDir()
  const git = simpleGit(targetPath)
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    return origin?.refs.fetch || null
  }
  catch {
    return null
  }
}
