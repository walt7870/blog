import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const root = mkdtempSync(join(tmpdir(), 'blog-vim-audit-'))
try {
  const report = join(root, 'result.json')
  const script = join(root, 'verify.vim')
  writeFileSync(script, String.raw`
set nocompatible
set clipboard=
set nomore
call setline(1, ['first', 'second', 'third'])
normal! ggyy
call assert_equal("first\n", getreg('0'), 'yy updates register 0')
normal! j"ayy
call assert_equal("second\n", getreg('a'), 'explicit yank writes a')
call assert_equal("first\n", getreg('0'), 'explicit yank keeps register 0')
call assert_equal("second\n", getreg('"'), 'unnamed reflects explicit yank')
normal! dd
call assert_equal("second\n", getreg('1'), 'line delete updates register 1')
call assert_equal("first\n", getreg('0'), 'delete keeps register 0')
normal! "_dd
call assert_equal("second\n", getreg('"'), 'black hole keeps unnamed')
call assert_equal("second\n", getreg('1'), 'black hole keeps history')
%delete _
call setline(1, 'order_status = "pending"')
call cursor(1, 18)
execute "normal! ci\"paid\<Esc>"
call assert_equal('order_status = "paid"', getline(1), 'inner quote edit')
call setline(1, 'one two')
call cursor(1, 1)
execute "normal! cwnew\<Esc>"
call assert_equal('new two', getline(1), 'cw keeps following whitespace')
call assert_equal(0, '订单' =~# '\w', 'word class is not Unicode word')
call assert_equal('foo' . "\n" . 'bar', matchstr('foo' . "\n" . 'bar', '\vfoo\_s+bar'), 'very magic multiline whitespace')
call setline(1, 'timeout=30 timeout_ms=3000')
%s/\<timeout\>=30/timeout=60/g
call assert_equal('timeout=60 timeout_ms=3000', getline(1), 'replace exact configuration key')
call setline(1, 'foo foo')
execute "normal! gg0vll\<Esc>"
'<,'>s/foo/bar/g
call assert_equal('bar bar', getline(1), 'visual line range includes both matches')
call setline(1, 'foo foo')
execute "normal! gg0vll\<Esc>"
'<,'>s/\%Vfoo/bar/g
call assert_equal('bar foo', getline(1), 'visual atom limits match start')
call writefile([json_encode({'assertions': 15, 'errors': v:errors})], '${report}')
if len(v:errors) | cquit | endif
qall!
`)
  const result = spawnSync('vim', ['-Nu', 'NONE', '-n', '-es', '-i', 'NONE', '-S', script], { encoding: 'utf8' })
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(result.status, 0, JSON.stringify(data.errors))
  assert.deepEqual(data.errors, [])
  console.log(`Vim 文档行为验证：${data.assertions} 项通过（临时缓冲区，无用户配置与剪贴板修改）。`)
} finally {
  rmSync(root, { recursive: true, force: true })
}
