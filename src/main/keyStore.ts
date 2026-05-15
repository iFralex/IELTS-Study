import { app } from 'electron'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { generateText, type LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

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
    // silently ignore — AI features will fail gracefully
  }
}

export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  const model    = process.env.AI_MODEL    ?? 'claude-haiku-4-5-20251001'
  const key      = process.env.AI_API_KEY  ?? ''
  if (provider === 'anthropic') return createAnthropic({ apiKey: key })(model)
  if (provider === 'google')    return createGoogleGenerativeAI({ apiKey: key })(model)
  if (provider === 'openai')    return createOpenAI({ apiKey: key })(model)
  throw new Error(`Provider non supportato: ${provider}`)
}

export { generateText }
