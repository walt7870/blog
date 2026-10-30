// Figures for docs/basic/acoustics/npu-asr/ (15-19, 端侧 NPU 加速).
// Reuses the llm-architecture drawing kit but writes to public/acoustics/.
// Run: node .maintenance/speech/npu-asr/diagrams-npu-asr.mjs
import { writeFileSync } from 'node:fs';
import { svg, box, cell, edge, text } from '../../llm-architecture/svg-kit.mjs';

const out = new URL('../../../public/acoustics/', import.meta.url);

// Rough advance width of one character of the 15px secondary text: full-width
// glyphs are square, ASCII is about half. The checker measures the rendered
// box, so leave a margin instead of fitting exactly.
const chw = c => (/[⺀-￯]/.test(c) ? 15 : 8.2);
const measure = s => [...s].reduce((sum, c) => sum + chw(c), 0);

// Greedy wrap into lines that fit `limit` pixels, breaking between characters
// for Chinese and at spaces for Latin runs.
function wrap(s, limit) {
  // Latin words, numbers and units stay in one piece; Chinese breaks anywhere.
  const units = s.match(/[0-9A-Za-z][0-9A-Za-z.%/+±-]*|[\s\S]/g) ?? [];
  const lines = [];
  let line = '';
  for (const u of units) {
    if (measure(line + u) > limit && line) {
      // avoid starting a line with closing punctuation
      if ('，。；：、）」』”%'.includes(u)) { lines.push(line + u); line = ''; continue; }
      lines.push(line.replace(/\s+$/, '')); line = u.replace(/^\s+/, '');
    } else line += u;
  }
  if (line) lines.push(line);
  return lines;
}

// A box whose height follows its wrapped body text. Returns [svg, height].
function card(node, x, y, w, cls, title, body, kicker) {
  const limit = w - 44;
  const lines = (Array.isArray(body) ? body : [body]).flatMap(p => wrap(p, limit));
  const top = kicker ? 52 : 36;
  const h = top + 28 + (lines.length - 1) * 23 + 16;
  return [box(node, x, y, w, h, cls, title, lines, kicker), h];
}

// 15: the two device paths an exported model can take, and where each one refuses it.
function twoPaths() {
  const W = 1400;
  let b = '';
  const [src] = card('src', 450, 104, 500, 'gray', '上游导出的 ONNX 模型',
    ['encoder、decoder、joiner 三件；117 路输入 117 路输出，一拍是 640 ms 音频。']);
  b += src;
  b += edge('M640 196V232');
  b += edge('M760 196V232');
  const colA = 96, colB = 744, cw = 560;
  let ya = 234, yb = 234;
  const push = (side, node, cls, title, body, kicker) => {
    const x = side === 'a' ? colA : colB;
    const y = side === 'a' ? ya : yb;
    const [s, h] = card(node, x, y, cw, cls, title, body, kicker);
    b += s;
    b += edge(`M${x + cw / 2} ${y + h}V${y + h + 32}`);
    if (side === 'a') ya = y + h + 34; else yb = y + h + 34;
  };
  push('a', 'a1', 'blue', '在线通路：主机只做格式转换',
    ['转换器把 ONNX 转成设备运行时的图格式，精度和量化策略在这一步由命令行开关表达。'], '通路一');
  push('a', 'a2', 'blue', '设备侧在线能力校验',
    ['加载时由系统服务判断这张图能否交给 NPU，通过才真正编译；不通过只回一个错误码：Authentication failed。'], '');
  push('b', 'b1', 'green', '离线通路：主机编译成硬件指令',
    ['离线编译器把图编译成设备可直接加载的模型文件，量化由配套的后量化工具单独完成。'], '通路二');
  push('b', 'b2', 'green', '设备侧只做兼容性确认',
    ['先问一次「这个文件这颗芯片收不收」，返回 0 为收，随后按离线模型构造执行器并绑定 117 路张量。这条路上没有在线校验。'], '');
  const [bad, hbad] = card('a3', colA, ya, cw, 'red', 'encoder 在这里被挡住',
    ['体量上限落在 201—268 MB，按反量化后的字节数算。权重量化得到的 169 MB 文件仍被拒，而且是 4272 ms 的慢拒；明显超限的 FP32 是 185 ms 的秒拒。'], '');
  const [ok, hok] = card('b3', colB, yb, cw, 'green', 'encoder 在这里通过',
    ['后量化得到的 150.3 MiB 模型兼容性返回 0，117 路输入输出全部对上，构建耗时 3.67 s。没有体量拒绝，但每拍比 CPU 慢 2.23 倍。'], '');
  b += bad + ok;
  const noteY = Math.max(ya + hbad, yb + hok) + 34;
  const [note, hnote] = card('note', colA, noteY, 1208, 'amber', '一个容易走错的岔口',
    ['两条路的拒绝原因不通用：按在线通路量出来的体量上限，不能拿去解释离线通路的失败；反过来把在线通路的图格式喂给离线设备，会在构建阶段直接失败，而不会报那个在线校验的错误。']);
  b += note;
  return svg('npu-asr-two-paths', W, noteY + hnote + 32, '端侧 NPU 的两条通路',
    '同一份 ONNX 模型分别走在线转换加设备侧能力校验，和主机离线编译加兼容性确认两条通路，前者在体量上限处拒收 encoder，后者通过。',
    '同一份模型，两条通往 NPU 的路',
    '区别不在模型，而在「谁来判断这张图能不能上 NPU」：一条在设备上临时判断，一条在主机编译时就定下来。', b);
}

