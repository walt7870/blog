// Figures for docs/ai/llm-architecture/09-position.md, 10-output-decoding.md, 02-transformer-family.md (group "posdec").
// Run: node .maintenance/llm-architecture/diagrams-posdec.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

const f2 = v => v.toFixed(2);
const deg = r => r * Math.PI / 180;

// ---- position-rope-rotate (09) ---------------------------------------------
// q = (1,0) for “申请”, k = (0,1) for “年假”, θ = 0.5 rad per position.
function rotPanel(id, x0, title, kicker, m, n, note) {
  const cx = x0 + 190, cy = 350, R = 130, th = 0.5;
  const aq = m * th, ak = Math.PI / 2 + n * th;
  const pt = a => [cx + R * Math.cos(a), cy - R * Math.sin(a)];
  const [qx, qy] = pt(aq), [kx, ky] = pt(ak);
  let s = box(id, x0, 112, 380, 440, 'node', '', [], kicker);
  s += text(x0 + 18, 166, title, 't');
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" class="line"/>`;
  s += `<line x1="${cx - R - 14}" y1="${cy}" x2="${cx + R + 14}" y2="${cy}" class="line"/><line x1="${cx}" y1="${cy - R - 14}" x2="${cx}" y2="${cy + R + 14}" class="line"/>`;
  // arc showing the angle between q and k
  const r2 = 56, [ax1, ay1] = [cx + r2 * Math.cos(aq), cy - r2 * Math.sin(aq)], [ax2, ay2] = [cx + r2 * Math.cos(ak), cy - r2 * Math.sin(ak)];
  s += `<path d="M${ax1.toFixed(1)} ${ay1.toFixed(1)}A${r2} ${r2} 0 0 0 ${ax2.toFixed(1)} ${ay2.toFixed(1)}" fill="none" stroke="#e0a63a" stroke-width="3"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${qx.toFixed(1)}" y2="${qy.toFixed(1)}" stroke="#2563eb" stroke-width="4"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}" stroke="#0f9f86" stroke-width="4"/>`;
  s += `<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="6" fill="#2563eb"/><circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="6" fill="#0f9f86"/>`;
  const lq = pt(aq), lk = pt(ak);
  s += text(lq[0] + 10, lq[1] - 6, `q（位置 ${m}）`, 's');
  s += Math.cos(ak) < -0.8 ? text(lk[0] + 4, lk[1] + 30, `k（位置 ${n}）`, 's') : text(lk[0] - 10, lk[1] - 10, `k（位置 ${n}）`, 's', 'end');
  s += text(x0 + 18, 520, note, 's');
  s += text(x0 + 18, 542, `夹角 = (π/2 + ${n}×0.5) − ${m}×0.5 = π/2 − 1，点积 0.8415`, 'xs');
  return s;
}
const ropeRotate = svg('position-rope-rotate', 1240, 600, '二维 RoPE：旋转后的点积只取决于两个位置的差',
  '“申请”的查询向量 q=(1,0)、“年假”的键向量 k=(0,1)，每个位置转 0.5 弧度。q 在位置 3、k 在位置 1 时夹角为 π/2−1，点积 0.8415；整体后移到位置 5 和 3，两个向量一起多转了 1 弧度，夹角不变，点积仍是 0.8415。右侧表格列出不同位置对的点积，只有位置差相同的行结果相同。',
  '把 q 和 k 按位置转一个角度，打分只剩“相隔多远”', 'q=(1,0) 代表“申请”，k=(0,1) 代表“年假”；每个位置转 θ=0.5 弧度。蓝色为 q，绿色为 k，橙色弧是两者夹角。',
  [
    rotPanel('pa', 32, '“申请”在 3，“年假”在 1', '情形 A', 3, 1, 'q 转 1.5 弧度，k 转 0.5 弧度'),
    rotPanel('pb', 436, '两个词整体后移 2 个位置', '情形 B', 5, 3, 'q 转 2.5 弧度，k 转 1.5 弧度'),
    box('tbl', 840, 112, 368, 440, 'blue', '旋转后的点积', [], '脚本验证'),
    ...['q 位置', 'k 位置', '位置差', '点积'].map((h, j) => text([858, 938, 1018, 1182][j], 202, h, 's', j === 3 ? 'end' : 'start')),
    `<line x1="858" y1="214" x2="1190" y2="214" class="line"/>`,
    ...[[3, 1, 2, '0.8415'], [5, 3, 2, '0.8415'], [12, 10, 2, '0.8415'], [3, 3, 0, '0.0000'], [1, 3, -2, '−0.8415']].map(([m, n, d, v], i) =>
      [m, n, d, v].map((c, j) => text([858, 938, 1018, 1182][j], 246 + i * 34, String(c).replace('-', '−'), 'm', j === 3 ? 'end' : 'start')).join('')),
    text(858, 438, '不旋转时点积恒为 0（两个向量垂直）。', 's'),
    text(858, 464, '128 维、theta 500000 的随机向量：', 's'),
    text(858, 488, '(10,7)、(1003,1000)、(100003,100000)', 's'),
    text(858, 512, '点积都是 4.422094；(7,10) 为 −6.585。', 's'),
  ].join('\n'));

