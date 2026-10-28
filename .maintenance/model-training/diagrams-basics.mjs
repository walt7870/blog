// Figures for docs/ai/model-training/ 01–03 (group "basics").
// Run: node .maintenance/model-training/diagrams-basics.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- map-training-pipeline (01) ----------------------------------------------
const mapPipeline = svg('map-training-pipeline', 1320, 760, '大语言模型从数据到上线的阶段，以及其他模型的同构流程',
  '大语言模型先用海量文本预训练得到基础模型，再经过 SFT、偏好对齐和强化学习等后训练，评估通过后部署；评估发现的问题回流到数据和后训练。前沿实验室负责预训练和通用后训练，普通团队从开源底座出发做后训练、评估和部署。语音识别、视觉和向量模型也遵循先通用预训练、再用任务数据微调的模式。',
  '一个大模型从数据到上线：先通用，再专用', '上排是大语言模型的阶段；中间是谁通常负责哪一段；下排是其他模型的同构流程。',
  [
    box('data', 32, 120, 196, 196, 'gray', '数据', ['网页、书籍、代码', '过滤、去重、去隐私', '分词'], '06'),
    box('pre', 268, 120, 228, 196, 'blue', '预训练', ['预测下一个 token', '约 15T token', '产出：基础模型', '会续写，不会听指令'], '07'),
    `<g data-node="post"><rect x="536" y="104" width="476" height="228" rx="10" fill="none" stroke="#9b87f5" stroke-width="2" stroke-dasharray="6 5"/><text x="554" y="128" class="k">后训练 · 09—12</text></g>`,
    box('sft', 552, 140, 140, 176, 'violet', 'SFT', ['照标准答案学', '格式与口径', '产出：指令模型']),
    box('pref', 704, 140, 140, 176, 'violet', '偏好对齐', ['两个回答', '哪个更好', 'RLHF / DPO']),
    box('rl', 856, 140, 140, 176, 'violet', '强化学习', ['可验证奖励', '数学、代码', '推理模型']),
    box('eval', 1052, 120, 112, 196, 'amber', '评估', ['基准', '业务集', '回归'], '21'),
    box('deploy', 1196, 120, 96, 196, 'green', '部署', ['推理', '服务'], '上线'),
    edge('M228 218H268'), edge('M496 218H536'), edge('M692 228H704'), edge('M844 228H856'),
    edge('M1012 218H1052'), edge('M1164 218H1196'),
    edge('M1108 316V352H130V320', 'dash'),
    label(560, 360, '失败样例回流：补数据、改目标，再训一轮', 330),
    // Who does what
    text(32, 418, '谁来做', 'k'),
    cell(32, 432, 1260, 40, 'fred'),
    text(48, 458, '前沿实验室与大厂：数据、预训练、通用后训练都做，数万张卡、数月；Llama 3.1 8B 记录 146 万 H100 GPU 小时', 's'),
    cell(552, 484, 740, 40, 'fgreen'),
    text(568, 510, '普通团队：从开源底座出发，只做后训练的一段 + 评估 + 部署；1—8 张卡、数小时到数天', 's'),
    // Other modalities
    text(32, 572, '其他模型同一个套路：大规模通用训练 → 用自己的任务数据微调', 'k'),
    box('asr', 32, 588, 400, 140, 'node', '语音识别', ['Whisper：68 万小时弱监督音频—文本对', '→ 口音、内部术语的转写数据微调', '指标：字错率 CER'], '14—15'),
    box('vision', 462, 588, 400, 140, 'node', '视觉与图文', ['大规模图像或 4 亿图文对（CLIP）预训练', '→ 冻结骨干、换分类头，或指令微调', '例：识别报销单类型'], '17—18'),
    box('embed', 892, 588, 400, 140, 'node', '向量与重排', ['海量文本对做对比学习预训练', '→ 用业务问答对、难负例微调', '指标：召回率、MRR'], '20'),
  ].join('\n'));

