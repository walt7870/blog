import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import MarkdownIt from 'markdown-it';

const root = path.resolve('docs/devlanguage/front/electron-series');
const parser = new MarkdownIt();
const dependencies = createRequire('/tmp/blog-electron-audit/package.json');
const snippets = new Map();
let syntaxBlocks = 0;
for (const file of fs.readdirSync(root).filter(x => x.endsWith('.md')).sort()) {
  const blocks = parser.parse(fs.readFileSync(path.join(root,file),'utf8'),{}).filter(x => x.type === 'fence' && x.info === 'js');
  snippets.set(file.slice(0,2),blocks.map(x=>x.content));
  for (const [index,block] of blocks.entries()) {
    new vm.Script(block.content,{filename:`${file}:${index}`});
    syntaxBlocks++;
  }
}
const selector = vm.runInNewContext(snippets.get('09')[0]+'; selectUpdate', {require:dependencies});
const client={version:'1.0.0',platform:'darwin',arch:'arm64',channel:'stable'};
const candidate=(version,extra={})=>({...client,version,...extra});
const feed={artifacts:[candidate('1.1.0'),candidate('3.0.0',{arch:'x64'}),candidate('2.0.0-beta.1'),candidate('invalid'),candidate('1.2.0'),null]};
assert.equal(selector(feed,client).version,'1.2.0');
assert.equal(selector({artifacts:[...feed.artifacts].reverse()},client).version,'1.2.0');
assert.equal(selector({artifacts:[candidate('1.2.0',{channel:'beta'})]},client),null);
assert.equal(selector({artifacts:[candidate('1.0.0'),candidate('0.9.0')]},client),null);
assert.throws(()=>selector({artifacts:{}},client),/invalid update contract/);
assert.throws(()=>selector(feed,{...client,version:'broken'}),/invalid update contract/);

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'blog-electron-contract-'));
fs.mkdirSync(path.join(temporary,'fixtures'));
fs.writeFileSync(path.join(temporary,'fixtures/demo.md'),'# 测试文档\n');
const pageUrl='file:///trusted/index.html';
const mainFrame={url:pageUrl};
const webContents={mainFrame};
let destroyed=false,handler,reads=0;
vm.runInNewContext(snippets.get('03')[3],{
  win:{webContents,isDestroyed:()=>destroyed},pageUrl,
  ipcMain:{handle:(_channel,fn)=>handler=fn},__dirname:temporary,path,
  fs:{readFile:async(...args)=>{reads++;return fs.promises.readFile(...args);}},
});
const event={sender:webContents,senderFrame:mainFrame};
assert.equal((await handler(event)).content,'# 测试文档\n');
const badEvents=[
  {...event,sender:{}},
  {...event,senderFrame:{url:pageUrl}},
  {...event,senderFrame:null},
];
for(const bad of badEvents) await assert.rejects(()=>handler(bad),/unexpected sender/);
mainFrame.url='file:///untrusted/other.html';
await assert.rejects(()=>handler(event),/unexpected sender/);
mainFrame.url=pageUrl;
destroyed=true;
await assert.rejects(()=>handler(event),/unexpected sender/);
destroyed=false;
assert.equal(reads,1);
fs.unlinkSync(path.join(temporary,'fixtures/demo.md'));
await assert.rejects(()=>handler(event),{code:'ENOENT'});

for(const platform of ['darwin','win32','linux']) {
  const handlers={};let quits=0;
  vm.runInNewContext(snippets.get('04')[0],{app:{on:(event,fn)=>handlers[event]=fn,quit:()=>quits++},process:{platform},BrowserWindow:class{on(){}}});
  handlers['window-all-closed']();
  assert.equal(quits,platform==='darwin'?0:1);
}
const report={pages:snippets.size,syntaxBlocks,checks:['unordered-highest-version','wrong-architecture-and-channel','stable-rejects-prerelease','no-downgrade','invalid-feed','invalid-client-version','fixed-file-read','wrong-window-rejected','subframe-rejected','missing-frame-rejected','wrong-url-rejected','destroyed-window-rejected','rejection-before-file-read','missing-file-rejects','platform-window-close-policy'],runtime:process.version,temporary,scope:'Node隔离夹具验证文档函数与事件策略；未启动Electron、重建原生模块、执行平台签名、公证或真实自动更新。'};
fs.mkdirSync('.maintenance/content-audit/evidence/electron',{recursive:true});
fs.writeFileSync('.maintenance/content-audit/evidence/electron/code-checks.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
