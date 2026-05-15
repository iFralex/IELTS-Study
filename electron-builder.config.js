/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ielts.study',
  productName: 'IELTS Study',
  directories: { buildResources: 'resources' },
  extraResources: [{ from: 'data', to: 'data', filter: ['**/*.json'] }],
  mac: { target: [{ target: 'dmg', arch: ['arm64', 'x64'] }] },
}
