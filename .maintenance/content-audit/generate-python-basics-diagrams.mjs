import fs from 'node:fs';

const out = new URL('../../public/python/', import.meta.url);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, s, cls = 's') => `<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
const box = (x, y, w, h, title, lines = [], cls = 'node') => `<rect data-node="${esc(title)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}"/>${text(x + 20, y + 36, title, 'n')}${lines.map((s, i) => text(x + 20, y + 68 + i * 28, s)).join('')}`;
const edge = (d, dashed = false) => `<path d="${d}" class="edge${dashed ? ' dashed' : ''}"/>`;
const label = (x, y, s) => `<rect x="${x - 8}" y="${y - 22}" width="${s.length * 18 + 16}" height="30" fill="#fff"/>${text(x, y, s)}`;
function draw(name, title, desc, h, body, notes = []) {
  const footer = notes.map((s, i) => text(32, h - 48 - (notes.length - 1 - i) * 30, s)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${name}-title ${name}-desc"><title id="${name}-title">${esc(title)}</title><desc id="${name}-desc">${esc(desc)}</desc><defs><marker id="${name}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;fill:#253c30;letter-spacing:0}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:#fff;stroke:#a6b9ad;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.warn{fill:#f8eef1;stroke:#ae7789;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${name}-arrow)}.dashed{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="white"/>${text(32, 44, title, 'h')}${text(32, 82, desc)}${body}${footer}</svg>\n`;
  fs.writeFileSync(new URL(`${name}.svg`, out), svg);
}
function pipeline(name, title, desc, nodes, notes) {
  const width = 240, gap = 32, y = 144, height = 144;
  const arrows = nodes.slice(0, -1).map((_, i) => edge(`M${32 + i * (width + gap) + width} ${y + 72}H${32 + (i + 1) * (width + gap)}`)).join('');
  const boxes = nodes.map(([head, ...lines], i) => box(32 + i * (width + gap), y, width, height, head, lines, i === nodes.length - 1 ? 'good' : 'node')).join('');
  draw(name, title, desc, 440, arrows + boxes, notes);
}
function fork(name, title, desc, root, upper, lower, labels, notes) {
  draw(name, title, desc, 520,
    edge('M364 180H708') + edge('M364 220H492Q500 220 500 228V346Q500 354 508 354H708') +
    box(32, 140, 332, 112, root[0], root.slice(1), 'info') +
    box(708, 128, 380, 116, upper[0], upper.slice(1), 'good') +
    box(708, 296, 380, 116, lower[0], lower.slice(1), 'warn') +
    label(440, 166, labels[0]) + label(532, 340, labels[1]), notes);
}

draw('customer-record-shape', '一张客户表，对应客户字典的列表', '列名变成字段键，行变成一条记录；列表索引表示位置，不是客户身份。', 540,
  edge('M332 190H432') + edge('M332 350H432') +
  box(32, 138, 300, 116, '表格第 1 行', ['李雷｜138…｜上海']) +
  box(32, 298, 300, 116, '表格第 2 行', ['韩梅梅｜空｜杭州']) +
  box(432, 138, 656, 116, 'customers[0]：dict', ['name → 李雷　phone → "138…"　city → 上海'], 'good') +
  box(432, 298, 656, 116, 'customers[1]：dict', ['name → 韩梅梅　phone → ""　city → 杭州'], 'good'),
  ['customers 是 list；一行字典中的 name、phone、city 是字段名。', '对账按记录数；稳定身份应使用客户编号，不能依赖当前排序后的索引。']);

draw('script-path-boundaries', '相对路径的起点，决定程序寻找哪份文件', '同一命令从不同目录运行时，工作目录可变；脚本目录由脚本文件位置确定。', 540,
  edge('M416 194H568') + edge('M416 362H568') +
  box(32, 138, 384, 116, 'Path("customers.csv")', ['起点：Path.cwd()']) +
  box(568, 138, 520, 116, '终端在 /tmp 运行', ['寻找 /tmp/customers.csv'], 'info') +
  box(32, 306, 384, 116, 'Path(__file__).resolve().parent', ['起点：脚本所在目录']) +
  box(568, 306, 520, 116, '脚本位于 /work/tool/', ['寻找 /work/tool/customers.csv'], 'good'),
  ['示例命令：python3 /work/tool/hello_customer.py', '解释器路径是另一个维度；先确认由哪个 Python 运行，再核对数据路径。']);

