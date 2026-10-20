import fs from 'node:fs';

const out = new URL('../../public/python/concurrency/', import.meta.url);
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, cls = 's') => `<text x="${x}" y="${y}" class="${cls}">${esc(value)}</text>`;
const box = (x, y, w, h, title, lines = [], cls = 'node') => `<rect data-node="${esc(title)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}"/>${text(x + 18, y + 34, title, 'n')}${lines.map((line, i) => text(x + 18, y + 65 + i * 27, line)).join('')}`;
const edge = (d, dashed = false) => `<path d="${d}" class="edge${dashed ? ' dashed' : ''}"/>`;
const label = (x, y, value) => `<rect x="${x - 8}" y="${y - 22}" width="${value.length * 18 + 16}" height="30" fill="#fff"/>${text(x, y, value)}`;
function draw(name, title, desc, height, body, notes = []) {
  const id = name.replaceAll('-', '_');
  const footer = notes.map((line, i) => text(32, height - 28 - (notes.length - 1 - i) * 28, line)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="${id}_title ${id}_desc"><title id="${id}_title">${esc(title)}</title><desc id="${id}_desc">${esc(desc)}</desc><defs><marker id="${id}_arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.warn{fill:#f8eef1;stroke:#ae7789;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${id}_arrow)}.dashed{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${height}" fill="white"/>${text(32, 44, title, 'h')}${text(32, 82, desc)}${body}${footer}</svg>\n`;
  fs.writeFileSync(new URL(`${name}.svg`, out), svg);
}
function row(name, title, desc, nodes, notes) {
  const y = 144, w = 240, gap = 32;
  draw(name, title, desc, 408,
    nodes.slice(0, -1).map((_, i) => edge(`M${32 + i * (w + gap) + w} 216H${32 + (i + 1) * (w + gap)}`)).join('') +
    nodes.map(([head, ...lines], i) => box(32 + i * (w + gap), y, w, 144, head, lines, i === 3 ? 'good' : 'node')).join(''), notes);
}
function compare(name, title, desc, nodes, notes) {
  draw(name, title, desc, 548, nodes.map(([head, ...lines], i) => box(32 + (i % 2) * 544, 128 + Math.floor(i / 2) * 164, 512, 136, head, lines, i === 0 ? 'info' : 'node')).join(''), notes);
}
function fan(name, title, desc, source, targets, notes) {
  draw(name, title, desc, 616,
    edge('M352 198H736Q744 198 744 190V144H776') +
    edge('M352 232H600Q608 232 608 240V292Q608 300 616 300H776') +
    edge('M352 266H496Q504 266 504 274V408Q504 416 512 416H776') +
    box(32, 168, 320, 128, source[0], source.slice(1), 'info') +
    targets.map(([head, ...lines], i) => box(776, 112 + i * 136, 312, 112, head, lines, i === 0 ? 'good' : 'node')).join(''), notes);
}

draw('concurrency-diagnosis-decision-flow', '先定位瓶颈，再给各阶段选择并发模型', '任务拆阶段 → 固定输入测量 → 按资源选工具 → 设置容量与恢复合同。', 640,
  edge('M272 192H304') + edge('M544 192H576') + edge('M816 192H848') +
  box(32, 128, 240, 132, '真实任务', ['扫描、转码、转写', '结果与状态落盘']) +
  box(304, 128, 240, 132, '证据', ['阶段耗时与错误', 'CPU、内存、队列']) +
  box(576, 128, 240, 132, '阶段模型', ['等待与计算分开', '按下方边界选择'], 'info') +
  box(848, 128, 240, 132, '运行约束', ['限速、超时、背压', '幂等与恢复'], 'good') +
  box(32, 336, 512, 104, '阻塞 I/O → 受限线程池 / 异步客户端', ['请求速率限制独立于在途数量']) +
  box(576, 336, 512, 104, '纯 Python CPU → 进程池 / 运行时比较', ['计入启动、序列化与总内存']) +
  box(32, 464, 512, 104, 'GPU → 复用模型 + 有界队列 + 组批', ['显存上限与端到端截止时间']) +
  box(576, 464, 512, 104, '多阶段 → 各阶段限容量 + 监督者', ['失败消息、停止协议与持久状态']),
  ['吞吐、P95、错误率和成本一起验收；checkpoint不替代内存背压。']);

row('ep01-bottleneck-evidence-chain', '用同一批任务建立可解释的证据链', '慢在哪一段、哪个资源先满、哪个调用在等待，是三个不同的问题。', [
  ['固定基线', '同输入与环境', '顺序 / 低并发'], ['分段计时', '扫描、转码、API', '成功与失败分类'],
  ['资源与调用栈', 'CPU / 当前与峰值RSS', '队列 / profiler'], ['单变量验证', '只改一个参数', '比较吞吐与尾延迟']
], ['ru_maxrss记录历史峰值；CPU低不单独证明网络慢，tracemalloc不覆盖全部原生内存。']);

compare('ep02-four-concepts-map', '四个概念观察同一系统的不同侧面', '三个各等1秒的请求可重叠等待；三个各算1秒的任务另看执行资源。', [
  ['并发：管理多个未完成任务', '任务A等待时，推进B或C', '多个任务在同一时间段内存在'],
  ['并行：多个执行资源同时工作', '两个CPU核心同时做特征计算', '默认GIL影响纯Python线程执行'],
  ['异步：调用不占住等待线程', '未就绪的I/O允许事件循环调度其他Task', 'await已完成对象不一定切换'],
  ['流水线：按阶段传递任务与压力', '转码 → 转写 → 落盘，分别限容量', '首份延迟与稳定吞吐分别计算']
], ['这些是观察维度，不是四个互斥工具，也不是必须逐项经历的执行步骤。']);

compare('ep03-tool-selection-map', '工具选择先看执行边界', '线程、协程、进程与队列各解决不同约束，可在不同阶段组合。', [
  ['阻塞等待 → ThreadPoolExecutor', '同步SDK、文件或外部命令等待', '限制运行线程和待执行Future'],
  ['非阻塞I/O → asyncio', '异步连接池、取消和超时', '在途上限与请求速率分别限制'],
  ['CPU计算 → ProcessPoolExecutor', '可导入的worker、可序列化参数', '考虑原生库内部线程与进程启动'],
  ['阶段连接 → 对应并发模型的Queue', '线程用queue.Queue，协程用asyncio.Queue', 'ffmpeg在外部进程，GPU由专用worker承接']
], ['队列只在对应线程/事件循环边界内使用；跨线程桥接本身也要有容量上限。']);

row('ep04-threadpool-lifecycle', '线程数与待执行窗口分别受控', '示例每批最多2×worker数，按完成顺序收集，批结束后才继续读取输入。', [
  ['惰性输入', '迭代读取路径', '保留稳定任务编号'], ['受限提交', 'max_workers限执行', '批大小限Future数'],
  ['收敛结果', '读取future.result', '成功和异常都归档'], ['输出与退出', '主线程合并结果', '有失败则报告失败']
], ['取消Future不能杀死正在运行的线程；HTTP/SDK内部仍需自己的超时。']);

draw('ep05-shared-state-strategies', '多个worker返回消息，一个writer拥有结果', '共享状态首先看所有权；锁只保护无法去除的共享临界区。', 520,
  edge('M304 192H432') + edge('M304 364H368Q376 364 376 356V252Q376 244 384 244H432') +
  edge('M712 216H808') +
  box(32, 136, 272, 112, 'worker A', ['产出记录，不写结果']) +
  box(32, 308, 272, 112, 'worker B', ['错误也转成消息']) +
  box(432, 152, 280, 136, '有界结果队列', ['STOP在普通消息之后', 'get对应task_done'], 'info') +
  box(808, 152, 280, 136, '单writer', ['拥有结果与写入状态', '故障必须报告监督者'], 'good'),
  ['join只等待计数归零，不证明落盘成功；单writer不自动提供事务和跨进程去重。', '必须共享的“先检查再修改”需锁或唯一约束；frozen对象也可能含可变字段。']);

draw('ep06-event-loop-model', 'Task只在真正等待未完成对象时暂停', '就绪队列中的Task由事件循环推进；完成的任务进入结果收集，不回到创建。', 552,
  edge('M288 200H376') + edge('M676 178H792') +
  edge('M676 220H728Q736 220 736 228V380Q736 388 744 388H792') +
  edge('M936 256V286Q936 294 928 294H160Q152 294 152 286V256', true) +
  box(32, 136, 256, 120, '就绪Task队列', ['等待当前执行段结束']) +
  box(376, 136, 300, 120, '运行当前Task', ['立即就绪的await继续', 'CPU长循环会占住循环'], 'info') +
  box(792, 136, 296, 120, '未就绪I/O或定时器', ['暂停后推进其他Task', '事件就绪再回队列']) +
  box(792, 328, 296, 120, '完成或异常', ['交给等待方收集', '不再被调度'], 'good') +
  label(696, 158, '挂起') + label(744, 364, '返回') + label(408, 328, '事件就绪 → 再次调度'),
  ['示例sleep模拟非阻塞等待；真实请求还需连接池、超时和取消收尾。']);

draw('ep07-async-task-state-machine', '成功、失败、超时和取消是不同结果', '图中是业务任务状态，不等同于asyncio.Task内部的全部状态。', 680,
  edge('M264 214H400') + edge('M688 184H792') +
  edge('M688 220H736Q744 220 744 228V316Q744 324 752 324H792') +
  edge('M688 256H712Q720 256 720 264V448Q720 456 728 456H792') +
  edge('M544 280V508') +
  box(32, 152, 232, 112, 'pending', ['等待业务调度']) +
  box(400, 152, 288, 128, 'running', ['执行服务操作', '观察截止时间'], 'info') +
  box(792, 120, 296, 104, 'success', ['结果保存成功'], 'good') +
  box(792, 272, 296, 104, 'failed', ['普通异常，保留原因'], 'warn') +
  box(792, 408, 296, 104, 'timeout', ['等待超时，外部状态待查'], 'warn') +
  box(400, 508, 288, 88, 'cancelled', ['清理后继续传播取消']) +
  label(704, 166, '返回') + label(752, 308, '异常') + label(728, 440, '超时') + label(560, 448, '取消'),
  ['pending也可能取消；wait_for会等待取消清理，真实返回可能晚于配置超时。']);

fan('ep08-sync-blocking-boundary', '阻塞工作由专用执行边界承接', '事件循环保留调度能力；外层超时与执行真正停止是两件事。',
  ['异步主流程', '连接、调度与结果收集', '每类入口限制容量'], [
    ['阻塞I/O → 线程池', 'SDK内部另设超时', '取消等待不杀线程'],
    ['纯Python计算 → 进程池', '隔离计算与事件循环', '计入序列化与进程成本'],
    ['GPU → 推理worker', '复用模型、有界组批', '按任务编号回传结果']
  ], ['to_thread不是可强制取消的SDK；超时后重试前先查外部操作或幂等合同。']);

compare('ep09-processpool-cost-model', '多核收益要覆盖跨进程成本', '显式spawn让worker导入边界清楚；任务粒度决定成本能否摊薄。', [
  ['主进程：提交可序列化参数', '传路径与小参数，避免重复复制大数组', '模块顶层函数与__main__入口守卫'],
  ['worker：每进程独立执行', '纯Python计算可跨核心并行', '大模型和缓存通常按进程增加内存'],
  ['结果：传回小对象或输出路径', 'map按输入顺序消费，可能等慢项', '完成即消费可用as_completed'],
  ['对比：顺序、线程、进程', '测总耗时、CPU与总RSS', '原生库内部线程池可能已并行']
], ['示例只核对计算结果；Python3.14默认启动方式变化时也不依赖隐式fork。']);

draw('ep10-bounded-pipeline', '各阶段有界，失败消息直接传给writer', '监督者等上一阶段全部worker退出后，才向下一阶段发送每worker一个STOP。', 536,
  edge('M272 210H304') + edge('M544 210H576') + edge('M816 210H848') +
  box(32, 144, 240, 136, '扫描 / main', ['路径 → q1(max=3)', '2个转码worker']) +
  box(304, 144, 240, 136, '转码', ['成功 → AudioJob', '异常 → StageResult']) +
  box(576, 144, 240, 136, 'q2(max=2) → ASR', ['只处理AudioJob', '失败结果原样透传'], 'info') +
  box(848, 144, 240, 136, 'q3(max=8) → writer', ['收集成功与失败', '按任务编号对账'], 'good') +
  box(32, 344, 1056, 96, '停止顺序：转码全部退出 → 两个ASR各收STOP → ASR全部退出 → writer收STOP', ['不会因一个上游提前结束而丢失另一个worker的尾部结果']),
  ['这里只打印模拟结果；真实存储故障仍需监督者停止上游，不能让join永久等待。']);

compare('ep11-control-layer', '容量、速率和重试分别设预算', '8个50毫秒请求槽可产生约160次/秒，并不满足每分钟60次的配额。', [
  ['Semaphore：同时在途数', '限制连接与执行资源，不保证QPS', '等待退避时释放请求槽'],
  ['Pacer / 令牌桶：开始速率', '每次尝试重新经过速率门', '多进程、多机需共享提供方配额'],
  ['有界Queue：未执行积压', '队列满时让上游等待或拒绝', '还需限制消息字节和最久等待'],
  ['有限重试：失败路径流量', '错误分类、退避、次数与总截止时间', '副作用重放依赖服务端幂等合同']
], ['模拟临时错误可重试；真实超时可能已执行或已收费，先查状态再决定重放。']);

draw('ep12-file-checkpoint-state', '跳过需要同时满足输入未变与完成合同', '本例只统计字节数；真实产物还要验证存在、摘要和对应的配置版本。', 540,
  edge('M324 190H424') + edge('M324 232H368Q376 232 376 240V388Q376 396 384 396H424') +
  edge('M704 198H792') +
  box(32, 144, 292, 120, '发现输入', ['路径 + 内容SHA256', '与上次状态比较'], 'info') +
  box(424, 128, 280, 120, '新输入 / 内容变化', ['执行任务并再查摘要']) +
  box(792, 128, 296, 120, 'done或failed', ['主线程提交checkpoint', '失败下次可重试'], 'good') +
  box(424, 336, 664, 120, '已有done且SHA相同 → skipped', ['跳过是本次决定，不覆盖之前done的有效输入合同']),
  ['状态放在扫描树之外；临时JSON先flush/fsync，再os.replace，单进程维护。']);

row('ep13-ffmpeg-command-pool', '转换到临时输出，校验后排他发布', '规格由模型决定；本例PCM16、单声道、16kHz，不自动修改响度。', [
  ['只读原输入', '路径与规格检查', '保留来源身份'], ['受限命令池', 'ffmpeg独立进程', '超时与stderr'],
  ['检查临时WAV', '退出码与编码', '非空帧、声道、采样率'], ['发布独立结果', 'os.link拒绝覆盖', '失败临时目录清理']
], ['同名源路径用摘要区分；合并声道可能破坏分轨信息，需先确认模型输入合同。']);

draw('ep14-api-quota-ledger', '执行结果与费用确认分别记账', '请求超时只说明客户端没有确认结果，不能推断服务端没执行或没收费。', 544,
  edge('M328 208H424') + edge('M704 184H792') +
  edge('M704 228H736Q744 228 744 236V388Q744 396 752 396H792') +
  box(32, 144, 296, 128, '持久任务身份', ['输入摘要与配置版本', '提供方支持的幂等键']) +
  box(424, 144, 280, 128, '并发与速率门', ['pending → running', '调用带超时'], 'info') +
  box(792, 128, 296, 128, '结果已确认', ['done + 提供方回执', '账单确认费用'], 'good') +
  box(792, 336, 296, 128, '结果未知 / 超时', ['执行unknown', '费用unknown'], 'warn') +
  label(712, 166, '确认') + label(752, 378, '未确认'),
  ['本地去重无法保证服务端不重复扣费；先查提供方请求状态，再决定是否重试。']);

row('ep15-gpu-batch-queue', '最大组批等待只是延迟预算的一部分', '从第一项入批开始计时，达到batch_size或max_wait_ms即运行。', [
  ['入口队列', '限制项数与字节', '检查任务截止时间'], ['组批调度', 'batch_size上限', 'max_wait_ms等待'],
  ['常驻推理worker', '复用模型与显存', '结果数等于输入数'], ['按编号回传', '每项成功或失败', '监督worker异常']
], ['本页sleep只模拟推理；TaskGroup让模型异常传播并停止join，避免挂死。']);

row('ep16-realtime-latency-budget', '音频序号和截止时间贯穿传输链', '是否保留静音、如何分段与何时结束，都要遵循识别协议。', [
  ['采集一帧', 'sequence递增', '记录单调时刻'], ['受限缓冲 / 桥接', '容量与最久等待', '溢出记录音频缺口'],
  ['上传 / 识别', '检查连续性与过期', '按协议发送EOF'], ['结果汇聚', 'partial按句覆盖', 'final按句保存']
], ['示例只模拟协程采集与上传；无损模式过载应停会话或落盘，不能静默丢帧。']);

row('ep17-benchmark-evidence-loop', '从提交开始计时，排队也属于延迟', '100项固定输入、每37项一次失败：97成功、3失败，1与4worker使用同一口径。', [
  ['固定实验', '输入、环境与预热', '一次改变worker数'], ['实际执行', '线程池使用参数', '保存提交时刻'],
  ['统计全部请求', '成功 / 失败对账', 'P95最近秩法'], ['评估运行范围', '吞吐与错误率', '资源 / 到达模型']
], ['完成吞吐与成功吞吐分别给出；本机sleep示例不是网络或模型容量压测。']);

row('ep18-runtime-selection-future', '区分构建能力与进程当前GIL状态', 'Python3.14正式支持可选free-threaded构建；默认解释器仍启用GIL。', [
  ['定位CPU瓶颈', '纯Python或原生库', '排除I/O与GPU等待'], ['检查构建能力', 'Py_GIL_DISABLED', 'Python版本与平台'],
  ['导入实际依赖', '检查_is_gil_enabled', 'C扩展可能重启GIL'], ['同输入对比', '吞吐、RSS与竞态', '达标后逐步迁移']
], ['默认构建、进程池和free-threaded分别测量；运行时升级不替代业务同步与容量控制。']);
