// Figures for docs/ai/llm-architecture/00-transformer.md.
// Run: node .maintenance/llm-architecture/diagrams-transformer.mjs
import { svg, box, cell, edge, text, write } from './svg-kit.mjs';

// The 2017 encoder-decoder, with shapes for the base config.
function architecture() {
  const W = 1360, H = 860;
  let b = '';
  // encoder column
  const ex = 120, dx = 700, cw = 420;
  b += text(ex, 128, '编码器：读原文（×6 层）', 'k');
  b += text(dx, 128, '解码器：写译文（×6 层）', 'k');
  b += box('enc-in', ex, 730, cw, 76, 'gray', '原文 token：年 假 怎么 申请 ？', ['词嵌入 ×√512 + 正弦位置编码 → [5, 512]']);
  b += `<rect x="${ex - 20}" y="148" width="${cw + 40}" height="550" rx="12" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>`;
  b += box('enc-attn', ex, 508, cw, 104, 'blue', '多头自注意力（双向）', ['8 个头 × 64 维；每个位置看整句', '之后：残差相加 + LayerNorm']);
  b += box('enc-ffn', ex, 318, cw, 104, 'green', 'FFN（逐位置）', ['512 → 2048 → 512，ReLU', '之后：残差相加 + LayerNorm']);
  b += box('enc-out', ex, 168, cw, 76, 'violet', '编码器输出（“记忆”）', ['原文每个位置一个向量 [5, 512]']);
  b += edge(`M${ex + cw / 2} 728V616`) + edge(`M${ex + cw / 2} 506V426`) + edge(`M${ex + cw / 2} 328V248`);
  // decoder column
  b += box('dec-in', dx, 730, cw, 76, 'gray', '已写出的译文：<s> How to apply', ['词嵌入 ×√512 + 正弦位置编码 → [4, 512]']);
  b += `<rect x="${dx - 20}" y="148" width="${cw + 40}" height="550" rx="12" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8 6"/>`;
  b += box('dec-self', dx, 590, cw, 84, 'blue', '带掩码的自注意力（只看左边）', ['之后：残差相加 + LayerNorm']);
  b += box('dec-cross', dx, 442, cw, 104, 'amber', '交叉注意力', ['Q 来自译文，K、V 来自编码器输出', '之后：残差相加 + LayerNorm']);
  b += box('dec-ffn', dx, 318, cw, 84, 'green', 'FFN（逐位置）', ['之后：残差相加 + LayerNorm']);
  b += box('dec-out', dx, 168, cw, 100, 'red', '线性层 + softmax', ['对 37000 个 token 打分', '取最后一个位置：下一个词 “for”']);
  b += edge(`M${dx + cw / 2} 728V678`) + edge(`M${dx + cw / 2} 588V546`) + edge(`M${dx + cw / 2} 448V406`) + edge(`M${dx + cw / 2} 316V272`);
  // memory to cross attention
  b += edge(`M${ex + cw} 206H${(ex + cw + dx) / 2}V496H${dx - 4}`);
  b += text(574, 530, '每层解码器', 'xs');
  b += text(574, 550, '都读这一份', 'xs');
  return svg('transformer-architecture', W, H, '原始 Transformer 的编码器-解码器结构',
    '左边编码器 6 层，每层是双向多头自注意力和逐位置 FFN，各自带残差相加和 LayerNorm，把原文变成每个位置一个 512 维向量；右边解码器 6 层，每层依次是只看左边的自注意力、读取编码器输出的交叉注意力和 FFN，最后经线性层和 softmax 给出下一个词。',
    '2017 年的 Transformer：编码器读、解码器写', 'base 配置：d_model 512、8 个头、FFN 2048、编码器和解码器各 6 层；形状以 5 个原文 token、4 个已写出的译文 token 为例', b);
}