// ---- position-rope-wavelength (09) -----------------------------------------
const d = 128, base = 500000;
const inv = Array.from({ length: d / 2 }, (_, i) => 1 / base ** (2 * i / d));
const wl = inv.map(f => 2 * Math.PI / f);
const scaled = inv.map((f, i) => {
  const w = wl[i];
  if (w < 2048) return f;
  if (w > 8192) return f / 8;
  const sm = (8192 / w - 1) / 3;
  return (1 - sm) * f / 8 + sm * f;
});
const wl2 = scaled.map(f => 2 * Math.PI / f);
const PX = 120, PW = 1040, PY = 140, PH = 380; // plot area
const lx = i => PX + 10 + i * (PW - 20) / 63;
const ly = w => PY + PH - (Math.log10(w) - 0) / 8 * PH; // 10^0 .. 10^8
let wave = `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="#fff" stroke="#cbd5e1"/>`;
// zones by pair index
const zHighEnd = wl.findIndex(w => w >= 2048), zLowStart = wl.findIndex(w => w > 8192);
wave += `<rect x="${PX}" y="${PY}" width="${(lx(zHighEnd) - 6 - PX).toFixed(1)}" height="${PH}" fill="#eff6ff"/>`;
wave += `<rect x="${(lx(zHighEnd) - 6).toFixed(1)}" y="${PY}" width="${(lx(zLowStart) - lx(zHighEnd)).toFixed(1)}" height="${PH}" fill="#fffbeb"/>`;
wave += `<rect x="${(lx(zLowStart) - 6).toFixed(1)}" y="${PY}" width="${(PX + PW - lx(zLowStart) + 6).toFixed(1)}" height="${PH}" fill="#ecfdf5"/>`;
for (let e = 0; e <= 8; e++) {
  const y = ly(10 ** e);
  wave += `<line x1="${PX}" y1="${y}" x2="${PX + PW}" y2="${y}" stroke="#e2e8f0"/>`;
  wave += text(PX - 10, y + 5, e === 0 ? '1' : `10${'⁰¹²³⁴⁵⁶⁷⁸'[e]}`, 'xs', 'end');
}
for (const [w, name] of [[8192, '原始训练长度 8192'], [131072, '扩展后 131072']]) {
  const y = ly(w);
  wave += `<line x1="${PX}" y1="${y}" x2="${PX + PW}" y2="${y}" stroke="#e88191" stroke-width="2" stroke-dasharray="6 5"/>`;
  wave += label(PX + 16, y - 8, name, name.length * 14 + 20);
}
wl.forEach((w, i) => { wave += `<circle cx="${lx(i).toFixed(1)}" cy="${ly(w).toFixed(1)}" r="4.5" fill="#60a5fa"/>`; });
wl2.forEach((w, i) => { if (Math.abs(w - wl[i]) > 1e-6) wave += `<circle cx="${lx(i).toFixed(1)}" cy="${ly(w).toFixed(1)}" r="4.5" fill="none" stroke="#0f9f86" stroke-width="2"/>`; });
for (const i of [0, 16, 32, 48, 63]) wave += text(lx(i), PY + PH + 22, String(i), 'xs', 'middle');
wave += text(PX + PW / 2, PY + PH + 46, '频率对编号 i（0–63，越往右转得越慢）', 's', 'middle');
wave += `<text x="40" y="${PY + PH / 2}" class="s" transform="rotate(-90 40 ${PY + PH / 2})" text-anchor="middle">波长（转一圈要多少个位置，对数刻度）</text>`;
wave += text(PX + 16, PY + 26, `高频 ${zHighEnd} 对：波长 < 2048，不改`, 's');
wave += text(lx(zHighEnd) - 2, PY + 50, `中间 ${zLowStart - zHighEnd} 对`, 's');
wave += text(lx(zHighEnd) - 2, PY + 72, '平滑过渡', 's');
wave += text(lx(zLowStart) + 4, PY + 26, `低频 ${64 - zLowStart} 对：波长 > 8192，频率 ÷ 8`, 's');
wave += `<circle cx="${PX + 650}" cy="${PY + PH - 56}" r="5" fill="#60a5fa"/>` + text(PX + 664, PY + PH - 51, '原始频率（rope_theta 500000）', 's');
wave += `<circle cx="${PX + 650}" cy="${PY + PH - 28}" r="5" fill="none" stroke="#0f9f86" stroke-width="2"/>` + text(PX + 664, PY + PH - 23, 'llama3 缩放后（factor 8）', 's');
const ropeWave = svg('position-rope-wavelength', 1240, 620, 'Llama-3.1-8B 的 64 个 RoPE 频率对的波长与 llama3 分频缩放',
  'head_dim 128 分成 64 个频率对，rope_theta 500000 时波长从约 6.3 个位置增长到约 256 万个位置，在对数刻度上是一条直线。llama3 缩放把原始训练长度 8192 作为分界：波长小于 2048 的 29 个高频对不变，波长大于 8192 的 29 个低频对频率除以 8，中间 6 对在两者之间平滑过渡。',
  '64 个频率对：快的数“隔几个字”，慢的数“隔几千字”', 'Llama-3.1-8B，head_dim 128，rope_theta 500000。llama3 缩放只拉长慢的那部分频率，快的保持原样。',
  wave);