// 16: which compression step clears the size gate, and which one is undone at run time.
function sizeGate() {
  const W = 1400;
  const x0 = 318, scale = 1.28; // px per MB
  const X = mb => x0 + mb * scale;
  let b = '';
  b += `<path d="M${x0} 556H${X(650)}" class="axis"/>`;
  for (const mb of [0, 150, 300, 450, 600]) b += `<path d="M${X(mb)} 550V562" class="axis"/>` + text(X(mb), 582, `${mb} MB`, 'xs', 'middle');
  const rows = [
    { y: 134, label: 'FP32 原始权重', mb: 617, cls: 'fred', verdict: '秒拒 185 ms' },
    { y: 214, label: '转换器 FP16', mb: 168, cls: 'fgreen', verdict: '通过' },
    { y: 294, label: '权重量化', mb: 169, cls: 'fred', verdict: '慢拒 4272 ms' },
    { y: 374, label: '全量量化', mb: 160, cls: 'fred', verdict: '图不被识别' },
    { y: 454, label: '离线后量化 INT8', mb: 150, cls: 'fgreen', verdict: '通过（离线通路）' },
  ];
  for (const r of rows) {
    b += text(32, r.y + 28, r.label, 't');
    b += cell(x0, r.y, X(r.mb) - x0, 40, r.cls, `${r.mb} MB`, 'xs');
    // keep the verdicts in one column clear of the gate band
    b += text(Math.max(X(r.mb) + 14, X(276)), r.y + 26, r.verdict, 's');
  }
  // The gate band sits on top of the bars, translucent, so a bar that crosses it
  // still reads as a bar rather than being cut in two.
  b += `<rect x="${X(201)}" y="118" width="${X(268) - X(201)}" height="420" rx="4" class="famber" opacity="0.45"/>`;
  b += `<path d="M${X(201)} 118V538M${X(268)} 118V538" class="line"/>`;
  b += text(X(201) + 8, 112, '实测上限落在这条带子里：201—268 MB', 'xs');
  const [why, h] = card('why', 32, 612, 1336, 'gray', '为什么「文件变小了」不等于「能放进去」',
    ['体量门槛作用在运行时真正要摆开的字节数，不是磁盘上的文件大小。权重量化只改变文件里的存法，加载后仍要还原成原精度参与计算，所以它在门槛面前等于没做。只有把计算精度本身降下来，或者由离线编译器把量化后的指令和权重一起固化，门槛才会让路。',
      '判断方法也由此确定：不要只记录文件大小，还要记录被拒绝的耗时量级——秒拒是体量，慢拒是先摆开再算、算完才发现超限。']);
  b += why;
  return svg('npu-asr-size-gate', W, 612 + h + 32, '压缩手段与体量门槛',
    '五种压缩结果与设备侧体量上限的关系：FP32 秒拒，转换器 FP16 通过，权重量化被运行时反量化后慢拒，全量量化的转换节点不被识别，离线后量化 INT8 通过。',
    '哪一级压缩真的过了门槛',
    '横轴是体量，琥珀色带子是实测出的上限区间；注意同为 169 MB 和 168 MB，一个被拒一个通过。', b);
}

