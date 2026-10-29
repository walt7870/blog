// Figures for docs/ai/llm-architecture/ 17–18 (group "read").
// Run: node .maintenance/llm-architecture/diagrams-read.mjs
// Numbers come from research/facts-read.md (Qwen2.5-VL / Qwen3-VL / Gemma 4 / Qwen3-Omni configs and source).
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- multimodal-image-tokens (17) ---------------------------------------------
function imageTokens() {
  const b = [];
  // the picture: 8×8 drawn cells stand for the 32×32 patch grid
  const GX = 40, GY = 150, C = 26;
  b.push(text(GX, 132, '448×448 的图（示意 8×8 格）', 'k'));
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const hi = r < 2 && c < 2;
    b.push(`<rect x="${GX + c * C}" y="${GY + r * C}" width="${C - 2}" height="${C - 2}" rx="2" class="${hi ? 'famber' : 'fgray'}"/>`);
  }
  b.push(`<rect x="${GX - 2}" y="${GY - 2}" width="${2 * C + 2}" height="${2 * C + 2}" rx="3" fill="none" stroke="#e0a63a" stroke-width="3"/>`);
  b.push(text(GX, GY + 8 * C + 26, '橙框：相邻 2×2 个 patch', 'xs'));
  b.push(text(GX, GY + 8 * C + 46, '每格 = 14×14 像素', 'xs'));

  const steps = [
    ['p1', '切成 patch', ['32×32 = 1024 个', '2 帧×14×14×3 通道', '每个 1176 个数'], 'node', '① Conv3d'],
    ['p2', 'ViT 编码', ['32 层，宽 1280', '[1024, 1176]', '→ [1024, 1280]'], 'blue', '② 视觉编码器'],
    ['p3', '2×2 合并', ['4 个相邻向量拼成 1 个', '[1024, 1280]', '→ [256, 5120]'], 'amber', '③ 相邻合并'],
    ['p4', 'MLP 投影', ['两层线性 + GELU', '[256, 5120]', '→ [256, 3584]'], 'violet', '④ 投影层'],
    ['p5', '进入语言模型', ['和文字 token 拼成', '一条序列，共 28 层', '256 个图像 token'], 'green', '⑤ 拼接'],
  ];
  const X0 = 290, W = 196, G = 22, Y = 124, H = 176;
  steps.forEach(([id, t, lines, cls, k], i) => {
    const x = X0 + i * (W + G);
    b.push(box(id, x, Y, W, H, cls, t, lines, k));
    if (i < steps.length - 1) b.push(edge(`M${x + W} ${Y + H / 2}H${x + W + G}`));
  });
  b.push(edge(`M${GX + 8 * C + 6} ${GY + 104}H${X0}`));

  // comparison strip
  const SY = 460;
  b.push(text(40, SY - 18, '同一张 448×448 的图，在不同模型里变成多少个 token（按各自源码和预处理配置计算）', 's'));
  const rows = [
    ['ViT-L/14 不合并', '1024', 1024, 'fgray', '按 448 原尺寸切 32×32 个，全部送进去'],
    ['Qwen2.5-VL', '256', 256, 'famber', 'patch 14，2×2 合并'],
    ['Qwen3-VL', '196', 196, 'fviolet', 'patch 16：28×28 = 784，2×2 合并'],
    ['Gemma 3', '256', 256, 'fblue', '固定缩放到 896，4096 个 patch 平均池化 4×4'],
    ['Gemma 4（预算 280）', '256', 256, 'fgreen', '放大到 768×768，2304 个 patch，3×3 池化'],
  ];
  const BX = 260, BW = 640;
  rows.forEach(([n, v, num, cls, note], i) => {
    const y = SY + i * 42;
    b.push(text(40, y + 22, n, 's'));
    b.push(`<rect x="${BX}" y="${y + 4}" width="${(BW * num / 1024).toFixed(1)}" height="26" rx="4" class="${cls}"/>`);
    b.push(text(BX + BW * num / 1024 + 10, y + 23, v, 'm'));
    b.push(text(960, y + 22, note, 'xs'));
  });
  return svg('multimodal-image-tokens', 1400, 690, '一张 448×448 的图在 Qwen2.5-VL 里变成 256 个 token 的过程',
    '448×448 的图按 14×14 像素切成 32×32 共 1024 个 patch，经 ViT 编码成 1024 个 1280 维向量，相邻 2×2 个合并成 256 个 5120 维向量，再由 MLP 投影到语言模型的 3584 维，和文字 token 拼接。下方对比同一张图在 ViT-L/14、Qwen2.5-VL、Qwen3-VL、Gemma 3、Gemma 4 中的 token 数。',
    '图像怎样变成 token：以 Qwen2.5-VL-7B 为例', '方括号是张量形状；token 数决定语言模型要多处理多少个位置',
    b.join('\n'));
}

