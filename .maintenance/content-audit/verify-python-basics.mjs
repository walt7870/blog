import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();
const sourceDir = 'docs/devlanguage/python/basics-series';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-python-basics-'));
const evidence = [];
const pages = fs.readdirSync(sourceDir).filter(name => name.endsWith('.md')).sort();
const blocks = new Map();
const csv = 'name,phone,city\n李雷,13800000001,上海\n韩梅梅,,杭州\n王芳,13900000003,\n';
function run(file, args = [], expected = 0, options = {}) {
  const result = spawnSync(process.env.PYTHON || 'python3', [file, ...args], { cwd: path.dirname(file), encoding: 'utf8', ...options });
  assert.equal(result.status, expected, `${file}: ${result.stderr}`);
  return result;
}
for (const page of pages) {
  const tokens = md.parse(fs.readFileSync(path.join(sourceDir, page), 'utf8'), {});
  const python = tokens.filter(t => t.type === 'fence' && t.info.trim() === 'python').map(t => t.content);
  blocks.set(page.slice(0, 2), python);
  for (let i = 0; i < python.length; i++) {
    const parsed = spawnSync(process.env.PYTHON || 'python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read(), feature_version=(3,10))'], { input: python[i], encoding: 'utf8' });
    assert.equal(parsed.status, 0, `${page} block ${i}: ${parsed.stderr}`);
  }
  evidence.push({ page, pythonBlocks: python.length, ast: 'passed' });
}
function prepare(id, content) {
  const dir = path.join(temp, id);
  fs.mkdirSync(dir);
  const file = path.join(dir, 'example.py');
  fs.writeFileSync(file, content);
  fs.writeFileSync(path.join(dir, 'customers.csv'), csv);
  return { dir, file };
}
const codes = id => blocks.get(id);
for (const id of ['01','02','03','04','05','06','07','08','09','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25']) {
  let code;
  if (id === '01') code = codes(id).join('\n');
  else if (id === '04') code = codes(id).at(-1);
  else if (id === '25') code = codes(id)[1];
  else code = codes(id)[0];
  const { dir, file } = prepare(id, code);
  if (id === '12') fs.writeFileSync(path.join(dir, 'crm_response.json'), JSON.stringify({ status:'ok', data:{ customers:[{ name:'李雷', phone:'13800000001' },{ name:'韩梅梅', phone:'' }] } }));
  if (id === '22') {
    fs.mkdirSync(path.join(dir,'inputs'));
    fs.writeFileSync(path.join(dir,'inputs/shanghai.txt'),'上海日报');
    fs.writeFileSync(path.join(dir,'inputs/hangzhou.txt'),'杭州日报');
  }
  const args = id === '23' ? ['--output','outputs/missing.csv'] : [];
  const result = run(file, args, id === '24' ? 1 : 0);
  if (id === '01') { assert.match(result.stdout,/韩梅梅/); assert.doesNotMatch(result.stdout,/王芳/); assert.match(result.stdout,/官网 2/); }
  if (id === '03') assert.match(result.stdout,/Decimal\('1200.50'\)/);
  if (id === '04') assert.match(result.stdout,/最近订单： A1001 paid/);
  if (id === '05') assert.match(result.stdout,/韩梅梅：资料待补, 需要回访/);
  if (id === '06') { assert.match(result.stdout,/完整客户：1/); assert.match(result.stdout,/待补客户：3/); }
  if (id === '08') { assert.match(result.stdout,/3 天未联系，正常/); assert.match(result.stdout,/23 天未联系，超期/); }
  if (id === '11') { const output = fs.readFileSync(path.join(dir,'missing_customers.csv'),'utf8'); assert.match(output,/韩梅梅,phone/); assert.match(output,/王芳,city/); }
  if (id === '12') assert.match(result.stdout,/客户数量：2/);
  if (id === '13') { assert.match(result.stdout,/空手机号：1/); assert.match(result.stdout,/疑似重复：1/); }
  if (id === '14') assert.match(result.stdout,/官网: 2/);
  if (id === '15') { assert.match(result.stdout,/A1002.*已付款净实收异常/); assert.match(result.stdout,/A1003.*取消订单仍有净实收/); }
  if (id === '16') assert.match(fs.readFileSync(path.join(dir,'outputs/daily-report-2026-08-02.txt'),'utf8'),/新增客户：18/);
  if (id === '19') assert.match(result.stdout,/日期格式错误：2026\/07\/xx/);
  if (id === '20') { const log=fs.readFileSync(path.join(dir,'run.log'),'utf8'); assert.match(log,/成功=1，跳过=1/); assert.doesNotMatch(log,/李雷/); }
  if (id === '22') {
    assert.equal(fs.readFileSync(path.join(dir,'inputs/shanghai.txt'),'utf8'),'上海日报');
    assert.equal(fs.readFileSync(path.join(dir,'outputs/report-shanghai.txt'),'utf8'),'上海日报');
    run(file,[],1);
  }
  if (id === '23') {
    const output=fs.readFileSync(path.join(dir,'outputs/missing.csv'),'utf8');
    assert.match(output,/韩梅梅/); assert.doesNotMatch(output,/王芳/);
    run(file,args,1); run(file,[...args,'--overwrite']);
    run(file,['--input','customers.csv','--output','customers.csv','--overwrite'],1);
    assert.equal(fs.readFileSync(path.join(dir,'customers.csv'),'utf8'),csv);
    fs.linkSync(path.join(dir,'customers.csv'),path.join(dir,'alias.csv'));
    run(file,['--output','alias.csv','--overwrite'],1);
    run(file,['--help']);
    fs.writeFileSync(path.join(dir,'customers.csv'),'name,city\n李雷,上海\n');
    run(file,['--output','missing-columns.csv'],1);
    assert.equal(fs.existsSync(path.join(dir,'missing-columns.csv')),false);
    fs.writeFileSync(path.join(dir,'customers.csv'),'name,phone,city\n');
    run(file,['--output','empty.csv']);
    assert.equal(fs.readFileSync(path.join(dir,'empty.csv'),'utf8').trim(),'name');
  }
  if (id === '24') {
    assert.equal(fs.existsSync(path.join(dir,'delivery_package')),false);
    fs.mkdirSync(path.join(dir,'delivery_package'));
    for(const name of ['README.md','run.py','customers.csv']) fs.writeFileSync(path.join(dir,'delivery_package',name),'fixture');
    run(file);
  }
  evidence.find(e=>e.page.startsWith(id+'-')).execution = 'passed';
}
const moduleDir=path.join(temp,'10');fs.mkdirSync(moduleDir);
for(const [i,name] of ['checks.py','report.py','main.py'].entries())fs.writeFileSync(path.join(moduleDir,name),codes('10')[i]);
assert.match(run(path.join(moduleDir,'main.py')).stdout,/韩梅梅/);
assert.equal(spawnSync(process.env.PYTHON || 'python3',['-c','import main'],{cwd:moduleDir,encoding:'utf8'}).stdout,'');
evidence.find(e=>e.page.startsWith('10-')).execution='passed';