// 17: from the exported graph to a model the device will load, with the three gates.
function convertPipeline() {
  const W = 1400;
  let b = '';
  const w = 300, gap = 40, y = 128;
  const steps = [
    ['gray', '上游 FP32 图', '10891 节点，batch 维是符号维，是所有后续产物的起点。'],
    ['blue', '固定形状与算子重写', '按目标批次固定输入形状，替换设备拒收的算子，共改 20 个节点。'],
    ['violet', '后量化', '权重按绝对值最大、激活按滑动极值定标；校准集要求全静态形状。'],
    ['green', '离线编译', '编译成设备可加载的模型文件，编译器自己会消除冗余转置。'],
  ];
  let hmax = 0;
  steps.forEach(([cls, t, l], i) => {
    const x = 32 + i * (w + gap);
    const [s, h] = card(`s${i}`, x, y, w, cls, t, [l], `第 ${i + 1} 步`);
    b += s; hmax = Math.max(hmax, h);
    if (i < steps.length - 1) b += edge(`M${x + w} ${y + 64}H${x + w + gap - 4}`);
  });
  const gy = y + hmax + 36;
  const gates = [
    [372, '关卡一：算子集预检', '只做静态检查，不跑数值。实测 3766 个节点全部支持。'],
    [712, '关卡二：宿主等价性验证', '重写前后同一批输入喂两次，117 路输出逐一比对偏差。'],
    [1052, '关卡三：设备准入', '兼容性查询返回 0 才算收，再看张量路数与构建耗时。'],
  ];
  let ghmax = 0;
  for (const [x, t, l] of gates) {
    b += edge(`M${x + 150} ${y + hmax}V${gy - 4}`);
    const [s, h] = card(`g${x}`, x, gy, 300, 'amber', t, [l]);
    b += s; ghmax = Math.max(ghmax, h);
  }
  const ry = gy + ghmax + 32;
  const [ex, hex] = card('ex', 32, ry, 644, 'red', '三道关卡各自漏掉什么',
    ['关卡一通过不代表图是自洽的：一处漏改的整数位宽让宿主运行时报错，而离线编译器照样接受并产出了模型文件。',
      '关卡二通过不代表设备会收：批次为 16 的图在宿主上 117 路输出都对，设备仍在构建阶段拒收。',
      '关卡三通过不代表值得用：模型收下来了，但每拍比 CPU 慢。'], '失败反例');
  const [rw, hrw] = card('rw', 716, ry, 652, 'blue', '重写要保持语义，不只是换名字',
    ['掩码类算子不能直接删：上游用 −1 占位表示「没有历史」，去掉掩码会把占位当成真实索引；换成零填充查表后，占位行天然取到零。',
      '末尾的降维算子被适配层拒收时，换成等价的形状重排即可，输出字节完全一致。',
      '整数位宽也要改：设备侧的加法不收 64 位整数。'], '怎么改');
  b += ex + rw;
  const vy = ry + Math.max(hex, hrw) + 32;
  const [vf, hvf] = card('verify', 32, vy, 1336, 'green', '偏差到多少算过',
    ['逐位一致是最强的判据：decoder 的两处重写在 2506 组输入上做到逐位一致，可以直接宣布等价。encoder 固定批次时做过常量折叠，重写后 117 路输出最大绝对偏差 9.59e-4，属于浮点重排的量级。',
      '但它只能说明「图没改错」，不能替代识别准确率的评测。两者要分开写进验收口径：等价性验证保证换图没引入错误，准确率评测回答换了精度之后业务还能不能用。']);
  b += vf;
  return svg('npu-asr-convert-pipeline', W, vy + hvf + 32, '转换流水线与三道关卡',
    '从上游 FP32 图经固定形状与算子重写、后量化、离线编译得到设备模型，三道关卡分别是算子集预检、宿主等价性验证和设备准入，并列出各自漏掉的问题。',
    '从导出的图到设备肯收的模型',
    '四步串起来不难，难在每一步后面都要有一道能独立否掉它的关卡，而三道关卡各有各的盲区。', b);
}