// ---- multimodal-fusion (17) ---------------------------------------------------
function fusion() {
  const b = [];
  const cols = [
    { x: 40, title: 'LLaVA-1.5：外挂编码器', parts: [
      ['l1', 'gray', '图像 336×336', ['24×24 = 576 个 patch']],
      ['l2', 'blue', 'CLIP ViT-L/14', ['单独预训练好，常冻结', '取倒数第 2 层输出']],
      ['l3', 'violet', '两层 MLP 投影', ['1024 → 4096']],
      ['l4', 'green', 'Vicuna 语言模型', ['576 个图像 token 在最前面', '只在输入层接收图像']],
    ] },
    { x: 490, title: 'Qwen3-VL：编码器 + 多层注入', parts: [
      ['q1', 'gray', '任意分辨率图像', ['按 32 像素对齐，保留长宽比']],
      ['q2', 'blue', 'ViT（27 层，宽 1152）', ['第 8、16、24 层另出特征']],
      ['q3', 'violet', '合并器 ×4', ['2×2 合并后投影到 4096']],
      ['q4', 'green', 'Qwen3 语言模型 36 层', ['最终特征进输入层', '3 组中间特征加到第 1—3 层']],
    ] },
    { x: 940, title: 'Gemma 4 12B Unified：无编码器', parts: [
      ['g1', 'gray', '图像', ['按 48×48 像素切块']],
      ['g2', 'amber', '没有视觉编码器', ['48×48×3 = 6912 个像素值']],
      ['g3', 'violet', '线性层 + 位置嵌入', ['6912 → 3840']],
      ['g4', 'green', '解码器 48 层', ['图像、音频、文字', '从第 1 层起共用同一套层']],
    ] },
  ];
  const W = 420, H = 104, G = 34, Y0 = 136;
  cols.forEach(({ x, title, parts }) => {
    b.push(text(x, 118, title, 't'));
    parts.forEach(([id, cls, t, lines], i) => {
      const y = Y0 + i * (H + G);
      b.push(box(id, x, y, W, H, cls, t, lines));
      if (i < parts.length - 1) b.push(edge(`M${x + W / 2} ${y + H}V${y + H + G}`));
    });
  });
  // DeepStack side arrows in the middle column
  const mx = 490 + W, y2 = Y0 + (H + G), y4 = Y0 + 3 * (H + G);
  b.push(edge(`M${mx} ${y2 + 70}H${mx + 14}V${y4 + 60}H${mx}`, 'dash'));
  b.push(text(40, 700, '“原生多模态”多指训练方式（从预训练起混入图像）；结构上大多仍是编码器 + 投影。Gemma 4 12B Unified 是少数真正去掉编码器的设计。', 's'));
  return svg('multimodal-fusion', 1400, 730, 'LLaVA、Qwen3-VL、Gemma 4 12B Unified 三种接入图像的结构',
    'LLaVA-1.5 用单独预训练的 CLIP ViT 编码 576 个 patch，经两层 MLP 投影后放在语言模型输入最前面；Qwen3-VL 的 ViT 除最终输出外，还把第 8、16、24 层的特征经各自的合并器加到语言模型第 1 到 3 层的图像位置上（DeepStack）；Gemma 4 12B Unified 没有视觉编码器，48×48 像素块直接经线性层投影到 3840 维，和文字共用全部解码器层。',
    '图像怎样接进语言模型：三种结构', '从上到下是数据流；虚线是 Qwen3-VL 把中间层视觉特征加到语言模型前几层（DeepStack）',
    b.join('\n'));
}