const boundaryCode = `${codes('05')[0].split('if __name__')[0]}
assert "需要回访" not in tag_customer({"phone":"1","level":"普通","amount":1,"days_since_contact":7})
assert "需要回访" in tag_customer({"phone":"1","level":"普通","amount":1,"days_since_contact":8})
`;
run(prepare('rule-boundary',boundaryCode).file);
run(prepare('normalize-boundary',`${codes('07')[0].split('if __name__')[0]}\nassert normalize_source(' ') == '来源待补'\nassert normalize_source('合作-平台') == '其他'\n`).file);
run(prepare('function-boundary',`${codes('09')[0].split('if __name__')[0]}\nassert not need_followup({'days_since_contact':12},14)\n`).file);
run(prepare('parse-boundary',`${codes('19')[0].split('if __name__')[0]}\nassert parse_contact({'last_contact':'2026-02-30'})[1]\nassert parse_contact({'last_contact':123})[1] == '联系日期必须是文本'\n`).file);

const envDir=path.join(temp,'venv');
const venv=spawnSync(process.env.PYTHON || 'python3',['-m','venv','--without-pip',envDir],{encoding:'utf8'});
assert.equal(venv.status,0,venv.stderr);
const envCheck=spawnSync(path.join(envDir,'bin/python'),[path.join(temp,'17/example.py')],{encoding:'utf8'});
assert.equal(envCheck.status,0);assert.match(envCheck.stdout,/是否虚拟环境：True/);

const httpCode = `${codes('21')[1]}
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.error import HTTPError

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        assert self.headers['Authorization'] == 'Bearer example-fixture'
        if self.path == '/unauthorized':
            self.send_response(401)
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()
        if self.path == '/invalid':
            self.wfile.write(b'{')
        elif self.path == '/missing':
            self.wfile.write(b'{}')
        else:
            self.wfile.write(b'{"customers":[]}')
    def log_message(self, *args):
        pass

os.environ['CRM_API_TOKEN'] = 'example-fixture'
server = HTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    assert fetch_customer_page(base)['customers'] == []
    for route, expected in [('/unauthorized',HTTPError),('/invalid',json.JSONDecodeError),('/missing',ValueError)]:
        try:
            fetch_customer_page(base + route)
        except expected:
            pass
        else:
            raise AssertionError(route)
finally:
    server.shutdown()
    server.server_close()
`;
run(prepare('http-contract',httpCode).file);

fs.mkdirSync('.maintenance/content-audit/evidence/python-basics',{recursive:true});
fs.writeFileSync('.maintenance/content-audit/evidence/python-basics/code-checks.json',JSON.stringify({python:spawnSync(process.env.PYTHON || 'python3',['--version'],{encoding:'utf8'}).stdout.trim(),temp,evidence,notes:['全部Python块AST按3.10语法检查','25篇示例实际运行（含三模块导入）','CLI缺列、空表、原件路径、硬链接与覆盖保护','批处理原件保留与重复运行拒绝','交付检查器不创建被检查目录','新venv运行验证，不安装包','本机HTTP服务验证GET认证头、空数组、401、非法JSON与缺字段，未调用真实CRM']},null,2)+'\n');
console.log(JSON.stringify({temp,pages:evidence.length,pythonBlocks:evidence.reduce((n,e)=>n+e.pythonBlocks,0),executed:evidence.filter(e=>e.execution).length}));
