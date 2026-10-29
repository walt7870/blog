// Figures for docs/ai/llm-architecture/15-llama.md and 16-qwen.md (group "families-a").
// Run: node .maintenance/llm-architecture/diagrams-families-a.mjs
// Numbers come from research/facts-families-a.md (config.json reads, transformers 5.21.0 source).
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- shared: generation timeline as rows ------------------------------------
function timeline(id, title, desc, heading, sub, rows) {
  const X0 = 28, Y0 = 112, RH = 84, GAP = 12;
  let b = '';
  // vertical axis
  b += `<path d="M60 ${Y0 - 8}V${Y0 + rows.length * (RH + GAP) - GAP + 8}" class="axis"/>`;
  rows.forEach(([date, name, cls, l1, l2, spec], i) => {
    const y = Y0 + i * (RH + GAP);
    b += `<circle cx="60" cy="${y + RH / 2}" r="8" fill="#fff" stroke="#64748b" stroke-width="2"/>`;
    b += box(`${id}-n${i}`, 84, y, 236, RH, cls, name, [], date);
    b += box(`${id}-c${i}`, 336, y, 780, RH, 'node', '', []);
    b += text(354, y + 34, l1, 's') + text(354, y + 62, l2, 's');
    b += box(`${id}-s${i}`, 1132, y, 240, RH, 'gray', '', []);
    b += text(1150, y + 34, spec[0], 'm') + text(1150, y + 62, spec[1], 'xs');
  });
  const h = Y0 + rows.length * (RH + GAP) + 24;
  return svg(id, 1400, h, title, desc, heading, sub, b);
}

// ---- llama-timeline (15) ------------------------------------------------------
const llamaRows = [
  ['2023-02', 'Llama 1', 'gray', '现代配方成形：Pre-Norm + RMSNorm、SwiGLU、RoPE、全部线性层无偏置', '多头注意力（MHA），SentencePiece 词表 32,000，上下文 2,048', ['7B–65B', '1.0T/1.4T token · 非商用']],
  ['2023-07', 'Llama 2', 'blue', '结构几乎不变：上下文翻倍到 4,096，训练 token 增到 2T', '只有 34B/70B 改用 GQA（8 个 KV 头），7B/13B 仍是 MHA', ['7B / 13B / 70B', '社区许可，可商用']],
  ['2024-04', 'Llama 3', 'blue', '分词器换成 128,256 词表（tiktoken 系），全部尺寸都用 GQA', 'rope_theta 从 10,000 调到 500,000，上下文 8,192，跨文档注意力掩码', ['8B / 70B', '15T+ token']],
  ['2024-07', 'Llama 3.1', 'violet', 'rope_scaling 类型 llama3：按频率分段缩放，上下文扩到 131,072', '新增 405B，仍是密集结构；许可证允许用输出训练其他模型', ['8B / 70B / 405B', '128K 上下文']],
  ['2024-09', 'Llama 3.2', 'green', '1B/3B：剪枝后用 3.1 8B/70B 的 logits 做蒸馏，共享词嵌入', '11B/90B Vision：在 3.1 文本模型旁插入交叉注意力层接图像', ['1B / 3B / 11B / 90B', '端侧 + 视觉']],
  ['2024-12', 'Llama 3.3', 'green', '只发布 70B Instruct，config 与 3.1-70B 相同', '改进全在后训练，结构没有变化', ['70B', '同 3.1 架构']],
  ['2025-04', 'Llama 4', 'amber', 'MoE：每 token 激活 1 个路由专家 + 1 个共享专家；Maverick 密集/MoE 层交替', 'iRoPE：每 4 层 1 层不用 RoPE 且看全文；早期融合原生多模态；词表 202,048', ['Scout 109B/17B', 'Maverick 400B/17B']],
];
const llamaTimeline = timeline('llama-timeline', 'Llama 各代结构变化时间线',
  '从 2023 年 2 月的 Llama 1 到 2025 年 4 月的 Llama 4，每一行列出发布时间、主要结构变化和规格。Llama 1 定下 RMSNorm、SwiGLU、RoPE 的配方；Llama 2 在大模型上引入 GQA；Llama 3 换 128K 词表、全尺寸 GQA、rope_theta 500000；Llama 3.1 用 llama3 RoPE 缩放扩到 128K；Llama 3.2 有剪枝蒸馏的小模型和交叉注意力视觉模型；Llama 3.3 结构不变；Llama 4 改为 MoE、iRoPE 和早期融合多模态。',
  'Llama 1 → Llama 4：每一代动了哪里', '中间一栏是结构变化，右栏是尺寸和训练量；Llama 3.3 之前都是同一个 LlamaForCausalLM 类。',
  llamaRows);

