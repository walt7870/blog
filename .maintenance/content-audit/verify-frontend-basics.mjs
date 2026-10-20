import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../',import.meta.url);
const base = new URL('docs/devlanguage/front/frontend-foundations-series/',root);
const files = fs.readdirSync(base).filter(s => /^(0[1-6]-|index\.md)/.test(s));
const blocks = name => [...fs.readFileSync(new URL(name,base),'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)];
let checked = 0;
for (const file of files) for (const [,lang,code] of blocks(file)) {
  if (lang === 'js') { new vm.Script(code,{filename:file}); checked++; }
  if (lang === 'html') for (const [,script] of code.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    new vm.Script(script,{filename:file}); checked++;
  }
}
const cart = blocks('03-html-css-javascript-responsibilities.md').find(b=>b[1]==='html')[2];
const formBlocks = blocks('06-html-form-model.md');
const form = formBlocks.find(b=>b[1]==='html')[2];
const formJS = formBlocks.find(b=>b[1]==='js')[2];
const fixture = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前端基础示例验收</title><body>${cart}<section aria-label="表单实验">${form}<pre id="form-result" aria-live="polite"></pre></section><script>${formJS}\nform.addEventListener('submit', event => { document.querySelector('#form-result').textContent = JSON.stringify([...new FormData(form,event.submitter).entries()]); });</script></body></html>`;
fs.writeFileSync('/tmp/blog-frontend-lab.html',fixture);
console.log(JSON.stringify({files:files.length,syntaxBlocks:checked,fixture:'/tmp/blog-frontend-lab.html'}));
