// Figures for docs/ai/llm-architecture/19-comparison.md.
// Run: node .maintenance/llm-architecture/diagrams-comparison.mjs
import { svg, box, cell, text, write } from './svg-kit.mjs';

const GiB = 2 ** 30;
// Bytes per token that grow with context (BF16), from each chapter's config-based calculation.
const kvRows = [
  ['MiniMax-M2（62 层全局 GQA）', 62 * 2 * 8 * 128 * 2, 'gray'],
  ['Qwen3-8B（36 层 GQA）', 36 * 2 * 8 * 128 * 2, 'gray'],
  ['Llama-3.1-8B（32 层 GQA）', 32 * 2 * 8 * 128 * 2, 'gray'],
  ['Gemma 3 27B（10 个全局层）', 10 * 2 * 16 * 128 * 2, 'blue'],
  ['DeepSeek-V3（MLA 576 个数）', 61 * 576 * 2, 'violet'],
  ['Llama 4 Maverick（12 个 NoPE 全局层）', 12 * 2 * 8 * 128 * 2, 'blue'],
  ['gpt-oss-120b（18 个全局层）', 18 * 2 * 8 * 64 * 2, 'blue'],
  ['Qwen3.5-397B-A17B（15 个注意力层）', 30 * 1024, 'green'],
  ['Kimi Linear（7 个 MLA 层）', 7.88 * 1024, 'green'],
];

function kv100k() {
  const W = 1320, H = 690, x0 = 430, y0 = 120, bh = 34, gap = 14, scale = 760 / 24;
  let b = '';
  [0, 4, 8, 12, 16, 20, 24].forEach(v => {
    b += `<path d="M${x0 + v * scale} ${y0 - 8}V${y0 + kvRows.length * (bh + gap)}" class="line"/>`;
    b += text(x0 + v * scale, y0 + kvRows.length * (bh + gap) + 22, `${v}`, 'xs', 'middle');
  });
  kvRows.forEach(([name, bytes, c], i) => {
    const y = y0 + i * (bh + gap), g = bytes * 1e5 / GiB;
    b += text(x0 - 14, y + 23, name, 's', 'end');
    b += `<rect x="${x0}" y="${y}" width="${g * scale}" height="${bh}" rx="4" class="f${c}"/>`;
    b += text(x0 + g * scale + 10, y + 23, `${g.toFixed(1)} GiB`, 's');
  });
  const ly = y0 + kvRows.length * (bh + gap) + 52;
  b += text(x0 + 380, ly, '10 万 token 时随长度增长的缓存（GiB，BF16）', 's', 'middle');
  [['fgray', '每层都看全文'], ['fblue', '局部层 + 少数全局层'], ['fviolet', '压缩 KV（MLA）'], ['fgreen', '线性层 + 少数注意力层']].forEach(([c, t], i) => {
    b += `<rect x="${60 + i * 300}" y="${ly + 22}" width="16" height="16" class="${c}"/>` + text(84 + i * 300, ly + 36, t, 's');
  });
  return svg('comparison-kv-100k', W, H, '10 万 token 时各模型随长度增长的缓存',
    '把 10 万 token 的员工手册放进上下文，各模型需要随长度增长保存的缓存：MiniMax-M2 约 23.6 GiB，Qwen3-8B 13.7，Llama-3.1-8B 12.2，Gemma 3 27B 7.6，DeepSeek-V3 6.5，Llama 4 Maverick 4.6，gpt-oss-120b 3.4，Qwen3.5-397B 2.9，Kimi Linear 0.75。局部层窗口和线性层状态另占固定大小，未计入。',
    '同一本手册，缓存差了 30 倍', '只计随上下文增长的部分；滑动窗口缓存和线性层状态大小固定，另计', b);
}

// Active-parameter ratio of MoE models, ordered by release.
const moe = [
  ['Mixtral 8x22B', '2024-04', 39, 141], ['DS-V3', '2024-12', 37, 671], ['Qwen3-235B', '2025-04', 22, 235],
  ['Llama 4 Mav.', '2025-04', 17, 400], ['Kimi K2', '2025-07', 32, 1000], ['gpt-oss-120b', '2025-08', 5.1, 117],
  ['Qwen3-Next', '2025-09', 3, 80], ['MiniMax-M2', '2025-10', 10, 230], ['GLM-5', '2026-02', 40, 744],
  ['Qwen3.5-397B', '2026-02', 17, 397], ['DS-V4-Pro', '2026-04', 49, 1600],
];
function moeRatio() {
  const W = 1340, H = 590, x0 = 90, y0 = 450, ph = 300, bw = 64, gap = 112, max = 30;
  const y = v => y0 - v / max * ph;
  let b = '';
  [0, 5, 10, 15, 20, 25, 30].forEach(v => {
    b += `<path d="M${x0} ${y(v)}H${x0 + moe.length * gap}" class="line"/>`;
    b += text(x0 - 12, y(v) + 5, `${v}%`, 'xs', 'end');
  });
  moe.forEach(([n, d, a, t], i) => {
    const r = a / t * 100, x = x0 + i * gap + 20;
    b += `<rect x="${x}" y="${y(r)}" width="${bw}" height="${y0 - y(r)}" rx="3" class="${i === 0 ? 'famber' : 'fviolet'}"/>`;
    b += text(x + bw / 2, y(r) - 8, `${r.toFixed(1)}%`, 'xs', 'middle');
    b += text(x + bw / 2, y0 + 22, n, 'xs', 'middle');
    b += text(x + bw / 2, y0 + 42, d, 'xs', 'middle');
    b += text(x + bw / 2, y0 + 62, `${a}B / ${t >= 1000 ? (t / 1000) + 'T' : t + 'B'}`, 'xs', 'middle');
  });
  b += `<path d="M${x0} ${y0}H${x0 + moe.length * gap}" class="axis"/>`;
  b += text(x0 - 60, 112, '每个 token 激活的参数占总参数的比例', 's');
  return svg('comparison-moe-ratio', W, H, 'MoE 模型的激活比例',
    '按发布时间排列的 MoE 模型激活参数占比：Mixtral 8x22B 27.7%，DeepSeek-V3 5.5%，Qwen3-235B 9.4%，Llama 4 Maverick 4.3%，Kimi K2 3.2%，gpt-oss-120b 4.4%，Qwen3-Next 3.8%，MiniMax-M2 4.3%，GLM-5 5.4%，Qwen3.5-397B 4.3%，DeepSeek-V4-Pro 3.1%。',
    'MoE 越来越稀疏', '激活 / 总参数取官方公布的取整值；DS 即 DeepSeek，Mav. 即 Maverick；2024 年底以后大多落在 3%—6%', b);
}

