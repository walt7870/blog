import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'vite';

const root='/tmp/blog-builder-fixtures';
const checker='/tmp/blog-builder-checker';
const source=new URL('../../docs/devlanguage/front/framework/',import.meta.url);
const blocks=name=>[...fs.readFileSync(new URL(name+'.md',source),'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)].map(([,lang,code])=>({lang,code}));
const results={};
function setup(name){const cwd=path.join(root,name);fs.mkdirSync(path.join(cwd,'src'),{recursive:true});if(!fs.existsSync(path.join(cwd,'node_modules')))fs.symlinkSync(checker+'/node_modules',path.join(cwd,'node_modules'),'dir');return {cwd,write:(file,code)=>fs.writeFileSync(path.join(cwd,file),code)}}
function run(cwd,args){const out=spawnSync(process.execPath,args,{cwd,encoding:'utf8',env:{...process.env,PARCEL_WORKERS:'2',RAYON_NUM_THREADS:'2'}});if(out.status!==0)throw Error(out.stdout+out.stderr);return out.stdout+out.stderr}

const vite=setup('vite'),v=blocks('vite');
vite.write('package.json',JSON.stringify({type:'module',private:true}));
vite.write('index.html',v.find(b=>b.lang==='html').code);
vite.write('src/main.ts',v.find(b=>b.lang==='ts').code);
vite.write('src/style.css','body { font-family: sans-serif; }');
vite.write('tsconfig.json',v.find(b=>b.lang==='json').code);
vite.write('vite.config.mjs',v.find(b=>b.lang==='js').code);
if(!fs.existsSync(checker+'/node_modules/vite'))fs.symlinkSync(path.resolve('node_modules/vite'),checker+'/node_modules/vite','dir');
const config=await import(pathToFileURL(vite.cwd+'/vite.config.mjs').href);
run(vite.cwd,['/tmp/blog-toolchain-checker/node_modules/typescript/bin/tsc','--noEmit']);
await build({...config.default,root:vite.cwd,configFile:false,logLevel:'warn'});
assert.ok(fs.readFileSync(vite.cwd+'/dist/index.html','utf8').includes('/shop/assets/'));
results.vite={types:true,productionBuild:true,base:'/shop/'};

const webpack=setup('webpack'),w=blocks('webpack');
webpack.write('package.json',JSON.stringify({private:true}));
const js=w.filter(b=>b.lang==='js');
webpack.write('webpack.config.cjs',js[0].code);
webpack.write('src/index.html',w.find(b=>b.lang==='html').code);
webpack.write('src/main.js',js[1].code);
webpack.write('src/report.js',js[2].code);
webpack.write('src/style.css',w.find(b=>b.lang==='css').code);
const webpackOutput=run(webpack.cwd,[checker+'/node_modules/webpack-cli/bin/cli.js','--mode','production']);
const webpackFiles=fs.readdirSync(webpack.cwd+'/dist');
assert.ok(webpackFiles.some(f=>/^\d+\..*\.js$/.test(f)));
assert.ok(webpackFiles.some(f=>f.endsWith('.css')));
assert.ok(fs.readFileSync(webpack.cwd+'/dist/index.html','utf8').includes('/shop/'));
results.webpack={productionBuild:true,files:webpackFiles,output:webpackOutput};

const rollup=setup('rollup'),r=blocks('rollup'),rj=r.filter(b=>b.lang==='js');
rollup.write('package.json',JSON.stringify({...JSON.parse(r.find(b=>b.lang==='json').code),name:'audit-price-library',version:'1.0.0',private:true}));
rollup.write('src/index.js',rj[0].code);rollup.write('rollup.config.mjs',rj[1].code);
run(rollup.cwd,[checker+'/node_modules/rollup/dist/bin/rollup','-c']);
const esm=await import(pathToFileURL(rollup.cwd+'/dist/index.js'));
const require=createRequire(import.meta.url),cjs=require(rollup.cwd+'/dist/index.cjs');
for(const module of [esm,cjs]){
  assert.equal(module.formatCents(1990),'19.90');assert.equal(module.formatCents(9007199254740990),'90071992547409.90');
  assert.equal(module.sumCents([1990,2990]),4980);
  for(const bad of ['1990',-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>module.formatCents(bad));
  assert.throws(()=>module.sumCents([Number.MAX_SAFE_INTEGER,1]));
}
const packed=spawnSync('npm',['pack','--json'],{cwd:rollup.cwd,encoding:'utf8'});assert.equal(packed.status,0,packed.stderr);
const packageInfo=JSON.parse(packed.stdout)[0];
const consumer=path.join(root,'consumer');fs.mkdirSync(consumer,{recursive:true});
fs.writeFileSync(consumer+'/package.json',JSON.stringify({type:'module',private:true}));
const installed=spawnSync('npm',['install',path.join(rollup.cwd,packageInfo.filename),'--ignore-scripts','--no-audit','--no-fund'],{cwd:consumer,encoding:'utf8'});assert.equal(installed.status,0,installed.stderr);
const consumed=run(consumer,['--input-type=module','-e',"import {formatCents} from 'audit-price-library';if(formatCents(1990)!=='19.90')throw Error('消费错误');console.log('ESM包消费通过')"]);
const required=run(consumer,['-e',"const {formatCents}=require('audit-price-library');if(formatCents(1990)!=='19.90')throw Error('消费错误');console.log('CJS包消费通过')"]);
rollup.write('src/consumer.js',"import {formatCents} from './index.js';console.log(formatCents(1990));");
run(rollup.cwd,[checker+'/node_modules/rollup/dist/bin/rollup','src/consumer.js','--format','es','--file','consumer.js']);
assert.ok(!fs.readFileSync(rollup.cwd+'/consumer.js','utf8').includes('sumCents'));
results.rollup={esmAndCjs:true,safeIntegerBoundary:true,badInputs:6,overflowRejected:true,packageFiles:packageInfo.files.map(f=>f.path),consumed,required,consumerUnusedExportRemoved:true};

const parcel=setup('parcel'),p=blocks('parcel');
parcel.write('package.json',JSON.stringify({private:true}));
parcel.write('src/index.html',p.find(b=>b.lang==='html').code);
parcel.write('src/main.js',p.find(b=>b.lang==='js').code);
parcel.write('src/style.css',p.find(b=>b.lang==='css').code);
const parcelOutput=run(parcel.cwd,[checker+'/node_modules/parcel/lib/bin.js','build','src/index.html','--public-url','/shop/','--no-autoinstall']);
assert.ok(fs.readFileSync(parcel.cwd+'/dist/index.html','utf8').includes('/shop/'));
results.parcel={productionBuild:true,base:'/shop/',files:fs.readdirSync(parcel.cwd+'/dist'),output:parcelOutput};
results.versions=Object.fromEntries(['webpack','webpack-cli','webpack-dev-server','rollup','parcel'].map(name=>[name,JSON.parse(fs.readFileSync(checker+'/node_modules/'+name+'/package.json')).version]));
fs.writeFileSync('/tmp/blog-build-tools-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
function serve(folder,port,failChunk=false){http.createServer((req,res)=>{const route=new URL(req.url,'http://localhost').pathname;let relative=route.replace(/^\/shop\//,'');if(route==='/shop/'||route==='/shop/missing.html')relative='index.html';if(!route.startsWith('/shop/')||relative.includes('..')){res.writeHead(404);res.end();return}if(failChunk&&String(req.headers.referer).endsWith('/shop/missing.html')&&/^\d+\..*\.js$/.test(relative)){res.writeHead(404);res.end('受控缺失chunk');return}const file=path.join(folder,relative);if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res)}).listen(port,'127.0.0.1')}
serve(vite.cwd+'/dist',5187);serve(webpack.cwd+'/dist',5188,true);serve(parcel.cwd+'/dist',5189);
console.log('生产夹具：Vite5187、Webpack5188、Parcel5189，路径/shop/；Webpack /shop/missing.html受控异步chunk404。');
