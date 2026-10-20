import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const source = '/Users/waltniu/Documents/项目/个人学习/模型推理学习资料/sources/releases-2026-10-20.json'
const raw = JSON.parse(readFileSync(source, 'utf8'))
const snapshot = {
  checked_at: raw.checked_at,
  definition: raw.definition,
  releases: raw.releases.map(({ repo, tag, url, published_at, prerelease, body }) => ({ repo, tag, url, published_at, prerelease, body_sha256: createHash('sha256').update(body).digest('hex') })),
  tensorrt_recent: raw.tensorrt_recent,
}
writeFileSync(new URL('./release-snapshot.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
console.log('保存正式版本与 RC 快照，包含原 release body 校验值')
