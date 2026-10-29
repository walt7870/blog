// Figures for docs/ai/llm-architecture/layer-practice.md, drawn from the measured result.json.
// Run: node .maintenance/llm-architecture/diagrams-practice.mjs
import { readFileSync } from 'node:fs';
import { svg, box, edge, text, write } from './svg-kit.mjs';

const R = JSON.parse(readFileSync(new URL('./layer-practice/result.json', import.meta.url)));

// Per-layer size of what attention and FFN add to the last position's residual stream.
function contributions() {
  const W = 1320, H = 560, x0 = 96, y0 = 460, ph = 330, bw = 18, gap = 48;
  const rows = R.residual, max = 80;
  const y = v => y0 - Math.min(v, max) / max * ph;
  let b = '';
  [0, 20, 40, 60, 80].forEach(v => {
    b += `<path d="M${x0} ${y(v)}H${x0 + rows.length * gap}" class="line"/>`;
    b += text(x0 - 12, y(v) + 5, String(v), 'xs', 'end');
  });
  rows.forEach((r, i) => {
    const x = x0 + i * gap + 6;
    b += `<rect x="${x}" y="${y(r.attn_out_norm)}" width="${bw}" height="${y0 - y(r.attn_out_norm)}" class="fblue"/>`;
    b += `<rect x="${x + bw}" y="${y(r.ffn_out_norm)}" width="${bw}" height="${y0 - y(r.ffn_out_norm)}" class="fgreen"/>`;
    b += text(x + bw, y0 + 22, String(r.layer), 'xs', 'middle');
  });
  const pts = rows.map((r, i) => `${x0 + i * gap + 6 + bw},${y(r.resid_norm)}`).join(' ');
  b += `<polyline points="${pts}" fill="none" stroke="#e0a63a" stroke-width="3"/>`;
  b += `<path d="M${x0} ${y0}H${x0 + rows.length * gap}" class="axis"/>`;
  b += text(x0 + rows.length * gap / 2, y0 + 50, '层号（0—23）', 's', 'middle');
  b += text(x0 - 60, 120, '向量长度（L2 范数）', 's');
  const lx = 860;
  b += `<rect x="${lx}" y="112" width="16" height="16" class="fblue"/>` + text(lx + 24, 126, '注意力输出（加进残差流的部分）', 's');
  b += `<rect x="${lx}" y="140" width="16" height="16" class="fgreen"/>` + text(lx + 24, 154, 'FFN 输出（加进残差流的部分）', 's');
  b += `<path d="M${lx} 176H${lx + 16}" stroke="#e0a63a" stroke-width="3"/>` + text(lx + 24, 182, '该层之后的残差流长度', 's');
  b += text(lx, 214, '第 23 层 FFN 输出 73.0，残差流却从 68.9 缩到 52.7：', 'xs');
  b += text(lx, 234, '它加进的方向和已有内容大体相反', 'xs');
  return svg('practice-contrib', W, H, '各层注意力和 FFN 写入残差流的大小',
    'Qwen2.5-0.5B-Instruct 处理“年假怎么申请？”时，最后一个位置在 24 层里每层注意力输出和 FFN 输出的向量长度，以及残差流长度。大多数层里 FFN 写入的量大于注意力，越往后两者和残差流都越大。',
    '每一层往残差流里加了多少', '实测：Apple M4，FP32，最后一个位置；只是向量长度，不等于重要性', b);
}

// Single-layer ablation: zero one module's output and measure loss on a reference answer.
function ablation() {
  const W = 1320, H = 600, x0 = 96, y0 = 470, ph = 330, bw = 18, gap = 48, max = 16;
  const base = R.ablation.baseline.loss;
  const y = v => y0 - v / max * ph;
  let b = '';
  [0, 2, 4, 6, 8, 10, 12, 14, 16].forEach(v => {
    b += `<path d="M${x0} ${y(v)}H${x0 + 24 * gap}" class="line"/>`;
    b += text(x0 - 12, y(v) + 5, String(v), 'xs', 'end');
  });
  for (let i = 0; i < 24; i++) {
    const x = x0 + i * gap + 6, f = R.ablation.ffn[i].loss, a = R.ablation.attn[i].loss;
    b += `<rect x="${x}" y="${y(a)}" width="${bw}" height="${y0 - y(a)}" class="fblue"/>`;
    b += `<rect x="${x + bw}" y="${y(f)}" width="${bw}" height="${y0 - y(f)}" class="fgreen"/>`;
    b += text(x + bw, y0 + 22, String(i), 'xs', 'middle');
  }
  b += `<path d="M${x0} ${y(base)}H${x0 + 24 * gap}" stroke="#e88191" stroke-width="2.5" stroke-dasharray="8 6"/>`;
  b += `<path d="M${x0} ${y0}H${x0 + 24 * gap}" class="axis"/>`;
  b += text(x0 + 12 * gap, y0 + 50, '被置零的层号', 's', 'middle');
  b += text(x0 - 60, 120, '参考回答的交叉熵损失', 's');
  const lx = 700;
  b += `<rect x="${lx}" y="112" width="16" height="16" class="fblue"/>` + text(lx + 24, 126, '只去掉这一层的注意力', 's');
  b += `<rect x="${lx}" y="140" width="16" height="16" class="fgreen"/>` + text(lx + 24, 154, '只去掉这一层的 FFN', 's');
  b += `<path d="M${lx} 176H${lx + 16}" stroke="#e88191" stroke-width="2.5" stroke-dasharray="5 4"/>` + text(lx + 24, 182, `完整模型 ${base}`, 's');
  b += box('mid', 1000, 104, 290, 126, 'amber', '一次去掉 4—19 层', [
    `全部 FFN：损失 ${R.ablation.mid_ffn.loss}`, `全部注意力：损失 ${R.ablation.mid_attn.loss}`, '两种情况输出都不成句']);
  return svg('practice-ablation', W, H, '逐层置零注意力或 FFN 后的损失',
    '把 Qwen2.5-0.5B-Instruct 某一层的注意力或 FFN 输出置零，测一句参考回答的交叉熵损失。去掉第 0 层 FFN 损失从 2.15 升到 13.97，第 0、1 层注意力和第 2 层 FFN 也影响很大；中间各层单独去掉几乎不变，但一次去掉 4—19 层的全部 FFN 或全部注意力，损失升到 9.36 和 8.19。',
    '去掉一层会怎样', '实测：同一句提示和参考回答；单层置零看冗余，多层一起置零看整体作用', b);
}

write({ 'practice-contrib': contributions(), 'practice-ablation': ablation() });
