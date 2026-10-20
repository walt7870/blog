import fs from 'node:fs';

const out = new URL('../../public/ai/speech-engineering/', import.meta.url);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, s, k = 's', a = 'start') => `<text x="${x}" y="${y}" class="${k}" text-anchor="${a}">${esc(s)}</text>`;
const box = (x, y, w, h, title, lines = [], k = 'b') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>${text(x + 16, y + 32, title, 't')}${lines.map((s, i) => text(x + 16, y + 60 + i * 26, s)).join('')}`;
let id;
const edge = d => `<path d="${d}" class="e"/>`;
function draw(name, title, desc, height, body) {
  id = name;
  fs.writeFileSync(new URL(`${name}.svg`, out), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#52616b"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;fill:#17252a;letter-spacing:0}.h{font-size:26px;font-weight:600}.t{font-size:20px;font-weight:600}.s{font-size:17px;fill:#43545b}.b{fill:#edf4fa;stroke:#4280a8;stroke-width:1.5}.g{fill:#eaf5ed;stroke:#488661;stroke-width:1.5}.r{fill:#f5eef2;stroke:#a46a84;stroke-width:1.5}.e{fill:none;stroke:#52616b;stroke-width:2;marker-end:url(#${id}-arrow)}</style></defs><rect width="1120" height="${height}" fill="white"/>${text(32, 44, title, 'h')}${text(32, 78, desc)}${body()}</svg>\n`);
}

draw('voice-decoder-queue', '连接继续收音，封口任务竞争有限解码容量', '教学快照：队列中有3项等待；容量数字只解释调度，不代表实际设备推荐配置。', 628, () =>
  edge('M228 174H270Q278 174 278 182V214Q278 222 286 222H332') +
  edge('M228 286H332') +
  edge('M228 398H270Q278 398 278 390V358Q278 350 286 350H332') +
  edge('M636 270H700') + edge('M636 350H664Q672 350 672 358V480Q672 488 680 488H700') +
  edge('M892 270H944') +
  box(32, 132, 196, 84, '会话 A', ['长句已封口']) +
  box(32, 244, 196, 84, '会话 B', ['短句已封口']) +
  box(32, 356, 196, 84, '会话 C', ['尾段已封口']) +
  box(332, 174, 304, 216, '有界任务队列', ['冻结 PCM / 参考 / 提示', '携带原始 deadline']) +
  ['A2', 'B1', 'C3'].map((s, i) => box(352 + i * 88, 300, 72, 60, s)).join('') +
  box(700, 190, 192, 174, '单进程解码', ['共享模型权重', '示例容量 B = 2', '退出后补入新任务'], 'g') +
  box(944, 214, 144, 112, '结果合并', ['按协议顺序', '发布 Final'], 'g') +
  box(700, 438, 388, 100, '满队列或截止时间已到', ['拒绝 / 背压 / 明确失败；不能无限等待'], 'r') +
  text(32, 488, '等待顺序与完成顺序可以不同。', 't') +
  text(32, 522, '长短句、KV cache和角色依赖共同影响等待。') +
  text(32, 580, '取消 HTTP 等待后，原生任务仍占用执行许可；真实线程退出后才能回收容量。') +
  text(32, 610, '示意只展开解码竞争；角色、声纹和热词各有独立队列与资源预算。')
);

draw('voice-target-input-contract', '目标条件来自参考编码，SEP 是模型训练得到的表示', '支持 learned SEP 的目标模型示意；门控是否开启，不改变必须携带登记参考的输入合同。', 626, () =>
  edge('M266 186H328') + edge('M266 350H328') +
  edge('M576 186H606Q614 186 614 194V236Q614 244 622 244H656') +
  edge('M576 350H606Q614 350 614 342V308Q614 300 622 300H656') +
  edge('M1048 340V408') +
  box(32, 132, 234, 108, '登记参考波形', ['参考身份与版本', '有效语音、固定截取边界']) +
  box(32, 296, 234, 108, '当前混合语音', ['保留目标上下文', '原始样本区间不变']) +
  box(328, 132, 248, 108, '参考编码', ['输出长度 E(R)', '不能用声纹向量代替']) +
  box(328, 296, 248, 108, '混合音频编码', ['输出长度 E(M)', '按实际前处理计算']) +
  box(656, 174, 432, 166, '按训练顺序装配', ['[参考编码, learned SEP, 混合编码]', '占位符数量 = E(R) + 1 + E(M)', 'SEP 不是静音波形或字符串'], 'g') +
  box(656, 408, 432, 100, '目标解码与输出核对', ['正例保留与负例误输出分别验收'], 'g') +
  text(32, 480, '参考缺失：明确失败，不自动放开目标约束。', 't') +
  text(32, 554, '编码长度由模型决定，E(R + M) 不保证等于 E(R) + E(M)；漏掉 SEP 会使占位符错位。') +
  text(32, 590, '门控、参考条件和模型能力分开验证；传入参考不等于已经证明非目标输出为空。')
);
