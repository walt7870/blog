// Figures for docs/ai/llm-architecture/ 01–03 (group "basics").
// Run: node .maintenance/llm-architecture/diagrams-basics.mjs
// Numbers come from research/facts-basics.md (parameter split, tokenizer runs, attention example).
import { svg, box, cell, edge, text, label, write, esc } from './svg-kit.mjs';

const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);

// ---- overview-dataflow (01) ---------------------------------------------------
const top = [
  ['txt', '输入文本', ['年假怎么申请？', '7 个字符'], 'gray', '文本'],
  ['tok', '分词器', ['切成 5 个 token', '形状 [5]'], 'node', '整数编号'],
  ['emb', '词嵌入', ['按编号查表取行', '[5] → [5, 4096]'], 'blue', '向量'],
  ['layers', '解码器层 ×32', ['注意力 + FFN', '[5, 4096] 进出'], 'violet', '主体'],
  ['norm', '最终 RMSNorm', ['统一数值尺度', '[5, 4096]'], 'node', '归一化'],
  ['head', '输出层', ['4096 → 128256', '[5, 128256]'], 'amber', 'logits'],
  ['next', '下一个 token', ['取最后一行', 'softmax 后选出'], 'green', '结果'],
];
let row1 = '';
const BW = 172, GAP = 22, X0 = 28, Y1 = 132, BH = 132;
top.forEach(([id, t, lines, cls, k], i) => {
  const x = X0 + i * (BW + GAP);
  row1 += box(id, x, Y1, BW, BH, cls, t, lines, k);
  if (i < top.length - 1) row1 += edge(`M${x + BW} ${Y1 + 66}H${x + BW + GAP}`);
});
const lx = X0 + 3 * (BW + GAP); // layers box x
// zoom of one layer
const ZY = 330, SY = 560; // zoom panel top, residual line y
const zoom = [
  `<rect x="28" y="${ZY}" width="1344" height="330" rx="10" fill="none" stroke="#9b87f5" stroke-width="2" stroke-dasharray="6 5"/>`,
  edge(`M${lx} ${Y1 + BH}L120 ${ZY}`, 'line'), edge(`M${lx + BW} ${Y1 + BH}L1280 ${ZY}`, 'line'),
  text(48, ZY + 28, '放大其中一层（32 层结构相同、参数各不相同）', 'k'),
  // residual stream
  `<path d="M60 ${SY}H1330" stroke="#60a5fa" stroke-width="10" stroke-linecap="round" opacity=".35" fill="none"/>`,
  edge(`M60 ${SY}H1336`),
  text(60, SY + 40, '残差流 [5, 4096]：每个子层只把结果加回来，不替换原来的向量', 's'),
  text(60, SY + 66, '第 06 篇讲残差与归一化；第 03、04 篇讲注意力；第 05 篇讲 FFN', 'xs'),
  // attention branch
  edge(`M130 ${SY}V478`), box('n1', 70, 398, 150, 80, 'node', 'RMSNorm', ['[5, 4096]']),
  edge('M220 438H252'), box('attn', 252, 382, 300, 112, 'blue', '自注意力', ['Q [5, 32, 128]，K/V [5, 8, 128]', '每个 token 看前面的 token']),
  edge(`M552 438H600V${SY - 14}`),
  `<circle cx="600" cy="${SY}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(600, SY + 6, '+', 't', 'middle'),
  // ffn branch
  edge(`M720 ${SY}V478`), box('n2', 660, 398, 150, 80, 'node', 'RMSNorm', ['[5, 4096]']),
  edge('M810 438H842'), box('ffn', 842, 382, 380, 112, 'green', 'FFN（SwiGLU）', ['[5, 4096] → [5, 14336] → [5, 4096]', '每个 token 各算各的']),
  edge(`M1222 438H1270V${SY - 14}`),
  `<circle cx="1270" cy="${SY}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(1270, SY + 6, '+', 't', 'middle'),
  text(560, 400, '每层 4194 万参数', 'xs'), text(1230, 400, '每层 1.76 亿', 'xs'),
];
const loop = [
  edge(`M${X0 + 6 * (BW + GAP) + BW / 2} ${Y1}V104H${X0 + BW / 2}V${Y1}`, 'dash'),
  label(560, 112, '选出的 token 接到输入末尾，再算下一步（自回归）', 380),
];
const overviewFlow = svg('overview-dataflow', 1400, 690, 'Llama-3.1-8B 从输入文本到下一个 token 的数据流',
  '输入“年假怎么申请？”经分词器切成 5 个 token，词嵌入查表得到形状 [5, 4096] 的矩阵，依次经过 32 个结构相同的解码器层，每层先 RMSNorm 再自注意力并加回残差流，再 RMSNorm、FFN 并加回残差流；最后经最终 RMSNorm 和输出层得到 [5, 128256] 的 logits，取最后一行经 softmax 选出下一个 token，再接到输入末尾重复。',
  '一个 token 的旅程：Llama-3.1-8B 的整体结构', '上排是从文本到下一个 token 的七步，方括号里是张量形状；下方放大一个解码器层。',
  [row1, ...loop, ...zoom].join('\n'));

