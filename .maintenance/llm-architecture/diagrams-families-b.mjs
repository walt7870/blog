// Figures for docs/ai/llm-architecture/15-deepseek.md and 16-open-models.md.
// Run: node .maintenance/llm-architecture/diagrams-families-b.mjs
// Numbers come from .maintenance/llm-architecture/research/facts-families-b.md (config.json + Transformers 5.21.0 source).
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

const fmt = n => n.toLocaleString('en-US');
// A box with a kicker and plain lines (no title), lines start right under the kicker.
function note(node, x, y, w, h, cls, kicker, lines) {
  let t = `<g data-node="${node}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>`;
  t += text(x + 18, y + 26, kicker, 'k');
  lines.forEach((l, i) => { t += text(x + 18, y + 54 + i * 24, l, 's'); });
  return t + '</g>';
}

// ============================== 15 ==============================

// ---- deepseek-timeline: which generations changed the architecture -----------
function timeline() {
  const items = [
    ['V2', '2024-05', 'blue', '架构', ['MLA：KV 压成 512+64', '160 路由 + 2 共享专家', '236B 总 / 21B 激活']],
    ['V3', '2024-12', 'blue', '架构 + 训练', ['256 专家 + 1 共享，top-8', '无辅助损失偏置、MTP', 'FP8 训练（训练配方）']],
    ['R1', '2025-01', 'gray', '训练', ['config 与 V3 逐项相同', 'V3-Base 上做强化学习', '长思维链来自训练']],
    ['V3.1', '2025-08', 'gray', '训练', ['同一架构继续长文本训练', '思考/非思考靠对话模板', 'FP8 缩放改为 UE8M0']],
    ['V3.2', '2025-09 / 12', 'amber', '架构', ['MLA 上加闪电索引器', '每个查询只看 2048 位置', '其余结构不变']],
    ['V4', '2026-04', 'violet', '架构', ['共享 KV 的 MQA', '滑动窗口 + CSA/HCA', 'mHC、哈希路由、1M']],
  ];
  const w = 214, gap = 12, x0 = 32, y = 150;
  let b = `<path d="M${x0} ${y - 22}H${x0 + 6 * w + 5 * gap}" class="axis"/>`;
  items.forEach(([name, date, cls, kind, lines], i) => {
    const x = x0 + i * (w + gap);
    b += `<circle cx="${x + 24}" cy="${y - 22}" r="7" fill="#64748b"/>`;
    b += text(x + 40, y - 30, date, 'xs');
    b += box(`tl-${name}`, x, y, w, 196, cls, name, lines, kind);
  });
  b += note('tl-legend-a', 32, 376, 520, 70, 'blue', '彩色框', ['改了网络结构：config 出现新字段或新的模型类']);
  b += note('tl-legend-b', 576, 376, 520, 70, 'gray', '灰色框', ['结构不变：改的是数据、训练流程或对话模板']);
  return svg('deepseek-timeline', 1400, 470, 'DeepSeek 各代改了什么',
    'V2 引入 MLA 和 DeepSeekMoE；V3 放大规模并加入无辅助损失负载均衡和 MTP；R1 和 V3.1 结构与 V3 相同，改的是训练；V3.2 在 MLA 上加闪电索引器做稀疏注意力；V4 换成共享 KV 的 MQA，加入压缩稀疏注意力、mHC 残差和哈希路由。',
    'DeepSeek 各代：哪些改了结构，哪些只改了训练', '日期为官方发布日期。判断依据是 config.json 的字段差异和 Transformers 里是否有新的模型类。', b);
}