// ---- map-decision-path (01) --------------------------------------------------
const steps = [
  ['prompt', '改提示词', ['写清口径和拒答规则', '给几个示例'], '成本：小时级', '无 GPU', 'node'],
  ['rag', '接检索与工具', ['制度原文检索后引用', '实时数据走接口'], '成本：天到周', '工程为主', 'blue'],
  ['sft', 'SFT / LoRA', ['几千条高质量问答', '固定格式、口径、拒答'], '成本：1 张卡、数小时', '要建评测集', 'violet'],
  ['pref', '偏好对齐', ['成对比较数据', '不乱承诺、更有分寸'], '成本：标注 + 多次训练', '要防钻空子', 'amber'],
  ['pretrain', '从零预训练', ['万亿级 token', '数千张卡、数月'], '成本：几乎不可能', '交给底座厂商', 'red'],
];
let ladder = '';
steps.forEach(([id, t, lines, cost, note, cls], i) => {
  const x = 32 + i * 256, y = 380 - i * 56;
  ladder += box(id, x, y, 236, 196, cls, t, [...lines, cost, note], `第 ${i + 1} 级`);
  if (i < steps.length - 1) ladder += edge(`M${x + 236} ${y + 60}H${x + 256}`);
});
const mapDecision = svg('map-decision-path', 1320, 720, '资料助手团队选择改进手段的阶梯',
  '从改提示词开始，依次是接检索与工具、SFT 或 LoRA、偏好对齐，最后才是从零预训练；每升一级成本上升一个量级，只有上一级解决不了且问题属于行为而非知识时才往上走。用微调灌入经常变化的制度文本是常见误用，应当走检索。',
  '资料助手要变好用：从最便宜的一级开始', '每往右上一级，成本大约升一个量级；只有上一级解决不了、而且问题出在模型“行为”时才往上走。',
  [
    ladder,
    box('wrong', 32, 600, 760, 96, 'red', '误用：把经常改的制度原文灌进 LoRA', ['3 月改了年假天数，模型仍按旧数回答，还说不出出处；每次改制度都要重训。']),
    box('right', 812, 600, 480, 96, 'green', '改法：知识放检索，行为交给训练', ['训练只教“引用条款编号、查不到就说不知道”。']),
  ].join('\n'));

// ---- step-training-loop (02) -------------------------------------------------
const stepLoop = svg('step-training-loop', 1320, 640, '一个训练 step 的循环',
  '每个 micro-batch 依次做 BF16 前向、计算交叉熵损失、反向传播并把梯度累加起来；累满 8 个 micro-batch 后裁剪梯度范数，AdamW 用 FP32 主权重和两份动量完成更新，再复制回 BF16 权重、清零梯度、按调度改学习率，进入下一个 step。',
  '一个 step：8 次前向反向，1 次参数更新', '资料助手 SFT 的设置：每个 micro-batch 4 条样本，累积 8 次，1 个 step 等于 32 条样本。',
  [
    box('mb', 32, 150, 220, 170, 'gray', '① 取 micro-batch', ['4 条问答', '每条约 600 token', '拼成张量']),
    box('fwd', 292, 150, 220, 170, 'blue', '② 前向', ['BF16 权重与激活', '保存激活', '给反向用']),
    box('loss', 552, 150, 220, 170, 'blue', '③ 损失', ['每个位置预测下一个', 'token 的交叉熵', '按 token 平均']),
    box('bwd', 812, 150, 220, 170, 'violet', '④ 反向', ['从损失往回算', '每个参数的梯度', '读取保存的激活']),
    box('acc', 1072, 150, 220, 170, 'violet', '⑤ 累加梯度', ['梯度加到缓冲区', '这是第几个？', '不足 8 个就回到 ①']),
    box('lr', 32, 420, 300, 180, 'green', '⑧ 收尾', ['FP32 → BF16 权重副本', '梯度清零', '学习率调度器前进一步', 'step 计数 +1']),
    box('opt', 392, 420, 460, 180, 'green', '⑦ AdamW 更新（FP32）', ['先做权重衰减：θ ← θ × (1 − lr × λ)', '更新一阶动量 m 和二阶动量 v', 'θ ← θ − lr × m̂ ⁄ (√v̂ + ε)', '在 FP32 主权重上加这点小改动']),
    box('clip', 912, 420, 380, 180, 'amber', '⑥ 梯度裁剪', ['算全部梯度的总范数', '超过 1.0 就整体等比缩小', '方向不变，只限步长', '记录下来，画训练曲线']),
    edge('M252 235H292'), edge('M512 235H552'), edge('M772 235H812'), edge('M1032 235H1072'),
    edge('M1182 150V112H142V150', 'dash'), label(560, 118, '不足 8 个：取下一个 micro-batch', 260),
    edge('M1182 320V420'), label(1194, 380, '满 8 个', 70),
    edge('M912 510H852'), edge('M392 510H332'),
    edge('M182 420V320', 'dash'), label(40, 380, '下一个 step', 100),
  ].join('\n'));

