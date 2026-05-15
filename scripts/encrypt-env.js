// Run before building: node scripts/encrypt-env.js
// Encrypts .env → resources/env.enc using AES-256-CBC
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Must match src/main/keyStore.ts
const SECRET = Buffer.from('IeltsStudySecureKey2024xK7pQ!!!!', 'utf8')

const envPath = path.join(__dirname, '..', '.env')
const outPath = path.join(__dirname, '..', 'resources', 'env.enc')

if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env not found at project root')
  process.exit(1)
}

const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq < 0) continue
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
}

const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-cbc', SECRET, iv)
const encrypted = Buffer.concat([iv, cipher.update(JSON.stringify(env), 'utf8'), cipher.final()])

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, encrypted)
console.log('✓ .env encrypted → resources/env.enc')