// ---- position-llama4-layers (09) --------------------------------------------
let l4 = '';
const L0 = 32, LW = 22, LG = 2;
for (let i = 0; i < 48; i++) {
  const nope = (i + 1) % 4 === 0;
  l4 += cell(L0 + i * (LW + LG), 150, LW, 56, nope ? 'famber' : 'fblue', '');
}
l4 += text(L0, 232, '第 0 层', 'xs') + text(L0 + 47 * (LW + LG) + LW, 232, '第 47 层', 'xs', 'end');
l4 += cell(32, 254, 22, 22, 'fblue') + text(62, 271, 'RoPE + 分块注意力：只看同一个 8192 块内的前文（36 层）', 's');
l4 += cell(640, 254, 22, 22, 'famber') + text(670, 271, 'NoPE + 全局注意力：不加位置，看全部前文（12 层）', 's');
function maskGrid(x0, y0, n, chunk, title) {
  let s = text(x0, y0 - 14, title, 't');
  const c = 19;
  for (let qi = 0; qi < n; qi++) for (let ki = 0; ki < n; ki++) {
    const ok = ki <= qi && (chunk ? Math.floor(ki / chunk) === Math.floor(qi / chunk) : true);
    s += `<rect x="${x0 + ki * c}" y="${y0 + qi * c}" width="${c - 2}" height="${c - 2}" rx="2" class="${ok ? (chunk ? 'fblue' : 'famber') : 'fgray'}"/>`;
  }
  return s;
}
l4 += box('m1', 32, 310, 560, 226, 'node', '', []);
l4 += maskGrid(56, 360, 8, 4, '分块因果掩码（示意：块长 4）');
l4 += text(232, 392, '第 5 个 token 看不到第 1–4 个：', 's') + text(232, 416, '跨块的信息只能交给 NoPE 层传递。', 's');
l4 += text(232, 452, '实际块长 8192，块内仍有 RoPE，', 's') + text(232, 476, '相对位置不会超出训练见过的范围。', 's');
l4 += box('m2', 616, 310, 592, 226, 'node', '', []);
l4 += maskGrid(640, 360, 8, 0, '普通因果掩码（NoPE 层）');
l4 += text(816, 392, '没有位置编码，也就没有“没见过的', 's') + text(816, 416, '位置”；顺序靠因果掩码间接体现。', 's');
l4 += text(816, 452, '查询向量按位置乘温度系数：位置', 's') + text(816, 476, '8191 起 1.069，约 100 万处 1.486。', 's');
const llama4Layers = svg('position-llama4-layers', 1240, 560, 'Llama 4 的 iRoPE：每 4 层中 3 层用 RoPE 加分块注意力，1 层不用位置编码看全局',
  'Llama 4 Scout 的 48 层里，第 3、7、11 … 47 层（每第 4 层）是 NoPE 层，不加旋转位置编码，做全局因果注意力，并按位置对查询向量做温度缩放；其余 36 层用 RoPE，注意力限制在 8192 个 token 的块内。下方用 8 个 token、块长 4 示意两种掩码。',
  'Llama 4：3 层 RoPE 管“附近”，1 层 NoPE 管“全局”', 'Llama 4 Scout config.json：no_rope_layers 每第 4 项为 0，attention_chunk_size 8192；Maverick 的层模式相同。',
  l4);