// ---- overview-param-share (01) -----------------------------------------------
const tot = 8030261248;
const segs = [
  ['词嵌入', 525336576, 'fblue'], ['注意力 ×32', 1342177280, 'fviolet'], ['FFN ×32', 5637144576, 'fgreen'],
  ['输出层', 525336576, 'famber'],
];
const PX = 60, PW = 1280;
let pbar = '', x = PX;
segs.forEach(([lab, v, cls]) => {
  const w = PW * v / tot;
  pbar += `<rect x="${x.toFixed(1)}" y="150" width="${w.toFixed(1)}" height="64" class="${cls}" stroke="#fff" stroke-width="2"/>`;
  pbar += text(x + w / 2, 178, lab, 's', 'middle') + text(x + w / 2, 202, `${(v / 1e9).toFixed(2)}B · ${(100 * v / tot).toFixed(1)}%`, 'xs', 'middle');
  x += w;
});
pbar += text(PX, 140, '整个模型 8,030,261,248 个参数（RMSNorm 共 266,240 个，占 0.003%，图上看不见）', 's');
// one layer
const lay = [['q', 16777216, 'fviolet'], ['k', 4194304, 'fviolet'], ['v', 4194304, 'fviolet'], ['o', 16777216, 'fviolet'],
  ['gate', 58720256, 'fgreen'], ['up', 58720256, 'fgreen'], ['down', 58720256, 'fgreen']];
const ltot = 218112000;
let lbar = '';
x = PX;
lay.forEach(([lab, v, cls]) => {
  const w = PW * v / ltot;
  lbar += `<rect x="${x.toFixed(1)}" y="300" width="${w.toFixed(1)}" height="56" class="${cls}" stroke="#fff" stroke-width="2"/>`;
  if (w > 60) lbar += text(x + w / 2, 324, lab, 'm', 'middle') + text(x + w / 2, 345, `${(v / 1e6).toFixed(1)}M`, 'xs', 'middle');
  else lbar += text(x + w / 2, 334, lab, 'm', 'middle');
  x += w;
});
lbar += text(PX + PW * 0.1442, 378, 'k、v 各 4.2M', 'xs', 'middle');
lbar += text(PX, 290, '其中一层 218,112,000 个参数：注意力 4 个矩阵占 19.2%，FFN 3 个矩阵占 80.8%', 's');
const notes = [
  box('pn1', 60, 410, 400, 150, 'green', 'FFN 为什么最大', ['3 个矩阵，每个 4096 × 14336', '中间维度是隐藏维度的 3.5 倍', '每层 1.76 亿，32 层 56.4 亿']),
  box('pn2', 500, 410, 400, 150, 'violet', '注意力为什么较小', ['q、o 各 4096 × 4096', 'k、v 只有 8 个头：4096 × 1024', '每层 4194 万，32 层 13.4 亿']),
  box('pn3', 940, 410, 400, 150, 'amber', '词表两头各一份', ['128256 × 4096 = 5.25 亿', '输入查表一份，输出打分一份', '不共享（tie = false）']),
];
const paramShare = svg('overview-param-share', 1400, 600, 'Llama-3.1-8B 的参数分布',
  '8,030,261,248 个参数中，32 层 FFN 共 5.64B 占 70.2%，32 层注意力共 1.34B 占 16.7%，词嵌入和输出层各 0.53B 合计 13.1%，RMSNorm 可以忽略。单层 218,112,000 个参数里，q、k、v、o 四个注意力矩阵占 19.2%，gate、up、down 三个 FFN 矩阵占 80.8%。',
  '8B 参数花在哪：七成在 FFN', '按 config.json 逐个矩阵相乘得到，宽度与参数量成正比。',
  [pbar, lbar, ...notes].join('\n'));

