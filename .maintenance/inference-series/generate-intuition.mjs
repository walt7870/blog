import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../../public/ai/inference-series/', import.meta.url))
mkdirSync(out, { recursive: true })
const ink = '#172b3a', muted = '#475569', rule = '#cbd5e1'
const blue = '#dbeafe', green = '#d1fae5', red = '#ffe4e6', amber = '#fef3c7'
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const t = (x, y, s, size = 23, fill = ink, anchor = 'start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${escape(s)}</text>`
const rect = (x, y, w, h, fill = '#fff', stroke = rule, rx = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`
const line = (d, arrow = false, color = muted, dashed = false) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="6 5"' : ''} ${arrow ? 'marker-end="url(#arrow)"' : ''}/>`
const dot = (x, y, color = ink, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`
const cell = (x, y, label, fill = blue, w = 88, h = 54) => rect(x, y, w, h, fill) + t(x + w / 2, y + h / 2 + 8, label, 23, ink, 'middle')
const row = (x, y, labels, fill = blue, w = 88) => labels.map((s, i) => cell(x + i * (w + 8), y, s, Array.isArray(fill) ? fill[i] : fill, w)).join('')
let count = 0
function save(name, title, desc, h, body, w = 1120) {
  writeFileSync(`${out}${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(desc)}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8 Z" fill="${muted}"/></marker></defs><rect width="${w}" height="${h}" fill="#f8fafc"/><g font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">${t(w === 1120 ? 36 : 20, 48, title, w === 1120 ? 29 : 25)}${body}</g></svg>\n`)
  count++
}

save('learning-route', '从一句问题，逐步走进推理系统', '四层学习路径：用户体验、资源与调度、机制与引擎、多卡语音和测量。', 460,
  line('M76 125 H1040', true) + [110, 395, 680, 965].map((x, i) => dot(x, 125, ['#2563eb', '#059669', '#b45309', '#be123c'][i], 12) + t(x, 100, ['01—02', '03—05', '06—09', '10—13'][i], 21, muted, 'middle')).join('') +
  [ ['看见回答', '问 → 等 → 逐步显示', '应用、模型、一次请求'], ['打开工作台', '长文档 → 多人排队', '显存、缓存、调度'], ['走进引擎', '少搬 → 少算 → 少等', '量化、推测、两种实现'], ['回到真实服务', '多卡 → 语音 → 实测', '扩展、选型、验证'] ].map((a, i) => {
    const x = 36 + i * 277
    return t(x, 193, a[0], 27) + t(x, 238, a[1], 21) + t(x, 278, a[2], 19, muted) + rect(x, 310, 240, 7, [blue, green, amber, red][i], 'none', 0)
  }).join('') + t(36, 392, '贯穿案例：小林问“年假怎么申请？”——每次只打开一层。', 23))

save('question-to-answer', '屏幕上的回答，来自一条协作链', '教学场景：小林提问，应用检索虚构制度片段，模型服务生成文字，应用展示答复。', 480,
  rect(36, 103, 304, 106, blue) + t(58, 143, '小林的问题') + t(58, 183, '年假怎么申请？', 27) +
  rect(36, 253, 304, 127, '#fff') + t(58, 292, '应用取到的制度片段') + t(58, 331, '“先提交申请，再审批。”', 21) + t(58, 361, '虚构制度，仅用于教学', 17, muted) +
  line('M340 155 H389 V226 H438', true) + line('M340 315 H389 V250 H438', true) +
  rect(438, 163, 244, 139, green) + t(560, 205, '模型服务', 28, ink, 'middle') + t(560, 248, '按输入计算答复', 21, muted, 'middle') + t(560, 282, '引擎组织执行', 20, muted, 'middle') +
  line('M682 233 H749', true) + rect(751, 129, 333, 206, '#fff') + t(775, 172, '小林看到的回复') + t(775, 221, '先在系统中提交申请，', 23) + t(775, 259, '然后等待审批。', 23) + line('M776 285 H1023', false, '#14b8a6') +
  t(36, 435, '生成文字 ≠ 真正提交业务申请；检索、权限与业务执行由应用负责。', 22, muted))

save('learn-and-use', '训练积累方法，推理使用方法', '训练由样本、损失和优化更新参数；常规推理用已固定参数处理当前输入，不自动更新权重。', 420,
  t(36, 114, '训练', 28) + row(160, 82, ['样本', '预测', '损失'], blue, 128) + line('M288 109 H296', true) + line('M424 109 H432', true) +
  rect(695, 82, 389, 89, red) + t(889, 120, '优化器更新参数', 25, ink, 'middle') + t(889, 151, '方法本身改变', 20, muted, 'middle') + line('M568 109 H695', true) +
  t(36, 271, '推理', 28) + row(160, 237, ['当前输入', '固定权重', '输出'], [blue, green, '#fff'], 220) + line('M380 264 H388', true) + line('M608 264 H616', true) +
  t(36, 366, '把制度放进上下文，是提供这次参考材料；不等于重新训练模型。', 23, muted))

save('read-then-write', '先读已知输入，再逐步生成未知输出', 'Prefill并行处理已知输入的位置，仍使用因果遮罩；decode依赖已生成结果逐步继续。词块是教学token，不对应真实分词。', 480,
  t(36, 114, 'Prefill：已知输入都已到齐', 25) + row(36, 146, ['年假', '怎么', '申请', '？'], blue, 106) +
  line('M142 218 H466', true) + t(520, 180, '同一轮处理多个已知位置', 26) + t(520, 221, '因果遮罩仍限制各位置可见范围', 21, muted) +
  line('M36 265 H1084', false, rule) + t(36, 309, 'Decode：下一个词块还未知', 25) +
  cell(36, 342, '先', green, 106) + line('M142 369 H217', true) + cell(220, 342, '提交', green, 106) + line('M326 369 H401', true) + cell(404, 342, '申请', green, 106) + line('M510 369 H585', true) +
  t(625, 365, '先有前一步，才能继续下一步', 25) + t(36, 445, '示意词块不是实际 tokenizer 的分词结果；两阶段都执行模型前向计算。', 21, muted))

save('latency-ruler', '同一条回答，有三种不同的等待', '教学时间线从发送请求到首个有效内容是TTFT，后续内容有间隔，到完成是E2E；网络chunk不一定对应单token。', 430,
  line('M84 196 H1040', true) + [84, 430, 590, 750, 995].map(x => dot(x, 196)).join('') +
  t(84, 151, '发出请求', 22) + t(430, 151, '首个有效内容', 22, ink, 'middle') + t(995, 151, '完成', 22, ink, 'middle') +
  [430, 590, 750, 995].map((x, i) => t(x, 242, ['先', '提交', '申请', '…结束'][i], 23, ink, 'middle')).join('') +
  line('M84 103 V89 H430 V103', false, '#2563eb') + t(257, 78, 'TTFT', 24, '#1d4ed8', 'middle') +
  line('M430 292 V306 H590 V292', false, '#059669') + t(510, 343, '内容片段间隔', 22, '#047857', 'middle') +
  line('M84 369 V383 H995 V369') + t(36, 414, 'E2E：直到完整结束。首网络包可能只有元信息；片段间隔也不一定是 token 间隔。', 20, muted))

save('memory-workbench', '显存像工作台：公共材料、个人便笺、临时空位', '共享模型权重、每请求KV状态与临时工作区占用不同资源；示意分区不按实际字节比例。', 510,
  rect(36, 120, 1048, 270, '#fff', '#64748b', 0) +
  rect(58, 143, 367, 223, blue) + [0, 1, 2, 3].map(i => rect(83 + i * 16, 169 + i * 20, 280, 50, '#eff6ff', '#60a5fa', 2)).join('') + t(241, 322, '共享模型权重', 28, ink, 'middle') + t(241, 350, '通常不随每个用户复制', 18, muted, 'middle') +
  [0, 1, 2].map(i => rect(456 + i * 105, 157 + i * 17, 89, 130, green, '#14b8a6', 2) + t(500 + i * 105, 202 + i * 17, ['林', '周', '陈'][i], 25, ink, 'middle') + [0, 1, 2].map(k => line(`M${469 + i * 105} ${221 + i * 17 + k * 15} h60`, false, '#6ee7b7')).join('')).join('') + t(609, 337, '各请求 KV', 27, ink, 'middle') +
  rect(799, 144, 259, 222, amber, '#d6b863', 0) + t(928, 224, '临时工作区', 27, ink, 'middle') + t(928, 265, '激活、算子缓冲等', 21, muted, 'middle') +
  line('M58 390 V423 H1060 V390') + t(560, 461, '容量有限：资料更长、独立请求更多，便笺区会扩张。', 24, ink, 'middle') + t(36, 496, '仅作分区示意，不按字节比例。真实分配还受并行、缓存池和后端影响。', 19, muted))

save('compute-and-move', '装得下、搬得快、算得快，是三件事', '容量是可保存字节，带宽是单位时间可搬字节，算力是单位时间可执行运算。简化示意不代表真实硬件比例。', 450,
  rect(36, 112, 260, 230, '#fff') + [0, 1, 2, 3].map(i => rect(62, 145 + i * 38, 207, 24, blue, '#60a5fa', 0)).join('') + t(166, 386, '容量：能装多少', 25, ink, 'middle') +
  line('M330 180 H717', true) + line('M330 248 H717', true) + [0, 1, 2].map(i => rect(371 + i * 105, 195, 70, 37, green, '#14b8a6', 1)).join('') + t(524, 297, '数据搬运通道', 25, ink, 'middle') + t(524, 386, '带宽：每秒搬多少', 25, ink, 'middle') +
  rect(760, 112, 324, 230, amber) + [0, 1, 2].map(i => [0, 1, 2, 3].map(j => rect(792 + j * 68, 143 + i * 58, 54, 43, '#fff', '#d6b863', 2)).join('')).join('') + t(922, 386, '算力：每秒算多少', 25, ink, 'middle') +
  t(36, 432, '任一环节成为瓶颈，都可能让另外两项资源等待。', 22, muted))

save('attention-notebook', '保存旧 K/V，仍然要查询旧 K/V', '历史位置的K和V已保存；新位置产生Q、K、V，当前Q与历史及当前位置K/V计算注意力，新K/V加入缓存。', 470,
  t(36, 108, '历史位置：已经写好的计算便笺', 25) + row(36, 134, ['K/V₁', 'K/V₂', 'K/V₃', 'K/V₄'], green, 125) +
  rect(710, 103, 374, 137, blue) + t(897, 145, '新位置', 28, ink, 'middle') + t(897, 193, '产生 Q、K、V', 26, ink, 'middle') +
  line('M822 240 V286 H300 V196', true) + t(490, 275, '当前 Q 查询历史', 22, muted, 'middle') +
  line('M976 240 V350 H574', true) + cell(440, 323, '新 K/V', blue, 132) + t(36, 361, '缓存末尾追加', 25) +
  t(36, 420, '省掉历史位置的 K/V 重建，不会省掉新位置对历史的 attention。', 23) + t(36, 453, '常规自回归 attention 示意；新位置也参与本轮注意力。', 19, muted))

save('cache-questions', '四种机制，回答四个不同的问题', 'KV cache保存历史状态，prefix cache在兼容请求间复用前缀，Paged管理物理位置，FlashAttention减少attention执行中的IO。', 560,
  t(36, 110, 'KV cache：旧位置还要重算吗？', 25) + row(36, 132, ['旧', '旧', '旧', '新'], [green, green, green, blue], 86) + t(471, 167, '保留同一序列的历史 K/V', 24) +
  line('M36 211 H1084', false, rule) + t(36, 250, 'Prefix cache：别人能借这段吗？', 25) + row(36, 271, ['a', 'b', 'c', 'd'], green, 86) + line('M414 298 H501', true) + row(527, 271, ['a', 'b', 'c', 'x'], [green, green, green, blue], 86) +
  line('M36 350 H1084', false, rule) + t(36, 390, 'Paged：便笺放在哪里？', 25) + row(36, 414, ['页7', '页2', '页19'], blue, 106) + t(470, 451, '逻辑顺序 → 分散的物理块', 24) +
  t(36, 513, 'FlashAttention：计算时怎样少搬中间数据？', 25) + t(36, 546, '分块与融合执行精确 attention；不等于减少为线性运算量。', 20, muted))

const slots = (y, items) => items.map((s, i) => cell(266 + i * 99, y, s, s === '空' ? '#f1f5f9' : s === 'P' ? blue : green, 91, 46)).join('')
save('chunked-prefill', '及时补位，与穿插长任务，是两种调度改进', '上半部两个工作位用四轮展示静态batch空位与连续补位；下半部教学等时隙显示整段prefill阻塞decode与分块穿插。', 655,
  t(36, 106, '短请求 A 两轮结束，B 继续：', 24) + t(36, 162, '整批才换人', 23) + slots(128, ['A/B', 'A/B', '空/B', '空/B']) +
  t(36, 223, '每轮可补位', 23) + slots(190, ['A/B', 'A/B', 'C/B', 'C/B']) + t(714, 222, 'C 提早开始', 22, '#047857') +
  line('M36 270 H1084', false, rule) + t(36, 316, '长输入 P 到达时，正在生成的 D 会怎样？', 25) +
  t(36, 376, '整段 prefill', 23) + slots(342, ['P', 'P', 'P', 'P', 'D', 'D', 'D', 'D']) +
  t(36, 439, '分块 prefill', 23) + slots(405, ['P', 'D', 'P', 'D', 'P', 'D', 'P', 'D']) +
  line('M266 482 H1050', true) + t(660, 516, '时间向右；P 共四份工作，D 也共四份', 22, muted, 'middle') +
  t(36, 570, 'P 更分散，D 更早推进；不是把长输入删短，也不保证总耗时下降。', 23) +
  t(36, 620, '教学等时隙示意；真实引擎可在同轮混合 prefill / decode，轮次耗时并不相等。', 20, muted))

save('precision-ruler', '量化像把连续数值放到有限刻度上', '示意均匀量化：原值0.37，细刻度近似0.375，粗刻度近似0.25。真实浮点格式和分组量化不限于这种刻度。', 470,
  [0, 1].map(i => {
    const y = 150 + i * 140, n = i ? 4 : 16
    return t(36, y + 8, i ? '较粗刻度' : '较细刻度', 24) + line(`M250 ${y} H1050`) + Array.from({ length: n + 1 }, (_, k) => line(`M${250 + k * 800 / n} ${y - 10} v20`)).join('') +
      dot(250 + 0.37 * 800, y, '#be123c', 8) + dot(250 + (i ? .25 : .375) * 800, y + 35, '#2563eb', 7) + t(250, y + 67, '0', 20, muted, 'middle') + t(1050, y + 67, '1', 20, muted, 'middle') +
      t(755, y - 27, i ? '0.37 → 0.25，误差较大' : '0.37 → 0.375，误差较小', 23)
  }).join('') + t(36, 403, '刻度越少，编码可以越短；实际计算能否更快，还要看 kernel 与硬件。', 23) +
  t(36, 445, '红点是原值，蓝点是近似值。均匀刻度仅用于建立直觉，不代表所有浮点格式。', 20, muted))

save('engine-loop', 'vLLM 把“再生成一步”组织成执行循环', 'API将请求加入队列，调度与KV管理确定本轮任务，runner执行，采样后返回并检查停止；未完成继续下一轮，完成或取消安全解除引用。', 500,
  line('M250 173 H344', true) + line('M633 173 H728', true) + line('M882 221 V289', true) + line('M728 337 H675 V261 H489 V221', true) +
  rect(36, 124, 214, 97, '#fff') + t(143, 165, 'API / 队列', 25, ink, 'middle') + t(143, 198, '问题与参数', 20, muted, 'middle') +
  rect(345, 124, 288, 97, blue) + t(489, 165, '调度 + KV 管理', 25, ink, 'middle') + t(489, 198, '选请求、算预算、分块', 20, muted, 'middle') +
  rect(729, 124, 355, 97, green) + t(906, 165, 'Model runner', 26, ink, 'middle') + t(906, 198, '执行本轮模型计算', 20, muted, 'middle') +
  rect(729, 289, 355, 97, '#fff') + t(906, 331, '采样、返回与停止判断', 25, ink, 'middle') +
  t(489, 328, '未结束：继续下一轮', 23, ink, 'middle') +
  line('M906 386 V441 H633', true) + rect(36, 411, 597, 61, red) + t(334, 450, '完成 / 取消：在安全位置解除活跃引用', 23, ink, 'middle'))

save('radix-branches', '相同 token 前缀，走同一段树枝', 'A和B共享a b c d，C只与它们共享a b；分叉后不同部分不共享。树节点索引实际KV池，不是语义相似检索。', 480,
  line('M230 239 H306 V155 H385', true) + line('M230 262 H306 V363 H727', true) + line('M535 143 H625 V107 H727', true) + line('M535 164 H625 V235 H727', true) +
  cell(65, 220, 'a b', green, 165, 65) + cell(385, 124, 'c d', green, 150, 65) + cell(727, 75, 'e f', blue, 150, 65) + cell(727, 204, 'x y', blue, 150, 65) + cell(727, 331, 'm n', amber, 150, 65) +
  t(929, 116, 'A', 28) + t(929, 246, 'B', 28) + t(929, 374, 'C', 28) + t(67, 328, '三条请求共用', 21, muted) + t(386, 232, 'A / B 继续共用', 21, muted) +
  t(36, 446, '树记录匹配与引用；KV 张量存放在状态池。相似意思不能代替相同 token 前缀。', 22, muted))

save('scaling-choices', '先看瓶颈，再决定多卡怎样分工', '模型放不下需要拆模型，用户多需要请求副本，长prefill干扰生成可评估阶段分离。图示不表示性能倍数或完整通信拓扑。', 530,
  t(36, 112, '模型放不下', 25) + cell(285, 80, '模型前半', blue, 210, 65) + line('M495 112 H563', true) + cell(565, 80, '模型后半', blue, 210, 65) + t(836, 120, '拆模型：如 PP', 23) +
  line('M36 178 H1084', false, rule) + t(36, 245, '请求太多', 25) + cell(285, 207, '完整副本 1', green, 210, 65) + cell(565, 207, '完整副本 2', green, 210, 65) + t(836, 246, '分请求：DP', 23) +
  t(390, 307, '小林的请求', 21, muted, 'middle') + t(670, 307, '小周的请求', 21, muted, 'middle') +
  line('M36 341 H1084', false, rule) + t(36, 408, '两阶段互相干扰', 25) + cell(285, 373, 'Prefill 池', blue, 210, 65) + line('M495 405 H563', true) + cell(565, 373, 'Decode 池', green, 210, 65) + t(530, 470, '交接 KV', 21, muted, 'middle') + t(836, 412, '分阶段：P/D', 23) +
  t(36, 514, '简化分工示意；TP 在层内协作，EP 拆专家，CP 拆上下文，详见正文。', 20, muted))

save('selection-gates', '先确认能完成，再确认能运行，最后比较快慢', '候选依次经过质量、支持组合、真实负载三道验证，任一道不满足就需要重新选择。', 400,
  [ [36, '任务质量', '回答是否正确？', '语音是否完整、自然？'], [405, '支持组合', '模型 × 设备 × 精度', '流式、工具、状态能否配合？'], [774, '真实负载', '同条件测 TTFT / ITL', '比较有效容量与成本'] ].map(([x, title, a, b], i) =>
    rect(x, 112, 310, 196, [blue, green, amber][i]) + t(x + 24, 154, `${i + 1}. ${title}`, 28) + t(x + 24, 214, a, 23) + t(x + 24, 261, b, 19, muted)
  ).join('') + line('M346 210 H403', true) + line('M715 210 H772', true) + t(36, 364, '任一道不满足，都要回到候选与配置；最新版本与最高 tokens/s 不能跳过前两道。', 22, muted))

save('measurement-path', '用户感到慢，要沿着同一请求定位', '教学时间线依次示意接入排队、prefill、生成首内容、继续decode和完成。客户端计时需要与服务端trace对齐，不能由chunk时间推断所有内部阶段。', 450,
  t(36, 112, '服务端分段', 24) + [ [36, 220, '接入 / 排队', '#e2e8f0'], [256, 300, 'Prefill', blue], [556, 528, '逐步 Decode', green] ].map(([x, w, s, color]) => rect(x, 139, w, 72, color, '#fff', 0) + t(x + w / 2, 184, s, 25, ink, 'middle')).join('') +
  line('M36 253 H1084', true) + [36, 556, 1084].map(x => dot(x, 253)).join('') + t(36, 293, '客户端发出', 22) + t(556, 293, '首个有效内容', 22, ink, 'middle') + t(1084, 293, '完成', 22, ink, 'end') +
  line('M36 330 V347 H556 V330') + t(296, 383, 'TTFT：先查首段路径', 24, ink, 'middle') +
  line('M591 330 V347 H1084 V330') + t(837, 383, '生成中停顿：查逐步执行', 24, ink, 'middle') +
  t(36, 430, '示意非实测比例；传输、分词、编码器等需按系统补齐，内部原因由 trace 验证。', 20, muted))

save('learning-route-mobile', '从一句问题，逐层深入', '与桌面图相同的四阶段学习路线，改用纵向布局。', 568,
  line('M43 95 V493', true) + [ ['01—02', '看见回答', '应用 → 一次请求'], ['03—05', '打开工作台', '显存 → 缓存 → 调度'], ['06—09', '走进引擎', '量化 → 推测 → 两种实现'], ['10—13', '回到真实服务', '多卡 → 语音 → 实测'] ].map((a, i) =>
    dot(43, 112 + i * 122, ['#2563eb', '#059669', '#b45309', '#be123c'][i], 8) + t(77, 100 + i * 122, `${a[0]}  ${a[1]}`, 25) + t(77, 141 + i * 122, a[2], 22, muted)
  ).join('') + t(20, 550, '同一个案例，每次打开一层。', 21, muted), 480)

save('question-to-answer-mobile', '一句提问，怎样得到回答', '问题和检索制度一起进入模型服务，结果回到应用展示；制度是虚构教学例子。', 615,
  rect(20, 81, 440, 77, blue) + t(40, 114, '小林的问题', 20) + t(40, 145, '年假怎么申请？', 25) +
  rect(20, 183, 440, 86, '#fff') + t(40, 214, '应用取到制度片段', 21) + t(40, 248, '“先提交申请，再审批。”', 24) +
  line('M460 120 H471 V310 H350 V330', true) + line('M240 269 V330', true) +
  rect(20, 331, 440, 85, green) + t(240, 367, '模型服务', 26, ink, 'middle') + t(240, 399, '引擎组织执行，模型计算答复', 21, ink, 'middle') +
  line('M240 416 V450', true) + rect(20, 451, 440, 81, '#fff') + t(40, 484, '回复：先提交申请，', 24) + t(40, 517, '然后等待审批。', 24) +
  t(20, 568, '制度为教学示例；生成答复', 20, muted) + t(20, 596, '不等于真正提交业务申请。', 20, muted), 480)

save('read-then-write-mobile', '先读输入，再逐步续写', '与桌面图相同，已知输入可一轮处理，未知输出有串行依赖。', 448,
  t(20, 104, 'Prefill：输入已经全部给定', 23) + row(20, 127, ['年假', '怎么', '申请', '？'], blue, 100) + t(20, 218, '同轮处理；仍遵守因果遮罩', 21, muted) +
  line('M20 248 H460', false, rule) + t(20, 289, 'Decode：下一词块仍未知', 23) + cell(20, 315, '先', green, 100) + line('M120 342 H183', true) + cell(185, 315, '提交', green, 100) + line('M285 342 H348', true) + cell(350, 315, '申请', green, 100) +
  t(20, 411, '先有前一步，才能继续下一步。', 22) + t(20, 439, '词块仅为教学，不对应真实分词。', 19, muted), 480)

save('latency-ruler-mobile', '首次等待与后续间隔', '教学时间线，从发出到首内容是TTFT，从发出到完成是E2E，chunk间隔不等于token间隔。', 448,
  line('M30 172 H452', true) + [30, 210, 290, 370, 445].map(x => dot(x, 172)).join('') + t(30, 140, '发出', 21) + t(210, 140, '首内容', 21, ink, 'middle') + t(445, 140, '完成', 21, ink, 'end') +
  line('M30 113 V96 H210 V113', false, '#2563eb') + t(120, 83, 'TTFT', 23, '#1d4ed8', 'middle') +
  t(210, 213, '先', 22, ink, 'middle') + t(290, 213, '提交', 22, ink, 'middle') + t(370, 213, '申请', 22, ink, 'middle') +
  line('M210 244 V258 H290 V244', false, '#059669') + t(250, 291, '内容片段间隔', 22, '#047857', 'middle') +
  line('M30 318 V332 H445 V318') + t(237, 365, 'E2E：直到完整结束', 23, ink, 'middle') + t(20, 405, '首网络包可能只有元信息；', 20, muted) + t(20, 430, '片段间隔不一定等于 token 间隔。', 20, muted), 480)

save('memory-workbench-mobile', '显存工作台装了什么', '共享权重、独立请求状态、临时工作区的纵向示意，不按真实字节比例。', 524,
  rect(20, 82, 440, 342, '#fff', '#64748b', 0) +
  rect(35, 97, 410, 90, blue) + [0, 1, 2].map(i => rect(55 + i * 9, 112 + i * 9, 120, 25, '#eff6ff', '#60a5fa', 1)).join('') + t(230, 135, '共享模型权重', 24) + t(230, 169, '不按用户复制', 20, muted) +
  [0, 1, 2].map(i => rect(36 + i * 138, 207, 132, 89, green) + t(102 + i * 138, 241, ['小林', '小周', '小陈'][i], 23, ink, 'middle') + t(102 + i * 138, 277, '请求 KV', 21, ink, 'middle')).join('') +
  rect(35, 317, 410, 90, amber) + t(240, 353, '临时工作区', 24, ink, 'middle') + t(240, 388, '激活、算子与通信缓冲等', 21, muted, 'middle') +
  t(20, 464, '文档更长、独立人数更多，', 23) + t(20, 497, '请求状态会扩张。分区非字节比例。', 20, muted), 480)

save('compute-and-move-mobile', '容量、带宽与算力', '用储存、搬运通道和计算格子，区分容量、带宽与算力。', 557,
  rect(20, 87, 171, 104, '#fff') + [0, 1, 2].map(i => rect(37, 103 + i * 27, 137, 16, blue, '#60a5fa', 0)).join('') + t(220, 122, '容量', 27) + t(220, 164, '能装多少', 23) +
  line('M105 192 V247', true) + rect(20, 249, 171, 76, green) + line('M43 287 H165', true) + t(220, 275, '带宽', 27) + t(220, 314, '每秒搬多少', 23) +
  line('M105 326 V383', true) + rect(20, 385, 171, 98, amber) + [0, 1, 2].map(i => rect(34 + i * 51, 408, 40, 47, '#fff', '#d6b863', 2)).join('') + t(220, 417, '算力', 27) + t(220, 461, '每秒算多少', 23) + t(20, 535, '装得下，不代表搬得快或算得快。', 21, muted), 480)

save('attention-notebook-mobile', '保留便笺，仍要查询便笺', '当前新位置的Q查询历史K/V，自己的K/V追加缓存，历史位置不必重复建立。', 520,
  rect(20, 86, 440, 90, blue) + t(240, 122, '新位置产生 Q、K、V', 25, ink, 'middle') + t(240, 155, 'Q 查询历史；K/V 留给后续', 21, ink, 'middle') +
  line('M125 176 V258', true) + line('M440 176 V220 H471 V389 H418', true) + t(25, 222, '查询', 22, muted) + t(369, 222, '追加', 22, muted) +
  row(20, 260, ['旧 K/V', '旧 K/V', '旧 K/V'], green, 140) +
  cell(278, 362, '新 K/V', blue, 140) + line('M277 389 H125 V314', true) +
  t(20, 455, '旧状态不必重新建立。', 23) + t(20, 489, '新位置仍要计算 attention，', 21, muted) + t(20, 516, '包括对历史及当前位置的查询。', 21, muted), 480)

const mobileSlots = (y, a) => a.map((s, i) => cell(160 + i * 76, y, s, s === '空/B' ? '#f1f5f9' : green, 68, 44)).join('')
save('chunked-prefill-mobile', '补空位，穿插长任务', '两个工作位示意静态等待与连续补位；下半部分示意长prefill分块后decode可更早推进。', 624,
  t(20, 99, 'A 两轮结束，B 继续', 23) + t(20, 151, '整批换人', 21) + mobileSlots(121, ['A/B', 'A/B', '空/B', '空/B']) + t(20, 216, '每轮补位', 21) + mobileSlots(186, ['A/B', 'A/B', 'C/B', 'C/B']) +
  line('M20 258 H460', false, rule) + t(20, 302, '长输入 P 与正在生成的 D', 23) + t(20, 346, '整段 prefill', 21) + row(20, 363, ['P', 'P', 'P', 'P', 'D', 'D', 'D', 'D'], [blue, blue, blue, blue, green, green, green, green], 47) +
  t(20, 458, '分块 prefill', 21) + row(20, 475, ['P', 'D', 'P', 'D', 'P', 'D', 'P', 'D'], [blue, green, blue, green, blue, green, blue, green], 47) +
  t(20, 569, '同样的工作，D 更早得到推进。', 22) + t(20, 600, '教学等时隙；不代表实际加速倍数。', 20, muted), 480)

console.log(`生成 ${count} 张直觉图（含手机排版）：${out}`)
