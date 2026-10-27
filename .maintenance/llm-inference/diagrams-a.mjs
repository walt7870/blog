// Figures for parts 1–2 of docs/ai/llm-inference/. Run: node .maintenance/llm-inference/diagrams-a.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- series-map --------------------------------------------------------------
const seriesMap = svg('series-map', 960, 560, '大模型推理优化系列的五个部分', '第一部分建立坐标系，第二部分解释瓶颈，第三部分讲引擎核心技术，第四部分讲量化与投机解码，第五部分讲多卡、部署、压测、运维与端侧。',
  '五个部分，从一次推理一直讲到生产部署', '先立坐标系，再找瓶颈，然后逐个拆解引擎技术、压缩加速和规模化工程。',
  [
    box('p1', 32, 112, 280, 180, 'blue', '一次推理怎样发生', ['Prefill 与 Decode', 'KV Cache 与显存账本', 'TTFT、TPOT、Goodput'], '第一部分 · 01–05'),
    box('p2', 340, 112, 280, 180, 'violet', '瓶颈在哪里', ['GPU 的算力与带宽', 'Roofline 与算术强度', '一个请求的全链路'], '第二部分 · 06–07'),
    box('p3', 648, 112, 280, 180, 'green', '推理引擎核心技术', ['分页 KV、连续批处理', '前缀缓存、分块预填充', '算子、CUDA Graph、源码'], '第三部分 · 08–13'),
    box('p4', 648, 336, 280, 180, 'amber', '压缩与加速', ['量化：每步搬更少字节', '投机解码：一步推进多个 token'], '第四部分 · 14–15'),
    box('p5', 32, 336, 588, 180, 'red', '规模化与工程', ['多卡并行、P/D 分离、vLLM 与 SGLang、语音与多模态', '压测与分析、生产部署与运维、端侧推理'], '第五部分 · 16–22'),
    edge('M312 202H340'), edge('M620 202H648'), edge('M788 292V336'), edge('M648 426H620'),
  ].join('\n'));

// ---- kv-recompute ------------------------------------------------------------
// 500 input + 200 output. Bars are drawn to scale: 699 positions = 300 px.
const px = n => Math.round(n * 300 / 699);
function recomputePanel(x0, cached) {
  const rows = [
    ['第 1 步', 500, 0],
    ['第 2 步', 501, 1],
    ['第 3 步', 502, 2],
    ['…', null, null],
    ['第 200 步', 699, 199],
  ];
  let s = '';
  rows.forEach(([name, n, out], i) => {
    const y = 196 + i * 52;
    s += text(x0, y + 22, name, 's');
    if (n === null) { s += text(x0 + 80, y + 22, '…', 's'); return; }
    const bx = x0 + 80;
    if (!cached) {
      s += cell(bx, y, px(n), 32, 'fblue');
      s += text(bx + px(n) + 8, y + 22, `${n}`, 'xs');
    } else if (i === 0) {
      s += cell(bx, y, px(500), 32, 'fblue');
      s += text(bx + px(500) + 8, y + 22, '500', 'xs');
    } else {
      s += cell(bx, y, px(n - 1), 32, 'fgray');
      s += cell(bx + px(n - 1), y, 8, 32, 'fgreen');
      s += text(bx + px(n - 1) + 16, y + 22, '1', 'xs');
    }
  });
  return s;
}
const kvRecompute = svg('kv-recompute', 960, 560, '不缓存与缓存 KV 时的计算量对比', '输入 500 个 token、生成 200 个 token。不缓存时第 1 步到第 200 步分别处理 500 到 699 个位置，共 119,900 个；缓存后只有 Prefill 处理 500 个位置，之后每步只算 1 个新位置，共 699 个。',
  '输入 500 个 token，生成 200 个：要算多少个位置？', '条形长度按实际位置数等比例绘制。蓝色为本步重新计算，灰色为从缓存读取，绿色为新 token。',
  [
    box('no', 32, 112, 440, 356, 'node', '', [], '不缓存：每一步都从头算'),
    box('yes', 488, 112, 440, 356, 'node', '', [], '缓存 K、V：只算新 token'),
    recomputePanel(52, false),
    recomputePanel(508, true),
    box('no-total', 32, 484, 440, 56, 'red', '共 119,900 个位置', []),
    box('yes-total', 488, 484, 440, 56, 'green', '共 699 个位置，约少 170 倍', []),
  ].join('\n'));