// ---- overview-autoregressive (01) --------------------------------------------
const steps = [
  ['第 1 步', ['年', '假', '怎么', '申请', '？'], [], '根据', '5 个位置一起算（Prefill），只用最后一行 logits'],
  ['第 2 步', ['年', '假', '怎么', '申请', '？'], ['根据'], '《', '只算新来的 1 个位置，前 5 个读 KV Cache'],
  ['第 3 步', ['年', '假', '怎么', '申请', '？', '根据'], ['《'], '员工', '只算 1 个位置，读前 6 个的 K、V'],
];
let ar = '';
steps.forEach(([name, old, nw, out, note], i) => {
  const y = 130 + i * 104;
  ar += text(32, y + 30, name, 't');
  let cx = 130;
  const all = i === 0 ? old.map(t => [t, 'fblue']) : [...old.map(t => [t, 'fgray']), ...nw.map(t => [t, 'fblue'])];
  all.forEach(([t, cls]) => { const w = t.length > 1 ? 72 : 52; ar += cell(cx, y, w, 46, cls, t, 's'); cx += w + 8; });
  ar += edge(`M${cx + 6} ${y + 23}H${cx + 66}`) + box(`o${i}`, cx + 72, y - 4, 120, 54, 'green', out);
  ar += text(cx + 214, y + 28, note, 's');
});
ar += cell(130, 450, 40, 26, 'fblue') + text(180, 469, '本步新算的位置', 's') + cell(360, 450, 40, 26, 'fgray') + text(410, 469, '已缓存，只被读取', 's');
ar += text(640, 469, '续写内容为示意，真实输出取决于模型和解码设置', 'xs');
const autoreg = svg('overview-autoregressive', 1320, 510, '自回归生成：每步把选出的 token 接到输入末尾',
  '第 1 步把“年假怎么申请？”5 个 token 一起算，只用最后一个位置的输出选出“根据”；第 2 步把“根据”接到末尾，只为这个新位置计算，前面的 K、V 从缓存读取，选出“《”；第 3 步同理选出“员工”。',
  '一次只出一个 token：生成就是不断接龙', '每一步模型只回答“下一个 token 是什么”，答案接到末尾，成为下一步的输入。',
  ar);

