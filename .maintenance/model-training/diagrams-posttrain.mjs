// Figures for chapters 09–12 of docs/ai/model-training/ (SFT, LoRA/QLoRA, preference alignment, RL).
// Run: node .maintenance/model-training/diagrams-posttrain.mjs
import { svg, box, cell, edge, text, label, esc, write } from './svg-kit.mjs';

// Rough text width so cells can be sized to their labels (CJK ≈ 1 em, ASCII ≈ 0.6 em).
const tw = (s, size = 14) => [...String(s)].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? size : size * 0.62), 0);
const mono = (x, y, s) => `<text x="${x}" y="${y}" class="m">${esc(s)}</text>`;

// A box whose body lines are monospace (template text, code-like content).
function monoBox(node, x, y, w, h, cls, kicker, lines, textCls = 'm') {
  let t = `<g data-node="${node}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>`;
  t += `<text x="${x + 18}" y="${y + 26}" class="k">${esc(kicker)}</text>`;
  lines.forEach((l, i) => { t += text(x + 18, y + 56 + i * 24, l, textCls); });
  return t + '</g>';
}

// ---- sft-loss-mask -----------------------------------------------------------
// One 资料助手 sample → Qwen2.5 template → token strip with labels → loss.
const toks = [
  ['<|im_start|>', 0], ['system', 0], ['只依据片段…', 0], ['<|im_end|>', 0],
  ['<|im_start|>', 0], ['user', 0], ['[片段]…', 0], ['年假怎么申请？', 0], ['<|im_end|>', 0],
  ['<|im_start|>', 0], ['assistant', 0],
  ['按员工手册', 1], ['第4.2条，', 1], ['提前3个工作日…', 1], ['<|im_end|>', 1],
];
let strip = '', sx = 32;
const stripY = 372;
for (const [t, train] of toks) {
  const w = Math.round([...t].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 13 : 6.6), 0) + 10);
  strip += cell(sx, stripY, w, 36, train ? 'fgreen' : 'fgray', t, 'xs');
  strip += text(sx + w / 2, stripY + 62, train ? '计入' : '-100', 'xs', 'middle');
  sx += w + 2;
}
const stripEnd = sx - 2;
const sftLossMask = svg('sft-loss-mask', 1240, 640, 'SFT 数据从消息到损失的路径',
  '一条资料助手训练样本先按 Qwen2.5 对话模板渲染成带特殊标记的文本，再切成 token。system、user 和检索片段位置的标签设为 -100 不计损失，只有 assistant 回答和结尾的 <|im_end|> 参与交叉熵平均。',
  '一条 SFT 样本怎样变成损失：消息 → 模板 → token → 只对回答计分', '灰色位置作为输入参与前向计算，但标签设为 -100；绿色位置是模型要学会写出的内容，包括结尾的停止标记。',
  [
    monoBox('msg', 32, 112, 330, 200, 'blue', '① 训练样本（messages）', ['system：只依据检索片段回答，', '　　片段里没有就说不知道', 'user：检索片段 + 年假怎么申请？', 'assistant：按《员工手册》第 4.2 条，', '　　提前 3 个工作日在审批系统提交…'], 's'),
    monoBox('tpl', 402, 112, 470, 200, 'violet', '② 套用 Qwen2.5 对话模板', [
      '<|im_start|>system', '只依据检索片段回答…<|im_end|>', '<|im_start|>user', '[片段]…年假怎么申请？<|im_end|>', '<|im_start|>assistant', '按《员工手册》第4.2条…<|im_end|>']),
    box('why', 912, 112, 296, 200, 'amber', '模板必须与底座一致', ['标记写错不会报错', '模型只会把它当普通文字', '推理时停不下来、角色混乱', '训练和推理用同一份模板'], '常见坑'),
    edge('M362 212H402'), edge('M872 212H912', 'dash'),
    text(32, stripY - 18, '③ 切成 token，并给每个位置一个“标签”（下一个 token 的答案）', 'k'),
    strip,
    edge('M637 312V352'),
    box('loss', 32, 500, 620, 112, 'green', '损失 = 绿色位置的交叉熵平均', ['回答 token 越可能是标注答案，损失越小', '灰色位置不产生损失项，模型不必学会“写用户的问题”'], '④ 计算损失'),
    box('stop', 692, 500, 516, 112, 'red', '漏掉结尾 <|im_end|> 的后果', ['模型学不到“什么时候停”', '上线后回答说完还继续编下一轮对话'], '失败情况'),
    edge(`M${Math.round((stripEnd + 32) / 2)} 444V500`),
  ].join('\n'));