// ---- output-lm-head (10) ----------------------------------------------------
const lmHead = svg('output-lm-head', 1320, 600, '从最后一层隐藏向量到一个 token 的流程',
  '第 32 层输出的最后一个位置向量 [1, 4096] 经过最终 RMSNorm，乘以输出层矩阵 4096×128256 得到 128256 个分数，这一段由模型结构和权重决定。之后的重复惩罚、温度、top-k、top-p、min-p、softmax 和抽样由解码参数决定，选出 token 110747“根据”，追加到输入末尾进入下一步。',
  '最后一步：4096 维向量 → 128256 个分数 → 一个 token', '左边由架构和权重决定，同一输入每次结果相同；右边由解码参数决定，改参数不用改模型。',
  [
    `<rect x="24" y="100" width="604" height="420" rx="10" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6 5"/>`,
    text(40, 126, '架构决定（forward 的最后几行）', 'k'),
    `<rect x="652" y="100" width="644" height="420" rx="10" fill="none" stroke="#e0a63a" stroke-width="2" stroke-dasharray="6 5"/>`,
    text(668, 126, '解码策略决定（generation_config / 请求参数）', 'k'),
    box('h', 44, 146, 172, 150, 'node', '第 32 层输出', ['只取最后位置', '[1, 4096]']),
    box('norm', 236, 146, 170, 150, 'violet', '最终 RMSNorm', ['形状不变', '[1, 4096]']),
    box('head', 426, 146, 182, 150, 'blue', 'lm_head', ['4096 × 128256', '5.25 亿参数', '无 bias']),
    box('logits', 240, 340, 368, 150, 'blue', 'logits [1, 128256]', ['每个 token 一个分数', '根据 5.0  您 4.0  申请 3.0 …', 'FP32 时约 501 KiB']),
    edge('M216 221H236'), edge('M406 221H426'), edge('M517 296V340'),
    box('proc', 672, 146, 300, 150, 'amber', '改分数', ['重复惩罚、禁用词', '温度：分数 ÷ T', '结构化输出掩码']),
    box('filt', 996, 146, 280, 150, 'amber', '砍候选', ['top-k：留前 k 个', 'top-p：累计到 p', 'min-p：≥ 最高 × p']),
    box('samp', 996, 340, 280, 150, 'green', 'softmax + 抽样', ['剩下的重新归一', '按概率抽一个', '温度 0 时直接取最大']),
    box('tok', 672, 340, 300, 150, 'green', '输出 token 110747', ['“根据”', '是停止 token 就结束', '否则追加进下一步']),
    edge('M608 415H640Q652 415 652 403V233Q652 221 664 221H672'),
    edge('M972 221H996'), edge('M1136 296V340'), edge('M996 415H972'),
    edge('M822 490V560H130V296', 'dash'),
    label(300, 566, '追加到输入末尾，下一步只为这 1 个新 token 跑一遍 32 层', 470),
  ].join('\n'));