pipeline('field-conversion-contract', '类型转换之前，先确认字段合同', '手机号保留文本；计算字段按口径转换，空值与零分开处理。', [
  ['原始文本', 'phone = "0138…"', 'amount = "1200.50"'],
  ['字段校验', '必需键、格式、空值', '非法值有明确错误'],
  ['业务类型', '手机号：str', '金额：Decimal / 分'],
  ['规则与输出', '数值比较、求和', '展示与缺失报告']
], ['Decimal 从原始字符串构造；bool("false") 为 True，文本布尔值需要显式映射。']);

draw('customer-rule-branches', '独立标签可以同时命中，联系状态只能二选一', '示例：韩梅梅缺手机号且 12 天未联系，应保留两个标签。', 548,
  edge('M328 180H424') + edge('M328 220H364Q372 220 372 228V384Q372 392 380 392H424') +
  edge('M708 368H792') + edge('M708 412H744Q752 412 752 420V468Q752 476 760 476H792') +
  box(32, 148, 296, 112, '一位客户', ['同一份字段输入'], 'info') +
  box(424, 128, 284, 116, '独立 if：缺手机号', ['命中 → 资料待补'], 'good') +
  box(424, 336, 284, 112, '互斥判断：天数 > 7', ['只选择一个联系状态']) +
  box(792, 320, 296, 84, '需要回访', [], 'good') +
  box(792, 440, 296, 72, '联系正常') +
  label(732, 350, '是') + label(758, 460, '否') +
  text(32, 298, '高价值也可独立判断。') + text(32, 330, '勿用elif排除其他标签。'), []);

fork('batch-classification', '循环让每条输入恰好进入一个分类', '计数器和结果列表在循环外初始化；本例没有静默跳过的记录。',
  ['逐条检查客户', '手机号和城市都存在？'],
  ['完整：complete_count += 1', '示例：李雷 1 位'],
  ['待补：incomplete.append(row)', '示例：韩梅梅、王芳、赵强'],
  ['是', '否'], ['结束对账：输入 4 位 = 完整 1 位 + 待补 3 位。']);

pipeline('source-normalization', '清洗来源时，保留原值与标准分类', '只应用明确约定的归并规则，未知值和空值分开处理。', [
  ['原始值', '" Web "', '"展会-上海"'],
  ['基础清洗', 'strip → lower', '只认展会-前缀'],
  ['别名映射', 'web → 官网', '展会-上海 → 展会'],
  ['标准值与原值', '未知 → 其他', '空白 → 来源待补']
], ['不要删除所有中间空格和横线；活动编号或客户名称中可能包含有意义的字符。']);

draw('contact-date-decision', '联系日期要区分缺失、非法、未来与正常日期', '业务日期固定为 2026-08-02；本课按自然日计算，不按精确 24 小时计算。', 552,
  edge('M324 190H408') + edge('M324 230V384Q324 392 332 392H408') +
  edge('M688 190H792') + edge('M688 230V384Q688 392 696 392H792') +
  box(32, 144, 292, 116, '日期原始文本', ['先确认类型和格式'], 'info') +
  box(408, 144, 280, 116, '解析为 date', ['计算 today - contact']) +
  box(408, 336, 280, 116, '不参与天数统计', ['缺失或解析失败'], 'warn') +
  box(792, 144, 296, 116, '天数 ≥ 0', ['>14：超期', '0…14：正常'], 'good') +
  box(792, 336, 296, 116, '天数 < 0', ['未来日期：需要核对'], 'warn') +
  label(340, 176, '有效') + label(144, 368, '无效 / 空白') +
  label(708, 176, '非负') + label(708, 368, '负数'),
  ['边界：7月19日为14天，7月18日为15天；8月3日不能当成联系正常。']);

pipeline('function-rule-contract', '规则函数返回判断，调用方决定结果去向', '同一函数可用于名单筛选与日报，不把文件读写混进单条规则。', [
  ['输入记录', '姓名、手机号', '联系天数已校验'],
  ['纯规则函数', 'is_incomplete', 'need_followup'],
  ['明确返回值', 'True / False', '不修改原始记录'],
  ['调用方组织', '筛选异常名单', '统计或格式化展示']
], ['print 只展示文本，不等于 return；缺少联系天数不能默认成刚联系过。']);