// ---- sft-packing -------------------------------------------------------------
// Four samples of different length in a max_length=16 batch: padding vs packing.
const S = [['A', 6, 'fblue'], ['B', 11, 'fgreen'], ['C', 4, 'famber'], ['D', 9, 'fviolet']];
const U = 30; // px per token
let pad = '', pk = '';
S.forEach(([n, len, cls], i) => {
  const y = 176 + i * 44;
  pad += text(52, y + 24, n, 's');
  for (let j = 0; j < 16; j++) pad += cell(76 + j * U, y, U - 3, 32, j < len ? cls : 'fgray', j < len ? '' : '');
});
pad += text(76, 376, '64 个位置里 30 个有效，34 个是填充（53%）', 's');
// packing: row1 = B(11)+C(4) =15 +1 pad, row2 = D(9)+A(6)=15 +1 pad
const rows = [[['B', 11, 'fgreen'], ['C', 4, 'famber']], [['D', 9, 'fviolet'], ['A', 6, 'fblue']]];
rows.forEach((r, i) => {
  const y = 176 + i * 44;
  let x = 676;
  for (const [n, len, cls] of r) {
    for (let j = 0; j < len; j++) pk += cell(x + j * U, y, U - 3, 32, cls, j === 0 ? n : '');
    x += len * U;
  }
  pk += cell(x, y, U - 3, 32, 'fgray');
});
pk += text(676, 288, '32 个位置里 30 个有效，2 个填充', 's');
pk += text(676, 318, '同一行里 B 的 token 不能看到 C：需要按样本', 's');
pk += text(676, 342, '重置位置编号并隔断注意力（padding-free 实现）', 's');
const sftPacking = svg('sft-packing', 1240, 420, '填充与打包两种组批方式的对比',
  '四条长度为 6、11、4、9 个 token 的样本，按最大长度 16 组批。逐条填充时 64 个位置中有 34 个是无效填充；打包把 B 和 C、D 和 A 拼进同一行，只剩 2 个填充，但要隔断样本之间的注意力。',
  '同样四条样本：逐条填充浪费一半位置，打包几乎不浪费', '每个小格是一个 token 位置，灰色为填充。最大长度按 16 示意，实际训练常用 2048—8192。',
  [
    box('padbox', 32, 112, 560, 290, 'node', '', [], '逐条填充（padding）'),
    box('packbox', 648, 112, 560, 290, 'node', '', [], '打包（packing）'),
    pad, pk,
  ].join('\n'));

// ---- lora-update-path --------------------------------------------------------
// gate_proj of Llama-3.1-8B (4096 → 14336), r = 16.
const lp = [];
lp.push(box('x', 32, 248, 150, 96, 'gray', '输入 x', ['4096 维'], ''));
lp.push(box('w0', 252, 128, 300, 120, 'blue', '冻结的 W₀（不更新）', ['14336 × 4096', '58,720,256 个参数'], 'gate_proj 原矩阵'));
lp.push(box('a', 252, 300, 170, 150, 'green', 'A：16 × 4096', ['65,536 个参数', '随机初始化'], '降到 16 维'));
lp.push(box('b', 446, 300, 170, 150, 'amber', 'B：14336 × 16', ['229,376 个参数', '初始化为 0'], '升回 14336 维'));
lp.push(box('scale', 640, 330, 120, 90, 'violet', '× α/r', ['32/16 = 2'], ''));
lp.push(box('sum', 792, 228, 100, 90, 'node', '相加', [''], ''));
lp.push(box('h', 932, 228, 276, 90, 'gray', 'h = W₀x + (α/r)·B(Ax)', ['14336 维'], ''));
lp.push(edge('M182 280Q216 280 216 188H252'), edge('M182 312Q216 312 216 375H252'));
lp.push(edge('M552 188Q842 188 842 228'), edge('M422 375H446'), edge('M616 375H640'), edge('M760 375Q842 375 842 318'));
lp.push(edge('M892 273H932'));
lp.push(box('init', 32, 480, 560, 120, 'node', '训练第 0 步：B = 0，所以 BA = 0', ['输出和原模型完全一样，训练从底座出发', '之后只有 A、B 收到梯度和优化器状态'], '为什么 B 要初始化为 0'));
lp.push(box('cnt', 640, 480, 568, 120, 'node', '这一层只多训练 294,912 个参数', ['16 × (4096 + 14336) = 294,912', '是 W₀ 的 0.50%；7 种线性层 × 32 层共约 4194 万'], '参数量'));
const loraPath = svg('lora-update-path', 1240, 630, 'LoRA 在一个线性层上的计算路径',
  '以 Llama-3.1-8B 的 gate_proj 为例：输入 x 同时经过冻结的 14336×4096 原矩阵和 LoRA 分支。分支先用 16×4096 的 A 降到 16 维，再用 14336×16 的 B 升回，乘以 α/r 后与原输出相加。B 初始化为 0，训练开始时输出与原模型相同。',
  'LoRA 不改原矩阵，旁边加一条“先压到 16 维再放大”的支路', '以 Llama-3.1-8B 第一个 FFN 投影 gate_proj、秩 r = 16、α = 32 为例；同样的支路挂在 q/k/v/o/gate/up/down 七种线性层上。',
  lp.join('\n'));