// 18: how the latency and power numbers were produced.
function measureProtocol() {
  const W = 1400;
  let b = '';
  const pre = [
    [32, 420, 'red', '先过门禁，否则不采数', '供电必须断开数据线、走电池。插线时电池电流被充电回路钳住、与负载脱钩，两档读数会一模一样，这不是差异小，是信号没进来。', '前提'],
    [476, 440, 'blue', '按真实节拍打拍', '一拍是 64 帧、640 ms 音频，按绝对时间边界排下一拍的起点，避免误差累计，同时记录超时拍数。背靠背测的是峰值，定速测的才是占空比。', '节拍'],
    [940, 428, 'green', '两档必须处理等量音频', '同样 10 分钟、同样 937 拍，两档吃掉的音频完全一样。否则快的那一档在同样墙钟时间里多干了活，功耗对比没有意义。', '口径'],
  ];
  let ph = 0;
  for (const [x, w, cls, t, l, k] of pre) { const [s, h] = card(`p${x}`, x, 104, w, cls, t, [l], k); b += s; ph = Math.max(ph, h); }
  let y = 104 + ph + 38;
  const legs = [
    ['gray', '第一段：空载基线', '同一个应用、同一块屏幕、同一个采样器，只把模型换成一个 100 节点的极小图，占空比 0.29%。', '1.21 W'],
    ['violet', '第二段：NPU', '离线编译的 INT8 模型，每拍 147 ms，占空比 23%，937 拍里没有一次超时。', '1.31 W'],
    ['node', '中间静置 5 分钟', '让机身降温，避免上一段的余热算进下一段。', '—'],
    ['amber', '第三段：CPU', '同一张图的 INT8 版本走 4 线程 CPU，每拍 69 ms，占空比 11%。', '1.52 W'],
  ];
  for (const [cls, t, l, v] of legs) {
    const [s, h] = card(`leg${y}`, 32, y, 1010, cls, t, [l]);
    b += s + cell(1062, y, 306, h, 'fgray', `整机功耗 ${v}`, 's');
    y += h + 18;
  }
  y += 16;
  const [calc, hc] = card('calc', 32, y, 660, 'green', '减掉地板才是推理本身',
    ['NPU 净增 +98±22 mW，CPU 净增 +311±42 mW；按每拍摊开是 63 mJ 对 199 mJ，NPU 省约 69%。整机只差 14%，因为屏幕把差异摊薄了。']);
  const [mean, hm] = card('mean', 716, y, 652, 'red', '为什么只能用均值',
    ['1 Hz 采样大多落在 CPU 两次突发之间的空闲期。按中位数算，CPU 净增只有 +80 mW，看起来比 NPU 还省，这是采样假象。峰值也要记：p90 为 1.43 W 对 2.10 W。']);
  b += calc + mean;
  return svg('npu-asr-measure-protocol', W, y + Math.max(hc, hm) + 32, '时延与功耗的测量协议',
    '测量前的三项前提，三段顺序对照（空载基线、NPU、静置、CPU）与两段算法说明：减去空载地板得到推理净功耗，以及为什么必须用均值而不是中位数。',
    '这些数字是怎么测出来的',
    '一条口径没立住，后面所有结论都会塌：先立供电、节拍和等量音频三条，再做三段顺序对照。', b);
}

