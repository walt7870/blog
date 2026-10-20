import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

const root = '/tmp/blog-architecture-fixtures';
fs.mkdirSync(root, { recursive:true });
const docs = new URL('../../docs/devlanguage/front/frontend-foundations-series/', import.meta.url);
const names = fs.readdirSync(docs).filter(n => /^(2[3-9]|30)-/.test(n));
const blocks = n => [...fs.readFileSync(new URL(names.find(s => s.startsWith(n)),docs),'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)].map(([,lang,code])=>({lang,code}));
const js = blocks('25').filter(b=>b.lang==='js');
fs.writeFileSync(root+'/package.json','{"type":"module"}');
fs.writeFileSync(root+'/route.js',js[0].code);
fs.writeFileSync(root+'/save.js',js[1].code);
fs.writeFileSync(root+'/route.test.js',blocks('26').find(b=>b.lang==='js').code);
const runTest = () => spawnSync(process.execPath,['--test','route.test.js'],{cwd:root,encoding:'utf8'});
const result = runTest();
assert.equal(result.status,0,result.stdout+result.stderr);
fs.writeFileSync(root+'/route.js','export function readPage(url){return parseInt(new URL(url,"https://shop.example").searchParams.get("page"))||1;}');
assert.notEqual(runTest().status,0);
fs.writeFileSync(root+'/route.js',js[0].code);
const {readPage} = await import(pathToFileURL(root+'/route.js'));
for(const [url,want]of [['/products',1],['/products?page=2',2],['/products?page=2abc',1],['/products?page=-1',1],['/products?page=0',1],['/products?page=1.5',1],['/products?page=9007199254740992',1],['/products?page=03',1]]) assert.equal(readPage(url),want);
const {saveName} = await import(pathToFileURL(root+'/save.js'));
const csp = blocks('28').find(b=>b.lang==='http').code.trim().replace(/^Content-Security-Policy: /,'');
let current = {name:'茶杯',version:1};
let requests=0;
let release='A';
const page = body => '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>前端机制验收</title><body>'+body+'</body></html>';
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8'});res.end(body);};
  if(url.pathname==='/api/products/p42'){
    requests++;
    if(req.headers['if-match']!==`"v${current.version}"`){send(412,'application/json','{}');return;}
    let body='';for await(const part of req)body+=part;
    current={name:JSON.parse(body).name,version:current.version+1};
    send(204,'application/json','');return;
  }
  if(url.pathname==='/text'){send(200,'text/html',page(blocks('28').find(b=>b.lang==='html').code));return;}
  if(url.pathname==='/csp'){
    res.setHeader('Content-Security-Policy',csp);
    send(200,'text/html',page('<h1>CSP边界</h1><p id="allowed">等待外部脚本</p><p id="blocked">内联未执行</p><script>document.querySelector("#blocked").textContent="内联已执行";</script><script src="/allowed.js"></script>'));return;
  }
  if(url.pathname==='/allowed.js'){send(200,'text/javascript','document.querySelector("#allowed").textContent="同源外部脚本已执行";');return;}
  if(url.pathname==='/cache'){res.setHeader('Cache-Control','no-cache');send(200,'text/plain','文档入口');return;}
  if(url.pathname.startsWith('/assets/report-')){res.setHeader('Cache-Control','public, max-age=31536000, immutable');send(200,'text/javascript',`export const version=${JSON.stringify(url.pathname.includes('-A.')?'A':'B')};`);return;}
  if(url.pathname==='/publish'&&req.method==='POST'){release='B';send(200,'text/plain','B');return;}
  if(url.pathname==='/release'){
    const captured=release;
    send(200,'text/html',page(`<h1>页面版本${captured}</h1><button id="publish">发布测试版本B</button><button id="load">首次加载报表</button><p id="published" role="status"></p><p id="report" role="status"></p><script type="module">document.querySelector('#publish').onclick=async()=>{const r=await fetch('/publish',{method:'POST'});document.querySelector('#published').textContent='当前发布'+await r.text();};document.querySelector('#load').onclick=async()=>{const m=await import('/assets/report-${captured}.js');document.querySelector('#report').textContent='已加载报表'+m.version;};</script>`));return;
  }
  send(404,'text/plain','not found');
});
await new Promise(resolve=>server.listen(5185,'127.0.0.1',resolve));
const base='http://127.0.0.1:5185';
const fetcher=(url,init)=>fetch(base+url,init);
assert.deepEqual(await saveName({id:'p42',etag:'"v1"'},{name:'新名称'},fetcher),{status:'saved'});
assert.equal(current.name,'新名称');
assert.deepEqual(await saveName({id:'p42',etag:'"v1"'},{name:'旧草稿'},fetcher),{status:'conflict'});
assert.equal(current.name,'新名称');
await assert.rejects(saveName({id:'p42',etag:'"v2"'},{name:'  '},fetcher),/名称/);
assert.equal(requests,2);
await assert.rejects(saveName({id:'p42',etag:'"v2"'},{name:'有效名称'},async()=>new Response('',{status:500})),/500/);
assert.equal((await fetch(base+'/cache')).headers.get('cache-control'),'no-cache');
assert.equal((await fetch(base+'/assets/report-A.js')).headers.get('cache-control'),'public, max-age=31536000, immutable');
const image=blocks('27').find(b=>b.lang==='html').code;
fs.writeFileSync(root+'/image-example.html',image);
const results={pages:names,routeCases:8,routeTests:2,mutationCaught:true,saveCases:4,conditionalHttp:{requests,current},cacheHeaders:true,csp};
fs.writeFileSync('/tmp/blog-frontend-architecture-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
console.log('独立受控HTTP夹具5185；不涉及生产会话或真实业务数据。');
