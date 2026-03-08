import fs from 'fs-extra'
import simpleGit from 'simple-git'
import { getCacheDir } from './config.js'

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
  await git.pull()
}

export async function pushRepo(repoPath?: string): Promise<void> {
  const targetPath = repoPath || getCacheDir()
  const git = simpleGit(targetPath)
  await git.push()
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
