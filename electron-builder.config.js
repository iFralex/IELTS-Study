/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ielts.study',
  productName: 'IELTS Study',
  directories: { buildResources: 'build' },
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.npmrc,pnpm-lock.yaml}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}',
  ],
  extraResources: [
    { from: 'data', to: 'data', filter: ['**/*.json'] },
    { from: 'resources/env.enc', to: 'env.enc' },
  ],
  asarUnpack: [
    // Native modules must be unpacked so their .node binaries are executable
    '**/node_modules/better-sqlite3/**',
    '**/node_modules/bindings/**',
    '**/node_modules/file-uri-to-path/**',
    // ai, @ai-sdk/*, and zod are now bundled into out/main/index.js at build
    // time (see electron.vite.config.ts) so they never hit the ASAR resolver
    // and do not need to be unpacked here.
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    icon: 'build/icon.icns',
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false,
  },
  dmg: {
    artifactName: '${name}-${version}.${ext}',
  },
}