// Which choice each representative model makes per module.
function matrix() {
  const cols = ['注意力与 KV', 'FFN', '位置编码', '稳定性'];
  const rows = [
    ['Llama-3.1-8B', ['GQA 32/8', '密集 SwiGLU', 'RoPE + 分频缩放', 'Pre-RMSNorm'], ['gray', 'gray', 'gray', 'gray']],
    ['Qwen3-235B-A22B', ['GQA 64/4', 'MoE 128 选 8', 'RoPE + YaRN', 'QK-Norm'], ['gray', 'violet', 'gray', 'blue']],
    ['DeepSeek-V3', ['MLA 压缩 KV', 'MoE 256 选 8 + 共享', '解耦 RoPE + YaRN', 'sigmoid 路由 + 偏置'], ['violet', 'violet', 'gray', 'blue']],
    ['Gemma 3 27B', ['局部 5 : 全局 1', '密集 GeGLU', '局部/全局不同 θ', 'QK-Norm + 夹心 norm'], ['blue', 'gray', 'blue', 'blue']],
    ['gpt-oss-120b', ['窗口 128 / 全局交替', 'MoE 128 选 4', 'RoPE + YaRN', '注意力汇聚、截断 SwiGLU'], ['blue', 'violet', 'gray', 'blue']],
    ['Llama 4 Maverick', ['分块局部 + NoPE 全局', '隔层 MoE', 'iRoPE', 'NoPE 层注意力温度缩放'], ['blue', 'violet', 'blue', 'blue']],
    ['Qwen3.5-397B-A17B', ['3 GDN : 1 门控注意力', 'MoE 512 选 10 + 共享', '部分维度 RoPE', '零中心 RMSNorm'], ['green', 'violet', 'blue', 'blue']],
    ['DeepSeek-V4-Pro', ['共享 KV MQA + 压缩', 'MoE 384 选 6，前 3 层哈希', '部分维度 RoPE', 'mHC 多路残差'], ['violet', 'violet', 'blue', 'blue']],
  ];
  const W = 1360, x0 = 32, nameW = 230, cw = 264, ch = 50, y0 = 112;
  const H = y0 + 40 + rows.length * (ch + 8) + 70;
  let b = '';
  cols.forEach((c, j) => { b += text(x0 + nameW + j * (cw + 8) + 12, y0 + 20, c, 'k'); });
  rows.forEach(([n, vals, cls], i) => {
    const y = y0 + 36 + i * (ch + 8);
    b += cell(x0, y, nameW - 8, ch, 'node', n, 's');
    vals.forEach((v, j) => { b += cell(x0 + nameW + j * (cw + 8), y, cw, ch, cls[j], v, 's'); });
  });
  const ly = y0 + 36 + rows.length * (ch + 8) + 30;
  [['gray', '与 Llama 式基线相同'], ['blue', '局部/稀疏或稳定性改动'], ['violet', '稀疏化：MoE 或 KV 压缩'], ['green', '线性注意力混合']].forEach(([c, t], i) => {
    b += `<rect x="${x0 + i * 320}" y="${ly - 14}" width="18" height="18" rx="3" class="${c}"/>` + text(x0 + 26 + i * 320, ly, t, 's');
  });
  return svg('comparison-matrix', W, H, '代表模型在四个模块上的选择',
    '八个代表模型在注意力与 KV、FFN、位置编码、稳定性四个模块上的选择：Llama-3.1-8B 全是基线配方；Qwen3 和 DeepSeek-V3 在 FFN 上改用 MoE，DeepSeek 还压缩了 KV；Gemma 3、gpt-oss、Llama 4 改为局部与全局层交替；Qwen3.5 用线性注意力混合；DeepSeek-V4 改用压缩注意力和多路残差。',
    '同一副骨架，四处不同的改法', '颜色表示与 Llama 式基线相比改在哪里；细节见各模型的单篇', b);
}

write({ 'comparison-kv-100k': kv100k(), 'comparison-moe-ratio': moeRatio(), 'comparison-matrix': matrix() });
