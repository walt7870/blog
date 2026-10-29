// Figures for docs/ai/llm-architecture/11-moe.md, 12-efficient-attention.md, 13-linear-hybrid.md (group "evolve").
// Run: node .maintenance/llm-architecture/diagrams-evolve.mjs
// Numbers come from scratch scripts calc_moe.py / calc_long.py / calc_hybrid.py / calc_linear.py
// (recorded in research/facts-evolve.md).
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- moe-layer (11) ----------------------------------------------------------
// Dense FFN vs MoE layer for the token "年假": router scores, top-2, weighted sum, shared expert.
function expertsRow(x0, y, picks) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * 66;
    const on = picks.includes(i);
    s += cell(x, y, 56, 64, on ? 'famber' : 'fgray', `E${i + 1}`, 'm');
  }
  return s;
}
const moeLayer = svg('moe-layer', 1320, 700, '稠密 FFN 与 MoE 层的对比',
  '左边稠密模型每个 token 都经过同一个大 FFN；右边 MoE 层先由路由器给 8 个专家打分，只选分数最高的 2 个专家计算，再按归一化后的权重相加；DeepSeek 和 Qwen3.5 还加一个所有 token 都经过的共享专家。输入输出形状都是 [序列长度, 4096]。',
  '同一个位置，稠密 FFN 与 MoE 层各做了什么', '形状不变：进来 [序列长度, 4096]，出去 [序列长度, 4096]；变的是中间经过哪些参数。',
  [
    box('dense', 32, 112, 380, 556, 'node', '', [], '稠密：Llama-3.1-8B 的 FFN'),
    cell(72, 160, 300, 44, 'fblue', '“年假”的向量 [4096]', 's'),
    edge('M222 204V244'),
    box('ffn', 72, 248, 300, 168, 'blue', '一个 SwiGLU FFN', ['gate / up：4096 → 14336', 'down：14336 → 4096', '1.76 亿参数，每个 token 都用']),
    edge('M222 416V456'),
    cell(72, 460, 300, 44, 'fblue', '输出 [4096]，加回残差流', 's'),
    text(72, 616, '每层 FFN 参数全部参与计算', 's'),
    text(72, 642, '计算量 ∝ 总参数', 's'),

    box('moe', 444, 112, 844, 556, 'node', '', [], 'MoE：Mixtral-8x7B 一层（top-2 / 8 个专家）'),
    cell(484, 160, 300, 44, 'fblue', '“年假”的向量 [4096]', 's'),
    edge('M634 204V236'),
    box('router', 484, 240, 300, 96, 'violet', '路由器 [4096] → [8]', ['softmax 后取最大的 2 个']),
    cell(820, 240, 440, 96, 'fgray'),
    text(836, 268, '8 个分数（softmax 后）', 'xs'),
    ...[0.42, 0.05, 0.03, 0.29, 0.08, 0.06, 0.04, 0.03].map((v, i) => {
      const h = Math.round(v * 120); const x = 840 + i * 52;
      return cell(x, 326 - h, 36, h, i === 0 || i === 3 ? 'famber' : 'fviolet') + text(x + 18, 326 + 0, '', 'xs');
    }),
    edge('M634 336V384'),
    expertsRow(484, 388, [0, 3]),
    text(484, 616, '只算 E1 和 E4：每个专家与稠密 FFN 同样大小（1.76 亿参数）', 's'),
    text(484, 642, '其余 6 个专家的权重留在显存里，这一步不参与计算', 's'),
    edge('M512 452V508'), edge('M710 452V508'),
    box('sum', 484, 512, 520, 64, 'amber', '0.59 × E1(x) + 0.41 × E4(x) → 输出 [4096]'),
    box('shared', 1032, 388, 228, 188, 'green', '共享专家', ['DeepSeek-V3、Qwen3.5', '每个 token 都经过', '结果直接加到', '路由专家的输出上'], '可选'),
  ].join('\n'));