// ---- deepseek-moe-routing: V3 router, groups → experts ----------------------
function routing() {
  let b = '';
  // 8 groups × 32 experts, drawn as 4×8 grids
  const gx0 = 32, gy = 150, gw = 128, gh = 74, cs = 12, cg = 2;
  const chosenGroups = [1, 2, 5, 6];
  const chosenExperts = { 1: [3, 17], 2: [9], 5: [0, 22, 30], 6: [12, 25] };
  b += text(32, 132, '① 256 个路由专家按部署位置分成 8 组，每组 32 个', 's');
  for (let g = 0; g < 8; g++) {
    const x = gx0 + g * (gw + 22);
    const on = chosenGroups.includes(g);
    b += `<rect x="${x}" y="${gy}" width="${gw}" height="${gh + 26}" rx="6" fill="${on ? '#ecfdf5' : '#f1f5f9'}" stroke="${on ? '#20a28c' : '#cbd5e1'}" stroke-width="2"/>`;
    b += text(x + 8, gy + 18, `第 ${g + 1} 组`, 'xs');
    for (let e = 0; e < 32; e++) {
      const cx = x + 8 + (e % 8) * (cs + cg), cy = gy + 28 + Math.floor(e / 8) * (cs + cg);
      const pick = (chosenExperts[g] || []).includes(e);
      b += `<rect x="${cx}" y="${cy}" width="${cs}" height="${cs}" rx="2" class="${pick ? 'fgreen' : on ? 'fgray' : 'fgray'}"${pick ? ' stroke="#0f766e" stroke-width="1.5"' : ''}/>`;
    }
  }
  // steps below
  const sy = 300;
  b += box('r-score', 32, sy, 270, 150, 'node', '② 打分', ['s = sigmoid(x · Wᵣ)', '[1, 7168] → [1, 256]', '每个专家一个 0—1 的分'], '路由器');
  b += box('r-bias', 330, sy, 270, 150, 'amber', '③ 加偏置后选', ['选择用 s + b', 'b 只影响“选谁”', '不进入加权'], 'e_score_correction_bias');
  b += box('r-group', 628, sy, 300, 150, 'green', '④ 先选组，再选专家', ['组分 = 组内最高 2 个分之和', '留下组分最高的 4 组', '在这 128 个里取 top-8'], 'n_group 8 · topk_group 4');
  b += box('r-weight', 956, sy, 292, 150, 'blue', '⑤ 加权', ['权重用原始 s，不含 b', '8 个权重归一化后 × 2.5', '再加 1 个共享专家的输出'], 'routed_scaling_factor 2.5');
  b += edge(`M302 ${sy + 75}H330`) + edge(`M600 ${sy + 75}H628`) + edge(`M928 ${sy + 75}H956`);
  b += edge(`M778 ${sy}V254`, 'dash');
  b += note('r-update', 32, 478, 1216, 100, 'gray', '偏置怎样更新', ['训练中每一步统计各专家接到的 token 数：过载的专家 b 减 0.001，空闲的专家 b 加 0.001。', '这个更新不经过反向传播，也不往损失里加项；另有 α = 0.0001 的序列级损失兜底。']);
  return svg('deepseek-moe-routing', 1280, 604, 'DeepSeek-V3 的 MoE 路由',
    'DeepSeek-V3 每个 MoE 层有 256 个路由专家，分成 8 组。路由器先用 sigmoid 给每个专家打分，加上负载均衡偏置后按组分选出 4 组，再在 128 个专家里取 8 个；加权时用不含偏置的原始分数归一化后乘 2.5，再加上共享专家的输出。偏置在训练中按负载增减。',
    'DeepSeek-V3 的一次路由：先选 4 组，再选 8 个专家', '绿色格子是某个 token 选中的 8 个专家，它们只落在 4 个组里。图中选中的位置为示意。', b);
}

