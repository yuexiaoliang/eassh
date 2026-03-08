import { Decrypter, Encrypter } from 'age-encryption'
import fs from 'fs-extra'

export async function encryptFile(inputPath: string, password: string): Promise<string> {
  const content = await fs.readFile(inputPath)
  const encrypter = new Encrypter()
  encrypter.setPassphrase(password)
  const encrypted = await encrypter.encrypt(content)
  const outputPath = `${inputPath}.age`
  await fs.writeFile(outputPath, encrypted)
  return outputPath
}

export async function decryptFile(inputPath: string, password: string, outputPath?: string): Promise<string> {
  const encrypted = await fs.readFile(inputPath)
  const decrypter = new Decrypter()
  decrypter.addPassphrase(password)
  const decrypted = await decrypter.decrypt(encrypted, 'uint8array')
  const outPath = outputPath || inputPath.replace(/\.age$/, '')
  await fs.writeFile(outPath, decrypted)
  return outPath
}

export async function encryptString(content: string, password: string): Promise<Uint8Array> {
  const encrypter = new Encrypter()
  encrypter.setPassphrase(password)
  return encrypter.encrypt(content)
}

export async function decryptString(encrypted: Uint8Array, password: string): Promise<string> {
  const decrypter = new Decrypter()
  decrypter.addPassphrase(password)
  return decrypter.decrypt(encrypted, 'text')
}
