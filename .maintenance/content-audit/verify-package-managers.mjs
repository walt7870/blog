import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync('/tmp/blog-package-cases-');
const bin = '/tmp/blog-package-checker/node_modules/.bin/';
const pnpm = '/tmp/blog-package-checker/node_modules/pnpm/bin/pnpm.cjs';
const yarn = '/tmp/blog-package-checker/node_modules/@yarnpkg/cli-dist/bin/yarn.js';
const results = { root, cases: [] };
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function run(cwd, command, args, expected = 0, env = {}) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 90000,
    env: { ...process.env, CI: 'true', COREPACK_ENABLE_AUTO_PIN: '0', ...env } });
  results.cases.push({ cwd, command: path.basename(command), args, exit: r.status,
    output: (r.stdout + r.stderr).slice(-4500) });
  if (expected === 0) assert.equal(r.status, 0, r.stdout + r.stderr);
  else assert.ok(r.status !== 0 && r.status !== null, r.stdout + r.stderr);
  return r.stdout.trim();
}
const base = { name: 'audit-fixture', private: true, version: '1.0.0', dependencies: { 'is-number': '7.0.0' } };
for (const [name, command, install, frozen] of [
  ['npm', 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], ['ci', '--ignore-scripts', '--no-audit', '--no-fund']],
  ['pnpm', pnpm, ['install'], ['install', '--frozen-lockfile']],
  ['yarn', yarn, ['install'], ['install', '--immutable']],
  ['bun', bin + 'bun', ['install'], ['install', '--frozen-lockfile']],
]) {
  const dir = path.join(root, name); fs.mkdirSync(dir); json(path.join(dir, 'package.json'), base);
  if (name === 'yarn') fs.writeFileSync(path.join(dir, '.yarnrc.yml'), 'nodeLinker: pnp\nenableGlobalCache: false\n');
  run(dir, command, ['--version']);
  run(dir, command, install, 0, { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' });
  run(dir, command, frozen);
  run(dir, name === 'yarn' ? command : 'node', name === 'yarn'
    ? ['node', '-e', "if(!require('is-number')(42))process.exit(1)"]
    : ['-e', "if(!require('is-number')(42))process.exit(1)"]);
  if (name === 'yarn') {
    assert.ok(fs.existsSync(path.join(dir, '.pnp.cjs')));
    fs.writeFileSync(path.join(dir, '.yarnrc.yml'), 'nodeLinker: node-modules\nenableGlobalCache: false\n');
    run(dir, command, frozen);
    run(dir, 'node', ['-e', "if(!require('is-number')(42))process.exit(1)"]);
  }
  json(path.join(dir, 'package.json'), { ...base, dependencies: { 'is-number': '6.0.0' } });
  run(dir, command, frozen, 1);
}

const pkg = path.join(root, 'controlled-script'); fs.mkdirSync(pkg);
json(path.join(pkg, 'package.json'), { name: 'blog-controlled-script', version: '1.0.0',
  scripts: { postinstall: 'node postinstall.cjs' } });
fs.writeFileSync(path.join(pkg, 'postinstall.cjs'), "require('node:fs').writeFileSync(require('node:path').join(__dirname,'executed.txt'),'controlled fixture');\n");
run(pkg, 'npm', ['pack', '--ignore-scripts']);
const tar = path.join(pkg, 'blog-controlled-script-1.0.0.tgz');
for (const name of ['pnpm', 'bun']) {
  const dir = path.join(root, name + '-trust'); fs.mkdirSync(dir);
  const manifest = { name: 'trust-fixture', private: true, dependencies: { 'blog-controlled-script': 'file:' + tar } };
  json(path.join(dir, 'package.json'), manifest);
  run(dir, name === 'pnpm' ? pnpm : bin + name, ['install']);
  assert.ok(!fs.existsSync(path.join(dir, 'node_modules/blog-controlled-script/executed.txt')));
  if (name === 'pnpm') {
    fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'onlyBuiltDependencies:\n  - blog-controlled-script\n');
    run(dir, pnpm, ['rebuild', 'blog-controlled-script']);
  } else {
    json(path.join(dir, 'package.json'), { ...manifest, trustedDependencies: ['blog-controlled-script'] });
    run(dir, bin + name, ['install']);
  }
  assert.ok(fs.existsSync(path.join(dir, 'node_modules/blog-controlled-script/executed.txt')));
}

const core = path.join(root, 'corepack'); fs.mkdirSync(core);
json(path.join(core, 'package.json'), { name: 'core-fixture', private: true, packageManager: 'pnpm@10.32.0' });
const coreEnv = { COREPACK_HOME: path.join(root, 'installer-cache') };
run(core, bin + 'corepack', ['install'], 0, coreEnv);
assert.equal(run(core, bin + 'corepack', ['pnpm', '--version'], 0, coreEnv), '10.32.0');
run(core, bin + 'corepack', ['yarn', '--version'], 1, coreEnv);

const registry = path.join(root, 'registry'); fs.mkdirSync(registry);
json(path.join(registry, 'package.json'), { name: 'registry-fixture', private: true });
fs.writeFileSync(path.join(registry, '.npmrc'), 'registry=https://registry.npmjs.org/\n@company:registry=https://npm.company.com/\n//npm.company.com/:_authToken=${NPM_TOKEN}\n');
assert.equal(run(registry, 'npm', ['config', 'get', '@company:registry'], 0, { NPM_TOKEN: 'synthetic-audit-value' }), 'https://npm.company.com/');
fs.writeFileSync(path.join(registry, '.yarnrc.yml'), 'npmRegistryServer: "https://registry.npmjs.org"\nnpmScopes:\n  company:\n    npmRegistryServer: "https://npm.company.com"\n    npmAlwaysAuth: true\n    npmAuthToken: "${NPM_TOKEN}"\n');
assert.equal(run(registry, yarn, ['config', 'get', 'npmRegistryServer'], 0, { NPM_TOKEN: 'synthetic-audit-value' }), 'https://registry.npmjs.org');
results.boundaries = ['所有脚本为自制无害夹具', '企业仓库只解析配置，未请求或发布', '不修改全局安装器或博客依赖'];
json('/tmp/blog-package-results.json', results);
console.log(JSON.stringify({ root, cases: results.cases.length, passed: true }));