// ---- step-lr-schedule (02) ---------------------------------------------------
const peak = 2e-4, minLr = 2e-5, W = 20, T = 564;
const lrAt = s => s < W ? peak * (s + 1) / W : minLr + 0.5 * (peak - minLr) * (1 + Math.cos(Math.PI * (s - W) / (T - W)));
const X0 = 120, Y0 = 520, PW = 1100, PH = 360;
const sx = s => X0 + s * PW / T, sy = v => Y0 - v * PH / peak;
let curve = '';
for (let s = 0; s < T; s++) curve += `${s ? 'L' : 'M'}${sx(s).toFixed(1)} ${sy(lrAt(s)).toFixed(1)}`;
const ticks = [0, 188, 376, 564].map(s => edge(`M${sx(s)} ${Y0}V${Y0 + 8}`, 'axis') + text(sx(s), Y0 + 30, String(s), 'xs', 'middle')).join('');
const yTicks = [[0, '0'], [5e-5, '5e-5'], [1e-4, '1e-4'], [1.5e-4, '1.5e-4'], [2e-4, '2e-4']].map(([v, l]) => edge(`M${X0 - 8} ${sy(v)}H${X0}`, 'axis') + text(X0 - 14, sy(v) + 5, l, 'xs', 'end') + (v ? edge(`M${X0} ${sy(v)}H${X0 + PW}`, 'line') : '')).join('');
const dot = (s, t, dx = 12, dy = -12) => `<circle cx="${sx(s)}" cy="${sy(lrAt(s))}" r="5" fill="#2563eb"/>` + text(sx(s) + dx, sy(lrAt(s)) + dy, t, 's');
const stepLr = svg('step-lr-schedule', 1320, 600, '线性预热加余弦衰减的学习率曲线',
  '共 564 步：前 20 步学习率从 1e-5 线性升到峰值 2e-4，之后按余弦曲线下降，第 292 步降到 1.1e-4，最后一步约 2e-5。竖线标出每个 epoch 的边界（每 188 步）。',
  '学习率怎样随 step 变化：先预热，再余弦下降', '资料助手 SFT 示例：3 个 epoch 共 564 步，峰值 2e-4，预热 20 步，最低 2e-5。按公式逐步计算后绘制。',
  [
    yTicks,
    `<rect x="${X0}" y="${Y0 - PH}" width="${sx(W) - X0}" height="${PH}" fill="#fef3c7" opacity=".7"/>`,
    [188, 376].map(s => edge(`M${sx(s)} ${Y0 - PH}V${Y0}`, 'line')).join(''),
    text(sx(94), Y0 + 30, 'epoch 1', 'xs', 'middle'), text(sx(282), Y0 + 30, 'epoch 2', 'xs', 'middle'), text(sx(470), Y0 + 30, 'epoch 3', 'xs', 'middle'),
    `<path d="${curve}" fill="none" stroke="#2563eb" stroke-width="3"/>`,
    edge(`M${X0} ${Y0}H${X0 + PW + 10}`, 'axis'), edge(`M${X0} ${Y0}V${Y0 - PH - 14}`, 'axis'), ticks,
    text(X0 + PW, Y0 + 54, 'step', 's', 'end'), text(X0 - 14, Y0 - PH - 22, '学习率', 's', 'end'),
    dot(19, '第 20 步：峰值 2e-4', 14, 52), dot(292, '第 292 步：1.1e-4'), dot(563, '末步：约 2e-5', -130, -14),
    text(sx(W) + 8, Y0 - 16, '← 预热 20 步', 'xs'),
  ].join('\n'));