// ---- output-temperature (10) ------------------------------------------------
const toks = ['根据', '您', '申请', '首先', '请', '好'];
const lg = [5.0, 4.0, 3.0, 2.5, 1.5, 0.0];
const soft = (x, T) => { const e = x.map(v => Math.exp(v / T)); const s = e.reduce((a, b) => a + b); return e.map(v => v / s); };
const temps = [[0.5, 'fblue', 'T = 0.5'], [1.0, 'fgreen', 'T = 1'], [1.5, 'famber', 'T = 1.5']];
let tb = '';
const BX = 120, BY = 140, BH = 340, groupW = 180;
tb += `<line x1="${BX}" y1="${BY + BH}" x2="${BX + groupW * 6 + 20}" y2="${BY + BH}" class="axis"/>`;
for (const g of [0, 0.25, 0.5, 0.75, 1]) {
  const y = BY + BH - g * BH;
  tb += `<line x1="${BX}" y1="${y}" x2="${BX + groupW * 6 + 20}" y2="${y}" stroke="#e2e8f0"/>` + text(BX - 10, y + 5, g.toFixed(2), 'xs', 'end');
}
toks.forEach((t, j) => {
  const gx = BX + 20 + j * groupW;
  temps.forEach(([T, cls], k) => {
    const p = soft(lg, T)[j], h = p * BH;
    tb += `<rect x="${gx + k * 46}" y="${(BY + BH - h).toFixed(1)}" width="40" height="${Math.max(h, 1).toFixed(1)}" class="${cls}"/>`;
    tb += text(gx + k * 46 + 20, BY + BH - h - 8, p < 0.0005 ? '0' : p.toFixed(3).replace(/^0/, ''), 'xs', 'middle');
  });
  tb += text(gx + 66, BY + BH + 26, `${t}（${lg[j].toFixed(1)}）`, 's', 'middle');
});
temps.forEach(([T, cls, name], k) => { tb += cell(860 + k * 120, 128, 20, 20, cls) + text(888 + k * 120, 144, name, 's'); });
const outTemp = svg('output-temperature', 1240, 540, '同一组 logits 在三种温度下的概率',
  '6 个候选 token 的分数为 根据 5.0、您 4.0、申请 3.0、首先 2.5、请 1.5、好 0.0。温度 0.5 时“根据”的概率 0.861，温度 1 时 0.616，温度 1.5 时 0.477；温度越高，排在后面的候选分到的概率越多，但排序不变。',
  '温度只改差距，不改排序', '教学用的 6 个候选（假设词表只有这 6 个）；括号里是 logit。柱上数字是 softmax(logit ÷ T) 后的概率。',
  tb);