// ---- moe-params (11) ---------------------------------------------------------
const models = [
  ['Mixtral-8x7B', 46.703, 12.880, '8 选 2，无共享'],
  ['Qwen3-235B-A22B', 235.094, 22.191, '128 选 8，无共享'],
  ['Qwen3.5-397B-A17B', 396.346, 17.349, '512 选 10 + 1 共享'],
  ['DeepSeek-V3', 671.026, 37.552, '256 选 8 + 1 共享'],
];
const PX = 800 / 680; // px per billion
let bars = '';
models.forEach(([n, t, a, note], i) => {
  const y = 150 + i * 104;
  bars += text(32, y + 30, n, 't');
  bars += text(32, y + 56, note, 'xs');
  bars += cell(300, y + 8, Math.round(t * PX), 40, 'fgray');
  bars += cell(300, y + 8, Math.max(4, Math.round(a * PX)), 40, 'famber');
  const pct = (a / t * 100).toFixed(1);
  const tx = 300 + Math.round(t * PX) + 12;
  bars += text(Math.min(tx, 1110), y + 26, `总 ${t.toFixed(1)}B`, 's');
  bars += text(Math.min(tx, 1110), y + 48, `激活 ${a.toFixed(1)}B（${pct}%）`, 's');
});
const moeParams = svg('moe-params', 1320, 600, '四个 MoE 模型的总参数与每 token 激活参数',
  'Mixtral-8x7B 总 46.7B、激活 12.9B（27.6%）；Qwen3-235B-A22B 总 235.1B、激活 22.2B（9.4%）；Qwen3.5-397B-A17B 文本部分总 396.3B、激活 17.3B（4.4%）；DeepSeek-V3 总 671.0B、激活 37.6B（5.6%）。条形长度按参数量等比例绘制。',
  '总参数决定要放多少权重，激活参数决定每个 token 算多少', '灰色是总参数，橙色是每个 token 实际参与计算的部分；按 config.json 手算，条形等比例。',
  [
    bars,
    text(32, 576, '激活参数包含注意力、词嵌入和输出层；Qwen3.5 只计文本部分，不含视觉编码器和 MTP 模块；DeepSeek-V3 不含 MTP 模块。', 'xs'),
  ].join('\n'));