// ---- deepseek-params: 671B total vs 37.6B active ---------------------------
function params() {
  const W = 1180, x0 = 50, total = 671.03;
  const sx = v => v / total * W;
  const segTotal = [
    ['路由专家 653.9B', 653.91, 'fviolet'],
    ['其余 17.1B', 17.12, 'fblue'],
  ];
  let b = text(x0, 130, '全部参数 671.0B（不含 MTP 模块）', 't');
  let x = x0;
  segTotal.forEach(([n, v, cls]) => { b += cell(x, 146, sx(v), 48, cls); x += sx(v); });
  b += text(x0 + 16, 176, '路由专家：58 层 × 256 个 × 44.0M = 653.9B，占 97.4%', 's');
  // active share marker
  const act = 37.55;
  b += `<rect x="${x0}" y="208" width="${sx(act)}" height="20" rx="3" class="fgreen"/>`;
  b += text(x0 + sx(act) + 12, 224, '每个 token 实际用到 37.6B，约 5.6%', 's');
  // zoomed active breakdown
  const segAct = [
    ['8 个路由专家', 20.43, 'fviolet'],
    ['注意力 MLA', 11.41, 'fblue'],
    ['共享专家', 2.55, 'famber'],
    ['词嵌入 + 输出层', 1.85, 'fgray'],
    ['前 3 层密集 FFN', 1.19, 'fred'],
  ];
  const ZW = 860, zx = v => v / act * ZW;
  b += text(x0, 290, '放大：这 37.6B 由什么组成', 't');
  x = x0;
  segAct.forEach(([n, v, cls]) => { b += cell(x, 306, zx(v), 48, cls); x += zx(v); });
  b += `<path d="M${x0} 232L${x0} 300M${x0 + sx(act)} 232L${x0 + ZW} 300" class="line" stroke-dasharray="6 5"/>`;
  [[x0, '8 个路由专家', '58 层 × 8 × 44.0M = 20.4B'], [x0 + zx(20.43), '注意力（MLA）', '61 层 × 187.1M = 11.4B']].forEach(([lx, t1, t2]) => {
    b += `<path d="M${lx + 2} 356V374" class="line"/>`;
    b += text(lx + 6, 392, t1, 's');
    b += text(lx + 6, 414, t2, 'xs');
  });
  [['famber', '共享专家：58 × 44.0M = 2.6B'], ['fgray', '词嵌入 + 输出层：1.9B'], ['fred', '前 3 层密集 FFN：1.2B']].forEach(([cls, t1], i) => {
    const ly = 300 + i * 40;
    b += cell(948, ly, 22, 22, cls);
    b += text(980, ly + 17, t1, 's');
  });
  b += note('p-note', 50, 446, 1180, 100, 'gray', '口径', ['路由器 58 × 256 × 7168 ≈ 0.1B、各层 RMSNorm 合计不到 100 万，图中并入相邻段。', 'MTP 模块另有 11.6B，不计入 671B，推理时可以不加载。']);
  return svg('deepseek-params', 1280, 570, 'DeepSeek-V3 的总参数与激活参数',
    'DeepSeek-V3 主模型共 671.0B 参数，其中 653.9B 是 58 个 MoE 层里的路由专家。每个 token 只用到 37.6B：8 个路由专家 20.4B、注意力 11.4B、共享专家 2.6B、词嵌入和输出层 1.9B、前三层密集 FFN 1.2B。',
    '671B 里 97% 是专家，每个 token 只点亮其中一小部分', '按 config.json 复算。上方条按总量等比例绘制，下方把绿色那一段放大。', b);
}

// ---- deepseek-mtp: MTP module training & drafting ---------------------------
function mtp() {
  let b = '';
  const tok = ['年假', '怎么', '申请', '？'];
  // main model column
  b += box('m-main', 32, 118, 300, 300, 'blue', '主模型 61 层', ['输入到“？”为止', '最后一层隐藏状态 h', '[1, 7168]', '', '输出头 → 下一个 token', '预测：根据'], '主干');
  tok.forEach((t, i) => { b += cell(48 + i * 68, 352, 60, 34, 'fgray', t, 's'); });
  // MTP module
  b += box('m-norm-h', 400, 118, 220, 90, 'node', 'RMSNorm(h)', ['[1, 7168]'], 'hnorm');
  b += box('m-norm-e', 400, 236, 220, 90, 'node', 'RMSNorm(嵌入)', ['“根据”的词嵌入'], 'enorm');
  b += box('m-cat', 660, 160, 230, 124, 'amber', '拼接 + 投影', ['[1, 14336]', 'eh_proj → [1, 7168]'], 'eh_proj');
  b += box('m-block', 930, 108, 318, 124, 'violet', '1 个 Transformer 块', ['结构同主模型：MLA + MoE', '权重文件里叫 layers.61'], 'MTP 模块');
  b += box('m-head', 930, 256, 318, 124, 'green', '共用主模型的输出头', ['预测再下一个 token', '预测：员工'], 'shared_head');
  b += edge('M332 163H400') + edge('M332 281H400') + edge('M620 163L660 200') + edge('M620 281L660 248') + edge('M890 200L930 175') + edge('M1089 232V256');
  // two uses
  b += box('m-train', 32, 456, 590, 110, 'gray', '训练时', ['每个位置多一个目标：预测后面第 2 个 token', '总损失 = 主损失 + λ × MTP 损失（λ 先 0.3，后 0.1）'], '用法一');
  b += box('m-infer', 658, 456, 590, 110, 'gray', '推理时', ['可以丢掉，只用主模型；也可以让它起草“员工”', '下一步主模型一次验证两个 token，接受率 85%—90%'], '用法二');
  return svg('deepseek-mtp', 1280, 590, 'DeepSeek-V3 的多 token 预测模块',
    '主模型读到“年假怎么申请？”，最后一层隐藏状态经输出头预测下一个 token“根据”。MTP 模块把这个隐藏状态和“根据”的词嵌入各自归一化后拼接，投影回 7168 维，经过一个与主模型同结构的 Transformer 块，再用共用的输出头预测再下一个 token“员工”。训练时它提供额外损失，推理时可丢弃或用作投机解码的草稿。',
    'MTP：主模型预测下一个，附加模块再往后猜一个', '“根据”“员工”是示意 token。MTP 深度为 1，即只多预测一个。', b);
}

