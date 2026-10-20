import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { ref, watch, effectScope, nextTick } from 'vue';
import ts from '/tmp/blog-toolchain-checker/node_modules/typescript/lib/typescript.js';

const root = '/tmp/blog-framework-fixtures';
const checker = '/tmp/blog-framework-checker';
const source = new URL('../../docs/devlanguage/front/frontend-foundations-series/', import.meta.url);
const blocks = ep => [...fs.readFileSync(new URL(fs.readdirSync(source).find(n => n.startsWith(ep)), source), 'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)].map(([,lang,code])=>({lang,code}));
fs.mkdirSync(root,{recursive:true});
const write = (file,text) => fs.writeFileSync(path.join(root,file),text);
write('package.json', JSON.stringify({type:'module',private:true}));
if(!fs.existsSync(path.join(root,'node_modules'))) fs.symlinkSync(checker+'/node_modules',path.join(root,'node_modules'),'dir');
const html = (body,script) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${body}<script type="module" src="./${script}"></script></html>`;

const react = blocks('31').filter(x=>x.lang==='jsx');
write('App.jsx', "import React from 'react';\n"+react[0].code);
write('react-main.jsx', `import React,{StrictMode,useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';
function Row({product}){const [note,setNote]=useState('');return <label>{product.id}<input aria-label={'备注'+product.id} value={note} onChange={e=>setNote(e.target.value)}/></label>}
function Ids(){const [reverse,setReverse]=useState(false);const list=[{id:'p1'},{id:'p2'}];if(reverse)list.reverse();return <section><button onClick={()=>setReverse(v=>!v)}>反序</button>{list.map(product=><Row key={product.id} product={product}/>)}</section>}
function Listener(){useEffect(()=>{document.body.dataset.live=String(Number(document.body.dataset.live||0)+1);return()=>{document.body.dataset.live=String(Number(document.body.dataset.live)-1)}},[]);return <p>已订阅</p>}
function Lifecycle(){const [show,setShow]=useState(true);return <section><button onClick={()=>setShow(v=>!v)}>切换订阅</button>{show&&<Listener/>}</section>}
createRoot(document.getElementById('app')).render(<StrictMode><App/><Ids/><Lifecycle/></StrictMode>);`);
write('react.html',html('<div id="app"></div>','react-main.jsx'));
write('BadApp.jsx',"import React from 'react';\n"+react[0].code.replaceAll('q => Math.min(5, q + 1)','Math.min(5, quantity + 1)'));
write('bad-main.jsx',"import React from 'react';import {createRoot} from 'react-dom/client';import App from './BadApp.jsx';createRoot(document.getElementById('app')).render(<App/>);");
write('react-bad.html',html('<div id="app"></div>','bad-main.jsx'));

const vb=blocks('32');
write('App.vue',vb[0].code);
write('vue-main.js',"import {createApp} from 'vue';import App from './App.vue';createApp(App).mount('#app');");
write('vue.html',html('<div id="app"></div>','vue-main.js'));
const requestCode=vb.filter(x=>x.lang==='js')[1].code.replace("import { ref, watch } from 'vue';",'');
const requests=[];
const fakeFetch = (url,options) => new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}));
const createQuery = new Function('ref','watch','fetch', requestCode+'\nreturn {keyword,items,status,error};');
let query;
const scope=effectScope();
scope.run(()=>{query=createQuery(ref,watch,fakeFetch)});
query.keyword.value='旧';await nextTick();
query.keyword.value='新';await nextTick();
assert.equal(requests[0].options.signal.aborted,true);
requests[1].resolve({ok:true,json:async()=>({items:[{id:'new',name:'新商品'}]})});
await new Promise(resolve=>setImmediate(resolve));
requests[0].resolve({ok:true,json:async()=>({items:[{id:'old',name:'旧商品'}]})});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(query.items.value[0].id,'new');
query.keyword.value='HTTP失败';await nextTick();requests[2].resolve({ok:false,status:500});
await new Promise(resolve=>setImmediate(resolve));assert.equal(query.status.value,'error');assert.equal(query.error.value,'HTTP 500');
query.keyword.value='坏字段';await nextTick();requests[3].resolve({ok:true,json:async()=>({items:[{id:1,name:'错误'}]})});
await new Promise(resolve=>setImmediate(resolve));assert.equal(query.error.value,'商品字段不符合合同');
query.keyword.value='未完成';await nextTick();scope.stop();assert.equal(requests[4].options.signal.aborted,true);
requests[4].resolve({ok:true,json:async()=>({items:[{id:'late',name:'迟到'}]})});
await new Promise(resolve=>setImmediate(resolve));assert.equal(query.items.value.length,0);

const transpile = code => ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;
const ab=blocks('33').filter(x=>x.lang==='ts');
write('cart.service.js',transpile(ab[0].code));
write('ng-app.js',transpile(ab[1].code).replace("'./cart.service'","'./cart.service.js'"));
write('angular-main.js',`import '@angular/compiler';import {Component,inject,provideZonelessChangeDetection} from '@angular/core';import {bootstrapApplication} from '@angular/platform-browser';import {App} from './ng-app.js';import {CartService} from './cart.service.js';
class Local{cart=inject(CartService)};Component({selector:'local-cart',standalone:true,providers:[CartService],template:'<p>局部数量 {{cart.quantity()}}</p><button (click)="cart.add()">局部加一</button>'})(Local);
class Shared{cart=inject(CartService)};Component({selector:'shared-cart',standalone:true,template:'<p>共享数量 {{cart.quantity()}}</p>'})(Shared);
class Shell{};Component({selector:'test-root',standalone:true,imports:[App,Local,Shared],template:'<app-root/><shared-cart/><local-cart/><local-cart/>'})(Shell);
bootstrapApplication(Shell,{providers:[provideZonelessChangeDetection()]}).catch(error=>{document.body.textContent=String(error);throw error});`);
write('angular.html',html('<test-root></test-root>','angular-main.js'));
await import(pathToFileURL(checker+'/node_modules/@angular/compiler/fesm2022/compiler.mjs'));
const {Injector}=await import(pathToFileURL(checker+'/node_modules/@angular/core/fesm2022/core.mjs'));
const {CartService}=await import(pathToFileURL(root+'/cart.service.js'));
const parent=Injector.create({providers:[CartService]});
const a=Injector.create({providers:[],parent});
const b=Injector.create({providers:[],parent});
assert.equal(a.get(CartService),b.get(CartService));
const local=Injector.create({providers:[CartService],parent});
local.get(CartService).add();
assert.equal(local.get(CartService).quantity(),2);assert.equal(a.get(CartService).quantity(),1);
assert.equal(local.get(CartService).totalCents(),3980);
for(let n=0;n<10;n++)local.get(CartService).add();
assert.equal(local.get(CartService).quantity(),5);
local.get(CartService).reset();assert.equal(local.get(CartService).totalCents(),1990);
local.destroy();a.destroy();b.destroy();parent.destroy();
const results={vue:{cases:5,staleIgnoredDespiteResolvedCancelledRequest:true,stoppedScopeIgnoresLateResponse:true},angular:{sharedParent:true,localIndependent:true,limit:5,resetCents:1990},versions:JSON.parse(fs.readFileSync(checker+'/package.json')).dependencies};
fs.writeFileSync('/tmp/blog-frontend-framework-details-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
const dev=await createServer({root,configFile:false,plugins:[vue()],resolve:{alias:{vue:path.resolve('node_modules/vue/dist/vue.runtime.esm-bundler.js')}},server:{host:'127.0.0.1',port:5186,strictPort:true},logLevel:'warn'});
await dev.listen();console.log('本地框架夹具：http://127.0.0.1:5186/{react,react-bad,vue,angular}.html');