// ---- moe-capacity (11) -------------------------------------------------------
function capRow(y, cap, title) {
  const choice = [0, 0, 0, 1, 0, 2, 0, 3];
  const load = [0, 0, 0, 0];
  let s = text(32, y + 26, title, 't');
  choice.forEach((e, t) => {
    const ok = load[e] < cap; if (ok) load[e]++;
    const x = 280 + t * 64;
    s += cell(x, y, 54, 40, ok ? 'fblue' : 'fred', `t${t + 1}→E${e + 1}`, 'xs');
  });
  for (let e = 0; e < 4; e++) {
    const x = 832 + e * 112;
    s += `<rect x="${x}" y="${y}" width="96" height="40" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
    for (let k = 0; k < cap; k++) s += cell(x + 4 + k * (88 / cap), y + 4, 88 / cap - 4, 32, k < load[e] ? 'fgreen' : 'fgray');
    s += text(x + 48, y + 60, `E${e + 1}：${load[e]}/${cap}`, 'xs', 'middle');
  }
  return s;
}
const moeCapacity = svg('moe-capacity', 1320, 560, '专家容量与被丢弃的 token',
  '一批 8 个 token、4 个专家、每个 token 选 1 个专家。5 个 token 都选了 E1。容量因子 1.0 时每个专家最多收 2 个，t3、t5、t7 被丢弃；容量因子 1.25 时每个专家收 3 个，t5、t7 被丢弃；被丢弃的 token 跳过 FFN，只经残差连接传到下一层。',
  '路由不均时，容量有限的专家会把多出来的 token 挡在门外', '8 个 token、4 个专家、每个 token 选 1 个；红色 token 超出容量，本层 FFN 不处理它，只沿残差连接往下走。',
  [
    text(280, 132, '每个 token 选中的专家（按顺序到达）', 'k'),
    text(832, 132, '各专家的容量槽', 'k'),
    capRow(150, 2, '容量因子 1.0'),
    capRow(260, 3, '容量因子 1.25'),
    box('fix', 32, 380, 600, 148, 'green', '不丢 token 的做法', ['训练时让负载本身均衡：辅助损失或偏置调整', '推理时按实际负载分配：DeepSeek-V3 训练和推理都不丢', '代价：热门专家所在的卡更忙，其他卡要等它']),
    box('cost', 664, 380, 624, 148, 'red', '丢 token 的代价', ['这一层对该 token 等于什么都没做', '训练时影响学习，推理时同一句话的结果会随', '同批其他请求变化，难复现']),
  ].join('\n'));

// ---- long-cost (12) ----------------------------------------------------------
function pair(x0, y0, title, items, scale, unit) {
  let s = text(x0, y0, title, 't');
  items.forEach(([lab, v, cls], i) => {
    const y = y0 + 24 + i * 56; const w = Math.max(4, Math.round(v * scale));
    s += text(x0, y + 26, lab, 's');
    s += cell(x0 + 190, y + 6, w, 32, cls);
    s += text(x0 + 190 + w + 10, y + 28, `${v} ${unit}`, 's');
  });
  return s;
}
const longCost = svg('long-cost', 1320, 620, 'Llama-3.1-8B 在 8K 与 128K 上下文下的成本',
  '生成每个 token 时，权重部分约 16.06 GFLOPs，与上下文长度无关；注意力部分在 8K 上下文是 4.29 GFLOPs，在 128K 是 68.72 GFLOPs，超过权重部分的 4 倍。BF16 KV Cache 在 8K 是 1 GiB，在 128K 是 16 GiB。128K 的整段 Prefill 里，注意力约占 68% 的计算。',
  '上下文从 8K 拉到 128K：权重那份不变，注意力那份涨 16 倍', 'Llama-3.1-8B，单个请求；FLOPs 为估算口径（矩阵乘法 2 次运算/乘加），KV 按 BF16。',
  [
    pair(32, 140, '生成 1 个新 token 的计算（GFLOPs）', [
      ['权重部分（8K/128K 相同）', 16.06, 'fblue'],
      ['注意力，上下文 8K', 4.29, 'famber'],
      ['注意力，上下文 128K', 68.72, 'fred'],
    ], 7, 'G'),
    pair(32, 380, '这个请求的 KV Cache（GiB）', [
      ['上下文 8K', 1, 'famber'],
      ['上下文 128K', 16, 'fred'],
    ], 28, 'GiB'),
    box('note', 820, 380, 468, 150, 'node', '整段 Prefill 128K', ['权重部分：16.06 G × 131072 ≈ 2.1 PFLOPs', '注意力（因果，只算下三角）≈ 4.5 PFLOPs', '注意力占约 68%；8K 时只占约 12%', '长度翻倍，这一项涨 4 倍']),
  ].join('\n'));

// ---- long-masks (12) ---------------------------------------------------------
function grid(x0, y0, n, fn, title, sub) {
  const c = 22; let s = text(x0, y0 - 40, title, 't') + text(x0, y0 - 14, sub, 'xs');
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = fn(i, j); const cls = v === 2 ? 'fred' : v === 1 ? 'fblue' : v === 3 ? 'famber' : 'fgray';
    if (j > i) s += `<rect x="${x0 + j * c}" y="${y0 + i * c}" width="${c - 2}" height="${c - 2}" rx="2" fill="#f8fafc" stroke="#e2e8f0"/>`;
    else s += cell(x0 + j * c, y0 + i * c, c - 2, c - 2, cls);
  }
  return s;
}
const N = 12, W8 = 4;
const pickTop = { 6: [0, 1, 3, 4, 5, 6], 7: [0, 2, 3, 5, 6, 7], 8: [0, 1, 3, 6, 7, 8], 9: [0, 3, 5, 7, 8, 9], 10: [1, 3, 5, 8, 9, 10], 11: [0, 2, 5, 9, 10, 11] };
const longMasks = svg('long-masks', 1320, 560, '四种注意力掩码的对比',
  '12 个 token 的注意力矩阵，行是当前 token，列是被看的历史 token。完整因果注意力看全部历史；滑动窗口只看最近 4 个；注意力汇聚加窗口额外保留开头 1 个 token；DeepSeek 稀疏注意力由索引器为每个查询挑出固定数量的位置，位置不必连续。',
  '每个 token 回头看哪些位置：四种掩码', '行 = 当前 token，列 = 历史 token；彩色格子才计算注意力分数，上三角是因果掩码挡掉的未来。',
  [
    grid(32, 180, N, (i, j) => 1, '完整因果注意力', '看全部 i+1 个：O(L²)'),
    grid(352, 180, N, (i, j) => (i - j < W8 ? 1 : 0), '滑动窗口（窗口 4）', 'Mistral 7B v0.1、gpt-oss、Gemma 3 局部层'),
    grid(672, 180, N, (i, j) => (j === 0 ? 2 : i - j < W8 ? 1 : 0), '汇聚 token + 窗口', '保留开头，StreamingLLM 的做法'),
    grid(992, 180, N, (i, j) => (pickTop[i] ? (pickTop[i].includes(j) ? 3 : 0) : 3), '索引器挑 top-k（k = 6）', 'DSA：每个查询选 k 个位置'),
    text(32, 476, '红色：开头的汇聚 token；橙色：索引器按内容挑出的位置（示意）；历史不足 6 个时全看，之后每行只看 6 个，位置可以不连续。', 's'),
    text(32, 504, '前三种按位置决定看哪里，和内容无关；第四种先用便宜的打分看一遍全部历史，再只对挑中的位置做完整注意力。', 's'),
  ].join('\n'));

// ---- long-layer-mix (12) -----------------------------------------------------
function strip(x0, y0, types, cw, title, sub) {
  let s = text(x0, y0 - 14, title, 't') + text(x0 + 420, y0 - 14, sub, 's');
  types.forEach((t, i) => { s += cell(x0 + i * cw, y0, cw - 3, 36, t === 'g' ? 'fred' : 'fblue'); });
  return s;
}
const gemma = Array.from({ length: 62 }, (_, i) => ((i + 1) % 6 ? 'l' : 'g'));
const oss = Array.from({ length: 36 }, (_, i) => (i % 2 ? 'g' : 'l'));
const longMix = svg('long-layer-mix', 1320, 640, '局部与全局注意力交替的层排布与 KV Cache',
  'Gemma 3 27B 的 62 层里每 6 层有 1 层全局注意力，共 10 层全局、52 层窗口 1024；gpt-oss-120b 的 36 层奇偶交替，18 层窗口 128、18 层全局。128K 上下文时 Gemma 3 的 KV 约 10.4 GiB，全部用全局注意力要 62 GiB；gpt-oss-120b 约 4.5 GiB，全部全局要 9 GiB。',
  '局部层只存最近一段，全局层存全部：KV 主要由全局层决定', '蓝色 = 滑动窗口层，红色 = 全局层；KV 按 BF16、单个 128K 请求计算。',
  [
    strip(32, 156, gemma, 20, 'Gemma 3 27B：5 局部 : 1 全局', '62 层，窗口 1024 个 token'),
    strip(32, 256, oss, 34, 'gpt-oss-120b：1 局部 : 1 全局', '36 层，窗口 128 个 token'),
    pair(32, 356, '128K 上下文的 KV Cache（GiB）', [
      ['Gemma 3 27B 实际', 10.41, 'fblue'],
      ['假如 62 层都全局', 62.0, 'fred'],
    ], 12, 'GiB'),
    pair(32, 500, '', [
      ['gpt-oss-120b 实际', 4.5, 'fblue'],
      ['假如 36 层都全局', 9.0, 'fred'],
    ], 12, 'GiB'),
  ].join('\n'));

// ---- linear-state (13) -------------------------------------------------------
function mat(x, y, m, cls, cw = 64) {
  let s = '';
  m.forEach((r, i) => r.forEach((v, j) => { s += cell(x + j * cw, y + i * 44, cw - 6, 38, cls, String(v), 'm'); }));
  return s;
}
const kvRows = [['年假', '[1, 0]', '[5, 1]'], ['申请', '[0, 1]', '[2, 4]'], ['报销', '[0.6, 0.8]', '[0, 6]']];
let kvTable = text(52, 172, 'token', 'k') + text(172, 172, 'K', 'k') + text(332, 172, 'V', 'k');
kvRows.forEach(([t, k, v], i) => {
  const y = 186 + i * 48;
  kvTable += cell(52, y, 100, 40, 'fgray', t, 's') + cell(172, y, 140, 40, 'fblue', k, 'm') + cell(332, y, 120, 40, 'fgreen', v, 'm');
});
const linearState = svg('linear-state', 1320, 640, 'KV Cache 与固定大小状态的对比',
  '左边 softmax 注意力把每个 token 的 K、V 都存下来，三个 token 存 12 个数，长度越长存得越多。右边线性注意力把每对 K、V 的外积累加进一个 2×2 的状态矩阵，始终只存 4 个数；前两个 key 正交时能准确读回，第三个 key 与前两个重叠后，读回的值都被污染。',
  'KV Cache 逐个 token 往下记，线性注意力把所有内容压进一个固定大小的矩阵', '玩具例子：key 和 value 都是 2 维；三个 token 依次写入，再用各自的 key 读回。',
  [
    box('kv', 32, 112, 448, 496, 'node', '', [], 'softmax 注意力：KV Cache'),
    kvTable,
    text(52, 362, '3 个 token 存 12 个数；10 万个 token 就存 40 万个', 's'),
    text(52, 390, '查“年假”时，用 q 和每个 K 打分再 softmax，', 's'),
    text(52, 414, '原始 V 都在，只要分数够尖就能取回 [5, 1]', 's'),
    box('kvcost', 52, 448, 408, 136, 'blue', '代价', ['存储和每步读取量随长度线性增长', '所有 token 的 K、V 一直留着']),

    box('lin', 512, 112, 776, 496, 'node', '', [], '线性注意力：S ← S + v·kᵀ，读出 o = S·q'),
    text(532, 172, '写入前两个 token 后', 'k'),
    mat(532, 186, [[5, 2], [1, 4]], 'fviolet'),
    text(532, 300, 'S·[1,0] = [5, 1] ✓', 'm'),
    text(532, 326, 'S·[0,1] = [2, 4] ✓', 'm'),
    edge('M676 230H736'),
    text(756, 172, '再写入“报销”后', 'k'),
    mat(756, 186, [[5, 2], [4.6, 8.8]], 'fred'),
    text(756, 300, 'S·[1,0] = [5, 4.6]，应为 [5, 1]', 'm'),
    text(756, 326, 'S·[0,1] = [2, 8.8]，应为 [2, 4]', 'm'),
    text(756, 352, 'S·k₃ = [4.6, 9.8]，应为 [0, 6]', 'm'),
    box('lincost', 532, 400, 736, 184, 'violet', '固定 4 个数，换来两件事', ['好处：不管写入多少 token，状态都是 d_k × d_v 个数，每步计算也固定', '问题：2 维的 key 最多容纳 2 个互不干扰的键值对，第 3 个一来就互相串扰', '真实模型每头 128 × 128，容量大得多，但仍是定数；长文里的旧细节会被挤掉', '门控（遗忘）和 delta 规则（先减去旧值再写）是在管理这份有限的容量']),
  ].join('\n'));

// ---- linear-hybrid-layers (13) ------------------------------------------------
function layerStrip(x0, y0, pattern, cw, title, sub) {
  let s = text(x0, y0 - 14, title, 't') + text(x0 + 360, y0 - 14, sub, 's');
  [...pattern].forEach((ch, i) => {
    const cls = ch === 'A' ? 'fred' : ch === 'L' ? 'fblue' : ch === 'F' ? 'fgray' : 'fgreen';
    s += cell(x0 + i * cw, y0, cw - 2, 34, cls);
  });
  return s;
}
const qwen35 = 'LLLA'.repeat(15);
const kimi = Array.from({ length: 27 }, (_, i) => ([4, 8, 12, 16, 20, 24, 27].includes(i + 1) ? 'A' : 'L')).join('');
const jamba = Array.from({ length: 32 }, (_, i) => (i % 8 === 4 ? 'A' : 'L')).join('');
const nemo = 'M-M-M-M*-M-M-M-M-M*-M-M-M-M-M*-M-M-M-M-M*-M-M-M-M-M-'.replace(/M/g, 'L').replace(/\*/g, 'A').replace(/-/g, 'F');
const hybridLayers = svg('linear-hybrid-layers', 1320, 660, '四个混合架构的层排布',
  'Qwen3.5-397B-A17B 60 层，按“3 层 Gated DeltaNet + 1 层门控注意力”重复 15 次；Kimi Linear 48B 27 层，第 4、8、12、16、20、24、27 层是 MLA，其余 20 层是 KDA；Jamba v0.1 32 层，每 8 层的第 5 层是注意力，共 4 层；Nemotron-H-8B 52 个块里 24 个 Mamba2、4 个注意力、24 个 MLP。',
  '混合架构：大部分层用固定状态，少数层保留完整注意力', '蓝色 = 线性注意力 / SSM 层，红色 = 完整注意力层，灰色 = 单独的 MLP 块（Nemotron-H 把混合层和 FFN 拆成独立块）。',
  [
    layerStrip(32, 150, qwen35, 20, 'Qwen3.5-397B-A17B', '60 层：45 Gated DeltaNet + 15 门控注意力（3:1）'),
    layerStrip(32, 260, kimi, 44, 'Kimi Linear 48B-A3B', '27 层：20 KDA + 7 MLA（约 3:1）'),
    layerStrip(32, 370, jamba, 38, 'Jamba v0.1', '32 层：28 Mamba + 4 注意力（7:1）'),
    layerStrip(32, 480, nemo, 23, 'Nemotron-H-8B', '52 块：24 Mamba2 + 4 注意力 + 24 MLP'),
    text(32, 572, '每层后面的 FFN：Qwen3.5、Kimi Linear 每层都是 MoE（Kimi Linear 第 1 层为稠密）；Jamba 隔层一个 16 选 2 的 MoE；Nemotron-H-8B 为稠密 MLP。', 's'),
    text(32, 600, '排布来自各自的 config.json：layer_types、linear_attn_config、attn_layer_period/offset、hybrid_override_pattern。', 'xs'),
  ].join('\n'));

// ---- linear-memory (13) ------------------------------------------------------
const mem = [
  ['Llama-3.1-8B（全注意力）', 16.0, 0, '32 层全注意力', '16.00'],
  ['Qwen3.5-35B-A3B', 2.50, 0.06, '30 层 GDN + 10 层注意力', '2.56'],
  ['Qwen3-Next-80B-A3B', 3.0, 0.07, '36 层 GDN + 12 层注意力', '3.07'],
  ['Jamba v0.1', 2.0, 0.015, '28 层 Mamba + 4 层注意力', '2.02'],
  ['Nemotron-Nano-9B-v2', 2.0, 0.134, '27 层 Mamba2 + 4 层注意力', '2.13'],
  ['Kimi Linear 48B-A3B', 0.984, 0.041, '20 层 KDA + 7 层 MLA', '1.03'],
];
const MPX = 52;
let mbars = '';
mem.forEach(([n, kv, st, note, tot], i) => {
  const y = 140 + i * 66;
  mbars += text(32, y + 26, n, 's') + text(32, y + 48, note, 'xs');
  const wk = Math.max(3, Math.round(kv * MPX)), ws = st ? Math.max(3, Math.round(st * MPX)) : 0;
  mbars += cell(330, y + 8, wk, 36, 'fred') + (ws ? cell(330 + wk, y + 8, ws, 36, 'fblue') : '');
  mbars += text(330 + wk + ws + 12, y + 32, `${tot} GiB`, 's');
});
const linearMemory = svg('linear-memory', 1320, 600, '128K 上下文时单个请求的缓存占用',
  '单个 128K 请求：Llama-3.1-8B 的 KV Cache 16 GiB；Qwen3.5-35B-A3B 约 2.56 GiB，Qwen3-Next-80B-A3B 约 3.07 GiB，Jamba v0.1 约 2.02 GiB，Nemotron-Nano-9B-v2 约 2.13 GiB，Kimi Linear 48B 约 1.03 GiB。混合模型的固定状态只有几十到一百多 MiB，主要占用来自保留的少数注意力层。',
  '128K 上下文、一个请求：缓存从 16 GiB 降到 1—3 GiB', '红色 = 注意力层的 KV（随长度增长，BF16），蓝色 = 线性层的固定状态（与长度无关，按 FP32 估算）。',
  [
    mbars,
    text(32, 556, '估算口径：KV = 2 × 注意力层数 × KV 头数 × 头维度 × 2 字节 × 131072；MLA 按 512+64 维潜向量；状态含卷积缓存。', 'xs'),
    text(32, 580, '只算缓存，不含权重和运行时工作区。Qwen3.5 权重仍有 35B，显存账要和权重一起看。', 'xs'),
  ].join('\n'));

write({
  'moe-layer': moeLayer,
  'moe-params': moeParams,
  'moe-capacity': moeCapacity,
  'long-cost': longCost,
  'long-masks': longMasks,
  'long-layer-mix': longMix,
  'linear-state': linearState,
  'linear-hybrid-layers': hybridLayers,
  'linear-memory': linearMemory,
});