// ---- kv-lifecycle ------------------------------------------------------------
const kvLifecycle = svg('kv-lifecycle', 960, 440, 'KV Cache 的生命周期', '请求进来时分配显存；Prefill 一次写入整段输入的 K、V，Decode 每步追加 1 个；每一步 Decode 读取全部历史；遇到结束符、达到长度上限或取消后释放。',
  '一个请求的 KV Cache：分配、填充、使用、释放', '难点在第一步：分配时还不知道这个请求最终会生成多长。',
  [
    box('alloc', 32, 120, 200, 200, 'amber', '分配', ['请求进来', '引擎预留显存', '最终长度未知'], '1'),
    box('fill', 272, 120, 200, 200, 'blue', '填充', ['Prefill：一次写入', '整段输入的 K、V', 'Decode：每步追加 1 个'], '2'),
    box('use', 512, 120, 200, 200, 'green', '使用', ['每一步 Decode', '读取全部历史 K、V', '上下文越长读得越多'], '3'),
    box('free', 752, 120, 176, 200, 'gray', '释放', ['遇到结束符', '达到长度上限', '用户取消'], '4'),
    edge('M232 220H272'), edge('M472 220H512'), edge('M712 220H752'),
    edge('M612 320Q612 372 452 372Q372 372 372 324', 'dash'),
    label(388, 392, 'Decode 循环：追加 1 个，再读全部', 270),
  ].join('\n'));

// ---- memory-ledger -----------------------------------------------------------
// 79.6 GiB usable on an H100 80 GB; budget 0.9 → 71.6 GiB = 15 weights + 6.6 workspace + 50 KV; 8.0 reserve.
const W = 896, total = 79.6, sx = g => Math.round(g * W / total);
const segs = [
  ['weights', 15, 'fblue', '权重', '约 15 GiB'],
  ['work', 6.6, 'famber', '运行时工作区', '几 GiB'],
  ['kv', 50, 'fgreen', 'KV Cache', '约 50 GiB'],
  ['reserve', 8.0, 'fgray', '安全余量', '约 8 GiB（10%）'],
];
let ledgerBar = '', ledgerLabels = '', lx = 32;
segs.forEach(([key, g, cls, name, amount]) => {
  const w = sx(g), mid = key === 'reserve' ? lx + w - 12 : lx + 12;
  ledgerBar += cell(lx, 170, w, 64, cls);
  // The narrow workspace segment gets its label on a lower row; the last one is right-aligned.
  const low = key === 'work', last = key === 'reserve';
  const ty = low ? 332 : 282, tx = last ? 928 : lx + 4, anchor = last ? 'end' : 'start';
  ledgerLabels += edge(`M${mid} 234V${ty - 22}`, 'line');
  ledgerLabels += text(tx, ty, name, 't', anchor);
  ledgerLabels += text(tx, ty + 24, amount, 's', anchor);
  lx += w;
});
const memoryLedger = svg('memory-ledger', 960, 556, '一张 80 GB H100 上运行 Llama-3.1-8B 时的显存分配估算', '实际可用约 79.6 GiB，按 0.9 的利用率留出约 8 GiB 余量；权重约 15 GiB，运行时工作区几 GiB，剩下约 50 GiB 给 KV Cache，按每 token 128 KiB 约可存 40 万个 token。',
  '80 GB 显存怎样分：一份权重，所有请求的 KV', '按比例绘制的估算，Llama-3.1-8B、BF16；实际数值以引擎启动日志为准。',
  [
    ledgerBar,
    edge(`M32 164V156H${32 + sx(71.6)}V164`, 'line'), text(32 + sx(71.6) / 2, 146, '引擎可用 ≈ 71.6 GiB（79.6 × 0.9）', 'xs', 'middle'),
    text(928, 146, '合计约 79.6 GiB', 'xs', 'end'),
    ledgerLabels,
    box('kv-cap', 32, 388, 432, 140, 'green', 'KV 容量 ≈ 50 GiB ÷ 128 KiB', ['≈ 40 万个 token，所有请求共享', '每个 token 128 KiB：', '2 × 32 层 × 8 KV 头 × 128 维 × 2 字节']),
    box('kv-use', 496, 388, 432, 140, 'node', '能同时容纳多少个对话', ['每个 1000 token：约 400 个', '每个 8192 token：约 50 个', '每个 128K token：只有 3 个']),
  ].join('\n'));