// ---- tokenizer-split (02) ----------------------------------------------------
const bytes = { 年: 'E5 B9 B4', 假: 'E5 81 87', 怎: 'E6 80 8E', 么: 'E4 B9 88', 申: 'E7 94 B3', 请: 'E8 AF B7', '？': 'EF BC 9F' };
let ts = '';
// step 1: pre-split
ts += text(32, 128, '① 预切分：正则把连续的汉字归为一段，标点单独一段', 'k');
ts += text(32, 172, '文本', 't') + cell(250, 142, 940, 46, 'fgray', '年假怎么申请', 't') + cell(1198, 142, 150, 46, 'fgray', '？', 't');
// step 2: bytes
ts += text(32, 230, '② 转成 UTF-8 字节：每个汉字 3 字节，共 21 字节，词表的起点是 256 个字节', 'k');
let bx = 250;
ts += text(32, 276, 'UTF-8 字节', 't');
Object.entries(bytes).forEach(([c, b]) => {
  ts += cell(bx, 244, 150, 52, 'node', '');
  ts += text(bx + 75, 266, c, 's', 'middle') + text(bx + 75, 287, b, 'm', 'middle');
  bx += 158;
});
// step 3: merged tokens
ts += text(32, 340, '③ 按训练时学到的合并规则把字节合并成 token，再换成编号（实测）', 'k');
const tokRow = (y, name, toks) => {
  let s = text(32, y + 30, name, 't'), cx = 250;
  toks.forEach(([t, id, w]) => { s += cell(cx, y, w, 56, 'fblue', ''); s += text(cx + w / 2, y + 24, t, 's', 'middle') + text(cx + w / 2, y + 46, id, 'm', 'middle'); cx += w + 8; });
  return s;
};
ts += tokRow(356, 'Llama 3', [['年', '8107', 150], ['假', '107099', 150], ['怎么', '104237', 308], ['申请', '112838', 308], ['？', '11571', 150]]);
ts += tokRow(428, 'Qwen2.5', [['年', '7948', 150], ['假', '99436', 150], ['怎么', '99494', 308], ['申请', '101915', 308], ['？', '11319', 150]]);
// rare char comparison
ts += text(32, 534, '同样的流程，词表里没有的字只能停在字节片段：“钉钉审批”（实测）', 'k');
const rare = (y, name, toks, n) => {
  let s = text(32, y + 30, name, 't'), cx = 250;
  toks.forEach(([t, cls, w]) => { s += cell(cx, y, w, 46, cls, t, 's'); cx += w + 8; });
  return s + text(cx + 12, y + 30, n, 's');
};
ts += rare(550, 'Llama 3', [['E9 92', 'fred', 100], ['89', 'fred', 64], ['E9 92', 'fred', 100], ['89', 'fred', 64], ['审', 'fblue', 64], ['批', 'fblue', 64]], '6 个 token：“钉”拆成两段字节，单独解码是乱码');
ts += rare(608, 'Qwen2.5', [['钉', 'fblue', 64], ['钉', 'fblue', 64], ['审批', 'fblue', 132]], '3 个 token：“钉”是整字，“审批”是一个词');
const tokSplit = svg('tokenizer-split', 1400, 680, '“年假怎么申请？”在 Llama 3 和 Qwen2.5 分词器里的切分过程',
  '分词分三步：先用正则预切分成“年假怎么申请”和“？”两段，再转成 21 个 UTF-8 字节，最后按合并规则合并成 token 并查出编号。实测两种分词器都切成 年、假、怎么、申请、？ 五个 token，编号不同。“钉钉审批”在 Llama 3 里切成 6 个 token，“钉”拆成 E9 92 和 89 两段字节；Qwen2.5 只要 3 个。',
  '文字怎样变成编号：预切分、字节、合并', '字节级 BPE 分词器的三步；编号来自本机加载 tokenizer.json 实测（Llama 3.1 与 Qwen2.5-0.5B-Instruct）。',
  ts);

