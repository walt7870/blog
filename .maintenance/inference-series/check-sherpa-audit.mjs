import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const isolated = mkdtempSync(join(tmpdir(), 'blog-sherpa-audit-'))
const audit = '.maintenance/content-audit'
const evidence = join(root, '.maintenance/inference-series/evidence/sherpa-20261023')
const pages = [
  ['index.md', '总览', '保留入门主线，只补语音回放与已有 sherpa-onnx 专题入口。'],
  ['01-landscape.md', '机制入门', '从同一个年假问题补充语音推理定位，不在第一篇引入后端清单。'],
  ['11-speech.md', '机制与选型', '补语音框架与计算后端分工图、七阶段流程回放、热词配置因果实验、能力边界与已有详细页入口。'],
  ['12-selection-versions.md', '对比与版本速查', '在任务选型中补 sherpa-onnx，语音版本使用独立核查日期；保留其他项目原有快照，无需追加重复图示。'],
].map(([name, pageType, decision]) => ({
  file: `docs/ai/inference-series/${name}`, status: 'verified', pageType, decision, findings: [],
  dependencyFiles: name === '11-speech.md' ? [
    '.vitepress/theme/components/SpeechRuntimeLab.vue',
    '.vitepress/theme/components/InferenceFigure.vue',
    'public/ai/inference-series/sherpa-runtime.svg',
    'public/ai/inference-series/sherpa-runtime-mobile.svg',
  ] : [],
  validation: [
    '全文阅读；语音框架职责、热词条件、FunASR 推理部署能力与 sherpa-onnx v1.13.8 发布说明经官方页面核查。',
    '四页在实际 1440/390/320 宽度、浅深色检查，无整页横向溢出或失败图片；浅色针对完整构建成品。交互推进、回退、重置、热词条件、站内跳转与中文搜索已实际操作。',
    'Node.js v24.19.0 独立全站构建通过，67.16 秒；两版 SVG 自检与真实字体文字边界通过。完整证据见 inference-series/evidence/sherpa-20261023。',
  ],
}))
try {
  for (const name of readdirSync(root)) {
    if (['docs', 'public', 'profile', 'projects', 'miniapp', '.vitepress'].includes(name) || name.endsWith('.md')) {
      symlinkSync(join(root, name), join(isolated, name))
    }
  }
  mkdirSync(join(isolated, audit), { recursive: true })
  for (const name of ['page-reviews.json', 'reviews']) {
    cpSync(join(root, audit, name), join(isolated, audit, name), { recursive: true })
  }
  writeFileSync(join(isolated, audit, 'reviews/zzzzzz-sherpa-runtime.json'), JSON.stringify({ pages }, null, 2))
  const run = spawnSync(process.execPath, [join(root, 'script/audit-site.mjs'), '--root', isolated, '--gate'], { encoding: 'utf8' })
  const scan = JSON.parse(readFileSync(join(isolated, audit, 'site-scan.json'), 'utf8'))
  for (const page of pages) page.reviewedHash = scan.pages.find(item => item.file === page.file).reviewHash
  const affected = scan.pages.filter(item => pages.some(page => page.file === item.file))
  const result = { exitCode: run.status, summary: scan.summary, affected, stderr: run.stderr }
  mkdirSync(evidence, { recursive: true })
  writeFileSync(join(evidence, 'site-audit.json'), JSON.stringify(result, null, 2) + '\n')
  writeFileSync(join(root, audit, 'reviews/zzzzzz-sherpa-runtime.json'), JSON.stringify({ pages }, null, 2) + '\n')
  console.log(JSON.stringify({ exitCode: run.status, pages: scan.summary.pages, brokenLocalReferences: scan.summary.brokenLocalReferences, stale: scan.summary.stale.length, pending: scan.summary.pending, openFindings: scan.summary.openFindings, affected: affected.map(item => ({ file: item.file, findings: item.findings })) }, null, 2))
} finally {
  rmSync(isolated, { recursive: true, force: true })
}