// ---- gqa-heads ---------------------------------------------------------------
// Eight distinguishable fills, one per GQA group.
const groupHex = ['#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd', '#fda4af', '#5eead4', '#fdba74', '#a5b4fc'];
const sq = (x, y, c, fill) => `<rect x="${x}" y="${y}" width="${c}" height="${c}" rx="4" fill="${fill}"/>`;
function headPanel(x0, kind) {
  let s = '';
  const qx = x0 + 24, qy = 168, c = 26, g = 4;
  // 32 Q heads as 4 rows × 8 columns; column j is GQA group j.
  for (let r = 0; r < 4; r++) for (let j = 0; j < 8; j++) {
    const fill = kind === 'gqa' ? groupHex[j] : groupHex[0];
    s += sq(qx + j * (c + g), qy + r * (c + g), c, fill);
  }
  const ky = 352;
  if (kind === 'mha') {
    for (let r = 0; r < 4; r++) for (let j = 0; j < 8; j++) s += sq(qx + j * (c + g), ky + r * (c + g), c, groupHex[0]);
  } else if (kind === 'gqa') {
    for (let j = 0; j < 8; j++) {
      s += sq(qx + j * (c + g), ky, c, groupHex[j]);
      s += edge(`M${qx + j * (c + g) + c / 2} ${qy + 4 * (c + g)}V${ky - 4}`, 'line');
    }
  } else {
    const cx = qx + 3.5 * (c + g);
    s += sq(cx, ky, c, groupHex[0]);
    for (let j = 0; j < 8; j++) s += edge(`M${qx + j * (c + g) + c / 2} ${qy + 4 * (c + g)}L${cx + c / 2} ${ky - 4}`, 'line');
  }
  return s;
}
const gqaHeads = svg('gqa-heads', 960, 640, 'MHA、GQA 与 MQA 中 Query 头和 KV 头的对应关系', '以 Llama-3.1-8B 的形状为例：32 个 Query 头。MHA 每个 Query 头配一个 KV 头，共 32 个，每 token KV 为 512 KiB；GQA 每 4 个 Query 头共用一个 KV 头，共 8 个，128 KiB；MQA 所有 Query 头共用 1 个 KV 头，16 KiB。',
  'KV 头越少，每个 token 的 KV 越小', '32 层、每头 128 维、BF16 的形状下，比较 32 个 Query 头配多少个 KV 头。GQA 中同色表示共用同一组 KV。',
  [
    box('mha', 32, 108, 288, 420, 'node', '', [], 'MHA：32 个 KV 头'),
    box('gqa', 336, 108, 288, 420, 'node', '', [], 'GQA：8 个 KV 头'),
    box('mqa', 640, 108, 288, 420, 'node', '', [], 'MQA：1 个 KV 头'),
    text(56, 160, 'Query 头 × 32', 'xs'), text(360, 160, 'Query 头 × 32', 'xs'), text(664, 160, 'Query 头 × 32', 'xs'),
    text(56, 340, 'KV 头（每个 Q 头各有一个）', 'xs'), text(360, 404, 'KV 头 × 8：同一列的 4 个 Q 共用', 'xs'), text(664, 404, 'KV 头 × 1：32 个 Q 全部共用', 'xs'),
    headPanel(32, 'mha'), headPanel(336, 'gqa'), headPanel(640, 'mqa'),
    box('mha-kv', 32, 544, 288, 72, 'red', '512 KiB / token', ['2 × 32 × 32 × 128 × 2']),
    box('gqa-kv', 336, 544, 288, 72, 'green', '128 KiB / token', ['2 × 32 × 8 × 128 × 2']),
    box('mqa-kv', 640, 544, 288, 72, 'amber', '16 KiB / token', ['2 × 32 × 1 × 128 × 2']),
  ].join('\n'));

