import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-docker-doc-'));
const suffix = `${process.pid}`;
const alpine = 'public.ecr.aws/docker/library/alpine:3.22';
const name = `blog-doc-exec-${suffix}`;
const javaName = `blog-doc-java-${suffix}`;
const image = `blog-doc-java:${suffix}`;
const project = `blog-doc-compose-${suffix}`;
const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 180_000, ...options,
}).trim();
const docker = (...args) => run('docker', args);
const blocks = (file, language) => [...fs.readFileSync(path.join(root, file), 'utf8')
  .matchAll(new RegExp('```' + language + '\\n([\\s\\S]*?)```', 'g'))].map(match => match[1]);
const compose = (...args) => docker('compose', '-p', project, '-f', path.join(temp, 'compose.yaml'), ...args);
const sql = statement => compose('exec', '-T', 'db', 'sh', '-c',
  'export PGPASSWORD="$(cat /run/secrets/db_password)"; exec psql -h 127.0.0.1 -U orders -d orders -v ON_ERROR_STOP=1 -Atc "$1"',
  'doc-audit', statement);
const wait = async test => {
  let last;
  for (let i = 0; i < 40; i++) {
    try { if (await test()) return; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw last || new Error('等待实验服务就绪超时');
};
const cleanup = action => { try { action(); } catch {} };

try {
  if (!process.argv.includes('--java-only')) {
  const observation = blocks('docs/container/docker/command.md', 'bash').at(-1);
  assert.match(run('bash', ['-c', observation]), /working-directory/);
  docker('run', '-d', '--name', name, '-e', 'AUDIT_SCOPE=main', alpine, 'sleep', '300');
  assert.equal(docker('exec', '-e', 'AUDIT_SCOPE=exec', name, 'sh', '-c', 'printf %s "$AUDIT_SCOPE"'), 'exec');
  assert.equal(docker('exec', name, 'sh', '-c', 'printf %s "$AUDIT_SCOPE"'), 'main');
  docker('exec', name, 'sh', '-c', 'printf retained > /tmp/instance-data');
  docker('stop', '--timeout', '2', name);
  docker('start', name);
  assert.equal(docker('exec', name, 'cat', '/tmp/instance-data'), 'retained');
  docker('stop', '--timeout', '2', name);
  docker('rm', name);
  docker('run', '-d', '--name', name, alpine, 'sleep', '300');
  docker('exec', name, 'test', '!', '-e', '/tmp/instance-data');
  console.log('docker_exec_environment_and_instance_lifecycle_passed');

  fs.mkdirSync(path.join(temp, 'secrets'));
  fs.writeFileSync(path.join(temp, 'secrets/db_password.txt'), randomBytes(24).toString('hex'), { mode: 0o600 });
  fs.writeFileSync(path.join(temp, 'compose.yaml'), blocks('docs/container/docker/storage-network-compose.md', 'yaml')[0]);
  compose('config', '--quiet');
  compose('up', '-d', 'db');
  await wait(() => compose('exec', '-T', 'db', 'pg_isready', '-h', '127.0.0.1', '-U', 'orders', '-d', 'orders').includes('accepting connections'));
  sql("CREATE TABLE doc_audit(id integer PRIMARY KEY, result text); INSERT INTO doc_audit VALUES(1,'retained');");
  compose('down');
  compose('up', '-d', 'db');
  await wait(() => compose('exec', '-T', 'db', 'pg_isready', '-h', '127.0.0.1', '-U', 'orders', '-d', 'orders').includes('accepting connections'));
  assert.equal(sql('SELECT result FROM doc_audit WHERE id=1'), 'retained');
  console.log('compose_document_config_and_database_recreation_passed');
  }

  fs.mkdirSync(path.join(temp, 'classes'));
  fs.mkdirSync(path.join(temp, 'target'));
  run('javac', ['-d', path.join(temp, 'classes'), path.join(root, '.maintenance/content-audit/docker-fixtures/AuditApp.java')]);
  run('jar', ['--create', '--file', path.join(temp, 'target/app.jar'), '--main-class', 'AuditApp', '-C', path.join(temp, 'classes'), '.']);
  fs.writeFileSync(path.join(temp, 'Dockerfile'), blocks('docs/container/docker/java-application.md', 'dockerfile')[0]);
  console.log('java_fixture_compiled; building_document_runtime_Dockerfile');
  docker('build', '-t', image, temp);
  docker('run', '-d', '--name', javaName, '--publish', '127.0.0.1::8080', '--memory', '512m', '--cpus', '1',
    '-e', 'JAVA_TOOL_OPTIONS=-Xms128m -Xmx256m', image);
  const inspect = JSON.parse(docker('inspect', javaName))[0];
  assert.equal(inspect.Config.User, '10001:10001');
  assert.equal(inspect.HostConfig.Memory, 512 * 1024 * 1024);
  const port = inspect.NetworkSettings.Ports['8080/tcp'][0].HostPort;
  let body;
  await wait(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    body = await response.text();
    return response.ok;
  });
  assert.match(body, /audit-ok;user=app;heap=\d+/);
  const maxHeap = Number(body.split('heap=')[1]);
  assert.ok(maxHeap <= 256 * 1024 * 1024 && maxHeap >= 240 * 1024 * 1024);
  assert.ok(inspect.Config.Env.includes('JAVA_TOOL_OPTIONS=-Xms128m -Xmx256m'));
  docker('stop', '--timeout', '5', javaName);
  assert.match(docker('logs', javaName), /audit-shutdown-hook/);
  console.log('java_document_Dockerfile_uid_memory_request_and_signal_passed');
  console.log('NOT_TESTED: real orders API, Spring graceful in-flight requests, Maven project and registry promotion');
} finally {
  cleanup(() => docker('rm', '-f', name));
  cleanup(() => docker('rm', '-f', javaName));
  cleanup(() => compose('down', '--volumes', '--remove-orphans'));
  cleanup(() => docker('image', 'rm', image));
  fs.rmSync(temp, { recursive: true, force: true });
}