// ---- lora-merge-serve --------------------------------------------------------
const ms = [];
ms.push(box('mL', 32, 112, 560, 330, 'node', '', [], '方式一：合并成一个新模型'));
ms.push(box('base1', 60, 160, 200, 96, 'blue', '底座 W₀', ['BF16 约 16.1 GB'], ''));
ms.push(box('ad1', 60, 280, 200, 96, 'green', '适配器 BA', ['BF16 约 84 MB'], ''));
ms.push(box('merged', 340, 210, 220, 110, 'violet', "W' = W₀ + (α/r)BA", ['仍约 16.1 GB', '推理无额外计算'], ''));
ms.push(edge('M260 208Q300 208 300 250H340'), edge('M260 328Q300 328 300 290H340'));
ms.push(text(60, 412, '适合只有一个业务版本；换版本要换整份权重', 's'));
ms.push(box('mR', 648, 112, 560, 330, 'node', '', [], '方式二：一个底座挂多个适配器'));
ms.push(box('base2', 676, 160, 220, 260, 'blue', '共享底座 W₀', ['显存里只放一份', '约 16.1 GB'], ''));
const ads = [['hr', '人事制度适配器'], ['fin', '报销问答适配器'], ['it', 'IT 支持适配器']];
ads.forEach(([id, n], i) => {
  ms.push(box('ad-' + id, 956, 160 + i * 88, 228, 72, 'green', n, ['约 84 MB'], ''));
  ms.push(edge(`M956 ${196 + i * 88}H896`, 'dash'));
});
ms.push(box('req', 648, 462, 560, 86, 'amber', '请求里写 model="人事制度适配器"', ['引擎按请求选择分支，同一批里可混用不同适配器'], ''));
ms.push(box('note', 32, 462, 560, 86, 'gray', '量化底座上训练的适配器', ['合并前先反量化；合并后要重新评估，不能直接沿用分数'], ''));
const loraMerge = svg('lora-merge-serve', 1240, 580, 'LoRA 适配器的两种上线方式',
  '左侧把适配器乘以 α/r 后加回底座，得到一个大小不变、推理无额外计算的新模型；右侧显存里只放一份底座，挂人事、报销、IT 三个各约 84 MB 的适配器，按请求选择。',
  '训练完的适配器：合并进底座，或保持独立按请求切换', '按 Llama-3.1-8B、r = 16、七种线性层估算；适配器大小 = 41,943,040 个参数 × 2 字节。',
  ms.join('\n'));