// ---- latency-timeline --------------------------------------------------------
const tokenXs = [];
for (let x = 380; x <= 830; x += 50) tokenXs.push(x);
const latencyTimeline = svg('latency-timeline', 960, 456, '一次流式请求的时间线', '请求经过网络、排队和 Prefill 后返回第一个 token，这段时间是 TTFT；之后每个 token 之间的间隔是 TPOT 或 ITL；从发出请求到最后一个 token 是端到端延迟。',
  '一次流式请求的时间线：首字之前和首字之后', '端到端延迟 ≈ TTFT + TPOT × (输出 token 数 − 1)',
  [
    '<g transform="translate(0,-76)">',
    edge('M40 300H920', 'axis'), text(924, 290, '时间', 'xs', 'end'),
    cell(48, 268, 40, 32, 'fgray'), text(68, 256, '网络', 'xs', 'middle'),
    cell(88, 268, 112, 32, 'famber', '排队'),
    cell(200, 268, 130, 32, 'fblue', 'Prefill'),
    cell(330, 268, 18, 32, 'fgreen'),
    ...tokenXs.map(x => cell(x, 268, 18, 32, 'fgreen')),
    text(339, 336, '首 token', 'xs', 'middle'), text(839, 336, '最后一个 token', 'xs', 'middle'),
    // TTFT bracket
    edge('M48 236V222H348V236', 'line'), text(198, 212, 'TTFT：网络 + 排队 + Prefill', 's', 'middle'),
    // TPOT bracket
    edge('M389 236V222H439V236', 'line'), text(414, 212, 'TPOT / ITL', 's', 'middle'),
    text(600, 212, '每个 token 之间的间隔', 'xs', 'middle'),
    // E2E bracket
    edge('M48 360V374H848V360', 'line'), text(448, 398, '端到端延迟（E2E）：从发出请求到最后一个 token', 's', 'middle'),
    '</g>',
    box('ttft-note', 32, 354, 440, 80, 'blue', 'TTFT 决定“多久开始回应”', ['输入越长、排队越久，TTFT 越大']),
    box('tpot-note', 488, 354, 440, 80, 'green', 'TPOT 决定“字出得多快”', ['20 毫秒 ≈ 每秒 50 个 token']),
  ].join('\n'));

// ---- gpu-anatomy -------------------------------------------------------------
let sms = '';
for (let r = 0; r < 2; r++) for (let j = 0; j < 5; j++) sms += cell(56 + j * 82, 150 + r * 54, 70, 44, 'fgreen', 'SM', 's');
const gpuAnatomy = svg('gpu-anatomy', 960, 620, 'H100 SXM 的结构', '芯片上有 132 个 SM，每个 SM 里有 Tensor Core、寄存器和共享内存；全芯片共享约 50 MB 的 L2 缓存；芯片外是 80 GB 的 HBM 显存，带宽约 3.35 TB/s；BF16 稠密峰值算力约 989 TFLOPS。',
  'GPU 里有两种资源：算得多快，搬得多快', '以 H100 SXM 为例。片上存储快但小，HBM 大但要经过带宽有限的通道。',
  [
    `<g data-node="chip"><rect x="32" y="108" width="608" height="408" rx="10" class="gray"/><text x="52" y="136" class="k">GPU 芯片（H100 SXM）</text></g>`,
    sms,
    text(478, 204, '…共 132 个 SM', 's'),
    box('sm', 56, 276, 268, 116, 'green', '每个 SM 内部', ['Tensor Core：做矩阵乘法', '寄存器 + 共享内存（SRAM）']),
    box('l2', 348, 276, 268, 116, 'violet', 'L2 缓存', ['约 50 MB，全芯片共享', '比 HBM 快，容量小得多']),
    box('peak', 56, 412, 560, 84, 'blue', '峰值算力约 989 TFLOPS', ['BF16 稠密矩阵运算；厂商标的约 1979 是稀疏值']),
    box('hbm', 720, 208, 208, 208, 'amber', 'HBM 显存', ['容量 80 GB', '存放权重', '和 KV Cache']),
    edge('M642 296H716'), edge('M716 328H642'),
    text(679, 280, '3.35 TB/s', 'xs', 'middle'),
    text(32, 556, '类比：SM 是厨师，片上存储是手边的台面，HBM 是仓库，带宽是仓库到厨房的传送带。', 's'),
    text(32, 584, '一次计算的时间，至少是“运算量 ÷ 算力”和“搬运量 ÷ 带宽”中较大的那个。', 's'),
  ].join('\n'));