// ---- output-filters (10) ----------------------------------------------------
function keepRow(y0, name, sub, probs, barW, gap, ks) {
  let s = text(32, y0 + 24, name, 't') + text(32, y0 + 50, sub, 'xs');
  const x0 = 300, H = 90, mx = Math.max(...probs);
  probs.forEach((p, i) => {
    const h = Math.max(2, p / mx * H);
    s += `<rect x="${x0 + i * (barW + gap)}" y="${(y0 + H - h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" class="fgray"/>`;
  });
  ks.forEach(([cnt, cls], r) => {
    probs.forEach((p, i) => { s += `<rect x="${x0 + i * (barW + gap)}" y="${y0 + H + 8 + r * 16}" width="${barW}" height="12" class="${i < cnt ? cls : 'fgray'}" opacity="${i < cnt ? 1 : 0.35}"/>`; });
  });
  const tx = 1000;
  ks.forEach(([cnt, cls, lab], r) => { s += cell(tx, y0 + 14 + r * 34, 18, 18, cls) + text(tx + 28, y0 + 29 + r * 34, `${lab}：留 ${cnt} 个`, 's'); });
  return s;
}
const pMain = soft(lg, 1);
const pFlat = soft([2.0, 1.9, 1.8, 1.8, 1.7, 1.6], 1);
const pTail = [0.5, ...Array(50).fill(0.01)];
const K = (a, b, c) => [[a, 'fblue', 'top-k = 3'], [b, 'fgreen', 'top-p = 0.9'], [c, 'famber', 'min-p = 0.1']];
const outFilters = svg('output-filters', 1300, 680, 'top-k、top-p、min-p 在三种分布上各留下多少候选',
  '第一行是资料助手的教学分布，三种方法都留下前 3 个候选。第二行是 6 个候选几乎一样好的平坦分布，top-k 3 砍掉了一半合理候选，top-p 0.9 和 min-p 0.1 都保留 6 个。第三行是一个 0.5 的主候选加 50 个各 0.01 的长尾，top-p 0.9 要留下 41 个才累计到 0.9，min-p 0.1 的阈值是 0.05，只留 1 个。',
  '三种截断：按个数、按累计概率、按相对最高概率', '灰色柱是概率；柱下三条色带依次表示 top-k、top-p、min-p 各自保留的候选（彩色为保留）。',
  [
    keepRow(120, '资料助手这一步', '根据 .616 您 .227 申请 .083 …', pMain, 40, 10, K(3, 3, 3)),
    `<line x1="32" y1="290" x2="1268" y2="290" class="line"/>`,
    keepRow(312, '平坦分布', '6 个候选 .202 … .135', pFlat, 40, 10, K(3, 6, 6)),
    `<line x1="32" y1="482" x2="1268" y2="482" class="line"/>`,
    keepRow(504, '长尾分布', '1 个 0.5 + 50 个 0.01', pTail, 9, 4, K(3, 41, 1)),
  ].join('\n'));

// ---- family-structures (04) -------------------------------------------------
function grid(x0, y0, n, fn, cls, c = 22) {
  let s = '';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += `<rect x="${x0 + j * c}" y="${y0 + i * c}" width="${c - 3}" height="${c - 3}" rx="3" class="${fn(i, j) ? cls : 'fgray'}"/>`;
  return s;
}
function rect(x0, y0, rows, cols, cls, c = 22) {
  let s = '';
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) s += `<rect x="${x0 + j * c}" y="${y0 + i * c}" width="${c - 3}" height="${c - 3}" rx="3" class="${cls}"/>`;
  return s;
}
const famStruct = svg('family-structures', 1320, 680, '编码器、编码器-解码器、解码器三种 Transformer 结构的注意力可见范围与适用任务',
  '编码器（BERT）每个位置能看见整句前后所有位置，训练目标是填回被遮住的词，适合分类、检索向量。编码器-解码器（原始 Transformer、T5）先用双向注意力读完输入，解码器用因果注意力逐个生成，并通过交叉注意力查看输入，适合翻译、摘要。解码器（GPT、Llama）只有因果注意力，每个位置只看左边，训练目标是预测下一个 token，输入和输出在同一条序列里。',
  '三种结构的差别，主要在“谁能看见谁”', '方格表示注意力能否看见：行是当前位置，列是被看的位置，彩色为可见。',
  [
    box('enc', 32, 104, 400, 552, 'node', '编码器（encoder-only）', ['BERT（2018）'], '双向'),
    grid(130, 220, 6, () => true, 'fblue'),
    text(52, 394, '训练：遮住 15% 的词再填回', 's'),
    text(52, 420, '输出：每个位置一个向量', 's'),
    text(52, 446, '不能直接逐字生成', 's'),
    box('enc-use', 52, 480, 360, 156, 'blue', '适合', ['文本分类、命名实体识别', '检索向量、重排序', '输入整段已知、只需“读懂”']),
    box('ed', 460, 104, 400, 552, 'node', '编码器-解码器', ['原始 Transformer（2017）、T5（2019）'], '双向读 + 因果写'),
    text(480, 214, '编码器', 'xs'), grid(480, 222, 4, () => true, 'fblue', 20),
    text(640, 214, '交叉注意力', 'xs'), rect(640, 222, 4, 4, 'fviolet', 20),
    text(760, 214, '解码器', 'xs'), grid(760, 222, 4, (i, j) => j <= i, 'fgreen', 20),
    text(480, 330, '输入 4 个 token', 'xs'), text(640, 330, '输出看全部输入', 'xs'), text(760, 330, '输出只看左边', 'xs'),
    text(480, 394, '训练：给输入，生成目标（T5 填空段）', 's'),
    text(480, 420, '输入和输出是两条序列', 's'),
    text(480, 446, '输入只编码一次，解码时反复查看', 's'),
    box('ed-use', 480, 480, 360, 156, 'violet', '适合', ['翻译、摘要、改写', '语音识别（Whisper）', '输入长、输出短且边界清楚']),
    box('dec', 888, 104, 400, 552, 'node', '解码器（decoder-only）', ['GPT（2018—2020）、Llama、Qwen'], '因果'),
    grid(986, 220, 6, (i, j) => j <= i, 'fgreen'),
    text(908, 394, '训练：每个位置预测下一个 token', 's'),
    text(908, 420, '提示和回答拼成一条序列', 's'),
    text(908, 446, '每个位置都贡献一份损失', 's'),
    box('dec-use', 908, 480, 360, 156, 'green', '适合', ['对话、续写、代码', '用提示描述任意任务', '少样本示例直接放进上下文']),
  ].join('\n'));