// ---- multimodal-mrope (17) ----------------------------------------------------
function mrope() {
  const b = [];
  const toks = [
    ['看', 'text', [0, 0, 0]], ['图', 'text', [1, 1, 1]], ['<vs>', 'text', [2, 2, 2]],
    ['图1', 'img', [3, 3, 3]], ['图2', 'img', [3, 3, 4]], ['图3', 'img', [3, 3, 5]],
    ['图4', 'img', [3, 4, 3]], ['图5', 'img', [3, 4, 4]], ['图6', 'img', [3, 4, 5]],
    ['<ve>', 'text', [6, 6, 6]], ['金额', 'text', [7, 7, 7]],
  ];
  const X0 = 210, CW = 96, CG = 8, Y = 120;
  b.push(text(40, Y + 30, '序列', 'k'));
  ['t（时间）', 'h（行）', 'w（列）'].forEach((n, r) => b.push(text(40, Y + 92 + r * 46, n, 's')));
  toks.forEach(([s, kind, ids], i) => {
    const x = X0 + i * (CW + CG);
    b.push(cell(x, Y + 8, CW, 38, kind === 'img' ? 'famber' : 'fblue', s, 's'));
    ids.forEach((v, r) => b.push(cell(x, Y + 64 + r * 46, CW, 38, 'fgray', String(v), 'm')));
  });
  // small 2×3 grid at right of image tokens explanation
  b.push(text(X0 + 3 * (CW + CG), Y + 222, '6 个图像 token = 合并后 2 行 × 3 列：t 相同，h 按行、w 按列变化', 'xs'));
  b.push(text(X0 + 9 * (CW + CG) - 40, Y + 246, '图后的文字从 3 + max(1, 2, 3) = 6 接着数', 'xs'));

  // frequency split
  const FY = 430, FX = 210, FW = 1120, N = 64, cw = FW / N;
  b.push(text(40, FY - 22, '每个头的 64 对旋转频率怎样分给 t、h、w（从高频到低频）', 's'));
  const rowsF = [
    ['Qwen2.5-VL', i => (i < 16 ? 't' : i < 40 ? 'h' : 'w'), 'mrope_section [16, 24, 24]：按段切开'],
    ['Qwen3-VL', i => (i >= 60 ? 't' : ['t', 'h', 'w'][i % 3]), 'mrope_section [24, 20, 20] 交错：t h w t h w …'],
  ];
  const cls = { t: 'fblue', h: 'fgreen', w: 'famber' };
  rowsF.forEach(([n, f, note], r) => {
    const y = FY + r * 74;
    b.push(text(40, y + 22, n, 's'));
    for (let i = 0; i < N; i++) b.push(`<rect x="${(FX + i * cw).toFixed(1)}" y="${y}" width="${(cw - 1).toFixed(1)}" height="32" class="${cls[f(i)]}"/>`);
    b.push(text(FX, y + 54, note, 'xs'));
  });
  [['t', 'fblue'], ['h', 'fgreen'], ['w', 'famber']].forEach(([n, c], i) => {
    b.push(`<rect x="${1040 + i * 100}" y="${FY - 38}" width="18" height="18" class="${c}"/>`);
    b.push(text(1064 + i * 100, FY - 23, n, 's'));
  });
  return svg('multimodal-mrope', 1400, 600, 'M-RoPE 为文字和图像 token 分配三维位置',
    '序列为“看、图、视觉开始、6 个图像 token、视觉结束、金额”。文字 token 的 t、h、w 三个位置相同、逐个加 1；6 个图像 token 来自合并后 2 行 3 列的网格，t 都是 3，h 按行取 3、4，w 按列取 3、4、5；图后的文字从 6 继续。下方显示每个头 64 对旋转频率分给 t、h、w 的方式：Qwen2.5-VL 按 16、24、24 分段，Qwen3-VL 交错分配。',
    'M-RoPE：给每个 token 三个位置编号', 'Qwen2.5-VL 与 Qwen3-VL 的 get_rope_index 规则；文字 token 三个编号相同，等价于普通 RoPE',
    b.join('\n'));
}

