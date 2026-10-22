import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { trajectory } from '../../.vitepress/theme/components/foundations/math.mjs'

const python = process.env.FOUNDATIONS_PYTHON || 'python3'
const script = new URL('../../public/ai/foundations/labs/train_regression.py', import.meta.url).pathname
const folder = mkdtempSync(join(tmpdir(), 'foundations-lab-'))
function train(name, args) {
  const path = join(folder, name + '.json')
  execFileSync(python, [script, ...args, '--output', path])
  return JSON.parse(readFileSync(path))
}
try {
  const normal = train('normal', ['--lr', '0.1', '--steps', '40'])
  assert.equal(normal.stop, 'completed')
  const expected = trajectory()
  assert.equal(normal.rows.length, expected.length)
  normal.rows.forEach((row, index) => {
    for (const key of ['w', 'b', 'loss', 'dw', 'db']) assert.ok(Math.abs(row[key] - expected[index][key]) < 1e-10, `${index}:${key}`)
  })
  const prediction = JSON.parse(execFileSync(python, [script, '--load', join(folder, 'normal.json'), '--weight', '2.5']))
  assert.ok(Math.abs(prediction.predicted_yuan - 6.006193390557751) < 1e-10)
  assert.ok(Math.abs(train('small', ['--single', '--lr', '.1', '--steps', '1']).rows[1].loss - .72) < 1e-10)
  assert.equal(train('large', ['--single', '--lr', '1', '--steps', '1']).rows[1].loss, 18)
  assert.equal(train('diverged', ['--lr', '1', '--steps', '40']).stop, 'parameter_limit')
  for (const args of [['--weight', '-1'], ['--weight', 'nan'], ['--lr', 'inf'], ['--steps', '0']]) {
    const result = spawnSync(python, [script, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 2)
    assert.match(result.stderr, /error:/)
  }
  console.log('通过：Python/JS全41个状态一致；独立重载、大小步长、发散保护与无效输入检查。')
} finally { rmSync(folder, { recursive: true, force: true }) }
