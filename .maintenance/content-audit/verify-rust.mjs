import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
const root = fs.mkdtempSync('/tmp/blog-rust-');
const source = new URL('../../docs/devlanguage/rust/', import.meta.url);
const blocks = name => [...fs.readFileSync(new URL(name + '.md', source), 'utf8').matchAll(/^```([^\n]+)\n([\s\S]*?)^```/gm)].map(([, lang, code]) => ({ lang, code }));
const results = { root, commands: [], assertions: [] };
const write = (name, content) => { fs.mkdirSync(new URL('.', 'file://' + root + '/' + name), { recursive: true }); fs.writeFileSync(root+'/'+name,content); };
function run(command, args, fail = false, code) {
  const r = spawnSync(command,args,{ cwd: root, encoding:'utf8',timeout:120000 });
  results.commands.push({command,args,exit:r.status,output:(r.stdout+r.stderr).slice(-3500)});
  assert.ok(fail ? r.status!==null && r.status!==0 : r.status===0,r.stdout+r.stderr);
  if(code) assert.ok(r.stderr.includes(code),r.stderr);
  return r;
}
run('rustc',['--version']);
for(const name of ['basic','ownership','concurrency']) {
  write(name+'.rs',blocks(name).find(b=>b.lang==='rust').code);
  run('rustc',['--edition','2024',name+'.rs','-o',name]);
  run('./'+name,[]);
}
const bads=[...blocks('ownership'),...blocks('troubleshooting')].filter(b=>b.lang==='rust,compile_fail');
for(const [i,b] of bads.entries()) { write('bad-'+i+'.rs',b.code);run('rustc',['--edition','2024','bad-'+i+'.rs'],true,['E0502','E0515','E0382','E0502'][i]); }
write('Cargo.toml','[package]\nname="order-cli"\nversion="0.1.0"\nedition="2024"\n'+blocks('project-practice').find(b=>b.lang==='toml').code.replace('"signal"]','"signal", "sync", "time"]'));
const typeBlocks=blocks('type-system').filter(b=>b.lang==='rust');
write('src/lib.rs',typeBlocks[0].code+'\n'+typeBlocks[2].code);
write('src/main.rs',blocks('hands-on').find(b=>b.lang==='rust').code);
write('tests/cli.rs',blocks('hands-on').filter(b=>b.lang==='rust')[1].code);
write('src/bin/api.rs',blocks('project-practice').find(b=>b.lang==='rust').code);
write('src/bin/async-queue.rs',blocks('concurrency').filter(b=>b.lang==='rust')[1].code);
// rustdoc proof distinguishes --all-targets from default cargo test, and README.
write('src/lib.rs','/// ```\n/// assert_eq!(order_cli::Quantity::parse("2").unwrap().get(), 2);\n/// ```\npub fn doc_marker() {}\n'+fs.readFileSync(root+'/src/lib.rs','utf8'));
write('README.md','```rust\ncompile_error!("README is not tested automatically");\n```\n');
run('cargo',['fmt']);
run('cargo',['test']);
const allTargets=run('cargo',['test','--all-targets','--locked']);
assert.ok(!allTargets.stdout.includes('Doc-tests')&&!allTargets.stderr.includes('Doc-tests'));
run('cargo',['test','--doc','--locked']);
run('cargo',['clippy','--all-targets','--locked','--','-D','warnings']);
run('cargo',['run','--locked','--bin','async-queue']);
run('cargo',['build','--release','--locked']);
const good=run('./target/release/order-cli',['2','1990']);assert.equal(good.stdout,'3980\n');
const bad=run('./target/release/order-cli',['0','1990'],true);assert.equal(bad.status,2);assert.equal(bad.stdout,'');
write('private.rs','extern crate order_cli; fn main() { let _ = order_cli::Quantity(0); }');
const rlib=fs.readdirSync(root+'/target/debug/deps').find(x=>x.startsWith('liborder_cli-')&&x.endsWith('.rlib'));
run('rustc',['--edition','2024','private.rs','--extern','order_cli='+root+'/target/debug/deps/'+rlib],true,'E0603');
const original=fs.readFileSync(root+'/src/lib.rs','utf8');
assert.ok(original.includes('checked_mul'));
write('src/lib.rs',original.replace('checked_mul','checked_add'));
run('cargo',['test','--lib','--locked'],true);
write('src/lib.rs',original);
const child=spawn(root+'/target/release/api',[],{cwd:root,stdio:['ignore','pipe','pipe']});
let error='';child.stderr.on('data',d=>error+=d);
try {
  for(let i=0;;i++){try{await fetch('http://127.0.0.1:3000/quote?quantity=2&unit_cents=1990');break;}catch(e){if(i>30||child.exitCode!==null)throw Error(error||String(e));await new Promise(r=>setTimeout(r,50));}}
  results.http=[];
  for(const [url,status,total] of [['/quote?quantity=2&unit_cents=1990',200,3980],['/quote?quantity=0&unit_cents=1990',400],['/quote?quantity=2&unit_cents=18446744073709551615',422],['/quote?quantity=2',400],['/missing',404]]) {
    const r=await fetch('http://127.0.0.1:3000'+url);const body=await r.text();assert.equal(r.status,status);if(total)assert.equal(JSON.parse(body).total_cents,total);else assert.ok(!body.includes('total_cents":'));results.http.push({url,status,body});
  }
} finally {child.kill('SIGINT');await new Promise(resolve=>child.once('exit',resolve));}
results.assertions.push('正文CLI、领域测试、外部私有构造拒绝、4个编译失败反例、标准库及Tokio队列、实际HTTP与SIGINT关闭通过；README与all-targets不执行doc test得到验证；故意乘改加使测试失败。');
results.passed=true;
fs.writeFileSync('/tmp/blog-rust-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({root,commands:results.commands.length,http:results.http,passed:true}));
