// Figures for docs/ai/llm-architecture/06-multi-head.md, 07-ffn.md, 08-residual-norm.md.
// Run: node .maintenance/llm-architecture/diagrams-layer.mjs
// Numbers come from .maintenance/llm-architecture/research/facts-layer.md (Llama-3.1-8B, DeepSeek-V3 config.json).
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

const stroke = (d, color, w = 3, dash = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

// ============================== 04 ==============================

// ---- mha-split-heads: 32 Q heads share 8 KV heads in Llama-3.1-8B -----------
function splitHeads() {
  const x0 = 300, cw = 18, gap = 4, step = cw + gap; // 32 Q cells
  const groupW = 4 * step - gap;
  let b = '';
  b += box('in', 32, 150, 220, 250, 'node', '输入 x', ['[n, 4096]', '已经过 RMSNorm', 'n 为 token 数'], '每层注意力的输入');
  b += text(x0, 132, 'q_proj 4096 → 4096：拆成 32 个 Q 头，每头 128 维', 's');
  b += text(x0, 252, 'k_proj 4096 → 1024：8 个 K 头', 's');
  b += text(x0, 352, 'v_proj 4096 → 1024：8 个 V 头', 's');
  for (let i = 0; i < 32; i++) {
    const g = Math.floor(i / 4), cls = g % 2 ? 'fviolet' : 'fblue';
    b += cell(x0 + i * step, 146, cw, 40, cls, String(i), 'xs');
  }
  for (let g = 0; g < 8; g++) {
    const gx = x0 + g * 4 * step, cls = g % 2 ? 'fviolet' : 'fblue';
    b += cell(gx, 266, groupW, 40, cls, `K${g}`, 'xs');
    b += cell(gx, 366, groupW, 40, cls, `V${g}`, 'xs');
    b += `<path d="M${gx + groupW / 2} 188V264" class="line"/>`;
  }
  b += edge('M252 275H292');
  const rx = x0 + 32 * step + 20; // right column
  b += box('rule', rx, 140, 1300 - rx - 32, 140, 'amber', '分组规则', ['Q 头 0—3 用 K0、V0', 'Q 头 4—7 用 K1、V1', '……每组 4 个头'], '32 ÷ 8 = 4');
  b += box('cache', rx, 296, 1300 - rx - 32, 110, 'green', '缓存的只有 K、V', ['每层每 token 存', '8 × 128 × 2 个数'], 'KV Cache');
  // bottom flow
  const y = 452;
  b += box('head', 32, y, 330, 112, 'blue', '每个头各算一次注意力', ['softmax(Q_j·K_gᵀ/√128)·V_g', '输出 [n, 128]']);
  b += box('cat', 412, y, 250, 112, 'node', '32 个头拼接', ['[n, 32 × 128] = [n, 4096]']);
  b += box('o', 712, y, 220, 112, 'node', 'o_proj', ['4096 → 4096', '把各头结果混合']);
  b += box('out', 982, y, 286, 112, 'node', '输出', ['[n, 4096]', '加回残差流']);
  b += edge('M362 508H412') + edge('M662 508H712') + edge('M932 508H982');
  b += edge('M330 410V448', 'dash');
  return svg('mha-split-heads', 1300, 600, 'Llama-3.1-8B 一层注意力里的 Q 头与 KV 头',
    '输入 [n,4096] 经 q_proj 拆成 32 个 128 维的 Q 头，经 k_proj、v_proj 各得到 8 个 KV 头；每 4 个 Q 头共用一组 K、V。每个头各自算注意力得到 [n,128]，32 个结果拼成 [n,4096]，再经 o_proj 输出并加回残差流。KV Cache 只存 8 组 K、V。',
    '一层注意力：32 个 Q 头，8 组 K、V', 'Llama-3.1-8B 的分组查询注意力（GQA）。颜色相同的 4 个 Q 头共用同一组 K、V。', b);
}

// ---- mha-kv-bytes: per-token KV cache bytes ---------------------------------
function kvBytes() {
  const x0 = 470, W = 460, max = 512; // KiB → px
  const rows = [
    ['Llama-3.1-8B 换成 MHA', '32 层 × 32 个 KV 头 × 128 维 × 2（K、V）', 512, 'fred', '512 KiB · 32K 上下文 16 GiB'],
    ['Llama-3.1-8B 实际 GQA', '32 层 × 8 个 KV 头 × 128 维 × 2', 128, 'fblue', '128 KiB · 32K 上下文 4 GiB'],
    ['Llama-3.1-8B 换成 MQA', '32 层 × 1 个 KV 头 × 128 维 × 2', 16, 'fgray', '16 KiB · 32K 上下文 0.5 GiB'],
    ['DeepSeek-V3 MLA', '61 层 × (512 + 64) 个数，所有头共用', 68.625, 'fgreen', '68.6 KiB · 32K 上下文 2.1 GiB'],
  ];
  let b = '';
  rows.forEach(([name, how, kib, cls, val], i) => {
    const y = 128 + i * 92;
    b += text(32, y + 20, name, 't');
    b += text(32, y + 46, how, 'xs');
    b += cell(x0, y, Math.max(4, kib / max * W), 40, cls);
    b += text(x0 + Math.max(4, kib / max * W) + 12, y + 26, val, 's');
  });
  b += `<path d="M${x0} 116V490" class="axis"/>`;
  b += box('note', 32, 500, 1136, 86, 'amber', 'DeepSeek-V3 若用普通 MHA：每 token 约 4,880 KiB（4.77 MiB），是 MLA 的 71 倍', ['61 层 × 128 个头 × (K 192 维 + V 128 维) × 2 字节。条形超出画幅，未画出；全部按 BF16、每个数 2 字节计。']);
  return svg('mha-kv-bytes', 1200, 610, '不同注意力结构每个 token 的 KV Cache 字节数',
    'BF16 下每 token 的 KV Cache：Llama-3.1-8B 若用 MHA 为 512 KiB，实际 GQA 为 128 KiB，若用 MQA 为 16 KiB；DeepSeek-V3 的 MLA 为 68.6 KiB。DeepSeek-V3 若用 128 头 MHA 约为 4880 KiB，是 MLA 的 71 倍。',
    '每多一个 token，KV Cache 增加多少', '条形长度按字节数等比例绘制（BF16）。右侧数字同时给出 32,768 个 token 的总量。', b);
}

// ---- mha-mla-flow: DeepSeek-V3 MLA ------------------------------------------
function mlaFlow() {
  let b = '';
  b += box('h', 32, 250, 150, 120, 'node', '输入 h', ['[n, 7168]']);
  // KV path (top)
  b += box('kva', 232, 112, 250, 120, 'blue', 'kv_a_proj', ['7168 → 512 + 64', '下投影（压缩）'], 'KV 路径');
  b += box('ckv', 532, 112, 200, 120, 'green', 'c_kv：512 维', ['RMSNorm 后缓存', '不含位置信息']);
  b += box('kr', 532, 250, 200, 106, 'green', 'k_rope：64 维', ['加 RoPE 后缓存', '所有头共用']);
  b += box('kvb', 782, 112, 386, 120, 'violet', 'kv_b_proj（上投影）', ['512 → 128 头 × (128 + 128)', '还原每个头的 k_nope 和 v']);
  // Q path (bottom)
  b += box('qa', 232, 404, 250, 120, 'blue', 'q_a_proj + RMSNorm', ['7168 → 1536', 'Q 也先压缩'], 'Q 路径');
  b += box('qb', 532, 404, 200, 120, 'node', 'q_b_proj', ['1536 → 128 头 × 192']);
  b += box('qs', 782, 404, 386, 120, 'node', '每个头的 Q 分两段', ['q_nope 128 维：与 k_nope 点积', 'q_rope 64 维：加 RoPE，与 k_rope 点积']);
  b += box('score', 782, 250, 386, 120, 'amber', '每个头的注意力分数', ['q_nope·k_nope + q_rope·k_rope', '再 softmax、乘 v、经 o_proj']);
  b += edge('M182 290Q205 290 205 200Q205 172 228 172') + edge('M182 330Q205 330 205 430Q205 464 228 464');
  b += edge('M482 160H528') + edge('M482 200Q505 200 505 290Q505 303 528 303');
  b += edge('M732 172H778') + edge('M482 464H528') + edge('M732 464H778');
  b += edge('M732 303H778') + edge('M975 232V246') + edge('M975 404V374');
  // cache frame
  b += `<rect x="516" y="96" width="232" height="276" rx="10" fill="none" stroke="#20a28c" stroke-width="2" stroke-dasharray="7 6"/>`;
  b += label(540, 392, '缓存：每层每 token 576 个数', 214);
  b += box('absorb', 32, 552, 1136, 76, 'amber', '矩阵吸收（推理优化）：把 kv_b_proj 里 K 的部分并进 q_nope，Q 直接与 512 维 c_kv 点积', ['V 的部分放到加权求和之后再乘。这样 Decode 时不必为 128 个头展开 K、V，所有头读同一份 576 维缓存。']);
  return svg('mha-mla-flow', 1200, 650, 'DeepSeek-V3 的多头潜在注意力 MLA',
    'KV 路径：输入 7168 维经 kv_a_proj 压到 512 维的 c_kv 和 64 维的 k_rope，两者进入缓存；kv_b_proj 再把 c_kv 还原成 128 个头的 k_nope 与 v。Q 路径：7168 经 q_a_proj 压到 1536，再经 q_b_proj 得到每头 192 维，分为 q_nope 128 维与 q_rope 64 维。分数为 q_nope·k_nope 加 q_rope·k_rope。推理时可把上投影矩阵吸收进 Q 与输出，直接在压缩向量上计算。',
    'MLA：只缓存压缩后的 576 个数', 'DeepSeek-V3 每层：128 个头，kv_lora_rank 512，qk_rope_head_dim 64，q_lora_rank 1536。虚线框内是写进 KV Cache 的部分。', b);
}

// ============================== 05 ==============================

// ---- ffn-shapes: SwiGLU data flow and token independence --------------------
function ffnShapes() {
  let b = '';
  b += box('x', 32, 170, 190, 150, 'node', '输入 x', ['[n, 4096]', '已经过 RMSNorm']);
  b += box('gate', 282, 112, 250, 120, 'blue', 'gate_proj', ['4096 → 14336', '输出 [n, 14336]'], '门');
  b += box('up', 282, 262, 250, 120, 'violet', 'up_proj', ['4096 → 14336', '输出 [n, 14336]'], '值');
  b += box('act', 582, 112, 170, 120, 'blue', 'SiLU', ['逐元素', '[n, 14336]']);
  b += box('mul', 802, 170, 150, 150, 'amber', '逐元素相乘', ['⊙', '[n, 14336]']);
  b += box('down', 1002, 170, 166, 150, 'green', 'down_proj', ['14336 → 4096', '输出 [n, 4096]']);
  b += edge('M222 220Q252 220 252 172Q252 172 278 172') + edge('M222 270Q252 270 252 322Q252 322 278 322');
  b += edge('M532 172H578') + edge('M752 172Q776 172 776 230Q776 236 798 236') + edge('M532 322H776Q776 322 776 262Q776 256 798 256');
  b += edge('M952 245H998');
  // token independence strip
  const toks = ['年', '假', '怎么', '申请', '？'];
  const y0 = 430;
  b += text(32, y0 - 8, '每个位置各算各的：5 个 token 共用同一套权重，但彼此之间不交换数据', 't');
  toks.forEach((t, i) => {
    const x = 32 + i * 230;
    b += cell(x, y0 + 16, 64, 44, 'fgray', t, 's');
    b += edge(`M${x + 64} ${y0 + 38}H${x + 92}`);
    b += cell(x + 96, y0 + 16, 64, 44, 'fgreen', 'FFN', 'xs');
    b += edge(`M${x + 160} ${y0 + 38}H${x + 188}`);
    b += cell(x + 192, y0 + 16, 20, 44, 'fblue');
  });
  b += text(32, y0 + 100, '对照：注意力里每个位置要读前面所有位置的 K、V；FFN 只看自己这一个向量，所以 n 个位置可以拼成一次大矩阵乘法。', 's');
  return svg('ffn-shapes', 1200, 560, 'Llama-3.1-8B 一层 FFN 的数据流与张量形状',
    '输入 [n,4096] 分别经 gate_proj 和 up_proj 变成两个 [n,14336]，gate 一路过 SiLU 后与 up 一路逐元素相乘，再经 down_proj 回到 [n,4096]。下方说明 5 个 token 共用同一组权重但各自独立计算。',
    'FFN：先升到 14336 维，再降回 4096 维', 'SwiGLU 版本有三个矩阵：gate_proj、up_proj、down_proj，每个 4096 × 14336。', b);
}

// ---- ffn-param-share: parameters and per-token FLOPs ------------------------
function ffnShare() {
  const x0 = 220, W = 900;
  let b = '';
  b += text(32, 128, '参数（共 80.3 亿）', 't');
  const P = [['FFN 56.4 亿 · 70.2%', 0.702, 'fgreen'], ['注意力 13.4 亿 · 16.7%', 0.167, 'fblue'], ['嵌入+输出 13.1%', 0.131, 'fgray']];
  let x = 32;
  P.forEach(([l, f, c]) => { b += cell(x, 146, f * 1136, 50, c); b += text(x + 12, 177, l, 's'); x += f * 1136; });
  b += text(32, 262, '每生成一个 token 的矩阵乘法计算量（按上下文长度，各自归一到 100%）', 't');
  const rows = [
    ['上下文 1', '15.0 GFLOPs', [0.751, 0.179, 0.0, 0.070]],
    ['8,192', '19.3 GFLOPs', [0.584, 0.139, 0.222, 0.054]],
    ['32,768', '32.2 GFLOPs', [0.350, 0.083, 0.534, 0.033]],
    ['131,072', '83.7 GFLOPs', [0.135, 0.032, 0.821, 0.013]],
  ];
  const cls = ['fgreen', 'fblue', 'famber', 'fgray'];
  rows.forEach(([name, tot, fr], i) => {
    const y = 286 + i * 66;
    b += text(32, y + 24, name, 's');
    b += text(32, y + 46, tot, 'xs');
    let xx = x0;
    fr.forEach((f, j) => {
      if (f <= 0) return;
      b += cell(xx, y, f * W, 44, cls[j]);
      if (j === 0) b += text(xx + 10, y + 28, `FFN ${(f * 100).toFixed(1)}%`, 's');
      if (j === 2 && f > 0.15) b += text(xx + 10, y + 28, `注意力分数 ${(f * 100).toFixed(1)}%`, 's');
      xx += f * W;
    });
  });
  const ly = 568;
  [['FFN 矩阵乘', 'fgreen'], ['q/k/v/o 投影', 'fblue'], ['QKᵀ 与加权求和（随上下文增长）', 'famber'], ['输出层', 'fgray']].forEach(([l, c], i) => {
    const lx = 32 + [0, 190, 400, 780][i];
    b += `<rect x="${lx}" y="${ly - 14}" width="16" height="16" class="${c}"/>` + text(lx + 24, ly, l, 's');
  });
  return svg('ffn-param-share', 1200, 600, 'Llama-3.1-8B 的参数构成与每 token 计算构成',
    '参数里 FFN 占 70.2%，注意力 16.7%，词嵌入与输出层 13.1%。每 token 计算：上下文很短时 FFN 占 75%；8192 个 token 时 58%；32768 时 35%，注意力分数部分升到 53%；131072 时 FFN 只占 13.5%。',
    'FFN 占七成参数；上下文变长后，计算的大头转向注意力', 'Llama-3.1-8B，BF16。计算量只计矩阵乘法，每个乘加记 2 FLOPs，注意力分数部分取第 n 个位置看前 n 个位置。', b);
}

// ---- ffn-activations: ReLU / GELU / SiLU and a gated toy example ------------
function ffnActs() {
  const ox = 260, oy = 330, sx = 48, sy = 48; // origin, px per unit
  const X = v => ox + v * sx, Y = v => oy - v * sy;
  const relu = z => Math.max(0, z);
  const gelu = z => 0.5 * z * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3)));
  const silu = z => z / (1 + Math.exp(-z));
  const path = f => { let d = ''; for (let z = -4; z <= 4.0001; z += 0.1) d += `${d ? 'L' : 'M'}${X(z).toFixed(1)} ${Y(f(z)).toFixed(1)}`; return d; };
  let b = '';
  b += `<path d="M${X(-4)} ${oy}H${X(4)}M${ox} ${Y(-1)}V${Y(4)}" class="axis"/>`;
  [-4, -2, 2, 4].forEach(v => { b += text(X(v), oy + 22, String(v), 'xs', 'middle'); });
  [1, 2, 3, 4].forEach(v => { b += `<path d="M${X(-4)} ${Y(v)}H${X(4)}" class="line"/>` + text(ox - 10, Y(v) + 5, String(v), 'xs', 'end'); });
  b += text(ox - 10, Y(-1) + 5, '-1', 'xs', 'end');
  b += stroke(path(relu), '#94a3b8', 3, '7 5');
  b += stroke(path(gelu), '#e0a63a', 3);
  b += stroke(path(silu), '#2563eb', 3);
  const lg = [['ReLU：负数直接变 0', '#94a3b8'], ['GELU：负数一侧平滑地趋近 0', '#e0a63a'], ['SiLU = z·sigmoid(z)：-1 处约 -0.27', '#2563eb']];
  lg.forEach(([l, c], i) => { b += stroke(`M40 ${430 + i * 30}H72`, c, 3) + text(82, 436 + i * 30, l, 's'); });
  // toy example
  b += box('toy', 540, 104, 628, 330, 'node', '手算一次 SwiGLU（d = 2，d_ff = 3）', [
    'x = [1, 2]',
    'gate = x·W_g = [1, 2, -1]',
    'SiLU(gate) = [0.731, 1.762, -0.269]',
    'up = x·W_u = [3, 0.5, 4]',
    'h = SiLU(gate) ⊙ up = [2.193, 0.881, -1.076]',
    'y = h·W_d = [1.117, 1.957]',
    '',
    '第 2 个中间单元：门值 1.762 大，但 up 只有 0.5；',
    '第 3 个中间单元：up 有 4，门值 -0.269 把它压小并变号。',
    '每个中间单元的输出 = 门的开合程度 × 值的大小。',
  ], '矩阵见正文');
  return svg('ffn-activations', 1200, 540, 'ReLU、GELU、SiLU 三种激活函数与 SwiGLU 手算',
    '左图在 -4 到 4 之间画出 ReLU、GELU 和 SiLU：三者在正数一侧都接近直线，负数一侧 ReLU 直接为 0，GELU 和 SiLU 平滑并允许小的负值。右侧手算 d=2、d_ff=3 的 SwiGLU：gate [1,2,-1]、SiLU 后 [0.731,1.762,-0.269]、up [3,0.5,4]、相乘得 [2.193,0.881,-1.076]，经 W_d 得 [1.117,1.957]。',
    '激活函数决定“哪些中间单元放行多少”', '左：三种激活函数的形状。右：SwiGLU 用一路线性结果当门，去调节另一路。', b);
}