draw('module-dependency', '入口组织任务，规则与展示分别负责自己的边界', '这是依赖树：main 导入两个模块；checks 和 report 不导入 main。', 496,
  edge('M480 232V272Q480 280 472 280H296Q288 280 288 288V328') +
  edge('M640 232V272Q640 280 648 280H824Q832 280 832 288V328') +
  box(376, 124, 368, 108, 'main.py', ['筛选后调用展示函数'], 'info') +
  box(64, 328, 448, 112, 'checks.py', ['missing_phone：返回布尔值'], 'good') +
  box(608, 328, 448, 112, 'report.py', ['print_missing：打印待补名单']),
  []);

pipeline('csv-validation-path', '缺列是批级错误，缺值是行级检查结果', '原始客户表保持不变，另写待补信息名单。', [
  ['读 CSV', 'utf-8-sig', 'newline=""'],
  ['先校验表头', 'name / phone / city', '缺列立即终止'],
  ['逐行检查', '空手机号或城市', '保留姓名和缺项'],
  ['写结果 CSV', '独立结果文件', '两行待补信息']
], ['合法表头但没有数据行是正常空表；零字节文件缺表头，不能当成同一种情况。']);

pipeline('json-response-contract', 'JSON 语法成功，不代表客户响应合同成立', '显式校验成功状态、对象与数组，避免接口变更被误判为空数据。', [
  ['JSON 文本', 'json.loads', '格式错则解析失败'],
  ['顶层成功对象', 'dict 且 status=ok', '失败响应停止处理'],
  ['data.customers', 'data 必须是对象', 'customers 必须是数组'],
  ['客户记录', '逐项校验文本姓名', '再做手机号检查']
], ['customers=[] 可以是正常零客户；字段缺失、null 或对象都不等同于空数组。']);

pipeline('table-health-gates', '字段映射在前，空值与疑似重复检查在后', '表头名称对齐不代表数据正确；重复键需要结合业务确认。', [
  ['外部行数据', '姓名 / 电话 / 城市', 'CSV或xlsx读取器'],
  ['检查并映射', '姓名 → name', '电话 → phone'],
  ['记录质量检查', '空手机号：1行', '疑似重复：1行'],
  ['核对清单', '保留记录和原因', '不自动删除客户']
], ['本例用姓名+电话标记疑似重复；正式客户身份应优先用稳定客户编号。']);

draw('group-summary-grain', '先明确统计单位，再选择分组字段', '三条唯一客户记录，可分别按来源、城市和负责人统计；三份统计不互相相加。', 520,
  edge('M376 174H624') + edge('M376 210H480Q488 210 488 218V314Q488 322 496 322H624') +
  edge('M376 246H432Q440 246 440 254V438Q440 446 448 446H624') +
  box(32, 144, 344, 132, '输入：3 位唯一客户', ['每行代表1位客户', '重复行会被重复计数'], 'info') +
  box(624, 128, 464, 96, '按来源', ['官网 2 + 展会 1 = 3'], 'good') +
  box(624, 272, 464, 96, '按城市', ['上海 2 + 杭州 1 = 3'], 'good') +
  box(624, 416, 464, 80, '按负责人：张三 2 + 李四 1', []), []);

draw('order-amount-status', '同一个金额字段，必须先定义业务含义', '本例 amount 为净实收：收款减已完成退款；限无赠品且已完成对账的快照。', 520,
  box(32, 132, 1056, 80, '净实收 ≠ 商品原价 ≠ 应付金额', [], 'info') +
  box(32, 256, 320, 120, 'paid', ['净实收应 > 0', '0或负数：待核对'], 'good') +
  box(400, 256, 320, 120, 'cancelled', ['净实收应 = 0', '正实收：核对退款'], 'warn') +
  box(768, 256, 320, 120, '未知状态', ['加入异常清单', '不静默排除'], 'warn'),
  ['取消订单可以保留商品原价；退款处理中也不代表已经退净，需结合时点与退款状态。', '规则仅生成核对项，不自动改订单、不自动发退款。']);