// ---- tokenizer-embedding (02) ------------------------------------------------
let te = '';
// ids
const ids = [['年', '8107'], ['假', '107099'], ['怎么', '104237'], ['申请', '112838'], ['？', '11571']];
te += text(32, 128, '输入编号 [5]', 'k');
ids.forEach(([t, id], i) => { te += cell(32, 142 + i * 50, 170, 40, 'fgray', `${t}  ${id}`, 's'); });
// matrix
const MX = 300, MY = 120, MW = 260, MH = 300;
te += `<rect x="${MX}" y="${MY}" width="${MW}" height="${MH}" rx="6" class="blue"/>`;
te += text(MX + MW / 2, MY + MH + 28, '词嵌入矩阵 [128256, 4096]', 's', 'middle');
te += text(MX + MW / 2, MY + MH + 50, '每行是一个 token 的向量', 'xs', 'middle');
const rowY = [0.063, 0.834, 0.813, 0.880, 0.090].map(r => MY + 8 + r * (MH - 24));
rowY.forEach((y, i) => {
  te += `<rect x="${MX + 6}" y="${y.toFixed(1)}" width="${MW - 12}" height="8" fill="#2563eb" opacity=".75"/>`;
  te += edge(`M202 ${162 + i * 50}L${MX - 2} ${(y + 4).toFixed(1)}`, 'line');
});
te += edge(`M${MX + MW} 270H640`);
te += text(MX + MW + 12, 258, '取出 5 行', 'xs');
// output matrix [5,4096]
for (let i = 0; i < 5; i++) te += `<rect x="650" y="${142 + i * 50}" width="240" height="40" rx="4" class="fblue"/>`;
te += text(770, 128, '[5, 4096]，送进第 1 层', 'k', 'middle');
te += text(770, 416, '查表不做乘法，只是按编号取行', 'xs', 'middle');
// right: tie comparison
te += box('untie', 940, 112, 428, 150, 'amber', 'Llama-3.1-8B：不共享', ['词嵌入 128256 × 4096 = 5.25 亿', '输出层再存一份同样大小的矩阵', '两份合计 10.5 亿，占全模型 13.1%'], 'tie_word_embeddings: false');
te += box('tie', 940, 282, 428, 150, 'green', 'Qwen2.5-0.5B：共享', ['词嵌入 151936 × 896 = 1.36 亿', '输出层直接复用这张表，不另存', '只存一份，仍占全模型 27.6%'], 'tie_word_embeddings: true');
// share bars
const share = [['Llama-3.1-8B（两份）', 13.1, 'famber'], ['Llama-3.2-1B（共享）', 21.3, 'fgreen'], ['Qwen2.5-0.5B（共享）', 27.6, 'fgreen']];
te += text(32, 530, '词嵌入 + 输出层占全部参数的比例：模型越小，词表这块越显眼', 'k');
share.forEach(([n, p, cls], i) => {
  const y = 548 + i * 44;
  te += text(32, y + 24, n, 's') + `<rect x="300" y="${y}" width="${(p * 30).toFixed(1)}" height="32" rx="4" class="${cls}"/>` + text(310 + p * 30, y + 22, `${p}%`, 's');
});
te += text(1368, 680, '比例按各自 config.json 计算', 'xs', 'end');
const tokEmb = svg('tokenizer-embedding', 1400, 700, '词嵌入查表与输出层是否共享',
  '5 个 token 编号在形状 [128256, 4096] 的词嵌入矩阵里各取一行，得到 [5, 4096] 送进第 1 层。Llama-3.1-8B 输出层另存一份同样大小的矩阵，两份共 10.5 亿参数占 13.1%；Qwen2.5-0.5B 让输出层复用词嵌入矩阵，只存一份 1.36 亿，仍占 27.6%；Llama-3.2-1B 共享后占 21.3%。',
  '词嵌入是一张表：编号就是行号', '左边：查表过程；右边：输出层要不要复用这张表；下方：词表在不同规模模型里的参数占比。',
  te);

