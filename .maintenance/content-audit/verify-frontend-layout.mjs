import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../../docs/devlanguage/front/frontend-foundations-series/',import.meta.url);
const names = fs.readdirSync(base).filter(s => /^(0[7-9]-|10-)/.test(s));
const blocks = name => [...fs.readFileSync(new URL(name,base),'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)];
const wrap = body => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>布局与交互验收</title><body>${body}</body></html>`;
const save = (name,body) => fs.writeFileSync(`/tmp/blog-layout-${name}.html`,wrap(body));
let scripts=0;
for(const name of names)for(const [,lang,code]of blocks(name)){
  if(lang==='js'){new vm.Script(code,{filename:name});scripts++;}
  if(lang==='html')for(const [,js]of code.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(js,{filename:name});scripts++;}
}
const cascade=blocks(names.find(n=>n.startsWith('07-'))).find(b=>b[1]==='html')[2];
save('cascade',cascade);
save('reversed',cascade.replace('@layer vendor, app;','@layer app, vendor;'));
save('unlayered',cascade+'<style>.buy { color: red; }</style>');
const layout=blocks(names.find(n=>n.startsWith('08-')));
save('grid',`<style>${layout.filter(b=>b[1]==='css').map(b=>b[2]).join('\n')}</style><div class="toolbar"><span class="toolbar-title">LongProductNameWithoutSpacesForOverflowCheckLongProductNameWithoutSpacesForOverflowCheck</span><button class="toolbar-action">保存</button></div>${layout.find(b=>b[1]==='html')[2]}`);
const responsive=blocks(names.find(n=>n.startsWith('09-'))).filter(b=>b[1]==='html').at(-1)[2];
save('container',`<div style="width:656px;max-width:100%" id="wide">${responsive}</div><div style="width:300px;max-width:100%" id="small">${responsive}</div>`);
save('a11y',blocks(names.find(n=>n.startsWith('10-'))).find(b=>b[1]==='html')[2]);
console.log(JSON.stringify({pages:names.length,scriptBlocks:scripts,fixtures:6}));