// ---- deepseek-dsa: lightning indexer + top-k on MLA --------------------------
function dsa() {
  let b = '';
  const x0 = 60, W = 1160, y1 = 170, y2 = 330;
  b += text(x0, 140, '闪电索引器：给前面全部 100,000 个位置打分（每层 64 个小头 × 128 维，可用 FP8）', 's');
  b += `<rect x="${x0}" y="${y1}" width="${W}" height="40" rx="4" class="famber"/>`;
  b += text(x0 + 12, y1 + 26, '每个位置一个分数：Σ 权重 × ReLU(q · k)', 's');
  b += `<rect x="${x0}" y="${y2}" width="${W}" height="40" rx="4" class="fgray"/>`;
  // deterministic pseudo-random picks
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const picks = [];
  for (let i = 0; i < 90; i++) picks.push(Math.floor(rnd() * (W - 6)));
  picks.forEach(px => { b += `<rect x="${x0 + px}" y="${y2}" width="4" height="40" class="fgreen"/>`; });
  for (let i = 0; i < 6; i++) { const px = picks[i * 9]; b += `<path d="M${x0 + px + 2} ${y1 + 42}V${y2 - 4}" class="dash"/>`; }
  b += text(x0, y2 + 62, '位置 1', 'xs');
  b += text(x0 + W, y2 + 62, '位置 100,000', 'xs', 'end');
  b += text(x0 + W / 2, y2 + 62, 'MLA 主注意力：只读分数最高的 2048 个位置的潜向量（每个 576 个数）', 's', 'middle');
  b += box('d-cost1', 60, 430, 560, 116, 'amber', '索引器仍是 O(L²)', ['每对位置都要打分，但头少、维度小、可用 FP8', '比 128 个头 × 576 维的 MLA 便宜得多'], '代价');
  b += box('d-cost2', 660, 430, 560, 116, 'green', '主注意力变成 O(L × 2048)', ['上下文再长，每个查询也只看 2048 个位置', 'KV Cache 仍要存全部位置，只是少读'], '收益');
  return svg('deepseek-dsa', 1280, 570, 'DeepSeek-V3.2 的稀疏注意力',
    '在 10 万 token 的上下文里，闪电索引器用 64 个小头给前面每个位置打分，只把分数最高的 2048 个位置交给 MLA 主注意力。索引器的计算仍随长度平方增长，但单价很低；主注意力的计算变成长度乘 2048。KV Cache 仍保存全部位置。',
    'V3.2：先用便宜的索引器挑 2048 个位置，再做正常的 MLA', '以资料助手把 10 万 token 的员工手册放进上下文为例。绿色竖线表示被选中的位置，分布为示意。', b);
}