// ---- multimodal-thinker-talker (17) -------------------------------------------
function thinkerTalker() {
  const b = [];
  const Y1 = 126, H = 118, W = 236, G = 34;
  const top = [
    ['a0', 'gray', '小林的语音', ['16 kHz 采样', '“年假怎么申请？”'], '输入'],
    ['a1', 'node', '梅尔频谱', ['128 维，每 10 ms 一帧', '每秒 100 帧'], '特征'],
    ['a2', 'blue', '音频编码器', ['32 层，宽 1280', '卷积下采样 8 倍'], 'AuT'],
    ['a3', 'violet', 'Thinker', ['MoE 48 层，128 选 8', '每秒语音约 13 个 token'], '理解与推理'],
    ['a4', 'green', '文字回复', ['“根据员工手册……”', '可以单独输出'], '文本'],
  ];
  top.forEach(([id, cls, t, lines, k], i) => {
    const x = 40 + i * (W + G);
    b.push(box(id, x, Y1, W, H, cls, t, lines, k));
    if (i < top.length - 1) b.push(edge(`M${x + W} ${Y1 + H / 2}H${x + W + G}`));
  });
  const Y2 = 420;
  const bot = [
    ['t1', 'amber', 'Talker', ['MoE 20 层，128 选 6', '每帧出第 1 层码本'], '说话'],
    ['t2', 'amber', '码本补全', ['5 层小 Transformer', '补出其余 15 层码本'], 'MTP'],
    ['t3', 'node', 'Code2Wav', ['因果卷积解码', '每帧放大 1920 倍'], '声码器'],
    ['t4', 'green', '24 kHz 波形', ['每秒 12.5 帧', '边生成边播放'], '输出'],
  ];
  const X2 = 40 + (W + G);
  bot.forEach(([id, cls, t, lines, k], i) => {
    const x = X2 + i * (W + G);
    b.push(box(id, x, Y2, W, H, cls, t, lines, k));
    if (i < bot.length - 1) b.push(edge(`M${x + W} ${Y2 + H / 2}H${x + W + G}`));
  });
  // thinker -> talker
  const tx = 40 + 3 * (W + G) + W / 2;
  b.push(edge(`M${tx} ${Y1 + H}V330H${X2 + W / 2}V${Y2}`));
  b.push(label(X2 + W / 2 + 20, 322, '多模态位置：Thinker 第 24 层隐藏状态；文字位置：只用词嵌入', 520));
  b.push(text(40, 600, '两个模型各自自回归：Thinker 出文字 token，Talker 跟着出语音码本 token；Talker 不读 Thinker 对回复文字的高层表示，只读回复文字本身。', 's'));
  return svg('multimodal-thinker-talker', 1400, 630, 'Qwen3-Omni 的 Thinker-Talker 结构',
    '语音以 16 kHz 输入，转成每秒 100 帧的 128 维梅尔频谱，经 32 层音频编码器下采样 8 倍，约每秒 13 个 token 进入 48 层 MoE 的 Thinker，输出文字回复。Talker 接收 Thinker 第 24 层在图像、音频位置的隐藏状态和文字的词嵌入，每帧生成第 1 层码本 token，再由 5 层的码本补全模块补出其余 15 层，Code2Wav 把每帧放大 1920 倍，得到每秒 12.5 帧的 24 kHz 波形。',
    '语音进、语音出：Qwen3-Omni 的 Thinker 与 Talker', '数字来自 Qwen3-Omni-30B-A3B-Instruct 的 config.json 与 Transformers 源码',
    b.join('\n'));
}

// ---- reading-config-map (18) --------------------------------------------------
function configMap() {
  const b = [];
  const fields = [
    ['f1', 'vocab_size', '128256'],
    ['f2', 'hidden_size', '4096'],
    ['f3', 'num_attention_heads × head_dim', '32 × 128'],
    ['f4', 'num_key_value_heads', '8'],
    ['f5', 'intermediate_size', '14336'],
    ['f6', 'num_hidden_layers', '32'],
    ['f7', 'tie_word_embeddings', 'false'],
  ];
  const FX = 40, FW = 390, FH = 62, FG = 18, FY = 120;
  fields.forEach(([id, k, v], i) => {
    const y = FY + i * (FH + FG);
    b.push(`<g data-node="${id}"><rect x="${FX}" y="${y}" width="${FW}" height="${FH}" rx="8" class="gray"/>`
      + `<text x="${FX + 16}" y="${y + 27}" class="m">${k}</text><text x="${FX + 16}" y="${y + 50}" class="xs">Llama-3.1-8B：${v}</text></g>`);
  });
  const mods = [
    ['m1', 'embed_tokens', '[128256, 4096]', 'blue', 0],
    ['m2', 'q_proj / o_proj', '[4096, 4096] 各一个', 'violet', 2],
    ['m3', 'k_proj / v_proj', '[4096, 1024] 各一个', 'violet', 3],
    ['m4', 'gate / up / down', '[4096, 14336] 三个', 'green', 4],
    ['m5', 'layers × 32', '上面三行每层一份', 'node', 5],
    ['m6', 'lm_head', '[4096, 128256]，不共享', 'amber', 6],
  ];
  const MX = 820, MW = 400;
  mods.forEach(([id, t, s, cls, fi]) => {
    const y = FY + fi * (FH + FG);
    b.push(box(id, MX, y - 4, MW, FH + 8, cls, '', []));
    b.push(`<text x="${MX + 18}" y="${y + 24}" class="m">${t}</text><text x="${MX + 18}" y="${y + 50}" class="xs">${s}</text>`);
    b.push(edge(`M${FX + FW} ${FY + fi * (FH + FG) + FH / 2}H${MX}`));
  });
  // vocab also feeds lm_head, tie feeds lm_head
  b.push(edge(`M${FX + FW} ${FY + FH / 2 + 8}C 620 ${FY + 40}, 640 ${FY + 6 * (FH + FG) + 10}, ${MX} ${FY + 6 * (FH + FG) + 20}`, 'dash'));
  // hidden_size fan-out
  const hy = FY + (FH + FG) + FH / 2;
  b.push(edge(`M${FX + FW} ${hy}H600`, 'line'));
  b.push(label(470, hy - 12, '所有矩阵的一条边', 150));
  b.push(text(40, 700, '形状决定参数：每层 4194 万（注意力）+ 1.76 亿（FFN），×32 层，再加两个 5.25 亿的词表矩阵，合计 80.3 亿。', 's'));
  return svg('reading-config-map', 1400, 730, 'config.json 字段和权重矩阵形状的对应关系',
    '左边是 Llama-3.1-8B 的 7 个关键字段，右边是它们决定的权重矩阵：vocab_size 和 hidden_size 决定词嵌入 [128256, 4096]，注意力头数乘头维度决定 q_proj 和 o_proj，KV 头数决定 k_proj、v_proj 为 [4096, 1024]，intermediate_size 决定 FFN 三个矩阵，num_hidden_layers 决定重复 32 份，tie_word_embeddings 为 false 时输出层单独一份 [4096, 128256]。hidden_size 是所有矩阵的一条边。',
    '从 config.json 读出每个矩阵的形状', '左边是字段（Llama-3.1-8B 的取值），右边是它决定的权重；虚线表示 vocab_size 同时决定输出层',
    b.join('\n'));
}

