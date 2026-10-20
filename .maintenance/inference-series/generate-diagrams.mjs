import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../../public/ai/inference-series/', import.meta.url))
mkdirSync(out, { recursive: true })
const c = { ink: '#172b3a', muted: '#475569', line: '#64748b', border: '#cbd5e1', blue: '#eff6ff', blueLine: '#60a5fa', green: '#ecfdf5', greenLine: '#14b8a6', red: '#fff1f2', redLine: '#e88191' }
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const text = (x, y, label, size = 19, fill = c.ink, anchor = 'start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(label)}</text>`
const box = (x, y, w, h, title, lines = [], tone = 'blue') => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c[tone] || '#fff'}" stroke="${c[tone + 'Line'] || c.border}"/>${text(x + 18, y + 32, title, 21)}${lines.map((s, i) => text(x + 18, y + 62 + i * 26, s, 17, c.muted)).join('')}</g>`
const path = (d, label, x, y, dashed = false, color = c.line) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="7 5"' : ''} ${label?.includes('↑') ? 'marker-start="url(#arrow)"' : ''} marker-end="url(#arrow)"/>${label ? text(x, y, label, 17, color, 'middle') : ''}`
function save(name, title, desc, height, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="${c.line}"/></marker><marker id="control" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="${c.redLine}"/></marker></defs><rect width="1120" height="${height}" fill="#f8fafc"/><g font-family="Arial,'PingFang SC','Microsoft YaHei',sans-serif">${text(32, 45, title, 27)}${body}</g></svg>\n`
  writeFileSync(`${out}${name}.svg`, svg)
}

save('inference-stack', '模型能力怎样变成可用服务', '应用发起请求，推理引擎管理状态与调度，计算框架与算子库执行模型，硬件提供资源；模型权重和配置由引擎加载。', 640,
  box(32, 90, 735, 82, '应用与业务', ['检索、会话、工具、权限、质量校验'], 'white') +
  path('M400 172 V214', '请求 ↓ / 结果 ↑', 580, 199) +
  box(32, 216, 735, 114, '推理引擎：vLLM / SGLang 等', ['请求队列 → 调度与 KV 管理 → 模型执行 → 采样与返回', '状态：已计算位置、活跃缓存、停止与取消'], 'blue') +
  box(813, 216, 275, 114, '模型与配置', ['架构、权重、tokenizer', 'chat template、模态处理'], 'green') +
  path('M813 273 H767', '加载', 791, 258) +
  path('M400 330 V374', '计算任务 ↓ / 张量结果 ↑', 590, 357) +
  box(32, 376, 1056, 82, '计算框架与算子', ['PyTorch / MLX；attention、GEMM、MoE、编译与执行图'], 'green') +
  path('M400 458 V502', '设备执行 ↓ / 计算结果 ↑', 590, 485) +
  box(32, 504, 1056, 82, '硬件与平台', ['GPU / CPU / 加速器；显存、内存带宽、卡间互联、CUDA / ROCm / Metal'], 'white') +
  text(32, 618, '分布式路由、KV 传输与存储可在引擎外围协作；不是所有项目都处于同一层。', 17, c.muted))

const actors = [110, 400, 690, 1000]
save('request-lifecycle', '常规文本生成请求的时序', '客户端经API进入引擎，引擎调度GPU完成prefill并返回首token，然后循环decode，结束后解除活跃引用。', 760,
  actors.map((x, i) => `<rect x="${x - 80}" y="83" width="160" height="48" rx="6" fill="${i === 3 ? c.green : c.blue}" stroke="${c.border}"/>${text(x, 114, ['客户端', 'API 与分词', '调度与 KV', 'GPU 执行'][i], 20, c.ink, 'middle')}<path d="M${x} 131 V675" stroke="${c.border}" stroke-dasharray="5 5"/>`).join('') +
  path('M110 174 H400', 'messages', 255, 163) +
  path('M400 230 H690', 'token 与生成参数', 545, 219) +
  text(705, 264, '查前缀、分配页、扣预算', 16, c.muted) +
  path('M690 305 H1000', '未命中输入的 prefill', 845, 294) +
  path('M1000 359 H690', 'logits / 模型结果', 845, 348, true) +
  path('M690 411 H400', '采样后的首 token', 545, 400, true) +
  path('M400 455 H110', '首个有效流式片段', 255, 444, true) +
  `<rect x="630" y="492" width="455" height="149" rx="4" fill="none" stroke="${c.border}"/>` + text(644, 516, '循环：未停止时', 16, c.muted) +
  path('M690 558 H1000', '新 token + 历史 KV → decode', 845, 546) +
  path('M1000 614 H690', '模型结果；采样并继续返回', 845, 602, true) +
  text(690, 693, '结束：解除活跃引用', 18, c.ink, 'middle') +
  text(32, 733, '时间从上到下。图示为成功主路径；排队、取消与错误由请求状态机管理。', 17, c.muted))

save('paged-kv', '逻辑页通过块表访问物理 KV', '请求A的三页映射到7、2、19，请求B共享物理页7并拥有页11。最后一页有未用位置，共享页不能在仍有引用时回收。', 640,
  box(32, 104, 290, 132, '请求 A：10 token', ['逻辑页 0：a b c d', '逻辑页 1：e f g h', '逻辑页 2：i j · ·'], 'blue') +
  box(32, 328, 290, 106, '请求 B：8 token', ['逻辑页 0：a b c d', '逻辑页 1：x y z w'], 'green') +
  box(438, 104, 240, 132, 'A 的块表', ['页 0 → 7', '页 1 → 2', '页 2 → 19'], 'white') +
  box(438, 328, 240, 106, 'B 的块表', ['页 0 → 7（共享）', '页 1 → 11'], 'white') +
  path('M322 170 H438', '映射', 380, 158) + path('M322 381 H438', '映射', 380, 368) +
  box(810, 104, 278, 80, '物理页 7 · 引用 2', ['a b c d'], 'green') +
  box(810, 212, 278, 80, '物理页 2', ['e f g h'], 'blue') +
  box(810, 320, 278, 80, '物理页 19', ['i j · ·（内部空位）'], 'blue') +
  box(810, 428, 278, 80, '物理页 11', ['x y z w'], 'green') +
  path('M678 142 H810') + path('M678 174 H744 V252 H810') + path('M678 207 H723 V360 H810') +
  path('M678 380 H779 V162 H810') + path('M678 406 H760 V468 H810') +
  text(32, 550, '块表使逻辑连续；物理页可以分散。两条请求共享页 7，不复制整段前缀。', 19) +
  text(32, 587, 'A 结束只减少引用；B 仍使用页 7 时不能回收。分页本身不代表自动卸载到 CPU。', 17, c.muted))

save('pd-deployment', 'Prefill / Decode 分离的状态交接', '路由器将输入交给prefill池，KV通过传输层交给decode池，后者继续生成并返回。超时或失败时向请求管理回报，停止交接并清理两侧状态。', 650,
  box(32, 112, 235, 104, '路由与请求管理', ['长度、负载、缓存信息', '维护请求与取消状态'], 'white') +
  box(376, 112, 280, 104, 'Prefill worker 池', ['计算输入与历史状态', '独立队列与资源配置'], 'blue') +
  box(792, 112, 296, 104, 'Decode worker 池', ['接续状态，逐步生成', '独立队列与资源配置'], 'green') +
  path('M267 160 H376', '输入', 321, 147) +
  path('M656 160 H792', 'KV + 元数据', 724, 146) +
  text(704, 195, '传输与布局恢复', 15, c.muted, 'middle') +
  box(376, 331, 280, 104, '可选共享 KV 后端', ['缓存、预取与传输协作', '不替代模型执行'], 'white') +
  path('M516 216 V331', '读写 / 预取', 590, 282, true) +
  path('M656 383 H940 V216', '恢复可复用状态', 826, 370, true) +
  path('M1088 196 H1100 V485 H150 V216', '输出经请求管理返回客户端', 609, 475) +
  `<path d="M64 216 V570 H346 V250 H400 V216" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-start="url(#control)" marker-end="url(#control)"/>` +
  `<path d="M64 216 V570 H1110 V250 H1050 V216" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-start="url(#control)" marker-end="url(#control)"/>` +
  text(680, 555, '控制通道：失败 / 超时回报；取消与双侧清理', 17, '#9f1239', 'middle') +
  text(32, 613, '图示为职责关系，不绑定某种传输协议。是否分离取决于干扰收益、KV 成本和恢复复杂度。', 17, c.muted))

save('speech-pipeline', '流式语音助手的关键路径与打断', '麦克风音频经VAD和ASR转文字，再由LLM生成文本，TTS和声码器输出可播放音频。用户停说前ASR已可运行；打断控制需要终止旧推理并清空待播放队列。', 640,
  box(32, 108, 222, 110, '音频接入与 VAD', ['音频块、采样率与时钟', '判断端点，不等于 ASR'], 'white') +
  box(346, 108, 288, 110, '流式 ASR', ['特征 / 编码 / 搜索', 'partial → 稳定 final'], 'blue') +
  box(764, 108, 324, 110, '语言模型', ['首段可合成文本 → 后续文本', 'KV、调度、工具与停止'], 'green') +
  path('M254 163 H346', '音频块', 300, 151) + path('M634 163 H764', '文本 / 事件', 699, 151) +
  box(764, 340, 324, 110, 'TTS 与声码器 / codec', ['文本 → 声学 / 音频 token', '生成首个可播放块与后续块'], 'blue') +
  box(346, 340, 288, 110, '播放与缓冲', ['音频时钟、续流与欠载', '回声处理、可打断播放'], 'green') +
  path('M926 218 V340', '文本分块', 992, 284) + path('M764 394 H634', '音频块', 699, 382) +
  box(32, 340, 222, 110, '会话与打断控制', ['失效旧请求与输出', '管理底层状态生命周期'], 'red') +
  `<path d="M254 394 H346" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#control)"/>` + text(300, 380, '清空队列', 17, '#9f1239', 'middle') +
  `<path d="M143 340 V258 H810 V218" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#control)"/>` +
  `<path d="M490 258 V218" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#control)"/>` +
  `<path d="M810 258 H1103 V394 H1088" fill="none" stroke="${c.redLine}" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#control)"/>` +
  text(423, 307, '取消旧 ASR / LLM / TTS 工作及待提交结果', 16, '#9f1239') +
  text(32, 524, '用户停说 → 端点确认 → ASR 收尾 → 首段回复 → TTS 首块 → 可播放音频', 21) +
  text(32, 565, 'ASR 主体可在说话时运行。首字、首 token、首个网络包、首音频是不同观测事件。', 17, c.muted) +
  text(32, 601, '打断是控制路径；底层未安全结束前，不可提前复用仍被占用的缓冲或状态。', 17, c.muted))

console.log(`生成 5 张 SVG：${out}`)