// ---- deepseek-v4-attention: sliding window + CSA / HCA ----------------------
function v4attn() {
  let b = '';
  const x0 = 60, W = 1160;
  // CSA row
  const rowCSA = 150, rowHCA = 330;
  b += text(x0, rowCSA - 16, 'CSA 层：每 4 个 token 压成 1 个条目，索引器从中挑 top-k（Flash 512、Pro 1024）', 's');
  const n = 64, cw = (W - 200) / n;
  for (let i = 0; i < n; i++) {
    const pick = [3, 11, 12, 27, 40, 41, 52].includes(i);
    b += `<rect x="${x0 + i * cw}" y="${rowCSA}" width="${cw - 2}" height="40" rx="2" class="${pick ? 'fgreen' : 'fgray'}"/>`;
  }
  b += `<rect x="${x0 + W - 190}" y="${rowCSA}" width="190" height="40" rx="4" class="fblue"/>`;
  b += text(x0 + W - 180, rowCSA + 26, '最近 128 个原样', 's');
  b += text(x0, rowCSA + 64, '压缩条目（每格代表 4 个 token；窗口宽 8、步长 4，相邻窗口有重叠）', 'xs');
  // HCA row
  b += text(x0, rowHCA - 16, 'HCA 层：每 128 个 token 压成 1 个条目，全部条目都参与注意力', 's');
  const m = 16, hw = (W - 200) / m;
  for (let i = 0; i < m; i++) b += `<rect x="${x0 + i * hw}" y="${rowHCA}" width="${hw - 4}" height="40" rx="2" class="fviolet"/>`;
  b += `<rect x="${x0 + W - 190}" y="${rowHCA}" width="190" height="40" rx="4" class="fblue"/>`;
  b += text(x0 + W - 180, rowHCA + 26, '最近 128 个原样', 's');
  b += text(x0, rowHCA + 64, '压缩条目（每格代表 128 个 token；窗口不重叠，不做挑选）', 'xs');
  // bottom boxes
  b += box('v4-kv', 60, 440, 370, 120, 'node', '每个条目 512 个数', ['K 和 V 是同一个向量', '所有查询头共用（MQA）'], '缓存单位');
  b += box('v4-grow', 455, 440, 370, 120, 'green', '每层每 token 新增缓存', ['CSA：512 ÷ 4 = 128 个数', 'HCA：512 ÷ 128 = 4 个数'], '随长度增长的部分');
  b += box('v4-ref', 850, 440, 370, 120, 'amber', '对照 V3.2 的 MLA', ['每层每 token 576 个数', '全部保存'], '对照');
  return svg('deepseek-v4-attention', 1280, 590, 'DeepSeek-V4 的两种压缩注意力层',
    'DeepSeek-V4 每层都保留最近 128 个 token 的原样 KV。CSA 层把更早的内容每 4 个 token 压成一个 512 维条目，再由闪电索引器挑出 top-k 个参与注意力；HCA 层每 128 个 token 压成一个条目，全部参与注意力。CSA 每层每 token 新增 128 个数，HCA 新增 4 个数，对照 V3.2 MLA 的 576 个数。',
    'V4：近处看原文，远处看压缩摘要', '两种层在网络里交替出现。格子数量为示意，不按真实长度比例。', b);
}

// ============================== 16 ==============================

// ---- open-layer-patterns: per-layer attention type across models ----------
function layerPatterns() {
  const rows = [
    ['Mistral 7B', '32 层全是滑动窗口 4096', i => 'S', '超过 4096 后不再增长'],
    ['Gemma 2 27B', '局部 : 全局 = 1 : 1，窗口 4096', i => (i + 1) % 2 ? 'S' : 'F', '23 层全局 · 184 KiB'],
    ['Gemma 3 27B', '局部 : 全局 = 5 : 1，窗口 1024', i => (i + 1) % 6 ? 'S' : 'F', '10 层全局 · 80 KiB'],
    ['gpt-oss-120b', '带状窗口 128 与全局交替', i => i % 2 ? 'F' : 'S', '18 层全局 · 36 KiB'],
    ['MiniMax-Text-01', '7 层闪电注意力 + 1 层 softmax', i => (i + 1) % 8 ? 'L' : 'F', '10 层 softmax · 40 KiB'],
    ['Kimi Linear', '3 层 KDA + 1 层 MLA', i => (i + 1) % 4 ? 'L' : 'M', '7 层 MLA · 7.9 KiB'],
    ['MiniMax-M2', '62 层全是完整注意力', i => 'F', '62 层 · 248 KiB'],
  ];
  const cls = { S: 'fgreen', F: 'fblue', L: 'fviolet', M: 'famber' };
  const x0 = 300, cw = 26, n = 24, y0 = 120, rh = 62;
  let b = text(x0, y0 - 10, '第 1—24 层（每格一层）', 'xs');
  b += text(x0 + n * cw + 24, y0 - 10, '随长度增长的 KV（每 token，BF16）', 'xs');
  rows.forEach(([name, rule, f, kv], r) => {
    const y = y0 + r * rh;
    b += text(32, y + 20, name, 't');
    b += text(32, y + 42, rule, 'xs');
    for (let i = 0; i < n; i++) b += cell(x0 + i * cw, y + 4, cw - 4, 34, cls[f(i)]);
    b += text(x0 + n * cw + 24, y + 27, kv, 's');
  });
  const ly = y0 + rows.length * rh + 18;
  [['fblue', '完整 softmax 注意力'], ['fgreen', '滑动窗口（局部）'], ['fviolet', '线性注意力（固定大小状态）'], ['famber', 'MLA 全局层']].forEach(([c, t], i) => {
    b += cell(32 + i * 300, ly, 22, 22, c);
    b += text(64 + i * 300, ly + 17, t, 's');
  });
  return svg('open-layer-patterns', 1300, ly + 56, '各开源模型每层用哪种注意力',
    'Mistral 7B 每层都是 4096 的滑动窗口；Gemma 2 局部与全局 1:1 交替，Gemma 3 为 5:1；gpt-oss 窗口 128 的带状注意力与全局交替；MiniMax-Text-01 每 7 层闪电注意力后接 1 层 softmax；Kimi Linear 每 3 层 KDA 后接 1 层 MLA；MiniMax-M2 全部是完整注意力。右侧是每 token 随长度增长的 KV Cache。',
    '同样几十层，各家把“看全文”的层放在哪里', '只有蓝色和黄色的层要为每个历史 token 存 KV；绿色只存窗口内的，紫色只存固定大小的状态。', b);
}