// ---- memory-ledger (03) ------------------------------------------------------
// GiB values from facts-basics.md. Scale: 140 GiB = 880 px.
const GX = 300, GS = 880 / 140, g = v => v * GS;
const rows = [
  ['全参数微调 · AdamW', '不开重计算，序列 2048，batch 1', [['权重', 15.0, 'fblue'], ['梯度', 15.0, 'fviolet'], ['FP32 主权重', 29.9, 'famber'], ['一阶动量 m', 29.9, 'famber'], ['二阶动量 v', 29.9, 'famber'], ['激活', 9.5, 'fred'], ['开销', 1.5, 'fgray']]],
  ['LoRA r=16 · BF16 底座', '开重计算，序列 2048，batch 1', [['冻结底座', 15.0, 'fblue'], ['LoRA 状态', 0.63, 'fgreen'], ['激活', 1.75, 'fred'], ['开销', 1.5, 'fgray']]],
  ['QLoRA r=16 · NF4 底座', '开重计算，序列 2048，batch 1', [['NF4 底座', 5.3, 'fblue'], ['LoRA 状态', 0.63, 'fgreen'], ['激活', 1.75, 'fred'], ['开销', 1.5, 'fgray']]],
];
let bars = '';
rows.forEach(([name, cond, segs], i) => {
  const y = 150 + i * 150;
  bars += text(32, y + 24, name, 't') + text(32, y + 50, cond, 'xs');
  let x = GX, tot = 0;
  segs.forEach(([lab, v, cls], j) => {
    bars += `<rect x="${x.toFixed(1)}" y="${y}" width="${g(v).toFixed(1)}" height="56" class="${cls}" stroke="#fff" stroke-width="1.5"/>`;
    if (i === 0 && g(v) > 60) bars += text(x + g(v) / 2, y + 26, lab, 'xs', 'middle') + text(x + g(v) / 2, y + 46, v.toFixed(1), 'xs', 'middle');
    x += g(v); tot += v;
  });
  bars += text(x + 12, y + 34, `≈ ${tot.toFixed(0)} GiB`, 't');
  if (i > 0) {
    let lx = GX, parts = [];
    segs.forEach(([lab, v]) => { parts.push(`${lab} ${v < 1 ? v.toFixed(2) : v.toFixed(1)}`); lx += g(v); });
    bars += label(GX, y + 82, parts.join(' + '), 470);
  }
});
bars += label(GX, 150 + 82, '前五项 = 16 字节 × 80.3 亿参数 ≈ 119.7 GiB（128.5 GB）；激活 9.5、开销 1.5 为估算', 600);
const legend = [['fblue', '权重 / 底座'], ['fviolet', '梯度'], ['famber', 'FP32 主权重与动量'], ['fgreen', 'LoRA 参数、梯度与动量'], ['fred', '激活'], ['fgray', '框架开销']]
  .map(([c, t], i) => cell(GX + i * 150 - (i > 3 ? 0 : 0) + (i > 3 ? 60 : 0), 584, 18, 18, c) + text(GX + i * 150 + (i > 3 ? 60 : 0) + 26, 599, t, 'xs')).join('');
