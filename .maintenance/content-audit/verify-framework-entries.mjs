import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createServer, build } from 'vite';
import vue from '@vitejs/plugin-vue';
import ts from '/tmp/blog-toolchain-checker/node_modules/typescript/lib/typescript.js';

const root = '/tmp/blog-framework-entry-fixtures';
const checker = '/tmp/blog-framework-checker';
const source = new URL('../../docs/devlanguage/front/framework/', import.meta.url);
const blocks = name => [...fs.readFileSync(new URL(name + '.md', source), 'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)].map(([,lang,code]) => ({lang,code}));
fs.mkdirSync(root, {recursive:true});
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
write('package.json', JSON.stringify({type:'module', private:true}));
if (!fs.existsSync(root + '/node_modules')) fs.symlinkSync(checker + '/node_modules', root + '/node_modules', 'dir');
const html = (body, script) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${body}<script type="module" src="./${script}"></script></html>`;

write('App.jsx', "import React from 'react';\n" + blocks('react').find(x => x.lang === 'jsx').code);
write('react-main.jsx', "import React from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';createRoot(document.getElementById('app')).render(<App/>);");
write('react.html', html('<div id="app"></div>', 'react-main.jsx'));
for (const block of blocks('vue').filter(x => x.lang === 'vue')) {
  const name = block.code.match(/<!-- ([\w.]+) -->/)[1];
  write(name, block.code);
}
write('vue-main.js', "import {createApp} from 'vue';import App from './App.vue';createApp(App).mount('#app');");
write('vue.html', html('<div id="app"></div>', 'vue-main.js'));
const angularCode = blocks('angular').find(x => x.lang === 'ts').code;
write('angular-main.js', "import '@angular/compiler';\n" + ts.transpileModule(angularCode, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext, experimentalDecorators:true}}).outputText);
write('angular.html', html('<app-root></app-root>', 'angular-main.js'));

const {compile} = (await import(pathToFileURL(checker + '/node_modules/svelte/compiler/index.js'))).default;
const sb = blocks('svelte');
const svelteSource = sb.find(x => x.lang === 'svelte').code;
const compiled = compile(svelteSource, {filename:'Quote.svelte', generate:'client', dev:true});
assert.equal(compiled.warnings.length, 0);
write('Quote.js', compiled.js.code);
const lifecycle = sb.find(x => x.lang === 'js').code;
write('Clock.js', compile(`<script>${lifecycle}</script><p>活动秒数：{seconds}</p>`, {filename:'Clock.svelte',generate:'client',dev:true}).js.code);
write('svelte-main.js', `import {mount,unmount} from 'svelte';import Quote from './Quote.js';import Clock from './Clock.js';
const originalSet=window.setInterval.bind(window),originalClear=window.clearInterval.bind(window);const timers=new Set();
window.setInterval=(...args)=>{const id=originalSet(...args);timers.add(id);document.body.dataset.timers=String(timers.size);return id};
window.clearInterval=id=>{originalClear(id);timers.delete(id);document.body.dataset.timers=String(timers.size)};
mount(Quote,{target:document.querySelector('#app')});let clock=mount(Clock,{target:document.querySelector('#clock')});
document.querySelector('#stop').onclick=async()=>{await unmount(clock);document.querySelector('#stop').disabled=true};`);
write('svelte.html', html('<div id="app"></div><div id="clock"></div><button id="stop">移除计时组件</button>', 'svelte-main.js'));

const element = blocks('lightweight-frameworks').find(x => x.lang === 'html').code;
write('element.html', '<!doctype html><html lang="zh-CN"><meta charset="utf-8">' + element + `<label>测试库存<input id="stock-value" value="3"></label><button id="apply">更新库存</button><script>document.querySelector('#apply').onclick=()=>document.querySelector('stock-status').setAttribute('available',document.querySelector('#stock-value').value)</script></html>`);

// 先验证三个组件应用的真实生产转换，Angular JIT另用开发服务器验证表单合同。
await build({root,configFile:false,plugins:[vue()],resolve:{alias:{vue:path.resolve('node_modules/vue/dist/vue.runtime.esm-bundler.js')}},build:{outDir:'dist',rolldownOptions:{input:['react','vue','svelte','element'].map(n=>root+'/'+n+'.html')}},logLevel:'warn'});
const results={productionBuilt:['react','vue','svelte','element'],svelteWarnings:compiled.warnings,versions:JSON.parse(fs.readFileSync(checker+'/package.json')).dependencies};
write('results.json', JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
const dev=await createServer({root,configFile:false,plugins:[vue()],resolve:{alias:{vue:path.resolve('node_modules/vue/dist/vue.runtime.esm-bundler.js')}},server:{host:'127.0.0.1',port:5186,strictPort:true},logLevel:'warn'});
await dev.listen();console.log('框架入口夹具 http://127.0.0.1:5186/{react,vue,angular,svelte,element}.html');