// ---- family-multiturn (04) --------------------------------------------------
function seq(x0, y0, n, clsFn, c = 30) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<rect x="${x0 + i * (c + 4)}" y="${y0}" width="${c}" height="${c}" rx="4" class="${clsFn(i)}"/>`;
  return s;
}
const famTurn = svg('family-multiturn', 1240, 560, '多轮对话中解码器与编码器-解码器的缓存复用差异',
  '解码器只有因果注意力，第一轮已有 token 的表示不受后来 token 影响，第二轮只需计算新增的 token，前面的 KV Cache 可以直接复用。编码器是双向的，新问题加入输入后，所有旧 token 的编码表示都会改变，整段历史要重新编码；解码器侧的交叉注意力 K、V 也要重算。',
  '第二轮提问时，哪些计算能复用', '第一轮：system + “年假怎么申请？” + 回答；第二轮追加“要提前几天？”。灰色为复用，彩色为本轮要重新计算。',
  [
    box('d', 32, 110, 1176, 190, 'node', '解码器（因果注意力）', [], 'Llama、Qwen'),
    text(52, 196, '第一轮 + 回答', 'xs'), seq(52, 206, 16, () => 'fgray'),
    text(52 + 16 * 34 + 8, 196, '第二轮新增', 'xs'), seq(52 + 16 * 34 + 8, 206, 6, () => 'fgreen'),
    text(52, 274, '每个位置只看左边，旧 token 的 K、V 不会因为后面来了新问题而改变：只为 6 个新 token 计算。', 's'),
    box('e', 32, 324, 1176, 210, 'node', '编码器-解码器（双向编码）', [], 'T5 式'),
    text(52, 410, '编码器输入：历史 + 新问题', 'xs'), seq(52, 420, 22, () => 'fblue'),
    text(52, 488, '双向注意力里，旧 token 也要看新问题：22 个位置的编码全部重算，交叉注意力用的 K、V 跟着重算。', 's'),
    text(52, 514, '把“历史”和“新问题”拆开编码可以省算力，但新问题就看不到上下文，或要改模型结构。', 's'),
  ].join('\n'));

write({
  'position-rope-rotate': ropeRotate,
  'position-rope-wavelength': ropeWave,
  'position-llama4-layers': llama4Layers,
  'output-lm-head': lmHead,
  'output-temperature': outTemp,
  'output-filters': outFilters,
  'family-structures': famStruct,
  'family-multiturn': famTurn,
});
