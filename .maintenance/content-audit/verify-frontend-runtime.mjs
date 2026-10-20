import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import http from 'node:http';

const base = new URL('../../docs/devlanguage/front/frontend-foundations-series/',import.meta.url);
const blocks = prefix => [...fs.readFileSync(new URL(fs.readdirSync(base).find(n=>n.startsWith(prefix)),base),'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)];
const evidence = new URL('evidence/frontend-runtime/',import.meta.url);
fs.mkdirSync(evidence,{recursive:true});
const js = prefix => blocks(prefix).filter(b=>b[1]==='js').map(b=>b[2]).join('\n');
const logs=[];
const language=vm.createContext({console:{log:(...args)=>logs.push(args)}});
vm.runInContext(js('11-'),language);
assert.deepEqual(logs,[[2,'杭州',false],['¥12.99'],[1,2,1]]);
assert.throws(()=>vm.runInContext('formatPrice(1299.5)',language),/安全整数/);
assert.throws(()=>vm.runInContext('formatPrice(-1)',language),/安全整数/);
vm.runInContext("copy.delivery = {...copy.delivery}; copy.delivery.city='苏州'",language);
assert.equal(vm.runInContext('cart.delivery.city',language),'杭州');
const storage=vm.createContext({});
vm.runInContext(js('16-'),storage);
assert.equal(vm.runInContext("readView({getItem:()=>null})",storage),'grid');
assert.equal(vm.runInContext("readView({getItem:()=>'{broken'})",storage),'grid');
assert.equal(vm.runInContext("readView({getItem:()=>JSON.stringify({version:1,view:'list'})})",storage),'list');
assert.equal(vm.runInContext("readView({getItem:()=>JSON.stringify({version:2,view:'list'})})",storage),'grid');
assert.equal(vm.runInContext("saveView('list',{setItem:()=>{throw Error('blocked')}})",storage),false);
assert.throws(()=>vm.runInContext("saveView('unknown',{})",storage),/未知/);

let crossPort;
const crossCounts={allowedOptions:0,allowedPost:0,blockedOptions:0,blockedPost:0};
const wrap = body => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>运行时示例验收</title><body>${body}</body></html>`;
const main=http.createServer((req,res)=>{
  if(req.url==='/lab/dom'||req.url==='/lab/events'){
    const prefix=req.url.endsWith('dom')?'12-':'13-';
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end(wrap(blocks(prefix).find(b=>b[1]==='html')[2]));
  }
  if(req.url==='/lab/loop'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const examples=blocks('14-').filter(b=>b[1]==='js');
    return res.end(wrap(examples.map(([, ,code],i)=>`<iframe title="顺序实验${i}" srcdoc="${(`<pre id='trace'></pre><script>console.log=(...args)=>{document.querySelector('#trace').textContent+=args.join(' ')+'\\n'};${code}</script>`).replaceAll('&','&amp;').replaceAll('"','&quot;')}"></iframe>`).join('')));
  }
  if(req.url==='/lab/network'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end(wrap(`<button id="allow">允许跨源</button><button id="block">拒绝跨源</button><pre id="result"></pre><script>
      for(const [id,path] of [['allow','/allowed'],['block','/blocked']])document.querySelector('#'+id).addEventListener('click',async()=>{
        try{const r=await fetch('http://127.0.0.1:${crossPort}'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});document.querySelector('#result').textContent=id+':'+await r.text();}
        catch(e){document.querySelector('#result').textContent=id+':rejected';}
      });</script>`));
  }
  const type=req.url==='/html'?'text/html':'application/json';
  res.setHeader('Content-Type',type);
  if(req.url==='/404'){res.statusCode=404;return res.end('{}');}
  if(req.url==='/empty'){res.statusCode=204;return res.end();}
  if(req.url==='/html')return res.end('<html>login</html>');
  if(req.url==='/badjson')return res.end('{');
  if(req.url==='/invalid')return res.end('{"items":[{"id":1,"name":"bad"}]}');
  if(req.url==='/null')return res.end('null');
  const send=()=>res.end(JSON.stringify({items:[{id:req.url==='/fast'?'fast':'box',name:'收纳盒'}]}));
  if(req.url==='/slow')return setTimeout(send,120);
  send();
});
await new Promise(resolve=>main.listen(0,'127.0.0.1',resolve));
const port=main.address().port;
const origin=`http://127.0.0.1:${port}`;
const cross=http.createServer((req,res)=>{
  const allowed=req.url==='/allowed';
  if(req.method==='OPTIONS'){
    crossCounts[allowed?'allowedOptions':'blockedOptions']++;
    if(allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','content-type');}
    res.statusCode=204;return res.end();
  }
  crossCounts[allowed?'allowedPost':'blockedPost']++;
  if(allowed)res.setHeader('Access-Control-Allow-Origin',origin);
  res.end('ok');
});
await new Promise(resolve=>cross.listen(0,'127.0.0.1',resolve));
crossPort=cross.address().port;
const context=vm.createContext({fetch,AbortController});
vm.runInContext(js('15-'),context);
const request=(route,signal)=>context.getProducts(origin+route,signal);
assert.equal((await request('/ok'))[0].id,'box');
for(const [route,pattern]of [['/404',/HTTP 404/],['/empty',/JSON|Unexpected/],['/html',/响应类型/],['/badjson',/JSON|position/],['/invalid',/结构无效/],['/null',/结构无效/]])await assert.rejects(request(route),pattern);
const controller=new AbortController();controller.abort();
await assert.rejects(request('/slow',controller.signal),/abort/i);
const rendered=[],errors=[];
const stale=context.refreshProducts(origin+'/slow',items=>rendered.push(items[0].id),e=>errors.push(String(e)));
const fresh=context.refreshProducts(origin+'/fast',items=>rendered.push(items[0].id),e=>errors.push(String(e)));
await Promise.all([stale,fresh]);
assert.deepEqual(rendered,['fast']);assert.deepEqual(errors,[]);
const checks={languageCases:6,storageCases:6,httpCases:9,syntax:'正文脚本已解析并执行',origin,crossOrigin:`http://127.0.0.1:${crossPort}`};
fs.writeFileSync(new URL('code-checks.json',evidence),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify(checks));
process.on('SIGINT',()=>{
  fs.writeFileSync(new URL('cors-server-counts.json',evidence),JSON.stringify(crossCounts,null,2)+'\n');
  main.close();cross.close();
});
