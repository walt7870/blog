// Figures for 04-compute-scaling, 05-training-curves and 08-distributed in docs/ai/model-training/.
// Run: node .maintenance/model-training/diagrams-scale.mjs
import { svg, box, cell, edge, text, esc, write } from './svg-kit.mjs';

const poly = (pts, color, w = 2.5, dash = '') =>
  `<polyline points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const line = (x1, y1, x2, y2, color = '#94a3b8', w = 1.5, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const rect = (x, y, w, h, fill, stroke = 'none', extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${stroke}"${extra}/>`;
const C = { blue: '#2563eb', green: '#0f9f86', red: '#e11d48', amber: '#d97706', violet: '#7c3aed', gray: '#94a3b8', ink: '#172b3a' };

// Deterministic noise so the illustrative curves are stable between runs.
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 - 0.5; };

// ============================ 04 compute =====================================

function computeLedger() {
  const W = 1340, H = 600, y = 112, h = 176, w = 244, gap = 18, x0 = 24;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const steps = [
    ['1 前向', '2 FLOPs', ['每个参数对每个 token：', '权重 × 激活 1 次乘法，', '再累加 1 次加法'], 'blue'],
    ['2 反向', '约 4 FLOPs', ['对激活求梯度约 2 次，', '对权重求梯度约 2 次，', '合计约为前向的 2 倍'], 'violet'],
    ['3 乘以规模', '6 × N × D', ['N = 80.3 亿参数', 'D = 15 万亿 token', '≈ 7.2×10²³ FLOPs'], 'green'],
    ['4 每卡有效算力', '约 396 TFLOPS', ['H100 BF16 稠密峰值', '989 TFLOPS × MFU 40%', '≈ 3.96×10¹⁴ 次/秒'], 'amber'],
    ['5 卡时', '约 50.7 万 GPU 小时', ['7.2×10²³ ÷ 3.96×10¹⁴', '≈ 1.83×10⁹ 卡·秒', '这是理想情况的下限'], 'node'],
  ];
  let b = '';
  steps.forEach(([k, t, lines, cls], i) => {
    b += box(`s${i}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 4) b += edge(`M${xs[i] + w + 2} ${y + h / 2}H${xs[i + 1] - 4}`);
  });
  // Ratio bars: each row is normalised to its own model-card figure.
  const by = 360, bx = 250, bw = 820;
  b += text(32, by - 24, '手算与模型卡对照：每行以该模型的模型卡 GPU 小时为满格，蓝色是 6ND 手算结果', 's');
  const rows = [
    ['Llama 3.1 8B', 0.507, 1.46, '手算 50.7 万（MFU 40%） / 模型卡 146 万：约 35%，倒推等效 MFU 约 14%'],
    ['Llama 3.1 405B', 26.0, 30.84, '手算 2600 万（MFU 41%） / 模型卡 3084 万：约 84%，倒推等效 MFU 约 35%'],
  ];
  rows.forEach(([name, hand, card, note], i) => {
    const ry = by + i * 104;
    b += text(32, ry + 26, name, 't');
    b += rect(bx, ry, bw, 38, '#e2e8f0');
    b += rect(bx, ry, bw * hand / card, 38, '#93c5fd');
    b += text(bx + bw + 14, ry + 25, '模型卡 = 100%', 'xs');
    b += text(bx, ry + 66, note, 'xs');
  });
  b += text(32, H - 24, '差距的具体构成模型卡没有拆分；能确定的只是：6ND 只数了理想矩阵乘，真实卡时只会比它多。', 'xs');
  return svg('compute-ledger', W, H, '从 6ND 到 GPU 小时的手算账本',
    '每个参数每个 token 前向 2 次运算、反向约 4 次，合计 6ND；Llama 3.1 8B 约 7.2×10²³ FLOPs，按 H100 BF16 稠密 989 TFLOPS、MFU 40% 折算约 50.7 万 GPU 小时，只有模型卡 146 万的约 35%；405B 的手算约为模型卡的 84%。',
    '训练算力账：从每个参数 6 次运算到 GPU 小时', '以 Llama 3.1 8B 预训练为例，五步把模型大小和数据量换算成卡时', b);
}

function computeTokensPerParam() {
  const W = 1300, H = 540, ax0 = 330, ax1 = 1090, top = 130, rowH = 54;
  const lo = Math.log10(0.5), hi = Math.log10(3000);
  const X = v => ax0 + (Math.log10(v) - lo) / (hi - lo) * (ax1 - ax0);
  const rows = [
    ['Gopher 280B（2021）', 300 / 280, '300B token', C.gray],
    ['GPT-3 175B（2020）', 300 / 175, '300B token', C.gray],
    ['Chinchilla 70B（2022）', 1400 / 70, '1.4T token', C.green],
    ['Llama 3 405B（2024）', 15600 / 405, '15.6T token', C.blue],
    ['Llama 3 70B（2024）', 15000 / 70.6, '约 15T token', C.blue],
    ['Llama 3 8B（2024）', 15000 / 8.03, '约 15T token', C.blue],
  ];
  const bottom = top + rows.length * rowH;
  let b = '';
  for (const v of [1, 10, 100, 1000]) {
    b += line(X(v), top - 10, X(v), bottom, '#cbd5e1');
    b += text(X(v), bottom + 24, `${v}`, 'xs', 'middle');
  }
  b += text((ax0 + ax1) / 2, bottom + 50, '每个参数训练了多少个 token（对数刻度，每格 10 倍）', 'xs', 'middle');
  b += line(X(20), top - 24, X(20), bottom, C.green, 2, '6 5');
  b += text(X(20) + 8, top - 20, 'Chinchilla 算力最优 ≈ 20', 'xs');
  rows.forEach(([name, v, tok, color], i) => {
    const y = top + i * rowH + rowH / 2;
    b += text(32, y + 5, name, 's');
    b += line(ax0, y, X(v), y, color, 6);
    b += dot(X(v), y, 7, color);
    b += text(X(v) + 14, y + 5, `${v >= 10 ? Math.round(v) : v.toFixed(1)}（${tok}）`, 'xs');
  });
  return svg('compute-tokens-per-param', W, H, '不同模型每个参数训练的 token 数',
    '对数刻度：Gopher 和 GPT-3 每参数约 1 到 2 个 token，Chinchilla 约 20 个，Llama 3 405B 约 39 个，70B 约 212 个，8B 约 1868 个，比 Chinchilla 算力最优点多近百倍。',
    '每个参数“读”了多少 token', '2020 年的大模型训练不足；Chinchilla 把比例拉到约 20；Llama 3 的小模型远超这个点，用更多训练换更便宜的推理', b);
}

// ============================ 05 curves ======================================

// Map data coordinates into a plot rectangle.
function plotFrame(x, y, w, h, xmax, ymin, ymax) {
  const P = (sx, sy) => [x + sx / xmax * w, y + h - (sy - ymin) / (ymax - ymin) * h];
  const axes = `<path d="M${x} ${y}V${y + h}H${x + w}" class="axis"/>`;
  return { P, axes };
}

function curvesSftNormal() {
  const W = 1320, H = 620;
  const px = 96, py = 130, pw = 700, ph = 380, steps = 300;
  const { P, axes } = plotFrame(px, py, pw, ph, steps, 0.3, 2.2);
  seed = 11;
  const train = [];
  for (let s = 0; s <= steps; s += 2) {
    const ep = Math.min(2, Math.floor(s / 100)), t = s - ep * 100;
    let v;
    if (ep === 0) v = 1.05 + 0.95 * Math.exp(-s / 14) - 0.08 * t / 100;
    else if (ep === 1) v = 0.80 - 0.06 * t / 100 + 0.05 * Math.exp(-t / 4);
    else v = 0.56 - 0.05 * t / 100 + 0.05 * Math.exp(-t / 4);
    train.push(P(s, v + rnd() * 0.08));
  }
  const valPts = [[0, 2.0], [20, 1.32], [40, 1.14], [60, 1.08], [80, 1.05], [100, 1.03], [120, 1.0], [140, 0.985], [160, 0.975], [180, 0.97], [200, 0.968], [220, 0.99], [240, 1.02], [260, 1.05], [280, 1.08], [300, 1.11]];
  let b = axes;
  for (const e of [100, 200]) { const [ex] = P(e, 0); b += line(ex, py, ex, py + ph, '#cbd5e1', 1.5, '6 5'); }
  [['第 1 轮', 50], ['第 2 轮', 150], ['第 3 轮', 250]].forEach(([s, e]) => { const [ex] = P(e, 0); b += text(ex, py - 12, s, 'xs', 'middle'); });
  for (const v of [0.5, 1.0, 1.5, 2.0]) { const [, yy] = P(0, v); b += line(px - 6, yy, px, yy, '#64748b'); b += text(px - 12, yy + 5, v.toFixed(1), 'xs', 'end'); }
  b += poly(train, C.blue, 2);
  b += poly(valPts.map(([s, v]) => P(s, v)), C.amber, 3);
  valPts.forEach(([s, v]) => { const [a, c] = P(s, v); b += dot(a, c, 4, C.amber); });
  const [bx, byy] = P(200, 0.968);
  b += `<circle cx="${bx}" cy="${byy}" r="10" fill="none" stroke="${C.green}" stroke-width="3"/>`;
  b += edge(`M${bx + 70} ${byy - 70}L${bx + 14} ${byy - 12}`);
  b += text(bx + 74, byy - 92, '验证 loss 最低：', 's');
  b += text(bx + 74, byy - 70, '选这个检查点', 's');
  const [t1x, t1y] = P(100, 0.78);
  b += text(t1x + 10, t1y + 40, '新一轮开头训练 loss 骤降：', 'xs');
  b += text(t1x + 10, t1y + 60, '模型见过这些样本了', 'xs');
  const [ox, oy] = P(222, 0.9);
  b += text(ox, oy, '第 3 轮验证 loss 回升：', 'xs');
  b += text(ox, oy + 20, '开始过拟合', 'xs');
  b += text(px + pw / 2, py + ph + 40, '训练步数（示意，共 3 轮）', 'xs', 'middle');
  b += line(px + 20, py + ph + 70, px + 60, py + ph + 70, C.blue, 3); b += text(px + 70, py + ph + 75, '训练 loss（每步，带噪声）', 'xs');
  b += line(px + 300, py + ph + 70, px + 340, py + ph + 70, C.amber, 3); b += text(px + 350, py + ph + 75, '验证 loss（每 20 步评估一次）', 'xs');

  // Side panels: learning rate and grad norm.
  const sx = 900, sw = 360, sh = 140;
  const lr = plotFrame(sx, 150, sw, sh, steps, 0, 1.05);
  const lrPts = [];
  for (let s = 0; s <= steps; s += 3) lrPts.push(lr.P(s, s < 10 ? s / 10 : 0.05 + 0.95 * 0.5 * (1 + Math.cos(Math.PI * (s - 10) / (steps - 10)))));
  b += text(sx, 132, '学习率：10 步预热，然后余弦衰减', 's');
  b += lr.axes + poly(lrPts, C.violet, 2.5);
  const gn = plotFrame(sx, 380, sw, sh, steps, 0, 3);
  seed = 5;
  const gnPts = [];
  for (let s = 0; s <= steps; s += 2) gnPts.push(gn.P(s, 0.45 + 1.8 * Math.exp(-s / 8) + Math.abs(rnd()) * 0.25));
  b += text(sx, 362, '梯度范数：开头大，随后稳定在一个带内', 's');
  b += gn.axes + line(sx, gn.P(0, 1)[1], sx + sw, gn.P(0, 1)[1], C.red, 1.5, '5 5') + poly(gnPts, C.red, 2);
  b += text(sx + sw - 4, gn.P(0, 1)[1] - 8, '裁剪阈值 1.0', 'xs', 'end');
  b += text(sx, 556, '三张图共用同一横轴；纵轴数值均为示意。', 'xs');
  return svg('curves-sft-normal', W, H, '资料助手 SFT 的示意训练曲线',
    '示意曲线，非真实日志：训练 3 轮，训练 loss 在每轮开头阶梯式下降；验证 loss 在第 2 轮末最低，第 3 轮回升，说明开始过拟合，应选第 2 轮末的检查点。右侧为预热加余弦衰减的学习率，以及开头偏大后稳定的梯度范数。',
    '一次“正常”的 SFT 曲线长什么样（示意）', '资料助手 1 万条问答训练 3 轮：训练 loss 一路降，选哪个检查点看验证 loss', b);
}

function curvesFailures() {
  const W = 1320, H = 740, pw = 404, ph = 286, gap = 20, x0 = 32, y0 = 104;
  const panels = [
    ['学习率过大', 'red', ['loss 先降后剧烈震荡，', '再一路上升或变成 NaN'], s => s < 30 ? 2 - s / 30 * 0.8 + rnd() * 0.1 : 1.2 + (s - 30) / 70 * 0.7 + Math.sin(s / 2.5) * 0.25 + rnd() * 0.15],
    ['学习率过小', 'amber', ['loss 缓慢下降，几轮后', '仍远高于正常水平'], s => 2.0 - s / 100 * 0.35 + rnd() * 0.05],
    ['loss 尖峰', 'violet', ['突然跳高，几十步后', '回到原轨道或留下台阶'], s => 1.9 * Math.exp(-s / 15) + 0.9 - s / 400 + (s >= 62 && s < 70 ? 1.1 * Math.exp(-(s - 62) / 3) : 0) + rnd() * 0.06],
    ['出现 NaN', 'red', ['曲线在某一步之后中断，', '日志里 loss 显示 nan'], s => s > 66 ? null : 1.9 * Math.exp(-s / 15) + 0.95 + (s > 58 ? (s - 58) * 0.12 : 0) + rnd() * 0.06],
    ['训练与验证重复', 'blue', ['验证 loss 紧贴训练 loss，', '低得可疑；线上效果不涨'], null],
    ['训练集内大量重复', 'green', ['训练 loss 很快接近 0，', '验证 loss 早早停住'], null],
  ];
  let b = '';
  panels.forEach(([title, cls, cap, f], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (pw + gap), y = y0 + row * (ph + gap);
    b += box(`p${i}`, x, y, pw, ph, 'node', title, [], `示意 ${i + 1}`);
    b += text(x + 18, y + ph - 44, cap[0], 'xs');
    b += text(x + 18, y + ph - 22, cap[1], 'xs');
    const { P, axes } = plotFrame(x + 30, y + 74, pw - 60, 140, 100, 0, 2.6);
    b += axes;
    seed = 17 + i * 3;
    if (f) {
      const pts = [];
      for (let s = 0; s <= 100; s++) { const v = f(s); if (v === null) break; pts.push(P(s, Math.max(0.05, Math.min(2.55, v)))); }
      b += poly(pts, C.blue, 2);
      if (i === 3) { const [ex, ey] = pts[pts.length - 1]; b += text(ex + 8, ey - 6, 'nan', 'm'); }
      if (i === 2) { const [sx, sy] = P(64, 2.1); b += text(sx + 10, sy, '尖峰', 'xs'); }
    } else if (i === 4) {
      const tr = [], va = [];
      for (let s = 0; s <= 100; s++) { const v = 1.9 * Math.exp(-s / 12) + 0.35 - s / 300; tr.push(P(s, v + rnd() * 0.07)); if (s % 10 === 0) va.push(P(s, v - 0.03)); }
      b += poly(tr, C.blue, 2) + poly(va, C.amber, 3);
    } else {
      const tr = [], va = [];
      for (let s = 0; s <= 100; s++) { const v = 1.9 * Math.exp(-s / 9) + 0.05; tr.push(P(s, v + rnd() * 0.04)); if (s % 10 === 0) va.push(P(s, Math.max(1.15, 1.9 * Math.exp(-s / 9) + 0.6))); }
      b += poly(tr, C.blue, 2) + poly(va, C.amber, 3);
    }
  });
  b += line(40, H - 24, 76, H - 24, C.amber, 3) + text(84, H - 19, '橙色：验证 loss；蓝色：训练 loss。所有曲线为示意形状，横轴为训练步数，纵轴范围 0–2.6。', 'xs');
  return svg('curves-failure-patterns', W, H, '六种异常训练曲线的示意形状',
    '示意：学习率过大时 loss 震荡上升；过小时下降缓慢；loss 尖峰后恢复；出现 NaN 后曲线中断；验证集与训练集重复时验证 loss 紧贴训练 loss；训练集大量重复时训练 loss 接近 0 而验证 loss 早早停住。',
    '六种要警惕的曲线形状（示意）', '形状只给出排查方向；同一种形状可能来自不同原因，要回到数据和配置去确认', b);
}

// ============================ 08 parallel ====================================

function parallelWhatSplits() {
  const W = 1320, H = 744, pw = 404, ph = 282, gap = 20, x0 = 32, y0 = 104;
  const colors = ['#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd'];
  const gw = 78, gh = 112, gg = 14;
  // Each GPU drawn as a frame holding 4 layer bars; `fill(g, l)` returns [x-fraction start, width fraction] or null.
  const gpu = (x, y, g, fill, extra = '') => {
    let s = rect(x, y, gw, gh, '#fff', '#94a3b8') + text(x + gw / 2, y + 18, `GPU ${g}`, 'xs', 'middle');
    for (let l = 0; l < 4; l++) {
      const ly = y + 28 + l * 16, lx = x + 8, lw = gw - 16;
      s += rect(lx, ly, lw, 11, '#f1f5f9', '#cbd5e1');
      const f = fill(g, l);
      if (f) s += rect(lx + f[0] * lw, ly, f[1] * lw, 11, colors[l]);
    }
    return s + extra;
  };
  const panels = [
    ['数据并行 DP', '每卡完整副本，各算一份数据', ['反向后 all-reduce 梯度，', '每卡显存不省'], () => [0, 1], 'batch'],
    ['ZeRO-3 / FSDP', '每卡只常驻 1/N 的状态', ['用到某层时临时 all-gather', '参数，算完即丢'], g => [g / 4, 0.25], 'batch'],
    ['张量并行 TP', '每层的矩阵按列或按行切', ['每层前向、反向都要通信，', '一般限制在一台机器内'], g => [g / 4, 0.25], 'same'],
    ['流水线并行 PP', '按层分段，每卡几层', ['微批次在卡间接力，', '首尾有空等的“气泡”'], (g, l) => (g === l ? [0, 1] : null), 'micro'],
    ['上下文并行 CP', '同一条长序列切成几段', ['注意力需要交换各段的', 'K、V；激活按段分摊'], () => [0, 1], 'seq'],
    ['专家并行 EP', 'MoE 的专家分到不同卡', ['token 按路由 all-to-all', '发到专家所在的卡'], null, 'expert'],
  ];
  let b = '';
  panels.forEach(([title, sub, cap, fill, data], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (pw + gap), y = y0 + row * (ph + gap);
    b += box(`p${i}`, x, y, pw, ph, 'node', title, [sub]);
    b += text(x + 18, y + ph - 40, cap[0], 'xs') + text(x + 18, y + ph - 20, cap[1], 'xs');
    const gy = y + 84;
    for (let g = 0; g < 4; g++) {
      const gx = x + 24 + g * (gw + gg);
      if (data === 'expert') {
        let s = rect(gx, gy, gw, gh, '#fff', '#94a3b8') + text(gx + gw / 2, gy + 18, `GPU ${g}`, 'xs', 'middle');
        s += rect(gx + 8, gy + 28, gw - 16, 14, '#e2e8f0') + text(gx + gw / 2, gy + 40, '注意力', 'xs', 'middle');
        for (let e = 0; e < 2; e++) s += cell(gx + 8 + e * 32, gy + 50, 28, 26, 'famber', `E${g * 2 + e}`);
        b += s;
      } else b += gpu(gx, gy, g, fill);
      // What data each GPU sees, drawn under it.
      const dy = gy + gh + 8;
      if (data === 'batch') b += cell(gx + 8, dy, gw - 16, 16, 'fgray', `样本 ${g * 2 + 1}–${g * 2 + 2}`);
      if (data === 'same') b += cell(gx + 8, dy, gw - 16, 16, 'fgray', '同一批');
      if (data === 'micro') b += cell(gx + 8, dy, gw - 16, 16, 'fgray', g === 0 ? '微批次入' : '接力');
      if (data === 'seq') b += cell(gx + 8, dy, gw - 16, 16, 'fgray', `第 ${g + 1} 段`);
      if (data === 'expert') b += cell(gx + 8, dy, gw - 16, 16, 'fgray', '部分 token');
    }
  });
  b += text(32, H - 22, '每张卡里的四条横条代表模型的 4 层；涂色部分是这张卡常驻保存的参数（及对应梯度、优化器状态），下方灰条是这张卡处理的数据。', 'xs');
  return svg('parallel-what-splits', W, H, '六种并行方式各自切分了什么',
    '数据并行每卡完整副本、切数据；ZeRO-3/FSDP 每卡只常驻四分之一状态；张量并行把每层矩阵切成四份；流水线并行每卡一层；上下文并行把同一条长序列切成四段；专家并行把 MoE 的专家分到不同卡。',
    '六种并行，各切了什么', '同样 4 张卡：涂色是这张卡常驻的模型状态，灰条是它处理的数据', b);
}

function parallelZeroMemory() {
  const W = 1300, H = 500, bx = 250, bw = 820, maxGB = 140, top = 140, rowH = 66;
  const S = gb => gb / maxGB * bw;
  const rows = [
    ['普通数据并行', [16.1, 16.1, 96.4], '128.5 GB', '2Ψ'],
    ['ZeRO-1：切优化器状态', [16.1, 16.1, 12.0], '44.2 GB', '2Ψ'],
    ['ZeRO-2：再切梯度', [16.1, 2.0, 12.0], '30.1 GB', '2Ψ'],
    ['ZeRO-3 / FSDP：再切参数', [2.0, 2.0, 12.0], '16.1 GB', '3Ψ'],
  ];
  const fills = ['#93c5fd', '#fcd34d', '#c4b5fd'];
  let b = '';
  for (const v of [0, 20, 40, 60, 80, 100, 120, 140]) {
    b += line(bx + S(v), top - 12, bx + S(v), top + rows.length * rowH, '#e2e8f0');
    b += text(bx + S(v), top + rows.length * rowH + 22, `${v}`, 'xs', 'middle');
  }
  b += line(bx + S(80), top - 30, bx + S(80), top + rows.length * rowH, C.red, 2, '6 5');
  b += text(bx + S(80) + 8, top - 26, 'H100 80 GB', 'xs');
  b += text(1110, top - 26, '每步通信量', 'k');
  rows.forEach(([name, segs, total, comm], i) => {
    const y = top + i * rowH + 10;
    b += text(32, y + 27, name, 's');
    let x = bx;
    segs.forEach((g, j) => { b += rect(x, y, S(g), 40, fills[j]); x += S(g); });
    b += text(x + 10, y + 27, total, 's');
    b += text(1110, y + 27, comm, 'm');
  });
  const ly = top + rows.length * rowH + 52;
  [['BF16 参数', 0], ['BF16 梯度', 1], ['FP32 主权重 + Adam 两个动量', 2]].forEach(([s, j], k) => {
    const lx = 250 + k * 220;
    b += rect(lx, ly - 13, 18, 18, fills[j]) + text(lx + 26, ly + 2, s, 'xs');
  });
  b += text(32, ly + 34, 'Ψ 为参数量，通信量按“每卡收发多少个参数大小的数据”计；只算模型状态，激活另计。数值按 8 卡、每参数 16 字节手算。', 'xs');
  return svg('parallel-zero-memory', W, H, 'Llama-3.1-8B 在 8 卡上用 ZeRO 各阶段时每卡的模型状态显存',
    '8B 全参训练、8 卡数据并行：普通数据并行每卡 128.5 GB，ZeRO-1 切优化器状态后 44.2 GB，ZeRO-2 再切梯度后 30.1 GB，ZeRO-3/FSDP 再切参数后 16.1 GB；前三者每步通信量都是 2Ψ，ZeRO-3 为 3Ψ。',
    '8B 全参训练，8 张卡，每卡要放多少模型状态', '条形按 GB 等比例绘制；切得越多每卡越省，ZeRO-3 的代价是多 50% 通信', b);
}

// Simulate a pipeline schedule. F takes 1 unit, B takes 2 units.
function simulate(p, m, order) {
  const done = {}; const free = Array(p).fill(0); const ops = [];
  const idx = Array(p).fill(0); let left = order.reduce((a, o) => a + o.length, 0);
  while (left > 0) {
    let progressed = false;
    for (let s = 0; s < p; s++) {
      if (idx[s] >= order[s].length) continue;
      const [k, i] = order[s][idx[s]];
      const dep = k === 'F' ? (s === 0 ? 0 : done[`F${s - 1}_${i}`]) : (s === p - 1 ? done[`F${s}_${i}`] : done[`B${s + 1}_${i}`]);
      if (dep === undefined) continue;
      const st = Math.max(free[s], dep), d = k === 'F' ? 1 : 2;
      ops.push({ s, k, i, st, d }); done[`${k}${s}_${i}`] = st + d; free[s] = st + d; idx[s]++; left--; progressed = true;
    }
    if (!progressed) throw new Error('deadlock');
  }
  return ops;
}

function parallelPipeline() {
  const p = 4, m = 8, u = 33, x0 = 150, rowH = 34;
  const gpipe = Array.from({ length: p }, () => [...Array.from({ length: m }, (_, i) => ['F', i]), ...Array.from({ length: m }, (_, i) => ['B', i])]);
  const ofob = Array.from({ length: p }, (_, s) => {
    const warm = p - 1 - s, o = [];
    for (let i = 0; i < warm; i++) o.push(['F', i]);
    for (let i = 0; i < m - warm; i++) { o.push(['F', warm + i]); o.push(['B', i]); }
    for (let i = m - warm; i < m; i++) o.push(['B', i]);
    return o;
  });
  const draw = (ops, y, title, note) => {
    let s = text(32, y - 14, title, 't');
    const end = Math.max(...ops.map(o => o.st + o.d));
    for (let st = 0; st < p; st++) {
      s += text(32, y + st * rowH + 23, `GPU ${st}`, 's');
      s += rect(x0, y + st * rowH, end * u, rowH - 6, '#fee2e2');
    }
    for (const o of ops) s += cell(x0 + o.st * u, y + o.s * rowH, o.d * u - 2, rowH - 6, o.k === 'F' ? 'fblue' : 'fgreen', `${o.k === 'F' ? 'F' : 'B'}${o.i + 1}`);
    s += text(x0, y + p * rowH + 16, note, 'xs');
    return s;
  };
  const W = 1340, H = 560;
  let b = draw(simulate(p, m, gpipe), 136, 'GPipe：先做完全部前向，再做全部反向', 'GPU 0 要同时保存 8 个微批次的激活；总时长 33 格，其中每卡空等 9 格（淡红色）。');
  b += draw(simulate(p, m, ofob), 352, '1F1B：预热几个前向后，前向与反向交替', 'GPU 0 最多同时保存 4 个微批次的激活；气泡大小不变，省的是显存。');
  const ly = H - 26;
  b += cell(32, ly - 14, 22, 18, 'fblue') + text(62, ly, '前向 F（1 格）', 'xs');
  b += cell(190, ly - 14, 44, 18, 'fgreen') + text(242, ly, '反向 B（约 2 格）', 'xs');
  b += rect(390, ly - 14, 22, 18, '#fee2e2') + text(420, ly, '气泡：卡在空等', 'xs');
  b += text(580, ly, '4 段流水线、8 个微批次：气泡占比 (p−1)/(m+p−1) = 3/11 ≈ 27%', 'xs');
  return svg('parallel-pipeline-schedule', W, H, 'GPipe 与 1F1B 两种流水线调度的时间线',
    '4 张卡组成 4 段流水线、处理 8 个微批次，前向 1 格、反向 2 格。GPipe 先完成全部前向再反向，1F1B 在预热后前向与反向交替；两者总时长都是 33 格、每卡空等 9 格，但 1F1B 的第一张卡最多只需保存 4 个微批次的激活，GPipe 要保存 8 个。',
    '流水线并行的时间线：气泡与微批次', '横轴是时间，每格是一个微批次在一段上做一次前向的时间', b);
}

function parallelLlama3() {
  const W = 1340, H = 520;
  let b = '';
  // One server: TP group.
  b += box('srv', 32, 112, 330, 250, 'blue', '一台服务器 = 1 个 TP 组', ['8 张 H100，NVLink 互联'], 'TP8');
  for (let g = 0; g < 8; g++) b += cell(52 + (g % 4) * 74, 212 + Math.floor(g / 4) * 50, 64, 40, 'fblue', `GPU ${g}`);
  b += text(52, 326, '每层矩阵切 8 份，每层都要', 'xs');
  b += text(52, 346, '在卡间交换结果', 'xs');
  // Pipeline of 16 servers.
  b += box('pp', 392, 112, 470, 250, 'violet', '16 台服务器串成 1 个模型副本', ['每台负责约 1/16 的层'], 'PP16');
  for (let k = 0; k < 16; k++) {
    const cx = 412 + (k % 8) * 54, cy = 210 + Math.floor(k / 8) * 56;
    b += cell(cx, cy, 40, 36, 'fviolet', `${k + 1}`);
    if (k % 8 < 7) b += edge(`M${cx + 41} ${cy + 18}H${cx + 51}`);
  }
  b += text(412, 326, '段与段之间只传激活和激活的梯度，', 'xs');
  b += text(412, 346, '可以走机间网络', 'xs');
  // Data parallel replicas.
  b += box('dp', 892, 112, 416, 250, 'green', '128 个副本 = 数据并行', ['FSDP 分片参数、梯度、优化器状态'], 'DP128');
  for (let k = 0; k < 6; k++) b += rect(912 + k * 8, 208 + k * 9, 250, 30, '#6ee7b7', '#20a28c');
  b += text(1196, 270, '× 128', 't');
  b += text(912, 326, '每个副本吃不同的数据，', 'xs');
  b += text(912, 346, '梯度在副本之间归约', 'xs');
  b += edge('M362 237H388');
  b += edge('M862 237H888');
  b += box('sum', 32, 392, 1276, 104, 'node', '8 × 16 × 128 = 16,384 张 H100，每批 1600 万 token，每卡约 400 TFLOPS，MFU 约 41%', ['长上下文阶段改成 TP8 × CP16 × PP16 × DP8：同样 16,384 张卡，序列 131,072，MFU 约 38%。通信最密的 TP 放在最内层。'], 'Llama 3 405B 预训练（论文表 4）');
  return svg('parallel-llama3-layout', W, H, 'Llama 3 405B 预训练的并行布局',
    '一台服务器内 8 张 H100 组成张量并行组；16 台服务器按层串成流水线，构成一个模型副本；128 个副本做 FSDP 数据并行，共 16,384 张卡，每卡约 400 TFLOPS、MFU 约 41%；长上下文阶段改为 TP8×CP16×PP16×DP8。',
    'Llama 3 405B 的 3D 并行：通信越密，放得越靠里', '从一台服务器到一万六千张卡：TP 在机内，PP 跨机串联，DP 在最外层复制', b);
}

write({
  'compute-ledger': computeLedger(),
  'compute-tokens-per-param': computeTokensPerParam(),
  'curves-sft-normal': curvesSftNormal(),
  'curves-failure-patterns': curvesFailures(),
  'parallel-what-splits': parallelWhatSplits(),
  'parallel-zero-memory': parallelZeroMemory(),
  'parallel-pipeline-schedule': parallelPipeline(),
  'parallel-llama3-layout': parallelLlama3(),
});