draw('daily-report-composition', '日报模板接收已计算指标，不替代统计过程', '本课传入固定教学指标18、3、5、2，只演示格式化与文件输出。', 520,
  edge('M352 190H444') + edge('M352 358H392Q400 358 400 350V238Q400 230 408 230H444') +
  edge('M732 210H816') +
  box(32, 136, 320, 120, '客户指标', ['新增18、待补3、回访5', '口径可重叠']) +
  box(32, 304, 320, 112, '订单指标', ['异常订单2', '附异常明细去向']) +
  box(444, 152, 288, 120, 'build_report(summary)', ['只负责文本模板', '不读原始表'], 'info') +
  box(816, 152, 272, 120, 'outputs/日报.txt', ['日期、批次、内容', '写入后核对指标'], 'good'),
  ['新增客户、待补与回访不是互斥人群，不能把四个数相加当作总客户数。']);

draw('venv-interpreter-contract', '安装包和运行工具，使用同一个项目解释器', 'venv 隔离 Python 包目录，不会固定操作系统、驱动或系统动态库。', 516,
  edge('M344 192H448') + edge('M720 176H816') +
  edge('M720 216H760Q768 216 768 224V372Q768 380 776 380H816') +
  box(32, 140, 312, 112, '已安装的 Python', ['python3 -m venv .venv']) +
  box(448, 132, 272, 128, '项目 .venv', ['独立包目录', '记录Python版本'], 'info') +
  box(816, 124, 272, 116, '安装依赖', ['环境Python -m pip', '只安装第三方依赖']) +
  box(816, 324, 272, 116, '运行入口', ['环境Python run.py', '输出路径检查'], 'good'),
  ['标准库csv、json、logging不需要pip安装；跨电脑交付环境说明，不直接复制.venv。']);

pipeline('traceback-reading-path', '错误阅读从异常类型回到输入合同', '失败代码行是定位入口，根因可能是上游数据格式与约定不一致。', [
  ['看最后一行', 'ValueError', '不能转成整数'],
  ['找业务代码帧', 'order_check.py', 'amount = int(text)'],
  ['核对原始输入', '"500元" 而非 "500"', '是否允许附加单位'],
  ['最小复现验证', '单条输入重现', '修正规则后再回归']
], ['异常链要读前后两段；记录命令、行号和类型，分享前去除客户数据与凭证。']);

fork('row-error-boundary', '是否继续处理，取决于错误影响的范围', '预期的行级问题记录原因；无法确认整批结果时报告失败。',
  ['遇到错误', '能归因到单条记录？'],
  ['行级：记录原因，继续下一行', '非法日期、日期缺失', '对账成功行与失败行'],
  ['批级：停止并返回失败', '文件读不到、整列缺失', '结果文件无法写入'],
  ['是', '影响整批'], ['只捕获已预期的异常；except: pass 会吞掉证据与编程错误。']);

pipeline('run-log-evidence', '日志把一次运行串成可追溯的记录', '不记录完整客户姓名和电话；用行号或内部编号关联异常明细。', [
  ['INFO 开始', '输入记录数：2', '时间与运行批次'],
  ['INFO 成功', '行号1处理完成', '累计成功：1'],
  ['WARNING 跳过', '行号2缺姓名', '累计跳过：1'],
  ['INFO 批次结束', '成功1 + 跳过1 = 2', '输出或失败去向']
], ['ERROR级别不会自动返回非零退出码；整批失败仍需抛异常或明确退出。']);

pipeline('api-response-gates', '客户 API 的成功，要逐层判断', '单页GET示意；分页游标和终止条件要按具体接口另行实现。', [
  ['网络请求', 'HTTPS与认证头', '设置阻塞操作超时'],
  ['HTTP 状态', '401认证 / 429限流', '5xx服务错误'],
  ['JSON与业务合同', '解析对象与客户数组', '识别业务失败状态'],
  ['进入客户规则', '校验记录和字段', '分页完成再汇总']
], ['HTTP 200不保证业务成功；错误不能当空数组，凭证不能写入日志或源码。']);

draw('batch-file-boundaries', '批处理读取原件，结果写到另一个目录', '按稳定原文件名派生目标名；排他创建防止重复运行静默覆盖。', 516,
  edge('M368 190H488') + edge('M368 358H488') +
  box(32, 136, 336, 112, 'inputs/shanghai.txt', ['只读UTF-8文本原件']) +
  box(32, 304, 336, 112, 'inputs/hangzhou.txt', ['不改名、不重写内容']) +
  box(488, 136, 600, 112, 'outputs/report-shanghai.txt', ['第一次用x创建；已有目标就报错'], 'good') +
  box(488, 304, 600, 112, 'outputs/report-hangzhou.txt', ['复制文本；本例不汇总多份内容'], 'good'),
  ['空输入明确报错；中断可留下部分结果，重跑前先核对，不假装整批事务已回滚。']);

