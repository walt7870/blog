import { build } from 'vitepress'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const workspace = mkdtempSync(join(tmpdir(), 'blog-sherpa-review-'))
// SSR output must resolve the repository's externalized Vue dependency.
const tempDir = mkdtempSync(join(root, '.vitepress/.sherpa-review-'))
const outDir = join(workspace, 'dist')
try {
  await build(root, {
    outDir,
    async onAfterConfigResolve(config) {
      config.tempDir = tempDir
    },
  })
  console.log(JSON.stringify({ outDir }))
} catch (error) {
  rmSync(workspace, { recursive: true, force: true })
  throw error
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