// ---- open-attention-sink: gpt-oss sink logit worked example -----------------
function attentionSink() {
  const toks = ['年假', '怎么', '申请', '？'];
  const logits = [1.0, 0.2, 2.0, 0.5], sink = 1.5;
  const ex = logits.map(Math.exp), es = Math.exp(sink), tot = ex.reduce((a, c) => a + c, 0);
  const withSink = ex.map(e => e / (tot + es)), noSink = ex.map(e => e / tot);
  let b = '';
  const x0 = 260, cw = 150;
  b += text(32, 150, '注意力分数', 't');
  b += text(32, 236, '普通 softmax', 't');
  b += text(32, 258, '权重和 = 1', 'xs');
  b += text(32, 336, '加汇聚项', 't');
  b += text(32, 358, '权重和 < 1', 'xs');
  toks.forEach((t, i) => {
    const x = x0 + i * cw;
    b += text(x + 60, 116, t, 's', 'middle');
    b += cell(x, 126, 120, 40, 'fgray', logits[i].toFixed(1), 'm');
    b += cell(x, 212, Math.max(8, noSink[i] * 200), 40, 'fblue');
    b += text(x, 278, noSink[i].toFixed(3), 'xs');
    b += cell(x, 312, Math.max(8, withSink[i] * 200), 40, 'fgreen');
    b += text(x, 378, withSink[i].toFixed(3), 'xs');
  });
  const sx = x0 + 4 * cw + 30;
  b += text(sx + 60, 116, '汇聚项', 's', 'middle');
  b += cell(sx, 126, 120, 40, 'famber', sink.toFixed(1), 'm');
  b += cell(sx, 312, (es / (tot + es)) * 200, 40, 'famber');
  b += text(sx, 378, `${(es / (tot + es)).toFixed(3)}（丢弃）`, 'xs');
  b += note('sink-note', 32, 410, 1236, 100, 'gray', '算法', [
    `分母多一项 e^1.5：四个权重从合计 1 变成合计 ${withSink.reduce((a, c) => a + c, 0).toFixed(3)}，相对大小不变，被“汇聚项”分走的那部分不读任何 V。`,
    '这个分数是每个头一个可学习参数（gpt-oss 的 sinks），不对应任何 token，也不进 KV Cache。']);
  return svg('open-attention-sink', 1300, 536, 'gpt-oss 的注意力汇聚项',
    '“？”对前面四个 token 的分数为 1.0、0.2、2.0、0.5。普通 softmax 后四个权重和为 1；gpt-oss 在 softmax 的分母里多加一个可学习的汇聚分数 1.5，四个权重按比例缩小，合计约 0.74，剩下约 0.26 不分给任何 token。',
    'gpt-oss：每个头多一个“哪里都不看”的选项', '示意数字：“？”这个位置对前面 4 个 token 的注意力分数。条形长度与权重成正比。', b);
}