// ---- reading-class-tree (18) --------------------------------------------------
function classTree() {
  const b = [];
  const r = (id, x, y, w, h, cls, t, sub) => {
    let s = `<g data-node="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>`
      + `<text x="${x + 16}" y="${y + 28}" class="m">${t}</text>`;
    if (sub) s += `<text x="${x + 16}" y="${y + 52}" class="xs">${sub}</text>`;
    return s + '</g>';
  };
  b.push(r('c0', 40, 110, 900, 590, 'node', 'LlamaForCausalLM', '加上 lm_head，算 logits 和损失，提供 generate()'));
  b.push(r('c1', 70, 180, 840, 430, 'gray', 'model: LlamaModel', '词嵌入 → 32 层 → 最终 norm；负责掩码和 RoPE 的 cos/sin'));
  b.push(r('c2', 100, 250, 240, 64, 'blue', 'embed_tokens', 'nn.Embedding'));
  b.push(r('c3', 360, 250, 250, 64, 'node', 'rotary_emb', 'LlamaRotaryEmbedding'));
  b.push(r('c4', 630, 250, 250, 64, 'node', 'norm', 'LlamaRMSNorm'));
  b.push(r('c5', 100, 334, 780, 256, 'violet', 'layers: ModuleList[LlamaDecoderLayer] × 32', '每层：norm → 注意力 → 加残差 → norm → MLP → 加残差'));
  b.push(r('c6', 130, 404, 330, 166, 'node', 'self_attn: LlamaAttention', 'q_proj  k_proj  v_proj  o_proj'));
  b.push(text(146, 490, '缓存读写 past_key_values', 'xs'));
  b.push(text(146, 512, '按 _attn_implementation 选 sdpa / flash', 'xs'));
  b.push(r('c7', 480, 404, 370, 166, 'node', 'mlp: LlamaMLP', 'gate_proj  up_proj  down_proj'));
  b.push(text(496, 490, 'down(act(gate(x)) * up(x))', 'xs'));
  b.push(text(496, 512, '另有 input_layernorm、post_attention_layernorm', 'xs'));
  b.push(r('c8', 70, 626, 840, 56, 'amber', 'lm_head: nn.Linear(4096, 128256)', ''));
  // config + modular side
  b.push(r('d1', 1000, 110, 360, 110, 'gray', 'LlamaConfig', '读 config.json；每个 __init__ 都收它'));
  b.push(edge('M1000 165H940', 'dash'));
  b.push(r('d2', 1000, 330, 360, 92, 'amber', 'modular_qwen3.py', '156 行：只写和父类不同的部分'));
  b.push(r('d3', 1000, 520, 360, 92, 'green', 'modeling_qwen3.py', '515 行：展开后的完整代码'));
  b.push(edge('M1180 422V520'));
  b.push(label(1192, 478, '转换脚本生成', 110));
  return svg('reading-class-tree', 1400, 730, 'Transformers 中 Llama 的类嵌套结构与 modular 文件',
    'LlamaForCausalLM 包含 model（LlamaModel）和 lm_head；LlamaModel 包含 embed_tokens、rotary_emb、norm 和 32 个 LlamaDecoderLayer；每个解码器层包含 LlamaAttention（q、k、v、o 四个投影）和 LlamaMLP（gate、up、down），以及两个 RMSNorm。LlamaConfig 传给所有模块的构造函数。右侧：modular_qwen3.py 只写与父类不同的部分，由转换脚本生成完整的 modeling_qwen3.py。',
    'modeling_*.py 里的类怎样一层套一层', '左边是 LlamaForCausalLM 的模块树（冒号前是属性名，冒号后是类名）；右边是 modular 文件和生成文件的关系',
    b.join('\n'));
}