const memoryLedger = svg('memory-ledger', 1320, 630, 'Llama-3.1-8B 全参数微调、LoRA 与 QLoRA 的训练显存按比例对比',
  '全参数微调需要 BF16 权重和梯度各约 15 GiB、FP32 主权重和两份 AdamW 动量各约 29.9 GiB，再加激活约 9.5 GiB，共约 131 GiB，超过 H100 的 79.6 GiB；LoRA 冻结 BF16 底座约 15 GiB，加 LoRA 训练状态 0.63 GiB 和重计算后的激活，约 19 GiB；QLoRA 把底座压到约 5.3 GiB，共约 9 GiB，24 GB 消费级卡也放得下。',
  '8B 模型训练一次要多少显存', '条形按 GiB 等比例绘制；虚线是 24 GB 消费级卡和 H100（可用约 79.6 GiB）的容量。激活与开销是估算，实际以显存监控为准。',
  [
    `<path d="M${GX + g(24)} 116V560" fill="none" stroke="#e88191" stroke-width="2" stroke-dasharray="7 6"/>`, text(GX + g(24) + 6, 130, '24 GB 卡', 'xs'),
    `<path d="M${GX + g(79.6)} 116V560" fill="none" stroke="#e88191" stroke-width="2" stroke-dasharray="7 6"/>`, text(GX + g(79.6) + 6, 130, 'H100 79.6 GiB', 'xs'),
    bars, legend,
  ].join('\n'));

// ---- memory-checkpointing (03) -----------------------------------------------
function layers(x0, y0, ckpt) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * 64;
    s += cell(x, y0, 52, 40, 'gray', `L${i + 1}`, 'xs');
    s += ckpt ? cell(x + 18, y0 + 52, 16, 14, 'fred') : cell(x + 4, y0 + 52, 44, 110, 'fred');
  }
  if (ckpt) s += cell(x0 + 7 * 64 + 4, y0 + 74, 44, 110, 'fred') + text(x0 + 7 * 64 + 26, y0 + 202, '重算这一层', 'xs', 'middle');
  return s;
}
const memoryCkpt = svg('memory-checkpointing', 1320, 600, '激活重计算用一次额外前向换显存',
  '不重计算时每一层在前向时把全部中间结果留到反向；开启重计算后每层只保留输入，反向走到某一层时先把这一层的前向重算一遍，再求梯度，显存从“所有层的激活”降到“各层输入加一层激活”，计算量多出约一次前向，约三分之一。',
  '激活重计算：少存中间结果，反向时再算一遍', '8 层示意。红色高度表示该层留给反向的激活；8B 模型 32 层、序列 2048 时两种情况约 9.1 GB 与 0.8 GB（估算）。',
  [
    box('plain', 32, 112, 600, 330, 'node', '', [], '不重计算：每层存全部中间结果'),
    layers(56, 160, false),
    text(56, 380, '显存 ∝ 层数 × 每层激活（34 × s × b × h 字节量级）', 's'),
    text(56, 410, '8B、s=2048、b=1：约 9.1 GB', 's'),
    box('ckpt', 688, 112, 600, 330, 'node', '', [], '重计算：每层只存输入，反向时逐层重算'),
    layers(712, 160, true),
    text(712, 400, '显存 ≈ 各层输入（2 × s × b × h）+ 一层激活', 's'),
    text(712, 428, '8B：0.54 GB + 0.29 GB ≈ 0.8 GB', 's'),
    text(32, 468, '计算时间', 'k'),
    cell(160, 472, 160, 30, 'fblue', '前向 1'), cell(320, 472, 320, 30, 'fviolet', '反向 ≈ 2'), text(660, 492, '≈ 3 份', 's'),
    cell(160, 520, 160, 30, 'fblue', '前向 1'), cell(320, 520, 160, 30, 'famber', '重算前向 1'), cell(480, 520, 320, 30, 'fviolet', '反向 ≈ 2'), text(820, 542, '≈ 4 份，多约 33%', 's'),
    text(32, 491, '不重计算', 's'), text(32, 541, '重计算', 's'),
  ].join('\n'));

write({
  'map-training-pipeline': mapPipeline,
  'map-decision-path': mapDecision,
  'step-training-loop': stepLoop,
  'step-lr-schedule': stepLr,
  'memory-ledger': memoryLedger,
  'memory-checkpointing': memoryCkpt,
});