// ---- llama-decoder-layer (15) ---------------------------------------------------
function chip(node, x, y, w, h, cls, t, s) {
  return box(node, x, y, w, h, cls, t, s ? [s] : []);
}
const dl = [];
// residual lines
const RY1 = 214, RY2 = 520;
dl.push(`<path d="M40 ${RY1}H1360" stroke="#60a5fa" stroke-width="10" opacity=".3" fill="none"/>`);
dl.push(`<path d="M40 ${RY2}H1360" stroke="#60a5fa" stroke-width="10" opacity=".3" fill="none"/>`);
dl.push(text(40, RY1 - 18, 'hidden_states [L, 4096]', 'm'));
dl.push(text(40, RY2 - 18, '加过注意力输出的残差流 [L, 4096]', 's'));
// attention branch (top)
dl.push(edge(`M120 ${RY1}V262`));
dl.push(chip('d-n1', 40, 262, 196, 74, 'node', 'input_layernorm', 'RMSNorm'));
dl.push(edge('M236 299H262'));
dl.push(chip('d-q', 262, 238, 250, 56, 'blue', 'q_proj → [L, 32, 128]', ''));
dl.push(chip('d-k', 262, 302, 250, 56, 'violet', 'k_proj → [L, 8, 128]', ''));
dl.push(chip('d-v', 262, 366, 250, 56, 'violet', 'v_proj → [L, 8, 128]', ''));
dl.push(edge('M512 266H540V290'), edge('M512 330H540'));
dl.push(chip('d-rope', 540, 268, 150, 80, 'amber', 'RoPE', '只转 Q、K'));
dl.push(edge('M512 394H730V356'));
dl.push(edge('M690 308H720'));
dl.push(chip('d-att', 720, 262, 290, 92, 'blue', '因果注意力', 'repeat_kv：8 组 KV 给 32 个 Q 头'));
dl.push(edge('M1010 308H1036'));
dl.push(chip('d-o', 1036, 262, 200, 92, 'blue', 'o_proj', '[L, 4096] → [L, 4096]'));
dl.push(edge(`M1236 308H1270V${RY1 + 14}`));
dl.push(`<circle cx="1270" cy="${RY1}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(1270, RY1 + 6, '+', 't', 'middle'));
dl.push(edge(`M1284 ${RY1}H1340V${RY2 - 40}H40V${RY2}`, 'dash'));
// mlp branch (bottom)
dl.push(edge(`M120 ${RY2}V566`));
dl.push(chip('d-n2', 40, 566, 270, 74, 'node', 'post_attention_layernorm', 'RMSNorm'));
dl.push(edge('M310 603H340'));
dl.push(chip('d-g', 340, 548, 320, 56, 'green', 'gate_proj → SiLU → [L, 14336]', ''));
dl.push(chip('d-u', 340, 612, 320, 56, 'green', 'up_proj → [L, 14336]', ''));
dl.push(edge('M660 576H700V594'), edge('M660 640H700V622'));
dl.push(`<circle cx="700" cy="608" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(700, 614, '×', 't', 'middle'));
dl.push(edge('M714 608H740'));
dl.push(chip('d-d', 740, 566, 260, 84, 'green', 'down_proj', '[L, 14336] → [L, 4096]'));
dl.push(edge(`M1000 608H1270V${RY2 + 14}`));
dl.push(`<circle cx="1270" cy="${RY2}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(1270, RY2 + 6, '+', 't', 'middle'));
dl.push(edge(`M1284 ${RY2}H1356`));
dl.push(text(1000, 470, '第 1 个残差加法后进入下半层', 'xs'));
dl.push(text(40, 700, '输出 [L, 4096] 交给下一个 LlamaDecoderLayer，32 层结构相同、参数各不相同', 's'));
dl.push(text(40, 726, '每层参数：注意力 41,943,040 + MLP 176,160,768 + 两个 RMSNorm 8,192 = 218,112,000', 'xs'));
const llamaLayer = svg('llama-decoder-layer', 1400, 750, 'LlamaDecoderLayer 前向数据流与模块名',
  'Llama-3.1-8B 的一层：输入 [L,4096] 先经 input_layernorm，再分别经 q_proj、k_proj、v_proj 得到 32 个 Q 头和 8 个 KV 头，Q 和 K 经 RoPE 旋转，repeat_kv 把 8 组 K、V 复制给 32 个 Q 头做因果注意力，o_proj 投回 4096 维后加回残差流；然后经 post_attention_layernorm，gate_proj 经 SiLU 后与 up_proj 逐元素相乘，down_proj 从 14336 维投回 4096 维，再加回残差流。',
  '一层 LlamaDecoderLayer：模块名与张量形状', '以 Llama-3.1-8B 为例，L 是序列长度；方框里的名字就是 modeling_llama.py 和权重文件里的参数名。',
  dl.join('\n'));

// ---- llama4-layout (15) --------------------------------------------------------
const l4 = [];
const CX = 170, CW = 22, CG = 2.4, CH = 40;
function layerRow(y, name, isMoe) {
  let s = text(32, y + 26, name, 't');
  for (let i = 0; i < 48; i++) {
    const x = CX + i * (CW + CG);
    const nope = (i + 1) % 4 === 0;
    s += cell(x, y, CW, CH, isMoe(i) ? 'famber' : 'fgreen');
    if (nope) s += `<rect x="${x - 1.5}" y="${y - 1.5}" width="${CW + 3}" height="${CH + 3}" rx="5" fill="none" stroke="#1d4ed8" stroke-width="3"/>`;
  }
  return s;
}
l4.push(text(CX, 118, '第 0 层', 'xs'), text(CX + 47 * (CW + CG) + CW, 118, '第 47 层', 'xs', 'end'));
l4.push(layerRow(132, 'Scout', () => true));
l4.push(layerRow(196, 'Maverick', i => i % 2 === 1));
// legend
l4.push(cell(170, 262, 22, 22, 'famber'), text(202, 279, 'MoE 层：1 个共享专家 + 1 个路由专家', 's'));
l4.push(cell(560, 262, 22, 22, 'fgreen'), text(592, 279, '密集 FFN 层（intermediate_size_mlp 16384）', 's'));
l4.push(`<rect x="958" y="260" width="26" height="26" rx="5" fill="none" stroke="#1d4ed8" stroke-width="3"/>`, text(994, 279, 'NoPE 层：不加 RoPE，看完整上下文', 's'));
l4.push(text(170, 312, '其余 36 层加 RoPE，只在 8,192 token 的块内做注意力（chunked_attention）', 'xs'));
// MoE block
const MY = 350;
l4.push(`<rect x="28" y="${MY}" width="1344" height="324" rx="10" fill="none" stroke="#e0a63a" stroke-width="2" stroke-dasharray="6 5"/>`);
l4.push(text(48, MY + 30, '放大一个 MoE 层（Llama4TextMoe）', 'k'));
l4.push(box('m-in', 60, MY + 108, 180, 84, 'node', '一个 token', ['[5120]']));
l4.push(edge(`M240 ${MY + 150}H270`, "line"));
l4.push(box('m-r', 300, MY + 50, 280, 104, 'violet', '路由器 router', ['5120 → 16 或 128 个分数', 'top-1 后取 sigmoid']));
l4.push(box('m-s', 300, MY + 168, 280, 104, 'green', '共享专家 shared_expert', ['SwiGLU，中间维 8192', '每个 token 都经过']));
l4.push(edge(`M270 ${MY + 150}V${MY + 102}H300`), edge(`M270 ${MY + 150}V${MY + 220}H300`));
l4.push(edge(`M580 ${MY + 102}H640`));
// experts grid
let ex = '';
for (let i = 0; i < 16; i++) ex += cell(640 + (i % 8) * 46, MY + 64 + Math.floor(i / 8) * 40, 40, 32, i === 5 ? 'famber' : 'fgray', i === 5 ? '选中' : '');
l4.push(ex);
l4.push(text(640, MY + 168, '路由专家（Scout 16 个 / Maverick 128 个）', 'xs'));
l4.push(text(640, MY + 190, '输入先乘以门控分数，再进选中的专家', 'xs'));
l4.push(edge(`M1008 ${MY + 100}H1094V${MY + 136}`));
l4.push(edge(`M580 ${MY + 220}H1094V${MY + 164}`));
l4.push(`<circle cx="1094" cy="${MY + 150}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>`, text(1094, MY + 156, '+', 't', 'middle'));
l4.push(edge(`M1108 ${MY + 150}H1150`));
l4.push(box('m-out', 1150, MY + 108, 200, 84, 'node', '输出', ['[5120]，加回残差流']));
l4.push(text(60, MY + 300, '每个 MoE 层每 token 只算 2 个专家（各约 1.26 亿参数）；两个模型都是 17B 激活，差别在专家总数和 MoE 层数', 's'));
const llama4Layout = svg('llama4-layout', 1400, 700, 'Llama 4 Scout 与 Maverick 的 48 层布局和 MoE 层结构',
  '上方用 48 个小格表示 Llama 4 Scout 和 Maverick 的 48 层：Scout 每层都是 MoE，Maverick 奇数层是 MoE、偶数层是密集 FFN；每第 4 层（第 3、7、11……47 层）是不加 RoPE、看完整上下文的 NoPE 层，其余层加 RoPE 并只在 8192 token 块内做注意力。下方放大一个 MoE 层：token 同时进入共享专家和路由器，路由器从 16 或 128 个专家里选 1 个，用 sigmoid 门控分数缩放输入后送进该专家，两路输出相加后加回残差流。',
  'Llama 4：哪些层是 MoE，哪些层不用 RoPE', '每格一层；颜色表示 FFN 类型，蓝框表示 NoPE 全局注意力层。数据读自两个模型的 config.json 与 modeling_llama4.py。',
  l4.join('\n'));

// ---- qwen-timeline (16) --------------------------------------------------------
const qwenRows = [
  ['2023', 'Qwen', 'gray', '与 Llama 同一套配方，但保留 Q/K/V 投影的偏置，词表约 152K', '输入输出词嵌入不共享；长文本靠 NTK 插值、LogN 缩放和窗口注意力', ['1.8B–72B', 'Tongyi Qianwen 许可']],
  ['2024-02', 'Qwen1.5', 'gray', '换成 Transformers 标准的 qwen2 实现，上下文 32K，rope_theta 1,000,000', '多数尺寸仍是 MHA；Qwen1.5-MoE-A2.7B：60 个专家选 4 + 共享专家', ['0.5B–110B', '首个 MoE']],
  ['2024-06', 'Qwen2', 'blue', '全部尺寸改用 GQA；0.5B/1.5B 共享词嵌入', 'DCA + YaRN 把 32K 训练长度外推到 128K；57B-A14B 由 7B 升级成 MoE', ['0.5B–72B', '7T token']],
  ['2024-09', 'Qwen2.5', 'blue', '结构与 Qwen2 相同，训练数据扩到 18T token', '1M 版本：rope_theta 1e7 + 双块注意力配置；3B/72B 用自有许可', ['0.5B–72B', '同 Qwen2 架构']],
  ['2025-04', 'Qwen3', 'violet', '去掉 QKV 偏置，改用逐头 QK-Norm；head_dim 固定 128', 'MoE：128 个细粒度专家选 8，不设共享专家；一个模型兼容思考/非思考', ['0.6B–32B · 30B/235B MoE', 'Apache 2.0']],
  ['2025-09', 'Qwen3-Next', 'amber', '混合注意力：3 层 Gated DeltaNet + 1 层带输出门的注意力', '512 个专家选 10 + 1 个共享专家；MTP；零中心、带权重衰减的 RMSNorm', ['80B 总 / 3B 激活', '每 token 激活 3.75%']],
  ['2026-02', 'Qwen3.5 / 3.6 / 3.8', 'amber', 'Qwen3-Next 结构进入主线，并接上视觉编码器做早期融合训练', '词表扩到 248,320；3.6（4 月）、3.8（8 月）沿用同一 qwen3_5 实现', ['0.8B–397B · 3.8 到 2.4T', '多为 Apache 2.0']],
  ['2026-08', 'Qwen3.8-Flash-Next', 'red', 'Transformers 里的 qwen4_exp：全注意力层换成块级稀疏的 QSA', '4 路加宽残差流（Gated Residual）；第 2 层加 n-gram 嵌入', ['125B/6B + 51B n-gram', 'Qwen Community 1.0']],
];
const qwenTimeline = timeline('qwen-timeline', 'Qwen 各代结构变化时间线',
  '从 2023 年的 Qwen 到 2026 年 8 月的 Qwen3.8-Flash-Next，每一行列出发布时间、结构变化和规格：Qwen 保留 QKV 偏置；Qwen1.5 换到 qwen2 实现；Qwen2 全面 GQA、小模型共享词嵌入；Qwen2.5 结构不变；Qwen3 去掉 QKV 偏置、加 QK-Norm，MoE 不设共享专家；Qwen3-Next 改为 3:1 的 Gated DeltaNet 与门控注意力混合、高稀疏 MoE 和 MTP；Qwen3.5 把这套结构带进主线并原生多模态；Qwen3.8-Flash-Next 换上稀疏注意力 QSA、加宽残差流和 n-gram 嵌入。',
  'Qwen → Qwen3.8：每一代动了哪里', '中间一栏是结构变化，右栏是尺寸和许可；日期取官方仓库首次发布的月份。',
  qwenRows);

// ---- qwen-attention-evolution (16) ---------------------------------------------
const qa = [];
const cols = [
  ['Qwen2 / 2.5', 'blue', [['q/k/v_proj', '带 bias，o_proj 无'], ['RoPE', '全部 128 维'], ['GQA 注意力', '7B：28 个 Q 头 / 4 个 KV 头'], ['o_proj', '投回隐藏维']], '每层都是这种注意力'],
  ['Qwen3', 'violet', [['q/k/v_proj', '去掉 bias'], ['q_norm / k_norm', '每个头 128 维各做 RMSNorm'], ['RoPE + GQA', '8B：32 个 Q 头 / 8 个 KV 头'], ['o_proj', '投回隐藏维']], '每层都是这种注意力'],
  ['Qwen3-Next / 3.5', 'amber', [['q_proj 输出翻倍', '一半是 Q，一半是门 gate'], ['q_norm / k_norm', 'head_dim 256'], ['部分 RoPE', '只转 256 维中的 64 维'], ['× sigmoid(gate)', '再进 o_proj']], '每 4 层 1 层；其余 3 层是 Gated DeltaNet'],
  ['Qwen3.8-Flash-Next', 'red', [['索引器 indexer', '4 个查询头 + 1 个共享键头'], ['每 4 个 token 并成一块', '给块打分，选前 512 块'], ['门控注意力', '只看选中的 2,048 个 token'], ['× gate → o_proj', '结构同左']], '每 4 层 1 层；其余 3 层仍是 Gated DeltaNet'],
];
const QW = 318, QG = 24, QX = 28;
cols.forEach(([name, cls, steps, foot], c) => {
  const x = QX + c * (QW + QG);
  qa.push(box(`qa-h${c}`, x, 104, QW, 56, cls, name, []));
  steps.forEach(([t, s], i) => {
    const y = 184 + i * 104;
    qa.push(box(`qa-${c}-${i}`, x + 14, y, QW - 28, 80, 'node', t, [s]));
    if (i < steps.length - 1) qa.push(edge(`M${x + QW / 2} ${y + 80}V${y + 104}`));
  });
  qa.push(edge(`M${x + QW / 2} 160V184`));
  qa.push(text(x + 14, 618, foot, 'xs'));
});
const qwenAttn = svg('qwen-attention-evolution', 1400, 646, 'Qwen 各代注意力模块的变化',
  '四列分别是 Qwen2/2.5、Qwen3、Qwen3-Next/Qwen3.5、Qwen3.8-Flash-Next 的注意力子层：Qwen2 的 q、k、v 投影带偏置，接全维 RoPE 和 GQA；Qwen3 去掉偏置，在 RoPE 前对每个头的 Q、K 做 RMSNorm；Qwen3-Next 的 q_proj 同时输出 Q 和门，head_dim 256 中只有 64 维做 RoPE，注意力输出乘以 sigmoid 门后再进 o_proj，而且每 4 层只有 1 层是这种注意力；Qwen3.8-Flash-Next 再加一个索引器，把每 4 个 token 合成一块打分，只让注意力看选中的 512 块共 2048 个 token。',
  'Qwen 的注意力子层：从 QKV 偏置到门控、混合与稀疏', '从左到右按时间排列；每列自上而下是一次前向经过的步骤。来源为各代 modeling_*.py 与 config.json。',
  qa.join('\n'));

// ---- qwen-tied-embedding (16) ----------------------------------------------------
const te = [];
const models = [
  ['Qwen2.5-0.5B（共享）', 494032768, 136134656, true],
  ['同一结构若不共享', 630167424, 136134656, false],
  ['Qwen3-0.6B（共享）', 596049920, 155582464, true],
  ['Llama-3.2-1B（共享）', 1235814400, 262668288, true],
  ['Qwen3-8B（不共享）', 8190735360, 622329856, false],
];
const BX = 330, BWID = 900;
models.forEach(([name, tot, emb, tie], i) => {
  const y = 128 + i * 82;
  te.push(text(32, y + 30, name, 't'));
  const we = BWID * emb / tot, wo = tie ? 0 : BWID * emb / tot, wm = BWID - we - wo;
  te.push(cell(BX, y, we, 46, 'fblue', we > 120 ? `词嵌入 ${(100 * emb / tot).toFixed(1)}%` : '', 's'));
  if (we <= 120) te.push(text(BX, y + 66, `词嵌入 ${(100 * emb / tot).toFixed(1)}%`, 'xs'));
  te.push(cell(BX + we, y, wm, 46, 'fgray', `解码器层 ${(100 * (tot - emb - (tie ? 0 : emb)) / tot).toFixed(1)}%`, 's'));
  if (!tie) te.push(cell(BX + we + wm, y, wo, 46, 'famber', wo > 90 ? `输出层 ${(100 * emb / tot).toFixed(1)}%` : '', 's'));
  te.push(text(BX + BWID + 16, y + 30, `${(tot / 1e9).toFixed(2)}B`, 'm'));
  if (!tie && wo <= 90) te.push(text(BX + we + wm + wo / 2, y + 66, `输出层 ${(100 * emb / tot).toFixed(1)}%`, 'xs', 'middle'));
});
te.push(text(32, 552, '共享时输出层直接复用词嵌入矩阵，不占额外参数；但每个 token 的输出层矩阵乘法照算，省的是显存和权重，不是计算。', 's'));
const qwenTied = svg('qwen-tied-embedding', 1400, 580, '词嵌入在小模型和大模型中的参数占比',
  '五条横条把模型参数按词嵌入、解码器层、输出层分开：Qwen2.5-0.5B 共享词嵌入时词嵌入占 27.6%，同一结构如果不共享，输入输出两张表合计占 43.2%，总参数从 4.94 亿增到 6.30 亿；Qwen3-0.6B 共享时占 26.1%；Llama-3.2-1B 共享时占 21.3%；Qwen3-8B 不共享，两张表各占 7.6%。',
  '为什么小模型共享词嵌入：一张 15 万行的表有多重', '每条按各自总参数归一到 100%；右侧是总参数。数字按 config.json 逐项计算。',
  te.join('\n'));

write({
  'llama-timeline': llamaTimeline,
  'llama-decoder-layer': llamaLayer,
  'llama4-layout': llama4Layout,
  'qwen-timeline': qwenTimeline,
  'qwen-attention-evolution': qwenAttn,
  'qwen-tied-embedding': qwenTied,
});
