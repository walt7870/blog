import { build, resolveConfig } from 'vitepress'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const commit = execFileSync('git', ['rev-parse', process.env.RELEASE_REF || 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const snapshot = mkdtempSync(join(root, '.vitepress/.sherpa-release-'))
const tempDir = mkdtempSync(join(root, '.vitepress/.sherpa-ssr-'))
const outDir = join(root, '.vitepress/dist')
try {
  const liveHost = process.env.RELEASE_LIVE_HOST
  if (!liveHost) throw new Error('请用 RELEASE_LIVE_HOST 指定线上文件核对目标')
  const livePaths = new Set(execFileSync('ssh', [liveHost,
    "cd /opt/blog/dist && find . -type f ! -path './assets/*' -print",
  ], { encoding: 'utf8' }).trim().split('\n'))
  const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', commit, 'public'], { cwd: root, encoding: 'utf8' }).trim().split('\n'))
  // Export committed sources while preserving the main workspace's live public assets.
  const archive = execFileSync('git', ['archive', commit], { cwd: root, maxBuffer: 128 * 1024 * 1024 })
  execFileSync('tar', ['-x', '-C', snapshot], { input: archive })
  rmSync(join(snapshot, 'public'), { recursive: true, force: true })
  const publicDir = join(snapshot, 'public')
  cpSync(join(root, 'public'), publicDir, { recursive: true })
  let omitted = 0
  for (const name of readdirSync(publicDir, { recursive: true })) {
    const file = join(publicDir, name)
    if (statSync(file).isFile() && !tracked.has(`public/${name}`) && !livePaths.has(`./${name}`)) {
      rmSync(file)
      omitted++
    }
  }
  console.log(JSON.stringify({ omittedUnpublishedPublicFiles: omitted }))
  if (existsSync(join(snapshot, 'node_modules'))) throw new Error('Unexpected snapshot node_modules')
  symlinkSync(join(root, 'node_modules'), join(snapshot, 'node_modules'))
  const releaseConfig = await resolveConfig(snapshot, 'build', 'production')
  await build(root, {
    outDir,
    async onAfterConfigResolve(config) {
      Object.assign(config, releaseConfig, {
        root,
        outDir,
        tempDir,
        cacheDir: join(snapshot, '.vitepress/cache'),
        publicDir,
      })
      global.VITEPRESS_CONFIG = config
    },
  })
  console.log(JSON.stringify({ commit, outDir }))
} finally {
  rmSync(snapshot, { recursive: true, force: true })
  rmSync(tempDir, { recursive: true, force: true })
}