// ---- ffn-key-value: key-value memory view -----------------------------------
function ffnKV() {
  let b = '';
  b += box('x', 32, 210, 180, 130, 'node', '输入 x', ['当前 token 的', '4096 维向量']);
  const keys = [0.1, 2.6, 0.0, 0.3, 1.9, 0.05];
  const kx = 300, vx = 820;
  b += text(kx, 128, '键：W_g、W_u 的第 i 列', 's');
  b += text(kx + 290, 128, '系数 m_i', 's');
  b += text(vx, 128, '值：W_d 的第 i 行', 's');
  keys.forEach((m, i) => {
    const y = 146 + i * 56, hot = m > 1;
    b += cell(kx, y, 200, 40, hot ? 'fblue' : 'fgray', `键 k${i + 1}`, 's');
    b += cell(kx + 290, y + 8, Math.max(3, m * 60), 24, hot ? 'famber' : 'fgray');
    b += text(kx + 300 + Math.max(3, m * 60), y + 26, m.toFixed(2), 'xs');
    b += cell(vx, y, 200, 40, hot ? 'fgreen' : 'fgray', `值 v${i + 1}`, 's');
    b += `<path d="M${kx + 200} ${y + 20}H${kx + 282}" class="line"/>`;
    b += `<path d="M${kx + 500} ${y + 20}H${vx - 8}" class="line"/>`;
  });
  b += edge('M212 275H292');
  b += box('sum', 1060, 200, 108, 150, 'green', '输出', ['Σ m_i·v_i', '加回', '残差流']);
  b += edge('M1020 275H1056');
  b += text(32, 520, '示意：6 个中间单元，数值为虚构。Llama-3.1-8B 每层有 14336 对键和值；多数系数很小，少数较大的那几对决定这一层加进残差流的内容。', 's');
  b += text(32, 548, '这是一种读法，不是模型的设计规格：真实中间单元常同时响应多种无关的模式，一个事实也往往分散在多层多个单元里。', 'xs');
  return svg('ffn-key-value', 1200, 570, 'FFN 的键值记忆读法',
    '输入向量与每个键做点积得到系数，系数大的键对应的值向量按系数加权求和，作为 FFN 的输出加回残差流。图中数值为示意。',
    '把 FFN 读成一张“键—值”表', 'x 与每个键比相似度（再过激活），相似度当权重，把对应的值向量加起来。', b);
}