// ---- roofline ----------------------------------------------------------------
const X0 = 120, X1 = 900, Y0 = 470, Y1 = 130;
const lx0 = -0.5, lx1 = 4, ly0 = -0.3, ly1 = 3.3;
const rx = ai => X0 + (Math.log10(ai) - lx0) / (lx1 - lx0) * (X1 - X0);
const ry = tf => Y0 - (Math.log10(tf) - ly0) / (ly1 - ly0) * (Y0 - Y1);
const peak = 989, bw = 3.35, ridge = peak / bw;
const perf = ai => Math.min(peak, bw * ai);
const f1 = v => Math.round(v);
const pt = (ai, cls) => `<circle cx="${f1(rx(ai))}" cy="${f1(ry(perf(ai)))}" r="7" class="${cls}"/>`;
let ticks = '';
for (const v of [1, 10, 100, 1000, 10000]) ticks += edge(`M${f1(rx(v))} ${Y0}V${Y0 + 6}`, 'line') + text(f1(rx(v)), Y0 + 26, String(v), 'xs', 'middle');
for (const v of [1, 10, 100, 1000]) ticks += edge(`M${X0 - 6} ${f1(ry(v))}H${X0}`, 'line') + text(X0 - 10, f1(ry(v)) + 5, String(v), 'xs', 'end');
const roofline = svg('roofline', 960, 556, 'H100 SXM 上的 Roofline 模型', '横轴是算术强度，纵轴是可达算力，均为对数刻度。斜坡由 3.35 TB/s 带宽决定，水平线是 989 TFLOPS 的峰值，平衡点约 295 FLOP/Byte。单请求 Decode 约 1，注意力读 KV 在个位数，批大小 64 的 Decode 约 64，都在斜坡上；2000 token 的 Prefill 约 2000，在水平线上。',
  'Roofline：Decode 落在斜坡底部，Prefill 落在屋顶上', '示意图，各点位置按 989 TFLOPS 与 3.35 TB/s 计算，表示理论上限。',
  [
    edge(`M${X0} ${Y0}H${X1 + 10}`, 'axis'), edge(`M${X0} ${Y0}V${Y1 - 20}`, 'axis'),
    ticks,
    text(X1, Y0 + 54, '算术强度（FLOP/Byte，对数刻度）', 'xs', 'end'),
    text(X0 + 10, Y1 - 6, '可达算力（TFLOPS，对数刻度）', 'xs'),
    `<path d="M${f1(rx(10 ** lx0))} ${f1(ry(bw * 10 ** lx0))}L${f1(rx(ridge))} ${f1(ry(peak))}H${X1}" fill="none" stroke="#172b3a" stroke-width="3"/>`,
    `<path d="M${f1(rx(ridge))} ${f1(ry(peak))}V${Y0}" class="line" stroke-dasharray="6 5"/>`,
    text(f1(rx(ridge)) + 8, Y0 - 12, '平衡点 ≈ 295', 'xs'),
    text(f1(rx(ridge)) + 8, f1(ry(peak)) - 12, '峰值 989 TFLOPS', 's'),
    text(f1(rx(3)) - 30, f1(ry(bw * 3)) - 34, '带宽 3.35 TB/s', 's', 'end'),
    text(f1(rx(3)) - 30, f1(ry(bw * 3)) - 14, '决定斜坡', 's', 'end'),
    text(f1(rx(80)), 420, '访存受限', 't', 'middle'), text(f1(rx(2500)), 420, '计算受限', 't', 'middle'),
    pt(1, 'fred'), pt(4, 'famber'), pt(64, 'fblue'), pt(2000, 'fgreen'),
    text(f1(rx(1)) + 16, f1(ry(perf(1))) + 30, 'Decode 批大小 1：≈1', 's'),
    text(f1(rx(4)) + 16, f1(ry(perf(4))) + 30, '注意力读 KV：个位数', 's'),
    text(f1(rx(64)) - 16, f1(ry(perf(64))) - 14, 'Decode 批大小 64：≈64', 's', 'end'),
    text(f1(rx(2000)), f1(ry(peak)) + 30, 'Prefill 2000 token：≈2000', 's', 'middle'),
  ].join('\n'));

write({
  'series-map': seriesMap,
  'kv-recompute': kvRecompute,
  'kv-lifecycle': kvLifecycle,
  'memory-ledger': memoryLedger,
  'gqa-heads': gqaHeads,
  'latency-timeline': latencyTimeline,
  'gpu-anatomy': gpuAnatomy,
  roofline,
});
