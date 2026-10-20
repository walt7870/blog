import { build } from 'vitepress'
import { fileURLToPath, pathToFileURL } from 'node:url'

// This review output is not a deployable full-site build.
const root = fileURLToPath(new URL('../../', import.meta.url))
await build(root, {
  outDir: fileURLToPath(new URL('./preview-dist/', import.meta.url)),
  async onAfterConfigResolve(config) {
    const excluded = config.pages.filter(p => p.startsWith('docs/devlanguage/front/'))
    config.pages = config.pages.filter(p => !p.startsWith('docs/devlanguage/front/'))
    config.tempDir = fileURLToPath(new URL('./review-temp/', import.meta.url))
    config.ignoreDeadLinks = [...(Array.isArray(config.ignoreDeadLinks) ? config.ignoreDeadLinks : []), /devlanguage\/front/, (link, source) => new URL(link, pathToFileURL(source)).pathname.startsWith(`${root}docs/devlanguage/front/`)]
    console.log(`独立验收构建：排除另一个正在编辑的前端专题 ${excluded.length} 页；保留推理系列与其 AI 入口。`)
  },
})
