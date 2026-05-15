import { app } from 'electron'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

// 32-byte AES-256 key — must match scripts/encrypt-env.js
const SECRET = Buffer.from('IeltsStudySecureKey2024xK7pQ!!!!', 'utf8')

function decryptEnv(): Record<string, string> {
  const encPath = app.isPackaged
    ? path.join(process.resourcesPath, 'env.enc')
    : path.join(app.getAppPath(), 'resources', 'env.enc')
  const data = fs.readFileSync(encPath)
  const iv = data.subarray(0, 16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET, iv)
  const decrypted = Buffer.concat([decipher.update(data.subarray(16)), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

export function loadEncryptedEnv(): void {
  try {
    const env = decryptEnv()
    for (const [k, v] of Object.entries(env)) {
      process.env[k] = v
    }
  } catch {
    // silently ignore — key will be missing and AI features will fail gracefully
  }
}