// ---- pref-rlhf-vs-dpo --------------------------------------------------------
const pr = [];
pr.push(box('lane1', 32, 112, 1176, 250, 'node', '', [], 'RLHF（InstructGPT 流程）：先学一个打分器，再用强化学习追分'));
pr.push(box('sft1', 56, 160, 170, 110, 'gray', 'SFT 模型', ['起点，也作参考模型'], ''));
pr.push(box('pairs1', 256, 160, 190, 110, 'amber', '偏好数据', ['同一问题的回答', '排序或两两比较'], ''));
pr.push(box('rm', 476, 160, 200, 110, 'violet', '奖励模型', ['Bradley–Terry 损失', '输出一个分数'], ''));
pr.push(box('ppo', 706, 150, 290, 130, 'blue', 'PPO 循环', ['策略生成回答 → 奖励模型打分', '分数 − β·KL(策略‖参考)', '还需要一个价值模型估基线'], ''));
pr.push(box('out1', 1026, 160, 160, 110, 'green', '对齐模型', [''], ''));
pr.push(edge('M226 215H256'), edge('M446 215H476'), edge('M676 215H706'), edge('M996 215H1026'));
pr.push(text(56, 330, '训练时同时在显存里：策略、参考、奖励、价值 4 个模型；需要在线生成回答，奖励模型可能被钻空子', 's'));
pr.push(box('lane2', 32, 386, 1176, 220, 'node', '', [], 'DPO：把“打分器 + 强化学习”化成一个分类式损失'));
pr.push(box('sft2', 56, 434, 170, 110, 'gray', 'SFT 模型', ['起点，也作参考模型'], ''));
pr.push(box('pairs2', 256, 434, 190, 110, 'amber', '偏好数据', ['(问题, 好回答, 差回答)'], ''));
pr.push(box('dpo', 476, 424, 520, 130, 'blue', 'DPO 损失', ['比较策略与参考对两个回答的对数概率比', '好回答的比值要比差回答高，β 控制离参考多远', '不训练奖励模型、训练中不生成回答'], ''));
pr.push(box('out2', 1026, 434, 160, 110, 'green', '对齐模型', [''], ''));
pr.push(edge('M226 489H256'), edge('M446 489H476'), edge('M996 489H1026'));
pr.push(text(56, 584, '训练时只需策略和参考 2 个模型（参考的对数概率可预先算好）；数据是离线固定的', 's'));
const prefPipelines = svg('pref-rlhf-vs-dpo', 1240, 630, 'RLHF 与 DPO 两条偏好对齐流程对比',
  'RLHF 从 SFT 模型和偏好数据出发，先训练奖励模型，再用 PPO 让策略在线生成并追求高分，同时用 KL 惩罚拉住与参考模型的距离，训练中需要四个模型。DPO 用同样的偏好数据和参考模型，直接用一个分类式损失提高好回答相对差回答的概率比，只需两个模型、不在线生成。',
  '同样的偏好数据，两条路：RLHF 先学打分器再追分，DPO 直接改概率', '两条路的起点都是 SFT 模型，都用 KL（或 β）把新模型拴在参考模型附近。',
  pr.join('\n'));

// ---- pref-overoptimization ---------------------------------------------------
// Illustrative curves in the functional form of Gao et al. 2022 (RL): gold = d(α − β ln d).
const ox = 120, oy = 440, pw = 720, ph = 300, dmax = 10;
const X = d => ox + d / dmax * pw, Y = r => oy - (r + 1) / 7 * ph;
let gold = '', proxy = '';
for (let i = 0; i <= 100; i++) {
  const d = Math.max(0.0001, i / 10);
  const g = d * (1 - 0.45 * Math.log(d)), p = 0.6 * d;
  gold += `${i ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(g).toFixed(1)}`;
  proxy += `${i ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(p).toFixed(1)}`;
}
const peakD = Math.exp((1 - 0.45) / 0.45), peakG = peakD * (1 - 0.45 * Math.log(peakD));
const ov = [
  `<path d="M${ox} ${oy - ph}V${oy}H${ox + pw}" class="axis"/>`,
  `<path d="M${ox} ${Y(0)}H${ox + pw}" class="line"/>`,
  `<path d="${proxy}" fill="none" stroke="#9b87f5" stroke-width="3"/>`,
  `<path d="${gold}" fill="none" stroke="#20a28c" stroke-width="3"/>`,
  `<path d="M${X(peakD).toFixed(1)} ${oy - ph}V${oy}" class="dash" style="marker-end:none"/>`,
  `<circle cx="${X(peakD).toFixed(1)}" cy="${Y(peakG).toFixed(1)}" r="6" fill="#20a28c"/>`,
  text(X(peakD) + 12, Y(peakG) - 14, '真实质量最高点', 's'),
  text(ox + pw - 210, Y(6) + 6, '紫线 代理奖励：一直上涨', 's'),
  `<path d="M${ox + 20} ${Y(0) + 25}h24" stroke="#20a28c" stroke-width="3"/>`,
  text(ox + 52, Y(0) + 30, '绿线 真实质量：先升后降', 's'),
  `<path d="M${ox + pw - 242} ${Y(6) + 1}h24" stroke="#9b87f5" stroke-width="3"/>`,
  text(ox + pw / 2, oy + 36, '离初始模型的距离 d = √KL →', 's', 'middle'),
  text(ox - 16, oy - ph - 16, '奖励（示意）', 's'),
  text(ox - 12, Y(0) + 5, '0', 'xs', 'end'),
  box('ovn', 880, 140, 328, 300, 'amber', '读图', ['训练只看得见紫线（奖励模型）', '真正想要的是绿线（人的判断）', '越过峰值后分数还在涨，', '回答却在变差：变长、讨好、', '套话、过度承诺', 'KL 惩罚和提前停止，都是为了', '停在峰值附近'], '奖励过度优化'),
];
const prefOver = svg('pref-overoptimization', 1240, 500, '奖励过度优化的示意曲线',
  '横轴是策略离初始模型的距离（KL 的平方根），紫色代理奖励随训练一直上涨，绿色真实质量先升后降，峰值之后继续优化代理奖励反而让真实质量变差。曲线形式取自 Gao 等 2022 的 RL 拟合式，系数为示意。',
  '奖励模型的分数一直涨，真实质量却先升后降', '曲线形式 R(d) = d(α − β·ln d) 取自 Gao 等 2022 的强化学习拟合式；系数为示意，不对应具体模型。',
  ov.join('\n'));

