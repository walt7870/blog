// Figures for chapters 06, 07 and 13 of docs/ai/model-training/.
// Run: node .maintenance/model-training/diagrams-pretrain.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

const rect = (x, y, w, h, fill, stroke = 'none', rx = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

// ---- data-pipeline-funnel (ch06) ---------------------------------------------
// Bar widths are illustrative only; the one real ratio is FineWeb → FineWeb-Edu in the callout.
const stages = [
  ['原始抓取', 1.00, '网页 HTML：导航、广告、模板、重复页都在'],
  ['URL 过滤', 0.88, '黑名单去掉恶意、成人站点'],
  ['抽取正文', 0.62, 'trafilatura 等工具只留正文'],
  ['语言识别', 0.52, 'fastText 判语种，按语言分桶'],
  ['规则过滤', 0.36, '重复行、过短、符号比例异常、脏词'],
  ['去重', 0.22, 'URL、精确哈希、MinHash 近似去重'],
  ['隐私与安全', 0.20, '替换邮箱和 IP，剔除 PII 密集站点'],
  ['模型打分', 0.09, '分类器给质量或“教育价值”打分'],
];
let funnel = '';
stages.forEach(([name, r, note], i) => {
  const y = 112 + i * 54, h = 40, maxW = 420, cx = 520, w = Math.round(maxW * r);
  funnel += rect(32, y, 196, h, '#eff6ff', '#60a5fa');
  funnel += text(48, y + 26, `${i + 1}  ${name}`, 't');
  funnel += rect(cx - w / 2, y, w, h, i === stages.length - 1 ? '#6ee7b7' : '#93c5fd');
  funnel += text(764, y + 26, note, 's');
  if (i < stages.length - 1) funnel += edge(`M130 ${y + h}V${y + 54}`, 'line');
});
const dataFunnel = svg('data-funnel', 1200, 640, '网页语料处理流水线：每一步都只留下更少的文本', '原始网页依次经过 URL 过滤、正文抽取、语言识别、规则过滤、去重、隐私与安全处理、模型打分，剩余量逐级减少。条形长度是示意；真实例子：FineWeb 约 15T token，用教育价值分类器筛到 3 分以上后剩 1.3T，删掉 92%。',
  '一份网页语料怎样被一层层筛小', '条形长度只示意剩余量的趋势，不是某份报告的真实比例；真实数字见底部。',
  [
    funnel,
    text(520, 104, '剩余文本量（示意）', 'xs', 'middle'),
    box('fw', 32, 556, 1136, 64, 'green', '', [], ''),
    text(52, 584, '真实例子（FineWeb，2024）：96 个 Common Crawl 快照处理后约 15T token；', 's'),
    text(52, 607, '再用教育价值分类器只留 3 分以上，剩 1.3T token，相当于又删掉 92%。', 's'),
  ].join('\n'));

// ---- data-sources-mix (ch06) -------------------------------------------------
const sources = [
  ['网页', 'Common Crawl 等公开抓取'],
  ['代码', '公开仓库，按许可证筛'],
  ['书籍与论文', '长文本、结构严谨'],
  ['数学与推理', '题解、证明、教材'],
  ['多语言文本', '按语种识别后分别去重'],
];
let srcBoxes = '';
sources.forEach(([t, s], i) => {
  const y = 112 + i * 76;
  srcBoxes += box(`src${i}`, 32, y, 290, 64, 'node', '', [], '');
  srcBoxes += text(50, y + 28, t, 't') + text(50, y + 52, s, 'xs');
  srcBoxes += edge(`M322 ${y + 32}C370 ${y + 32} 370 177 410 177`);
});
const mix = [[50, '#93c5fd', '通用知识'], [25, '#6ee7b7', '数学与推理'], [17, '#c4b5fd', '代码'], [8, '#fcd34d', '多语言']];
let mixBar = '', mx = 440;
mix.forEach(([p, c, n], i) => {
  const w = Math.round(p * 7.2);
  mixBar += rect(mx, 330, w, 56, c, 'none', 0);
  mixBar += text(mx + w / 2, 364, `${p}%`, 't', 'middle');
  const ly = 416;
  mixBar += text(mx + (i === 3 ? w : 0), ly, n, 's', i === 3 ? 'end' : 'start');
  mx += w;
});
const dataMix = svg('data-mix', 1200, 560, '多种来源的数据经过分类和配比实验，组成预训练数据配比', '网页、代码、书籍与论文、数学与推理、多语言文本先分类，再用小模型配比实验决定比例。Llama 3 公布的主训练配比约为通用知识 50%、数学与推理 25%、代码 17%、多语言 8%。训练末尾的退火阶段再上采样高质量数据，且不放常用基准的训练集。',
  '来源各不相同的文本，按比例混成一锅', 'Llama 3 论文公布的主训练配比；比例按 token 计，类别来自内容分类，不是来源。',
  [
    srcBoxes,
    box('mixer', 410, 112, 760, 130, 'blue', '分类 + 配比实验', ['先给每篇文档分主题类别，网上过多的类别（如艺术与娱乐）下采样；', '再用小模型试不同配比，拟合规模定律，预测大模型在哪个配比下最好。'], '决定比例'),
    edge('M790 242V312'),
    text(440, 320, 'Llama 3 主训练配比', 'k'),
    mixBar,
    box('anneal', 410, 470, 760, 72, 'amber', '', [], ''),
    text(428, 498, '退火数据：训练最后一小段上采样极高质量的来源；', 's'),
    text(428, 522, '常用基准的训练集不放进去，避免分数被“喂”出来。', 's'),
  ].join('\n'));

// ---- data-bpe-merges (ch06) --------------------------------------------------
const merges = [
  ['第 1 次', 'e + s → es', '9 次'],
  ['第 2 次', 'es + t → est', '9 次'],
  ['第 3 次', 'l + o → lo', '7 次'],
  ['第 4 次', 'lo + w → low', '7 次'],
];
let mergeRows = '';
merges.forEach(([n, m, c], i) => {
  const y = 236 + i * 46;
  mergeRows += text(56, y, n, 's') + text(140, y, m, 'm') + text(500, y, c, 's', 'end');
});
function tokRow(x, y, pieces, cls) {
  let s = '', cx = x;
  pieces.forEach(([t, w, k]) => { s += cell(cx, y, w, 36, k ?? cls, t, w < 40 ? 'xs' : 's'); cx += w + 4; });
  return s;
}
const gpt2 = Array.from({ length: 16 }, () => ['', 26, 'fgray']);
const llama2 = [['▁', 30], ['年', 34], ['E5', 32, 'fred'], ['81', 32, 'fred'], ['87', 32, 'fred'], ['E6', 32, 'fred'], ['80', 32, 'fred'], ['8E', 32, 'fred'], ['么', 34], ['E7', 32, 'fred'], ['94', 32, 'fred'], ['B3', 32, 'fred'], ['请', 34], ['？', 34]];
const llama3 = [['年', 50], ['假', 50], ['怎么', 76], ['申请', 76], ['？', 50]];
const dataBpe = svg('data-bpe', 1200, 600, 'BPE 合并过程与三种分词器切分同一句中文的结果', '左：在 low×5、lower×2、newest×6、widest×3 的小语料上，BPE 依次把出现最多的相邻对合并成新 token：es、est、lo、low，没见过的 lowest 被切成 low + est。右：“年假怎么申请？”在 GPT-2 分词器下是 16 个字节片段，Llama 2 分词器 14 个（假、怎、申各退回 3 个字节），Llama 3 分词器 5 个。',
  'BPE：从字符出发，反复合并最常见的相邻对', '左边是手算的小例子；右边是本机用三个公开分词器实测的切分结果。',
  [
    box('bpe', 32, 104, 500, 470, 'node', '', [], '训练分词器'),
    text(56, 162, '语料词频：low ×5，lower ×2，newest ×6，widest ×3', 's'),
    text(56, 194, '起点：每个词拆成单个字母，统计相邻对出现次数', 'xs'),
    mergeRows,
    edge('M56 412H508', 'line'),
    text(56, 444, '学到的合并规则按顺序存进词表。切新词时照顺序套用：', 'xs'),
    text(56, 478, 'newest → n e w est', 'm'),
    text(56, 510, 'lowest（训练时没见过）→ low est', 'm'),
    text(56, 548, '常见片段变成整块，生僻词也能拆成已知片段', 'xs'),
    box('cut', 560, 104, 608, 470, 'node', '', [], '同一句“年假怎么申请？”'),
    text(584, 162, 'GPT-2 分词器（词表 50,257）：16 个 token', 's'),
    tokRow(584, 176, gpt2, 'fgray'),
    text(584, 252, 'Llama 2 分词器（32,000）：14 个，红色是退回的字节', 's'),
    tokRow(584, 266, llama2.slice(0, 14), 'fblue'),
    text(584, 342, 'Llama 3 分词器（128,256）：5 个', 's'),
    tokRow(584, 356, llama3, 'fgreen'),
    edge('M584 420H1144', 'line'),
    text(584, 452, '同样 115 字的年假制度段落（单段样例实测）：', 'xs'),
    text(584, 482, 'GPT-2 246 个 · Llama 2 158 个 · Llama 3 93 个 · Qwen2.5 82 个', 's'),
    text(584, 516, '词表里中文片段越多，同一段话的 token 越少，', 'xs'),
    text(584, 540, '训练和推理按 token 计费、按 token 占上下文。', 'xs'),
  ].join('\n'));

// ---- pretrain-next-token (ch07) ----------------------------------------------
const toks = ['员工', '申请', '年假', '需', '提前', '三个', '工作日'];
const tgts = ['申请', '年假', '需', '提前', '三个', '工作日', '提交'];
const probs = [0.05, 0.30, 0.20, 0.60, 0.45, 0.85, 0.40];
let ntp = '';
toks.forEach((t, i) => {
  const x = 120 + i * 150;
  ntp += cell(x, 128, 120, 44, 'fblue', t, 't');
  ntp += edge(`M${x + 60} 172V210`);
  ntp += edge(`M${x + 60} 290V326`);
  ntp += cell(x, 330, 120, 44, 'fgreen', tgts[i], 't');
  const ph = Math.round(probs[i] * 90);
  ntp += rect(x + 30, 480 - ph, 60, ph, '#c4b5fd', 'none', 3);
  ntp += text(x + 60, 474 - ph, probs[i].toFixed(2), 'xs', 'middle');
  ntp += text(x + 60, 504, (-Math.log(probs[i])).toFixed(2), 's', 'middle');
});
const pretrainNextToken = svg('pretrain-next-token', 1200, 600, '预测下一个 token：每个位置都在猜下一个词，并按猜对的概率计损失', '一句话“员工申请年假需提前三个工作日提交”被切成 token，输入是前 7 个，目标是整体右移一位的 7 个。模型在每个位置输出对下一个 token 的概率分布；正确 token 的概率越低，该位置损失 −ln p 越大。示意数值下 7 个位置的平均损失约 1.17。',
  '一句话就是七道“猜下一个词”的题', '切分和概率都是示意值；真实训练里每个 batch 有几百万个这样的位置一起算。',
  [
    text(32, 156, '输入', 'k'),
    box('model', 120, 210, 1020, 80, 'violet', '', [], ''),
    text(630, 248, 'Transformer 解码器：每个位置只能看见它左边的 token（因果掩码）', 't', 'middle'),
    text(630, 276, '输出：词表里 128,256 个候选各自的概率', 's', 'middle'),
    text(32, 358, '目标', 'k'),
    text(32, 430, '正确词', 'k'), text(32, 450, '的概率', 'k'),
    edge('M120 480H1140', 'line'),
    text(32, 504, '−ln p', 'k'),
    ntp,
    text(120, 560, '损失 = 平均(−ln p) = (3.00 + 1.20 + 1.61 + 0.51 + 0.80 + 0.16 + 0.92) ÷ 7 ≈ 1.17', 'm'),
  ].join('\n'));

// ---- pretrain-stages (ch07) --------------------------------------------------
// Top: schematic lr curves. Bottom: Llama 3 pretraining stages (widths not to scale).
const X0 = 120, X1 = 1140, Ytop = 140, Ybot = 330;
const xs = t => X0 + t * (X1 - X0), ys = v => Ybot - v * (Ybot - Ytop);
let cos = `M${xs(0)} ${ys(0)}`, wsd = `M${xs(0)} ${ys(0)}`;
for (let i = 1; i <= 100; i++) {
  const t = i / 100, w = 0.05;
  const c = t < w ? t / w : 0.01 + 0.99 * 0.5 * (1 + Math.cos(Math.PI * (t - w) / (1 - w)));
  const d = t < w ? t / w : t < 0.9 ? 1 : 1 - (t - 0.9) / 0.1;
  cos += `L${xs(t).toFixed(1)} ${ys(c).toFixed(1)}`;
  wsd += `L${xs(t).toFixed(1)} ${ys(d * 0.92).toFixed(1)}`;
}
const pretrainStages = svg('pretrain-stages', 1200, 700, '预训练的学习率调度与 Llama 3 的三个训练阶段', '上半部分：两种常见学习率曲线的示意，余弦调度预热后一路平滑下降；WSD 调度预热后长时间保持不变，最后约 10% 的 token 快速衰减。下半部分：Llama 3 的预训练分三段，主训练约 15T token、余弦学习率、按通用知识 50% 数学推理 25% 代码 17% 多语言 8% 配比；长上下文扩展分 6 个阶段从 8K 到 128K，约 800B token；退火阶段在最后 40M token 把学习率线性降到 0，并上采样高质量数据。',
  '学习率怎样走，数据怎样换', '上：两种学习率调度的形状（示意）。下：Llama 3 论文公布的预训练阶段，宽度不按 token 比例。',
  [
    `<path d="M${X0} ${Ytop - 10}V${Ybot}H${X1 + 10}" class="axis"/>`,
    text(X0 - 12, Ytop + 4, '峰值', 'xs', 'end'), text(X0 - 12, Ybot, '0', 'xs', 'end'),
    text(X1, Ybot + 24, '训练进度（token）→', 'xs', 'end'),
    `<path d="${cos}" fill="none" stroke="#60a5fa" stroke-width="3"/>`,
    `<path d="${wsd}" fill="none" stroke="#20a28c" stroke-width="3" stroke-dasharray="10 6"/>`,
    text(xs(0.07), ys(1) - 10, '预热', 'xs'),
    text(150, 270, '蓝实线：余弦调度（Llama 3 用）', 's'),
    text(150, 296, '绿虚线：WSD，预热—稳定—衰减', 's'),
    text(xs(0.9) - 8, ys(0.5), '最后约 10% 快速衰减', 'xs', 'end'),
    box('main', 32, 380, 600, 230, 'blue', '① 主训练', ['约 15T token（旗舰 15.6T）', '序列 4K → 8K，批大小 4M → 16M token', 'lr 预热 8000 步后余弦下降（405B）', '配比：通用 50% · 数学推理 25%', '代码 17% · 多语言 8%'], '最长、最贵'),
    box('long', 656, 380, 260, 230, 'violet', '② 长上下文', ['6 个阶段', '8K 逐步到 128K', '约 800B token', '每段确认短文本能力', '恢复、长文本找得到'], ''),
    box('anneal', 940, 380, 228, 230, 'amber', '③ 退火', ['最后 40M token', 'lr 线性降到 0', '上采样高质量数据', '不含基准训练集'], ''),
    edge('M632 495H656'), edge('M916 495H940'),
    text(32, 650, 'RoPE base 一开始就设为 500,000，为后面拉长上下文留余地。退火对 8B 的 GSM8k、MATH 验证集分别提升 24.0% 和 6.4%，对 405B 几乎没有提升。', 'xs'),
  ].join('\n'));

// ---- distill-pipeline (ch13) -------------------------------------------------
const flow = [
  ['q', '问题集', ['真实问法 + 改写', '覆盖拒答、跨条款'], 'node'],
  ['t', '教师生成', ['8B + 检索片段', '每题采样多份回答'], 'blue'],
  ['f', '程序过滤', ['条款编号在片段里', '格式、拒答正确'], 'amber'],
  ['s', '学生 SFT', ['1.5B 学教师回答', '只对回答算损失'], 'green'],
  ['e', '同卷评估', ['教师 / 学生原版', '/ 学生蒸馏后'], 'violet'],
];
let flowS = '';
flow.forEach(([k, t, l, c], i) => {
  const x = 32 + i * 230;
  flowS += box(`d-${k}`, x, 108, 206, 130, c, t, l, `${i + 1}`);
  if (i < flow.length - 1) flowS += edge(`M${x + 206} 173H${x + 230}`);
});
const cand = ['工作日', '自然日', '小时', '月'];
const hard = [1, 0, 0, 0], t1 = [0.80, 0.12, 0.05, 0.03], t2 = [0.55, 0.21, 0.14, 0.11];
function distBars(x0, vals, color, title) {
  let s = text(x0, 344, title, 's');
  vals.forEach((v, i) => {
    const x = x0 + i * 86, h = Math.round(v * 150);
    s += rect(x, 520 - h, 60, Math.max(h, 2), color, 'none', 3);
    s += text(x + 30, 512 - h, v === 0 ? '0' : v.toFixed(2), 'xs', 'middle');
    s += text(x + 30, 544, cand[i], 'xs', 'middle');
  });
  return s;
}
const distillPipeline = svg('distill-pipeline', 1200, 640, '资料助手的序列级蒸馏流程，以及硬标签和软标签的区别', '上：问题集交给 8B 教师结合检索片段生成回答，程序过滤掉条款编号不在片段里、格式错误、该拒答没拒答的回答，剩下的用来对 1.5B 学生做 SFT，最后用同一份评测集比较教师、学生原版和蒸馏后的学生。下：预测“年假需提前三个”的下一个 token 时，硬标签只有“工作日”为 1；教师的软标签在 T=1 时为 0.80、0.12、0.05、0.03，T=2 时变得更平，为 0.55、0.21、0.14、0.11，学生能学到“自然日”比“月”更接近正确答案。',
  '把 8B 的回答“教”给 1.5B', '上：序列级蒸馏，只需要教师的文字输出。下：逐 token 蒸馏要教师的概率分布（数值示意）。',
  [
    flowS,
    edge('M926 238V270H160V250', 'dash'),
    text(560, 290, '评估发现薄弱题型 → 补问题、再生成', 'xs', 'middle'),
    box('kd', 32, 310, 1136, 300, 'node', '', [], ''),
    text(56, 600, '下一个 token：“年假需提前三个 ___”', 'xs'),
    distBars(56, hard, '#cbd5e1', '硬标签（训练语料里的答案）'),
    distBars(440, t1, '#93c5fd', '教师概率，温度 T = 1'),
    distBars(824, t2, '#6ee7b7', '教师概率，温度 T = 2（更平）'),
  ].join('\n'));

// ---- merge-task-vectors (ch13) -----------------------------------------------
const tA = [0.8, -0.1, 0.5, 0.02, -0.6, 0.3];
const tB = [0.6, 0.4, -0.7, -0.01, -0.5, 0.04];
const avg = tA.map((a, i) => (a + tB[i]) / 2);
const keep = v => { const th = [...v].map(Math.abs).sort((a, b) => b - a)[2]; return v.map(x => (Math.abs(x) >= th ? x : 0)); };
const kA = keep(tA), kB = keep(tB);
const sign = kA.map((a, i) => Math.sign(a + kB[i]));
const ties = sign.map((s, i) => { const vs = [kA[i], kB[i]].filter(v => v !== 0 && Math.sign(v) === s); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0; });
const fmt = v => (v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(Math.abs(v) < 0.1 && v !== 0 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, ''));
const tieRows = [
  ['τA 条款格式', tA, 'fblue'],
  ['τB 加班费计算', tB, 'fgreen'],
  ['直接平均', avg, 'fgray'],
  ['① 修剪后 τA', kA, 'fblue'],
  ['① 修剪后 τB', kB, 'fgreen'],
  ['② 选定符号', sign, 'fgray'],
  ['③ TIES 结果', ties, 'famber'],
];
let tieGrid = '';
tieRows.forEach(([n, v, c], r) => {
  const y = 160 + r * 52;
  tieGrid += text(560, y + 26, n, 's');
  v.forEach((x, j) => {
    const cx = 700 + j * 76;
    const t = r === 5 ? (x > 0 ? '+' : x < 0 ? '−' : '·') : fmt(x);
    tieGrid += cell(cx, y, 68, 38, x === 0 && r !== 5 ? 'gray' : c, t, 's');
  });
});
['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].forEach((p, j) => { tieGrid += text(734 + j * 76, 148, p, 'xs', 'middle'); });
const mergeTaskVectors = svg('merge-task-vectors', 1200, 620, '任务向量与 TIES 合并：同一底座上的两次微调怎样合成一个模型', '左：同一个底座 W0 分别微调成“条款格式”模型 A 和“加班费计算”模型 B，任务向量 τA = A − W0、τB = B − W0，合并模型为 W0 + λ(τA + τB)。不同底座的权重坐标互不对应，不能这样相加。右：6 个参数的示意数值，直接平均时 p3 上 +0.5 和 −0.7 相互抵消成 −0.1；TIES 先修剪每个向量里变化小的参数，再按多数选符号，只平均符号一致的值，p3 保留 −0.7。',
  '合并的是“相对底座改了什么”', '左：权重空间里的示意几何。右：6 个参数的示意数值，比较直接平均与 TIES。',
  [
    box('geo', 32, 104, 500, 490, 'node', '', [], '同一底座出发的两次微调'),
    `<circle cx="140" cy="440" r="9" fill="#172b3a"/>`, text(120, 474, 'W0 底座', 's'),
    `<circle cx="420" cy="400" r="9" fill="#60a5fa"/>`, text(330, 432, 'A：条款格式', 's'),
    `<circle cx="200" cy="200" r="9" fill="#20a28c"/>`, text(214, 196, 'B：加班费计算', 's'),
    `<circle cx="440" cy="190" r="10" fill="#e0a63a"/>`, text(330, 168, 'W0 + λ(τA+τB)', 'm'),
    edge('M148 437L410 402'), text(250, 445, 'τA', 'm'),
    edge('M143 431L196 212'), text(140, 320, 'τB', 'm'),
    edge('M147 433L432 198', 'dash'),
    edge('M56 528H508', 'line'),
    text(56, 558, '另一个底座 W0′ 的参数坐标和 W0 不对应，', 'xs'),
    text(56, 580, '把它的 τ 加到 W0 上只会得到噪声。', 'xs'),
    tieGrid,
    text(560, 548, 'p3：直接平均 +0.5 与 −0.7 互相抵消成 −0.1；TIES 按总和 −0.2 选负号，只保留 −0.7。', 'xs'),
    text(560, 572, '修剪：每个向量只留绝对值最大的 3 个；结果最后再乘系数 λ 加回底座。', 'xs'),
  ].join('\n'));

write({
  'data-pipeline-funnel': dataFunnel,
  'data-sources-mix': dataMix,
  'data-bpe-merges': dataBpe,
  'pretrain-next-token': pretrainNextToken,
  'pretrain-stages-schedule': pretrainStages,
  'distill-pipeline': distillPipeline,
  'distill-merge-task-vectors': mergeTaskVectors,
});