// RNN reads one step at a time; self-attention connects every pair directly.
function rnnVsAttention() {
  const W = 1360, H = 520;
  const toks = ['年', '假', '怎么', '申请', '？'];
  let b = '';
  b += text(60, 130, 'RNN：一个接一个地读', 't');
  toks.forEach((t, i) => {
    const x = 70 + i * 120;
    b += box(`r${i}`, x, 170, 90, 56, 'gray', t);
    b += box(`h${i}`, x, 290, 90, 56, 'blue', `h${i + 1}`);
    b += edge(`M${x + 45} 228V286`);
    if (i < 4) b += edge(`M${x + 92} 318H${x + 118}`);
  });
  b += text(60, 390, '“年”的信息要经过 4 次传递才到“？”', 's');
  b += text(60, 414, '第 5 步必须等第 4 步算完，训练时无法按位置并行', 's');
  b += text(60, 438, '长句里早期的信息被反复压缩进固定大小的状态，容易被冲淡', 's');
  const ax = 760;
  b += text(ax, 130, '自注意力：每对位置直接相连', 't');
  const pos = toks.map((t, i) => [ax + 40 + i * 110, 300 + (i % 2 ? -60 : 40)]);
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    b += `<path d="M${pos[i][0] + 40} ${pos[i][1] + 28}L${pos[j][0] + 40} ${pos[j][1] + 28}" stroke="#93c5fd" stroke-width="2" fill="none"/>`;
  }
  toks.forEach((t, i) => { b += box(`a${i}`, pos[i][0], pos[i][1], 80, 56, 'blue', t); });
  b += text(ax, 414, '任意两个词之间只隔一步，所有位置可以一次矩阵乘法同时算', 's');
  b += text(ax, 438, '代价：n 个 token 要算 n² 对关系，5 个是 25 对，10 万个是 100 亿对', 's');
  return svg('transformer-rnn-vs-attention', W, H, 'RNN 与自注意力的信息传递方式',
    '左边 RNN 按顺序逐个读入“年 假 怎么 申请 ？”，第一个词的信息要经过 4 次传递才到最后一个位置，且各步不能并行；右边自注意力让每对位置直接相连，路径长度为 1，所有位置可以并行计算，但关系数随长度平方增长。',
    '为什么是注意力：路径更短，可以并行', '同一句话，两种处理方式', b);
}

// What today's decoder-only LLM kept and changed, with chapter pointers.
function toLlm() {
  const W = 1360, H = 640;
  const rows = [
    ['整体结构', '编码器 + 解码器', '只保留解码器（去掉交叉注意力）', '09'],
    ['词表与嵌入', '约 3.7 万，输入输出共享', '12.8 万—25 万；小模型共享、大模型多不共享', '02'],
    ['注意力', '多头注意力 8 头', '多头 + GQA / MLA，KV 头更少', '03 · 04'],
    ['FFN', 'ReLU，512 → 2048 → 512', 'SwiGLU 三个矩阵，或拆成 MoE 专家', '05 · 10'],
    ['残差与归一化', '相加之后 LayerNorm（Post-Norm）', '子层之前 RMSNorm（Pre-Norm），常加 QK-Norm', '06'],
    ['位置', '正弦位置编码加在输入上', '每层对 Q、K 做旋转（RoPE），配合缩放扩展长度', '07'],
    ['输出', '线性层 + softmax，束搜索', '同样打分，采样或贪心逐个生成', '08'],
    ['规模', '6+6 层，512 维，约 0.65 亿', 'Llama-3.1-8B：32 层，4096 维，80 亿', '01'],
  ];
  let b = '';
  const xs = [32, 232, 620, 1190], y0 = 116, rh = 56;
  ['部件', '2017 年原始 Transformer', '今天的 decoder-only 大模型', '本系列'].forEach((h, i) => { b += text(xs[i] + 10, y0, h, 'k'); });
  rows.forEach((r, i) => {
    const y = y0 + 16 + i * (rh + 6);
    b += box(`n${i}`, xs[0], y, 186, rh, 'node', r[0]);
    b += cell(xs[1], y, 372, rh, 'gray', r[1], 's');
    b += cell(xs[2], y, 554, rh, i === 6 ? 'gray' : 'blue', r[2], 's');
    b += cell(xs[3], y, 138, rh, 'violet', r[3], 's');
  });
  return svg('transformer-to-llm', W, H, '原始 Transformer 与今天大模型的部件对照',
    '八个部件的对照：结构从编码器加解码器变成只保留解码器；词表从约 3.7 万变成十几到二十几万；注意力加上 GQA 或 MLA；FFN 从 ReLU 变成 SwiGLU 或 MoE；Post-Norm LayerNorm 变成 Pre-Norm RMSNorm；正弦位置编码变成 RoPE；输出层基本不变；规模从约 6500 万参数到数十亿以上。',
    '骨架没变，零件几乎全换了', '最右列是本系列详细讲解该部件的篇号', b);
}

write({ 'transformer-architecture': architecture(), 'transformer-rnn-vs-attention': rnnVsAttention(), 'transformer-to-llm': toLlm() });
