import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-git-behavior-'));
let checks = 0;
function repo(name) {
  const cwd = path.join(root, name);
  fs.mkdirSync(cwd);
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true' } });
    if (result.status) throw new Error(`${args.join(' ')}: ${result.stderr || result.stdout}`);
    return result.stdout.trimEnd();
  };
  git('init', '-b', 'main');
  git('config', 'user.name', '文档验证');
  git('config', 'user.email', 'audit@example.invalid');
  const write = (file, value) => fs.writeFileSync(path.join(cwd, file), value);
  const read = file => fs.readFileSync(path.join(cwd, file), 'utf8');
  const commit = message => { git('add', '.'); git('commit', '-m', message); return git('rev-parse', 'HEAD'); };
  return { cwd, git, write, read, commit };
}
function check(label, fn) { fn(); checks++; console.log(`通过：${label}`); }
try {
  const a = repo('index');
  a.write('export.txt', '旧版\n'); a.commit('初始');
  a.write('export.txt', '修复\n'); a.git('add', 'export.txt');
  a.write('export.txt', '修复\n日志\n');
  check('add 后编辑同时产生暂存和未暂存修改', () => {
    assert.match(a.git('status', '--short'), /^MM /);
    assert.equal(a.git('show', ':export.txt'), '修复');
  });
  a.git('branch', 'backup');
  check('新分支不保存未提交内容', () => assert.equal(a.git('show', 'backup:export.txt'), '旧版'));
  a.git('restore', '--', 'export.txt');
  check('restore 默认取索引而非 HEAD', () => assert.equal(a.read('export.txt'), '修复\n'));
  a.git('restore', '--staged', '--', 'export.txt');
  check('取消暂存保留工作区并恢复索引', () => {
    assert.equal(a.read('export.txt'), '修复\n'); assert.equal(a.git('show', ':export.txt'), '旧版');
  });
  const fix = a.commit('修复');
  a.git('reset', '--soft', 'HEAD~1');
  check('soft 保留索引', () => assert.equal(a.git('show', ':export.txt'), '修复'));
  a.git('reset', '--mixed', 'HEAD');
  check('mixed 重建索引保留工作区', () => {
    assert.equal(a.git('show', ':export.txt'), '旧版'); assert.equal(a.read('export.txt'), '修复\n');
  });
  a.git('branch', 'recovery', fix);
  check('旧提交仍存在时可建立恢复引用', () => assert.equal(a.git('show', 'recovery:export.txt'), '修复'));

  const b = repo('stash'); b.write('a', '基础\n'); b.commit('初始');
  b.write('a', '临时\n'); b.write('untracked', '新文件\n'); b.git('stash', 'push', '-m', '已跟踪');
  check('默认 stash 不包含未跟踪文件', () => assert.equal(b.read('untracked'), '新文件\n'));
  b.write('a', '主线\n'); b.commit('主线修改');
  const conflict = spawnSync('git', ['stash', 'pop'], { cwd: b.cwd, encoding: 'utf8' });
  check('stash pop 冲突保留条目', () => { assert.notEqual(conflict.status, 0); assert.match(b.git('stash', 'list'), /已跟踪/); });

  const c = repo('integration'); c.write('base', '基础\n'); c.commit('初始');
  c.git('switch', '-c', 'feature'); c.write('fix', '修复\n'); const original = c.commit('功能');
  c.git('switch', 'main'); c.write('permission', '权限\n'); const main = c.commit('主线');
  c.git('branch', 'replayed', 'feature'); c.git('switch', 'feature'); c.git('merge', 'main', '--no-edit');
  check('分叉 merge 具有两个父提交', () => assert.equal(c.git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3));
  c.git('switch', 'replayed'); c.git('rebase', 'main');
  check('rebase 重放修改并改变父提交与 ID', () => { assert.notEqual(c.git('rev-parse', 'HEAD'), original); assert.equal(c.git('rev-parse', 'HEAD^'), main); });
  c.git('switch', '-c', 'release', main); c.git('cherry-pick', '-x', original);
  check('cherry-pick 形成新提交并记录来源', () => { assert.notEqual(c.git('rev-parse', 'HEAD'), original); assert.match(c.git('log', '-1', '--format=%B'), /cherry picked from commit/); });
  const d = repo('worktrees'); d.write('base', '基础\n'); d.commit('初始');
  const extraTree = path.join(root, 'hotfix');
  d.git('worktree', 'add', '-b', 'hotfix', extraTree, 'HEAD');
  fs.writeFileSync(path.join(extraTree, 'base'), '未提交修复\n');
  check('工作树共享引用但不共享未提交文件', () => {
    assert.match(d.git('branch', '--list', 'hotfix'), /hotfix/);
    assert.equal(d.read('base'), '基础\n');
    assert.equal(d.git('-C', extraTree, 'diff', '--', 'base').includes('未提交修复'), true);
  });
  const deniedRemove = spawnSync('git', ['worktree', 'remove', extraTree], { cwd: d.cwd, encoding: 'utf8' });
  check('正常移除工作树拒绝丢弃脏文件', () => assert.notEqual(deniedRemove.status, 0));
  d.git('-C', extraTree, 'add', 'base'); d.git('-C', extraTree, 'commit', '-m', '热修复');
  d.git('worktree', 'remove', extraTree);
  check('移除工作树后分支提交仍保留', () => assert.equal(d.git('show', 'hotfix:base'), '未提交修复'));
  d.write('untracked', '仅在工作区\n');
  const bundlePath = path.join(root, 'backup.bundle');
  d.git('bundle', 'create', bundlePath, '--all'); d.git('bundle', 'verify', bundlePath);
  const recovered = path.join(root, 'recovered'); d.git('clone', bundlePath, recovered);
  check('Bundle 恢复引用但不包含未提交工作区', () => {
    assert.equal(d.git('-C', recovered, 'show', 'origin/hotfix:base'), '未提交修复');
    assert.equal(fs.existsSync(path.join(recovered, 'untracked')), false);
  });
  console.log(`总计 ${checks} 项通过；仅操作临时仓库。`);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
