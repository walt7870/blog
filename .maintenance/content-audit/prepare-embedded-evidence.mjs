import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('../../',import.meta.url).pathname);
const output='/tmp/blog-audit-preview-root/__embedded-diagrams';
const evidence=root+'/.maintenance/content-audit/evidence/embedded';
fs.mkdirSync(output,{recursive:true});
fs.mkdirSync(evidence,{recursive:true});
const pages=[...fs.readdirSync(root+'/docs/embedded').filter(x=>x.endsWith('.md')).map(x=>'docs/embedded/'+x),'docs/devlanguage/index.md'];
const diagrams=[...new Set(pages.flatMap(file=>[...fs.readFileSync(root+'/'+file,'utf8').matchAll(/!\[[^\]]*\]\(([^)]+\.svg)\)/g)].map(x=>x[1])))];
for(const file of diagrams){const id=path.basename(file,'.svg');fs.writeFileSync(output+'/'+id+'.html','<!doctype html><meta charset="utf-8"><title>'+id+'</title><style>body{margin:0;background:white}svg{display:block}</style>'+fs.readFileSync(root+'/public'+file,'utf8'));}
fs.writeFileSync(evidence+'/diagrams.json',JSON.stringify(diagrams,null,2));
fs.copyFileSync('/tmp/blog-embedded-results.json',evidence+'/code-checks.json');
const sourceFiles=['/tmp/blog-embedded-official-rtos.json','/tmp/blog-embedded-official-io.json','/tmp/blog-embedded-official-pinned.json'];
fs.writeFileSync(evidence+'/official-read-attempts.json',JSON.stringify(sourceFiles.map(file=>({file,result:JSON.parse(fs.readFileSync(file,'utf8'))})),null,2));
console.log(JSON.stringify({pages:pages.length,diagrams:diagrams.length,evidence}));
