import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { build, resolveConfig } from 'vitepress'

// Build committed sources while retaining public files already served online.
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const target = process.env.REMOTE_HOST
if (!target) throw new Error('请设置 REMOTE_HOST')
const live = new Set(execFileSync('ssh', [target, "cd /opt/blog/dist && find . -type f ! -path './assets/*' -print"], { encoding: 'utf8' }).trim().split('\n').map(p => p.replace(/^\.\//, '')))
const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', 'public'], { cwd: root, encoding: 'utf8' }).trim().split('\n'))
const release = mkdtempSync(join(root, '.vitepress/.precision-release-'))
const archive = execFileSync('git', ['archive', 'HEAD'], { cwd: root, maxBuffer: 128 * 1024 * 1024 })
execFileSync('tar', ['-x', '-C', release], { input: archive })
const retained = [], excluded = []
function copyPublic(relative = '') {
  for (const entry of readdirSync(join(root, 'public', relative), { withFileTypes: true })) {
    const path = join(relative, entry.name)
    if (entry.isDirectory()) { copyPublic(path); continue }
    if (entry.isSymbolicLink()) throw new Error(`请先核对资源符号链接：${path}`)
    if (!tracked.has(`public/${path}`) && !live.has(path)) { excluded.push(path); continue }
    const output = join(release, 'public', path)
    mkdirSync(dirname(output), { recursive: true })
    if (!tracked.has(`public/${path}`)) { copyFileSync(join(root, 'public', path), output); retained.push(path) }
  }
}
copyPublic()
if (!existsSync(join(root, 'node_modules'))) throw new Error('主工作区依赖缺失')
symlinkSync(resolve(root, 'node_modules'), join(release, 'node_modules'), 'dir')
const evidence = join(root, '.maintenance/precision-series/evidence')
mkdirSync(evidence, { recursive: true })
writeFileSync(join(evidence, 'release-inputs.json'), JSON.stringify({ commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), release, retained, excluded, liveNonAssetCount: live.size }, null, 2))
const outDir = join(release, '.vitepress/dist')
const tempDir = join(release, '.vitepress/ssr')
try {
  const releaseConfig = await resolveConfig(release, 'build', 'production')
  await build(root, {
    outDir,
    async onAfterConfigResolve(config) {
      Object.assign(config, releaseConfig, { root, outDir, tempDir, cacheDir: join(release, '.vitepress/cache'), publicDir: join(release, 'public') })
      global.VITEPRESS_CONFIG = config
    },
  })
  console.log(JSON.stringify({ release, outDir, retainedPublicFiles: retained.length, excludedPublicFiles: excluded.length }))
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