// ---- reading-modular-diff (18) ------------------------------------------------
function modularDiff() {
  const b = [];
  const rows = [
    ['Mistral4RMSNorm', 'LlamaRMSNorm', 'pass'],
    ['Mistral4RotaryEmbedding', 'LlamaRotaryEmbedding', 'pass'],
    ['Mistral4MLP', 'Qwen2MoeMLP', 'pass'],
    ['Mistral4TopkRouter', 'DeepseekV2TopkRouter', '改 forward：softmax 打分'],
    ['Mistral4Experts / MoE', 'DeepseekV3Experts / MoE', 'pass'],
    ['Mistral4Attention', 'DeepseekV3Attention', '改 forward：按位置缩放 query'],
    ['Mistral4DecoderLayer', 'DeepseekV3DecoderLayer', '只换成本模型的子类'],
    ['Mistral4Model / ForCausalLM', 'DeepseekV3Model / ForCausalLM', 'pass'],
  ];
  const Y0 = 120, H = 56, G = 12;
  b.push(text(40, Y0 - 10, 'modular_mistral4.py 里的类', 'k'));
  b.push(text(560, Y0 - 10, '父类（来自哪个模型）', 'k'));
  b.push(text(1000, Y0 - 10, '改了什么', 'k'));
  rows.forEach(([c, p, what], i) => {
    const y = Y0 + i * (H + G);
    const changed = what !== 'pass';
    b.push(`<g data-node="r${i}a"><rect x="40" y="${y}" width="420" height="${H}" rx="8" class="${changed ? 'amber' : 'gray'}"/><text x="58" y="${y + 35}" class="m">${c}</text></g>`);
    b.push(edge(`M460 ${y + H / 2}H560`));
    b.push(`<g data-node="r${i}b"><rect x="560" y="${y}" width="400" height="${H}" rx="8" class="node"/><text x="578" y="${y + 35}" class="m">${p}</text></g>`);
    b.push(text(1000, y + 35, changed ? what : '原样继承（pass）', changed ? 's' : 'xs'));
  });
  b.push(text(40, 680, '读这一页就知道：Mistral Small 4 的骨架是 DeepSeek-V3 的 MLA + MoE，真正新增的只有路由打分和 query 缩放两处，其余差别在 config.json 的数值里。', 's'));
  return svg('reading-modular-diff', 1400, 710, 'modular_mistral4.py 中各类的父类和改动',
    'Mistral4 的 RMSNorm、旋转位置编码继承自 Llama，MLP 继承自 Qwen2-MoE，专家与 MoE 块、解码器层、模型和 ForCausalLM 继承自 DeepSeek-V3，路由器继承自 DeepSeek-V2 并改写为 softmax 打分，注意力继承自 DeepSeek-V3 并在 forward 里加入按位置的 query 缩放。橙色是改写了方法的类，灰色是原样继承。',
    '先读 modular 文件：Mistral Small 4 改了 DeepSeek-V3 的哪里', '橙色：改写了方法；灰色：只有 pass，原样继承父类',
    b.join('\n'));
}

write({
  'multimodal-image-tokens': imageTokens(),
  'multimodal-fusion': fusion(),
  'multimodal-mrope': mrope(),
  'multimodal-thinker-talker': thinkerTalker(),
  'reading-config-map': configMap(),
  'reading-class-tree': classTree(),
  'reading-modular-diff': modularDiff(),
});