// ============================== 06 ==============================

// ---- norm-residual-stream ---------------------------------------------------
function residualStream() {
  let b = '';
  const y = 330; // stream line
  b += `<path d="M150 ${y}H1080" stroke="#e0a63a" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  b += box('emb', 32, y - 50, 110, 100, 'node', '词嵌入', ['[n, 4096]']);
  b += box('fn', 1090, y - 50, 78, 100, 'gray', '最终', ['Norm']);
  const blocks = [['attn', 190, '注意力', 'blue'], ['ffn', 410, 'FFN', 'green'], ['attn2', 630, '注意力', 'blue'], ['ffn2', 850, 'FFN', 'green']];
  blocks.forEach(([id, x, name, cls], i) => {
    b += box(id, x, 108, 180, 76, cls, name, [i < 2 ? '第 1 层' : '第 2 层']);
    b += box(id + 'n', x, 214, 96, 50, 'gray', '', []);
    b += text(x + 48, 245, 'RMSNorm', 's', 'middle');
    b += edge(`M${x + 40} ${y - 6}V268`);
    b += edge(`M${x + 40} 214V188`);
    b += edge(`M${x + 150} 184V${y - 18}`);
    b += `<circle cx="${x + 150}" cy="${y}" r="14" fill="#fff" stroke="#64748b" stroke-width="2"/>` + text(x + 150, y + 6, '+', 't', 'middle');
  });
  b += text(1010, y + 48, '… 共 32 层', 's', 'middle');
  b += text(150, y + 48, '残差流：始终是 [n, 4096]，子层只读归一化后的副本，再把结果加回来', 's');
  b += box('eq', 32, 412, 1136, 136, 'amber', '一层两次加法', [
    'h ← h + Attention(RMSNorm(h))',
    'h ← h + FFN(RMSNorm(h))',
    '反向传播时，每个“+”都给梯度留了一条不经过子层的直通路径。',
  ]);
  return svg('norm-residual-stream', 1200, 570, '残差流：每个子层从主干读、往主干加',
    '橙色主干是残差流，形状始终为 [n,4096]。每个注意力和 FFN 子层先对主干做 RMSNorm 得到副本，计算后把结果加回主干。32 层后经最终 Norm 送入输出层。',
    '残差流：一条贯穿 32 层的主干', '这是 Pre-Norm 结构（Llama、Qwen、DeepSeek 等）。主干本身从不被归一化，只有送进子层的副本被归一化。', b);
}

// ---- norm-pre-post: Post-Norm vs Pre-Norm vs sandwich -----------------------
function prePost() {
  let b = '';
  const col = (x, kicker, title, steps, models, cls) => {
    let s = box(kicker, x, 104, 360, 520, 'node', title, [], kicker);
    const bx = x + 70, w = 220;
    let yy = 204;
    s += text(bx + w / 2, yy - 10, 'x（来自上一子层）', 'xs', 'middle');
    const ys = [];
    steps.forEach(([name, c], i) => {
      const y = yy + 20 + i * 86;
      if (name) s += cell(bx, y, w, 50, c, name, 's');
      ys.push(y);
      if (i) s += edge(`M${bx + w / 2} ${y - 36}V${y - 2}`);
    });
    s += edge(`M${bx + w / 2} ${yy - 4}V${ys[0] - 2}`);
    return { s, bx, w, ys, x };
  };
  const add = (c, i) => `<circle cx="${c.bx + c.w / 2}" cy="${c.ys[i] + 25}" r="16" fill="#fff" stroke="#64748b" stroke-width="2"/>` + text(c.bx + c.w / 2, c.ys[i] + 31, '+', 't', 'middle');
  const bypass = (c, toIdx) => `<path d="M${c.bx + c.w / 2} 210H${c.bx - 30}V${c.ys[toIdx] + 25}H${c.bx + c.w / 2 - 18}" class="dash"/>`;
  // Post-Norm: sublayer → + → LN
  const a = col(32, 'Post-Norm', '原始 Transformer、BERT', [['子层（注意力/FFN）', 'gray'], ['', 'node'], ['LayerNorm', 'famber']], '', 'node');
  b += a.s + add(a, 1) + bypass(a, 1);
  b += text(a.x + 20, 520, '加法之后再归一化：主干本身被反复', 's') + text(a.x + 20, 544, '归一化，梯度要穿过每一层的 Norm', 's') + text(a.x + 20, 568, '深了需要学习率预热，容易训崩', 's');
  const p = col(420, 'Pre-Norm', 'GPT-2 以后的大多数模型', [['LayerNorm 或 RMSNorm', 'famber'], ['子层（注意力/FFN）', 'gray'], ['', 'node']], '', 'node');
  b += p.s + add(p, 2) + bypass(p, 2);
  b += text(p.x + 20, 520, '只归一化送进子层的副本，主干是', 's') + text(p.x + 20, 544, '纯加法：训练稳定；代价是主干越加', 's') + text(p.x + 20, 568, '越大，深层的增量相对变小', 's');
  const s = col(808, 'Sandwich', 'Gemma 2 / 3 / 4', [['RMSNorm', 'famber'], ['子层（注意力/FFN）', 'gray'], ['RMSNorm', 'famber'], ['', 'node']], '', 'node');
  b += s.s + add(s, 3) + bypass(s, 3);
  b += text(s.x + 20, 576, '子层前后各一次 RMSNorm，再加回', 's') + text(s.x + 20, 600, '主干：限制每个子层增量的大小', 's');
  return svg('norm-pre-post', 1200, 650, 'Post-Norm、Pre-Norm 与 Gemma 的三明治归一化',
    'Post-Norm 先做子层再与输入相加，然后对和做 LayerNorm；Pre-Norm 先对输入做 RMSNorm 再进子层，结果直接加回主干；Gemma 的三明治结构在子层前后各做一次 RMSNorm 再加回主干。虚线是残差旁路。',
    '归一化放在哪里：三种常见位置', '虚线是残差旁路（不经过子层的那条路）。一层里注意力和 FFN 各用一次这个结构。', b);
}

// ---- norm-softcap ------------------------------------------------------------
function softcap() {
  const ox = 120, oy = 470, sx = 6, sy = 6;
  const X = v => ox + v * sx, Y = v => oy - v * sy;
  let b = '';
  b += `<path d="M${ox} ${oy}H${X(160)}M${ox} ${oy}V${Y(62)}" class="axis"/>`;
  [0, 30, 60, 90, 120, 150].forEach(v => { b += text(X(v), oy + 24, String(v), 'xs', 'middle'); });
  [10, 20, 30, 40, 50, 60].forEach(v => { b += `<path d="M${ox} ${Y(v)}H${X(160)}" class="line"/>` + text(ox - 10, Y(v) + 5, String(v), 'xs', 'end'); });
  let d1 = '', d2 = '', d3 = '';
  for (let v = 0; v <= 160; v += 1) {
    d2 += `${d2 ? 'L' : 'M'}${X(v)} ${Y(30 * Math.tanh(v / 30)).toFixed(1)}`;
    d3 += `${d3 ? 'L' : 'M'}${X(v)} ${Y(50 * Math.tanh(v / 50)).toFixed(1)}`;
    if (v <= 62) d1 += `${d1 ? 'L' : 'M'}${X(v)} ${Y(v)}`;
  }
  b += stroke(d1, '#94a3b8', 3, '7 5') + stroke(d3, '#9b87f5', 3) + stroke(d2, '#2563eb', 3);
  b += text(X(160) - 10, oy + 50, '原始 logit', 's', 'end');
  b += text(ox + 14, Y(57), '压缩后的值', 's');
  const pts = [[10, 9.645], [60, 28.921]];
  pts.forEach(([u, v]) => { b += `<circle cx="${X(u)}" cy="${Y(v)}" r="6" fill="#2563eb"/>`; });
  b += label(X(10) + 14, Y(9.645) + 30, '10 → 9.6', 90);
  b += label(X(60) + 10, Y(28.921) + 30, '60 → 28.9', 100);
  b += box('lg', 770, 312, 370, 148, 'node', '曲线', ['灰虚线：不截断 y = x', '蓝：30·tanh(x/30)，Gemma 2 输出层', '紫：50·tanh(x/50)，Gemma 2 注意力', '小的值几乎不变，大的值被压到上限以内']);
  return svg('norm-softcap', 1200, 540, 'logit soft-capping 的形状',
    'soft-capping 把 logit x 换成 cap·tanh(x/cap)。cap 为 30 时，10 变成 9.6，60 变成 28.9，再大也不会超过 30；cap 为 50 的曲线更晚弯折。灰色虚线为不截断时的 y=x。',
    'soft-capping：小值几乎不变，大值被压到上限以内', 'Gemma 2 对注意力分数用 cap = 50，对最终输出 logits 用 cap = 30。', b);
}

write({
  'mha-split-heads': splitHeads(),
  'mha-kv-bytes': kvBytes(),
  'mha-mla-flow': mlaFlow(),
  'ffn-shapes': ffnShapes(),
  'ffn-param-share': ffnShare(),
  'ffn-activations': ffnActs(),
  'ffn-key-value': ffnKV(),
  'norm-residual-stream': residualStream(),
  'norm-pre-post': prePost(),
  'norm-softcap': softcap(),
});
