import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
const root = new URL('../../public/ai/foundations/', import.meta.url)
const svg = readdirSync(root).filter(name => name.endsWith('.svg')).map(name => {
  const data = readFileSync(new URL(name, root))
  assert.ok(data.length <= 32 * 1024, `${name}超过32KiB`)
  return { name, bytes: data.length, gzipBytes: gzipSync(data).length }
})
assert.equal(svg.length, 12)
assert.ok(svg.reduce((sum, asset) => sum + asset.bytes, 0) <= 180 * 1024)
const video = statSync(new URL('video/gradient-learning-rate.mp4', root)).size
const poster = statSync(new URL('video/gradient-poster.webp', root)).size
assert.ok(video <= 2.5 * 1024 ** 2, '网页样片超过2.5MiB')
assert.ok(poster <= 20 * 1024, '封面超过20KiB')
const chunks = new URL('../../.vitepress/dist/assets/chunks/', import.meta.url)
const engines = readdirSync(chunks).filter(name => name.startsWith('three.')).map(name => {
  const data = readFileSync(new URL(name, chunks))
  return { name, bytes: data.length, gzipBytes: gzipSync(data).length }
})
assert.ok(engines.length > 0)
assert.ok(engines.reduce((sum, file) => sum + file.gzipBytes, 0) <= 200 * 1024, 'Three.js压缩体积超过200KiB')
const result = { svg, video: { bytes: video, budget: 2.5 * 1024 ** 2 }, poster: { bytes: poster, budget: 20 * 1024 }, engines, note: 'gzip为本地计算结果，线上压缩头尚未验收；浏览器按需请求另行记录。' }
writeFileSync(new URL('./resource-report.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