pipeline('cli-path-contract', '参数决定本次路径，规则留在程序里', '本例相对路径以终端当前目录为准，输出与原件必须分开。', [
  ['解析参数', '--input / --output', '--help不读数据'],
  ['校验路径', '拒绝相同实际文件', '解析符号与硬链接'],
  ['读取与检查', '先检查表头', '只查空手机号'],
  ['写结果', '默认x：不覆盖', '--overwrite显式替换']
], ['输入三位客户得到韩梅梅一行；城市检查并未实现在这份参数版工具中。']);

pipeline('delivery-validation-gates', '文件齐全之后，还要实际运行并核对结果', '结构检查器只读现有目录，不创建样例，不把缺失项变成通过项。', [
  ['准备交付目录', '真实run.py', 'README与样例'],
  ['只读结构检查', '文件必须is_file', '缺项退出码1'],
  ['新环境运行', '固定输入与命令', '核对真实结果'],
  ['边界验收', '缺列、空表、重跑', '确认原输入不变']
], ['outputs可在首次运行时创建；存在run.py不等于规则正确或工具已经通过验收。']);

draw('customer-object-ownership', '类定义共享方法，实例保留各自字段', '示例字段在__init__中赋给self，不使用共享可变类属性保存客户状态。', 516,
  edge('M472 240V280Q472 288 464 288H296Q288 288 288 296V328', true) +
  edge('M648 240V280Q648 288 656 288H824Q832 288 832 296V328', true) +
  box(360, 124, 400, 116, 'Customer 类', ['__init__ / is_incomplete / label'], 'info') +
  box(64, 328, 448, 116, 'han_meimei 实例', ['name=韩梅梅　phone=""', 'source=展会'], 'good') +
  box(608, 328, 448, 116, 'li_lei 实例', ['name=李雷　phone="138…"', 'source=官网'], 'good'), []);

draw('python-basics-map', '客户工具的能力地图：运行、规则、连接与交付', '同一条业务线贯穿学习：客户名单 → 缺失检查 → 汇总与日报 → 可复现工具。', 560,
  edge('M344 196H420') + edge('M732 196H808') +
  edge('M936 272V328') + edge('M808 400H732') + edge('M420 400H344') +
  box(32, 128, 312, 144, '运行入口 EP01–04', ['解释器与路径', '变量、类型、列表与字典']) +
  box(420, 128, 312, 144, '批量规则 EP05–08', ['条件、循环、清洗', '金额与日期边界']) +
  box(808, 128, 280, 144, '组织 EP09–10', ['函数与模块', '类在EP25展开']) +
  box(808, 328, 280, 144, '连接 EP11–16', ['CSV与JSON', '体检、统计、日报']) +
  box(420, 328, 312, 144, '稳健运行 EP17–20', ['环境、报错、异常、日志', '每条输入有可追溯去向'], 'info') +
  box(32, 328, 312, 144, '交付 EP21–26', ['API、文件、参数', '样例与验收闭环'], 'good'),
  ['异常、日志与验证应贯穿全程；箭头表示课程阅读顺序，不是只能最后才处理异常。']);

draw('python-tool-delivery-loop', '先让最小工具结果可信，再逐条增加能力', '第一版只查手机号；每次扩展都增加输入样例、预期结果和失败说明。', 528,
  edge('M272 212H304') + edge('M544 212H576') + edge('M816 212H848') +
  edge('M968 284V340Q968 348 960 348H160Q152 348 152 340V284', true) +
  box(32, 140, 240, 144, '固定输入', ['三位客户', '韩梅梅缺手机号']) +
  box(304, 140, 240, 144, '执行参数版工具', ['独立outputs目录', '保留原始CSV']) +
  box(576, 140, 240, 144, '对照预期', ['一行待补', '缺列必须失败'], 'info') +
  box(848, 140, 240, 144, '新环境交付', ['按README重跑', '目录与结果都检查'], 'good') +
  label(384, 380, '新增规则后，补样例再验证'),
  ['恢复输入应恢复结果；变更规则应有新的预期，不能只看程序退出码为0。']);