// ---- rl-grpo-loop ------------------------------------------------------------
// 8 sampled answers to an overtime-pay question; correct = 1600.
const ans = [['1600', 1], ['1200', 0], ['1600', 1], ['2400', 0], ['1600', 1], ['800', 0], ['无答案', 0], ['1600', 1]];
let g = '';
ans.forEach(([a, r], i) => {
  const x = 330 + i * 86;
  g += cell(x, 300, 78, 40, 'fblue', a, 's');
  g += cell(x, 380, 78, 36, r ? 'fgreen' : 'fred', String(r), 's');
  g += cell(x, 460, 78, 36, r ? 'fgreen' : 'fred', r ? '+1.0' : '−1.0', 's');
});
g += text(320, 326, '8 个回答', 'k', 'end');
g += text(320, 404, '奖励', 'k', 'end');
g += text(320, 484, '优势', 'k', 'end');
g += edge('M670 340V380') + edge('M670 416V460');
g += label(690, 368, '② 检查器：抽取最终数字，与 1600 比对', 310);
g += label(690, 446, '(奖励 − 组均值 0.5) ÷ 组标准差 0.5', 300);
const grpo = svg('rl-grpo-loop', 1240, 660, 'GRPO 训练一步的循环',
  '同一道加班费题让当前策略采样 8 个回答，检查器抽取最终数字与标准答案 1600 比对，答对得 1、答错或没有答案得 0。8 个奖励的均值 0.5、标准差 0.5，归一化后答对的优势 +1.0、答错的 −1.0，再按优势更新策略并用 KL 拉住参考模型，然后进入下一题。',
  'GRPO 一步：同题采样一组回答，按组内相对好坏更新', '题目：月工资 8,700 元，按 21.75 天折算日工资，休息日加班 2 天且未补休，加班费多少？（教学用示例制度：休息日 200%）',
  [
    box('q', 32, 120, 260, 120, 'gray', '题目 + 标准答案', ['400 元/天 × 2 天 × 200%', '= 1600 元'], '训练数据'),
    box('pol', 330, 120, 340, 120, 'blue', '当前策略采样 G = 8 次', ['温度 > 0，每次推理过程不同', '生成占一步大部分时间'], '① 生成（rollout）'),
    box('ref', 880, 120, 328, 120, 'violet', '参考模型', ['计算 KL：别离起点太远', '（TRL 当前默认不加）'], '可选'),
    edge('M292 180H330'), edge('M500 240V300'),
    g,
    box('upd', 330, 540, 878, 92, 'green', '③ 更新：提高 +1.0 回答里每个 token 的概率，降低 −1.0 的', ['不需要价值模型；组里全对或全错时优势都是 0，这道题本步不提供学习信号'], ''),
    edge('M670 496V540'),
    edge('M1120 240V540', 'dash'),
    label(1132, 400, 'KL 项', 60),
    edge('M330 586H162V240', 'dash'),
    label(176, 420, '下一批题目', 100),
  ].join('\n'));

write({
  'sft-loss-mask': sftLossMask,
  'sft-packing': sftPacking,
  'lora-update-path': loraPath,
  'lora-merge-serve': loraMerge,
  'pref-rlhf-vs-dpo': prefPipelines,
  'pref-overoptimization': prefOver,
  'rl-grpo-loop': grpo,
});
