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
    '**/node_modules/better-sqlite3/**',
    '**/node_modules/bindings/**',
    '**/node_modules/file-uri-to-path/**',
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    icon: 'build/icon.icns',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false,
  },
  dmg: {
    artifactName: '${name}-${version}.${ext}',
  },
}
