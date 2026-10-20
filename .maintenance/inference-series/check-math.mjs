import assert from 'node:assert/strict'
import { kvBytes, matchPrefix, schedule, greedyVerification } from '../../.vitepress/theme/components/inferenceMath.mjs'

assert.equal(kvBytes({ layers: 32, heads: 8, dimension: 128, bytes: 2, tokens: 8192, sequences: 1 }), 2 ** 30)
assert.equal(kvBytes({ layers: 32, heads: 8, dimension: 128, bytes: 2, tokens: 8192, sequences: 32 }), 32 * 2 ** 30)
assert.deepEqual(matchPrefix('ABCDEFGH'.split(''), 'ABCDEFGX'.split(''), 4), { exact: 7, reusable: 4 })
assert.deepEqual(matchPrefix('ABCDEFGH'.split(''), 'XBCDEFGH'.split(''), 1), { exact: 0, reusable: 0 })
assert.deepEqual(matchPrefix([], [], 4), { exact: 0, reusable: 0 })
const lengths = [2, 6, 3, 2, 4]
assert.equal(schedule(lengths, 2, false).ticks, 13)
assert.equal(schedule(lengths, 2, true).ticks, 10)
for (const slots of [2, 3]) for (const continuous of [false, true]) {
  const plan = schedule(lengths, slots, continuous)
  assert.equal(plan.work, 17)
  plan.rows.forEach((row, i) => assert.equal(row.length, lengths[i]))
  for (let t = 0; t < plan.ticks; t++) assert.ok(plan.rows.filter(row => row.includes(t)).length <= slots)
}
assert.deepEqual(greedyVerification(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'x', 'd']), { accepted: 2, committed: ['a', 'b', 'c'], rejected: true })
assert.deepEqual(greedyVerification(['a', 'b', 'c'], ['a', 'b']), { accepted: 2, committed: ['a', 'b', 'c'], rejected: false })
assert.deepEqual(greedyVerification(['a', 'b'], ['x']), { accepted: 0, committed: ['a'], rejected: true })
console.log('显存、页粒度、调度守恒与推测提交检查通过')