// ---- attention-qkv-example (03) ----------------------------------------------
const toks = ['年', '假', '怎么', '申请'];
const X = [[1, 1, 0, 0], [2, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const WQ = [[0, 1], [1, 0], [1, 0], [2, 0]], WK = [[1, 0], [0, 0], [0, 1], [0, 0]], WV = [[1, 0], [0, 0], [0, 1], [0, 1]];
const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const Q = mm(X, WQ), K = mm(X, WK), V = mm(X, WV);
function grid(id, x, y, M, cw, ch, title, rowLab, colLab, cls = 'node', fmt = v => String(v)) {
  let s = `<g data-node="${id}">`;
  const w = M[0].length * cw, h = M.length * ch;
  s += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="6" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
  M.forEach((r, i) => r.forEach((v, j) => { s += cell(x + j * cw + 2, y + i * ch + 2, cw - 4, ch - 4, cls, fmt(v), 'm'); }));
  s += '</g>';
  s += text(x + w / 2, y - 16, title, 's', 'middle');
  if (rowLab) rowLab.forEach((l, i) => { s += text(x - 12, y + i * ch + ch / 2 + 5, l, 's', 'end'); });
  if (colLab) colLab.forEach((l, j) => { s += text(x + j * cw + cw / 2, y + M.length * ch + 22, l, 'xs', 'middle'); });
  return s;
}
let qa = '';
const GY = 170, CW = 52, CH = 44;
qa += grid('X', 110, GY, X, CW, CH, 'X：4 个 token × 4 维', toks, ['事项', '时间', '疑问', '动作'], 'gray');
qa += edge(`M340 ${GY + 88}H400`);
qa += grid('WQ', 430, GY - 20, WQ, CW, 36, 'W_Q', null, null, 'violet');
qa += grid('WK', 580, GY - 20, WK, CW, 36, 'W_K', null, null, 'violet');
qa += grid('WV', 730, GY - 20, WV, CW, 36, 'W_V', null, null, 'violet');
qa += text(640, GY + 150, '三个 4 × 2 的权重矩阵（训练学出来的参数）', 'xs', 'middle');
qa += edge(`M880 ${GY + 88}H930`);
qa += grid('Q', 980, GY, Q, CW, CH, 'Q = X·W_Q', toks, null, 'blue');
qa += grid('K', 1110, GY, K, CW, CH, 'K = X·W_K', null, null, 'amber');
qa += grid('V', 1240, GY, V, CW, CH, 'V = X·W_V', null, null, 'green');
// lower half: row 申请 walk-through
const LY = 430;
qa += text(32, LY, '以“申请”这一行为例：它的 q = [2, 0]，和每个位置的 k 做点积', 'k');
const sc = [2, 4, 0, 0], scs = sc.map(v => v / Math.SQRT2), ex = scs.map(Math.exp), sum = ex.reduce((a, b) => a + b), p = ex.map(v => v / sum);
const cols = [['点积 q·k', sc.map(String)], ['÷ √2', scs.map(f3)], ['e^x', ex.map(f3)], ['权重 = e^x ÷ 23.032', p.map(f3)]];
cols.forEach(([h, vals], c) => {
  const x = 150 + c * 210;
  qa += text(x + 80, LY + 36, h, 's', 'middle');
  vals.forEach((v, i) => { qa += cell(x, LY + 50 + i * 40, 160, 34, c === 3 ? (i === 1 ? 'fblue' : 'fgray') : 'node', v, 'm'); });
  if (c < 3) qa += edge(`M${x + 166} ${LY + 128}H${x + 204}`);
});
toks.forEach((t, i) => { qa += text(130, LY + 72 + i * 40, t, 's', 'end'); });
qa += box('out', 1010, LY + 40, 360, 166, 'green', '输出 = Σ 权重 × v', ['0.179×[1,0] + 0.735×[2,0]', '+ 0.043×[0,1] + 0.043×[0,1]', '= [1.648, 0.087]', '“申请”的新向量主要带上了“假”']);
qa += edge(`M980 ${LY + 128}H1004`);
const qkvExample = svg('attention-qkv-example', 1400, 660, '4 个 token 的注意力手算：从 X 到 Q、K、V，再到“申请”的输出',
  '4 个 token 年、假、怎么、申请各有一个 4 维向量，组成 X；X 分别乘 W_Q、W_K、W_V 得到 4×2 的 Q、K、V。“申请”的 q=[2,0] 与各位置 k 的点积是 2、4、0、0，除以 √2 得 1.414、2.828、0、0，取指数后归一化，权重为 0.179、0.735、0.043、0.043，按权重加权 V 得到输出 [1.648, 0.087]，主要来自“假”。',
  '注意力手算：“申请”回头看了谁', '教学用的小数字：4 个 token、4 维输入、每个头 2 维。真实模型是 4096 维输入、每头 128 维。',
  qa);

// ---- attention-mask-matrix (03) ----------------------------------------------
const Sraw = Q.map(q => K.map(k => q[0] * k[0] + q[1] * k[1]));
const Ss = Sraw.map(r => r.map(v => v / Math.SQRT2));
const P = Ss.map((r, i) => { const e = r.map((v, j) => j <= i ? Math.exp(v) : 0); const s = e.reduce((a, b) => a + b); return e.map(v => v / s); });
function matrix(id, x, y, M, title, sub, kind) {
  const cw = 92, ch = 56;
  let s = text(x + 2 * cw, y - 44, title, 't', 'middle') + text(x + 2 * cw, y - 18, sub, 'xs', 'middle');
  toks.forEach((t, i) => { s += text(x - 12, y + i * ch + 34, t, 's', 'end'); s += text(x + i * cw + cw / 2, y + 4 * ch + 26, t, 's', 'middle'); });
  M.forEach((r, i) => r.forEach((v, j) => {
    const cx = x + j * cw, cy = y + i * ch, masked = j > i;
    if (kind === 'mask') {
      s += `<rect x="${cx + 2}" y="${cy + 2}" width="${cw - 4}" height="${ch - 4}" rx="4" fill="${masked ? '#fda4af' : '#ecfdf5'}" stroke="${masked ? '#e88191' : '#20a28c'}"/>`;
      s += `<text x="${cx + cw / 2}" y="${cy + 34}" text-anchor="middle" class="m">${masked ? '−∞' : '0'}</text>`;
    } else if (kind === 'p') {
      s += `<rect x="${cx + 2}" y="${cy + 2}" width="${cw - 4}" height="${ch - 4}" rx="4" fill="${masked ? '#f1f5f9' : '#2563eb'}" fill-opacity="${masked ? 1 : (0.1 + 0.8 * v).toFixed(2)}" stroke="#cbd5e1"/>`;
      s += `<text x="${cx + cw / 2}" y="${cy + 34}" text-anchor="middle" class="m"${!masked && v > 0.55 ? ' style="fill:#fff"' : ''}>${masked ? '0' : f3(v)}</text>`;
    } else {
      s += `<rect x="${cx + 2}" y="${cy + 2}" width="${cw - 4}" height="${ch - 4}" rx="4" fill="#fff" stroke="#cbd5e1"/>`;
      s += `<text x="${cx + cw / 2}" y="${cy + 34}" text-anchor="middle" class="m">${f3(v)}</text>`;
    }
  }));
  return s;
}
let mk = '';
mk += text(32, 150, '行 = 提问的 token（Q）', 'xs') + text(32, 170, '列 = 被看的 token（K）', 'xs');
mk += matrix('ss', 120, 220, Ss, '① 分数 QKᵀ ÷ √2', '每行是一个 token 对所有位置的打分');
mk += text(518, 340, '+', 'h', 'middle');
mk += matrix('mask', 570, 220, Ss, '② 因果掩码', '右上角（未来位置）加 −∞', 'mask');
mk += text(968, 340, '→', 'h', 'middle');
mk += matrix('p', 1010, 220, P, '③ 按行 softmax 得到权重', '每行加起来等于 1，未来位置为 0', 'p');
mk += box('leak', 120, 540, 600, 104, 'red', '没有掩码会怎样', ['“假”这一行对“怎么”的分数最高（1.414），会拿走 0.578 的权重：', '训练时等于偷看答案，生成时这个位置根本还不存在。']);
mk += box('row', 760, 540, 610, 104, 'blue', '最后一行就是上一张图的手算', ['“申请”能看到全部 4 个位置：0.179、0.735、0.043、0.043', '第一行“年”只能看自己，权重必然是 1。']);
const maskMatrix = svg('attention-mask-matrix', 1400, 670, '注意力分数矩阵、因果掩码与 softmax 权重',
  '左：4×4 的分数矩阵 QKᵀ÷√2；中：因果掩码在对角线右上方加负无穷；右：按行 softmax 后的权重，年一行为 1，假一行为 0.5、0.5，怎么一行为 0.284、0.576、0.140，申请一行为 0.179、0.735、0.043、0.043，右上角全为 0。没有掩码时“假”会把 0.578 的权重放到未来的“怎么”上。',
  '注意力矩阵：每一行只能看自己和左边', '同一组手算数字。颜色越深，权重越大。',
  mk);

// ---- attention-quadratic (03) ------------------------------------------------
const ctx = [[8192, '8K'], [32768, '32K'], [131072, '128K']];
const CX = 140, CY = 520, CHH = 340, maxV = 80;
const yv = v => CY - v * CHH / maxV;
let qd = '';
[0, 20, 40, 60, 80].forEach(v => { qd += edge(`M${CX} ${yv(v)}H${CX + 700}`, 'line') + text(CX - 12, yv(v) + 5, String(v), 'xs', 'end'); });
qd += edge(`M${CX} ${CY}H${CX + 710}`, 'axis') + edge(`M${CX} ${CY}V${CY - CHH - 14}`, 'axis');
qd += text(CX - 12, CY - CHH - 26, 'GFLOPs / token', 'xs', 'start');
ctx.forEach(([n, lab], i) => {
  const x = CX + 60 + i * 220;
  const fixed = 15.0, att = 4 * n * 4096 * 32 / 1e9;
  qd += `<rect x="${x}" y="${yv(fixed)}" width="70" height="${(CY - yv(fixed)).toFixed(1)}" class="fgray"/>`;
  qd += `<rect x="${x + 80}" y="${yv(att).toFixed(1)}" width="70" height="${(CY - yv(att)).toFixed(1)}" class="fred"/>`;
  qd += text(x + 35, yv(fixed) - 8, '15.0', 'xs', 'middle') + text(x + 115, yv(att) - 8, att.toFixed(1), 'xs', 'middle');
  qd += text(x + 75, CY + 26, `上下文 ${lab}`, 's', 'middle');
});
qd += cell(CX, CY + 48, 26, 18, 'fgray') + text(CX + 36, CY + 63, '与权重相乘（固定）', 'xs');
qd += cell(CX + 230, CY + 48, 26, 18, 'fred') + text(CX + 266, CY + 63, '注意力 QKᵀ 与加权 V（随长度增长）', 'xs');
qd += box('mem', 920, 150, 450, 200, 'red', '如果把分数矩阵整张存下来', ['每层 32 个头，每个 n × n，BF16', '8K：4 GiB / 层', '32K：64 GiB / 层', '128K：1024 GiB / 层', '长度翻 4 倍，这张表涨 16 倍']);
qd += box('fa', 920, 380, 450, 140, 'green', '实际推理怎样避开', ['FlashAttention 分块计算，不写出整张表', '计算量不变，显存不再随 n² 增长', '见第 11 篇和推理系列第 12 篇']);
const quad = svg('attention-quadratic', 1400, 610, '注意力计算量与分数矩阵随上下文长度增长',
  'Llama-3.1-8B 处理第 n 个 token 时，和权重相乘的部分固定约 15 GFLOPs；注意力部分约 4×n×4096×32 FLOPs，8K 时 4.3、32K 时 17.2、128K 时 68.7 GFLOPs，超过固定部分。如果把每层 32 个头的 n×n 分数矩阵按 BF16 存下来，8K 要 4 GiB，32K 要 64 GiB，128K 要 1024 GiB。',
  '长度的代价：每个 token 的注意力计算随长度线性涨，整段随长度平方涨', 'Llama-3.1-8B，单个 token 在第 n 个位置时的前向计算量（估算）；右侧为分数矩阵的理论大小。',
  qd);

write({
  'overview-dataflow': overviewFlow,
  'overview-param-share': paramShare,
  'overview-autoregressive': autoreg,
  'tokenizer-split': tokSplit,
  'tokenizer-embedding': tokEmb,
  'attention-qkv-example': qkvExample,
  'attention-mask-matrix': maskMatrix,
  'attention-quadratic': quad,
});
