import { build, resolveConfig } from 'vitepress'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const snapshot = mkdtempSync(join(root, '.vitepress/.sherpa-release-'))
const tempDir = mkdtempSync(join(root, '.vitepress/.sherpa-ssr-'))
const outDir = join(root, '.vitepress/dist')
try {
  // Export committed sources while preserving the main workspace's live public assets.
  const archive = execFileSync('git', ['archive', 'HEAD'], { cwd: root, maxBuffer: 128 * 1024 * 1024 })
  execFileSync('tar', ['-x', '-C', snapshot], { input: archive })
  rmSync(join(snapshot, 'public'), { recursive: true, force: true })
  symlinkSync(join(root, 'public'), join(snapshot, 'public'))
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
        publicDir: join(root, 'public'),
      })
      global.VITEPRESS_CONFIG = config
    },
  })
  console.log(JSON.stringify({ commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), outDir }))
} finally {
  rmSync(snapshot, { recursive: true, force: true })
  rmSync(tempDir, { recursive: true, force: true })
}