// 19: the five hypotheses, the synthetic rulers that killed them, and the real cause.
function whySlower() {
  const W = 1400;
  let b = '';
  const [rl, hrl] = card('rulers', 32, 104, 636, 'blue', '先用合成模型量出几把尺子',
    ['每节点地板价 0.0024 ms，由 100、400、800、1600 节点的链量出，严格线性。',
      '换成真实形状后每节点 0.0035 ms。',
      '每路张量绑定 0.003 ms：117 路对 8 路、同体积只差 0.32 ms。',
      '权重读带宽 23.9 GB/s，由扫 8.39、33.6、81.9 MB 三点量出。',
      '形状比体积重要 5.6 倍：同为 64 KB 的二维与四维张量。',
      '填满批次：16 倍数据只花 2.44 倍时间。'], '方法');
  const [hy, hhy] = card('hyp', 700, 104, 668, 'red', '五个假说被同一批尺子否掉',
    ['「九成多的时间是每节点过路费」：实测小 15 倍。',
      '「砍到 1605 个节点就能打平 CPU」：折 600 个节点只值 1.4 ms。',
      '「把 99 处激活展开折回去是必要铺垫」：同样只值 1.4 ms。',
      '「234 路张量绑定要 58 ms」：实测 2.4 ms，松了 20 倍。',
      '「每秒只搬 63 MB，所以带宽不是瓶颈」：漏算了权重和激活，结论侥幸对、依据无效。'], '反例');
  b += rl + hy;
  let y = 104 + Math.max(hrl, hhy) + 44;
  const bx = 32, bw = 1336, total = 144;
  const seg = [[13.2, 'famber', '节点地板价 13.2'], [6.6, 'fblue', '权重 6.6'], [2.4, 'fviolet', '绑定 2.4'], [121.8, 'fgreen', '真实算术约 122 ms，约 83%']];
  b += text(32, y, '每拍 144 ms 的去向：可归因的开销合计只有约 22 ms', 't');
  let cx = bx;
  seg.forEach(([v, cls, label], i) => {
    const w = (v / total) * bw;
    b += cell(cx, y + 14, w, 56, cls, w > 180 ? label : '', 'xs');
    // narrow slices get their label underneath, staggered so they do not touch
    if (w <= 180) b += text(cx + w / 2, y + 94 + (i % 2 ? 22 : 0), label, 'xs', 'middle');
    cx += w;
  });
  y += 142;
  const [cause, hca] = card('cause', 32, y, 636, 'amber', '真因：张量填不满计算单元',
    ['矩阵单元按 16×16×16 的立方块工作，而 encoder 八成节点的形状是时间 8、批次 1。',
      '8 乘 1 的瓦片只填满立方块的三十二分之一，算一次的代价和填满时相差不大，于是「算力更强」没有兑现。',
      '这不是算子选得不好：搬运合计只占 6%，没有开销可削。'], '结论');
  const [con, hco] = card('contrast', 700, y, 668, 'green', '同一颗 NPU 上另一个模型赚了 11 倍',
    ['一个 90 节点的说话人编码器每次处理 10 秒窗口，在同一颗 NPU 上从 307.7 ms 降到 27.7 ms。',
      '差别不在节点数，而在每个节点带的数据量：它的张量塞得满，流式识别的 640 ms 小块塞不满。',
      '所以「这颗 NPU 行不行」问得不对，要问「这张图的形状行不行」。'], '对照');
  b += cause + con;
  y += Math.max(hca, hco) + 32;
  const [nx, hnx] = card('next', 32, y, 1336, 'violet', '顺着真因往下试，又撞上一道算子墙',
    ['既然填满批次是唯一测到有效的杠杆，就把同一张图按 16 路并行重转：宿主验证通过，设备却在构建阶段拒收，日志指名注意力里的批量矩阵乘不被支持。',
      '隔离实验把原因缩到一点：同一个算子、同一形状，浮点版本设备收、量化版本不收，这颗芯片没有量化版批量矩阵乘的实现。批次为 1 时这些节点降解成普通矩阵乘，所以反而能跑。补救方向是让这 19 个节点保持浮点，它们的权重合计只有 0.1 MB，但这一步在记录时点尚未跑完。']);
  b += nx;
  return svg('npu-asr-why-slower', W, y + hnx + 32, '为什么没有变快',
    '用合成模型量出每节点地板价、张量绑定、权重带宽和形状敏感度四把尺子，否掉五个关于开销的假说，得出真因是张量形状填不满矩阵单元，并给出同一颗 NPU 上另一个模型获益 11 倍的对照。',
    '为什么模型上了 NPU 却没有变快',
    '先用合成模型量出几把尺子，再用尺子去量那些听起来合理的解释：五个全部不成立，剩下的只有形状。', b);
}

const figures = {
  'npu-asr-two-paths': twoPaths(),
  'npu-asr-size-gate': sizeGate(),
  'npu-asr-convert-pipeline': convertPipeline(),
  'npu-asr-measure-protocol': measureProtocol(),
  'npu-asr-why-slower': whySlower(),
};
for (const [name, content] of Object.entries(figures)) writeFileSync(new URL(`${name}.svg`, out), content);
console.log(`wrote ${Object.keys(figures).join(', ')}`);