// ---- open-gemma4-layers: local vs global layer in Gemma 4 31B ---------------
function gemma4Layers() {
  let b = '';
  // panel helper: draws Q / K / V head strips, width ∝ head_dim
  function panel(x, title, kicker, cls, q, kv, dim, kEqV, lines) {
    let t = `<g data-node="${kicker}"><rect x="${x}" y="112" width="600" height="300" rx="8" class="${cls}"/>`;
    t += text(x + 18, 138, kicker, 'k') + text(x + 18, 164, title, 't');
    const w = dim === 256 ? 7 : 14, step = w + 2; // width ∝ head_dim
    const rowsY = [190, 232, 274];
    t += text(x + 18, rowsY[0] + 18, 'Q', 'm') + text(x + 18, rowsY[1] + 18, 'K', 'm') + text(x + 18, rowsY[2] + 18, 'V', 'm');
    for (let i = 0; i < q; i++) t += `<rect x="${x + 44 + i * step}" y="${rowsY[0]}" width="${w}" height="26" rx="2" class="fgray"/>`;
    for (let i = 0; i < kv; i++) t += `<rect x="${x + 44 + i * step}" y="${rowsY[1]}" width="${w}" height="26" rx="2" class="${cls === 'green' ? 'fgreen' : 'fblue'}"/>`;
    if (kEqV) t += text(x + 44, rowsY[2] + 18, 'V = K 的投影（没有 v_proj，V 另做一次 RMSNorm）', 's');
    else for (let i = 0; i < kv; i++) t += `<rect x="${x + 44 + i * step}" y="${rowsY[2]}" width="${w}" height="26" rx="2" class="fgreen"/>`;
    lines.forEach((l, i) => { t += text(x + 18, 336 + i * 24, l, 's'); });
    return t + '</g>';
  }
  b += panel(32, '局部层：每 6 层里的前 5 层', '50 层 · sliding_attention', 'green', 32, 16, 256, false,
    ['32 个 Q 头、16 个 KV 头，每头 256 维；只看最近 1024 个 token', 'RoPE 底数 1 万，全部维度旋转', 'KV 每层每 token 16 KiB，超出窗口的丢掉']);
  b += panel(668, '全局层：每 6 层的第 6 层，最后一层必为全局', '10 层 · full_attention', 'blue', 32, 4, 512, true,
    ['32 个 Q 头、只有 4 个 KV 头，每头 512 维；看全部上下文', 'p-RoPE 底数 100 万，只旋转 25% 的维度', 'KV 每层每 token 8 KiB，随上下文增长']);
  b += note('g4-both', 32, 436, 1236, 124, 'gray', '两种层共有', [
    'Q、K 各做 RMSNorm（QK-Norm），V 做一次不带缩放的 RMSNorm；注意力缩放系数取 1.0，不再除以 √d。',
    '每层 4 个 RMSNorm（夹心归一化）：注意力前后各一个、FFN 前后各一个；词嵌入乘 √5376 后进入第 1 层。',
    '输出层与词嵌入共享，最终 logits 做 tanh 软截断，上限 30。']);
  return svg('open-gemma4-layers', 1300, 584, 'Gemma 4 31B 的局部层与全局层',
    'Gemma 4 31B 共 60 层，每 6 层中 5 层是局部层：16 个 KV 头、头维度 256、只看最近 1024 个 token；第 6 层是全局层：只有 4 个 KV 头但头维度 512，V 复用 K 的投影，用只旋转 25% 维度的 p-RoPE。两种层都有 QK-Norm、V-Norm、夹心归一化，最终 logits 软截断 30。',
    'Gemma 4：局部层多而窄，全局层少而宽', '以 31B 为例。格子宽度表示头维度：窄格 256 维，宽格 512 维。', b);
}

const figures = {
  'deepseek-timeline': timeline(),
  'deepseek-moe-routing': routing(),
  'deepseek-params': params(),
  'deepseek-mtp': mtp(),
  'deepseek-dsa': dsa(),
  'deepseek-v4-attention': v4attn(),
  'open-layer-patterns': layerPatterns(),
  'open-attention-sink': attentionSink(),
  'open-gemma4-layers': gemma4Layers(),
};
write(figures);
