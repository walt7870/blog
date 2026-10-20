import fs from 'node:fs';
const out = new URL('../../public/rust/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const t = (x, y, s, c = 's') => `<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
function save(id, title, subtitle, body, note) {
  fs.writeFileSync(new URL(id + '.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="580" viewBox="0 0 1120 580" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(subtitle)}</desc><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.focus{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#a)}</style></defs><rect width="1120" height="580" fill="white"/>${t(32,44,title,'h')}${t(32,82,subtitle)}${body}${t(32,544,note)}</svg>\n`);
}
const node = (x, y, title, lines, c = 'node', w = 304) => `<g data-node="${esc(title)}"><rect x="${x}" y="${y}" width="${w}" height="120" rx="6" class="${c}"/>${t(x+18,y+32,title,'n')}${lines.map((s,i)=>t(x+18,y+64+i*26,s)).join('')}</g>`;
const e = d => `<path class="edge" d="${d}"/>`;
function flow(id, title, sub, items, note, routes = 'snake') {
  const paths = routes === 'rows' ? ['M336 190H408','M712 190H784','M336 404H408','M712 404H784'] : ['M336 190H408','M712 190H784','M936 250V344','M784 404H712','M408 404H336'];
  const coords = routes === 'rows' ? [[32,130],[408,130],[784,130],[32,344],[408,344],[784,344]] : [[32,130],[408,130],[784,130],[784,344],[408,344],[32,344]];
  save(id,title,sub,paths.map(e).join('')+items.map((v,i)=>node(...coords[i],v[0],v.slice(1),i===1?'focus':i===4?'info':'node')).join(''),note);
}
flow('resource-delivery','Rust程序从输入到交付的阅读地图','以订单CLI和报价服务为主线，先建立规则，再选择运行环境。',[
 ['输入与语法','文本数量、整数金额','区分缺失、非法与溢出'],['资源归属','只读、修改、移交任务','所有权和借用限制别名'],['领域类型','私有字段与校验入口','状态、Trait与错误合同'],['运行与并发','同步线程或异步运行时','队列容量、取消与关闭'],['工程验证','固定工具链与依赖','规则、进程与HTTP测试'],['目标环境交付','CPU、系统库与配置','实机运行及恢复路径']],
 '语言保证、运行时行为和部署合同需要分别验证。');
flow('safety-boundaries','语言保证与工程责任的边界','同一个日志解析器仍需同时满足安全、资源和业务约束。',[
 ['安全接口','约束悬垂、越界与别名','底层unsafe仍需正确实现'],['显式资源模型','Box分配、Arc计数','锁等待与析构都有边界'],['运行表现','输入规模、算法与I/O','编译成功不证明低延迟'],['业务合同','幂等、事务与状态转换','数据竞争安全不等于正确'],['证据与验收','畸形输入、峰值与尾延迟','固定负载、平台和profile'],['采用与回退','先替换边界清晰的模块','保留对照与恢复方案']],
 '无通用GC不等于无分配、无泄漏或无暂停。');
save('stability-timeline','Rust稳定版与Edition节点','横轴按年份间隔布局；Edition名称并不等于实际发布日期。',
 '<path d="M90 292H1026" stroke="#a6b9ad" fill="none"/>'+[
 [120,'2015-05-15','1.0稳定版',182],[370,'2018-12-06','1.31 / Edition 2018',378],[590,'2021-10-21','1.56 / Edition 2021',182],[850,'2025-02-20','1.85 / Edition 2024',378]
 ].map(([x,date,label,y])=>`<circle cx="${x}" cy="292" r="5" fill="#397657"/><path d="M${x} 292V${y<292?y+18:y-26}" stroke="#a6b9ad"/>${t(x-66,y,date)}${t(x-66,y+28,label)}`).join(''),
 '同一依赖图可含不同Edition；编译器版本、Edition与MSRV需要分别维护。');
// Parallel rows describe distinct host environments, rather than an execution chain.
save('ecosystem-boundaries','运行目标决定库与系统依赖','Cargo管理crate；文件、网络、调度与ABI由具体环境提供。',
 node(32,130,'服务端 / CLI',['标准库与原生系统能力','TLS、数据库与系统运行库'],'focus',480)+
 node(608,130,'浏览器WASM',['JS与Web API提供宿主能力','不是原生文件和套接字'],'info',480)+
 node(32,344,'MCU / no_std',['PAC、HAL、启动与链接脚本','按板级验证中断和时序'],'node',480)+
 node(608,344,'跨语言FFI',['ABI、长度、编码与对象寿命','线程、释放及错误传播'],'node',480),
 '先在目标环境跑通最小I/O与错误路径，再比较生态和性能。');
flow('order-input-flow','订单金额的输入与计算边界','数量只允许1到99；本例以整数分计算，失败不伪装成零金额。',[
 ['外部文本','数量字符串、单价分','例如2件、每件1990分'],['解析与范围校验','文本转整数，数量1..99','空串、负数、文字拒绝'],['受控整数计算','checked_mul检测溢出','不依赖构建溢出行为'],['Result结果','Ok金额或明确错误','正常结果3980分'],['调用边界','成功输出，失败报告原因','传播不等于重试或补偿'],['后续扩展','税率、币种与舍入另建模','逐行处理不自动形成事务']],
 'Option表达缺失；Result表达需要解释原因的失败。');
flow('ownership-lifecycle','一个字符串的借用、修改与移交','同一资源的访问阶段依次结束；标注生命周期不能延长所有者寿命。',[
 ['draft拥有String','负责正常作用域退出释放','原文含首尾空格'],['只读借用 &str','读取与打印，不接管','最后一次使用后结束'],['独占修改 &mut','规范化缓冲区','与同位置活跃借用冲突'],['移动到job','新绑定接管资源','原draft不能继续读取'],['任务处理与释放','新所有者负责Drop','终止或遗忘可能不析构'],['共享是另一种模型','Rc/Arc管理共享分配','clone句柄不是深复制']],
 'Copy由类型实现决定，不按栈或堆判断；共享与独占引用有各自边界。');
flow('type-validation-boundary','在领域边界集中校验订单数量','私有字段限制外部构造，所有入口仍需遵守同一不变量。',[
 ['不可信输入','CLI参数、JSON或数据库','不是有类型就天然可信'],['Quantity::parse','u8解析与1..99检查','失败返回InvalidQuantity'],['领域核心','接收Quantity而非字符串','私有字段防外部直接构造'],['金额计算','checked_mul检测溢出','错误保留可匹配原因'],['协议适配','CLI退出码或HTTP响应','不把内部故障当输入错误'],['验证边界','非法输入、溢出、构造拒绝','故意改错计算应测试失败']],
 '类型保证仅与实际构造规则一样强，新增加载入口不能绕过校验。');
flow('bounded-work-lifecycle','有界队列中的接受、处理与关闭','通道容量控制排队，业务完成需等待处理结果。',[
 ['生产者提交','拥有任务数据后发送','发送端可能还有克隆'],['有界队列','容量2，满时等待或拒绝','出队空位不等于执行完成'],['工作任务','受控并发、区分两层错误','阻塞工作不占异步调度线程'],['停止接收新工作','关闭最后一个发送端','明确剩余任务处理策略'],['排空与等待','读完队列再join或await','异常退出记录未完成任务'],['副作用与恢复','取消不回滚外部操作','幂等键、查状态和恢复']],
 'Send/Sync防数据竞争；死锁、重复扣款和关闭恢复仍需工程合同。');
flow('toolchain-gates','固定输入后，对同一提交执行不同检查','检查各有职责；通过静态分析不替代行为与目标平台验证。',[
 ['工具链与解析图','精确版本、锁文件、目标','stable通道会继续移动'],['格式与静态检查','rustfmt、Clippy','规则升级要评估新增诊断'],['行为与文档','单元、集成和doc tests','all-targets不含文档测试'],['Release制品','目标ABI、系统库与CPU','构建成功不等于跨平台'],['实际环境验收','参数、响应、关闭与恢复','验证和发布对应同一产物'],['依赖与升级治理','扩展审计工具独立安装','锁文件不限制构建脚本权限']],
 '互斥feature按支持矩阵分组，不用all-features代替全部组合。');
flow('cli-contract','订单CLI的计算与进程合同','核心库不打印、不终止进程；入口负责协议适配。',[
 ['操作系统参数','args_os读取原始参数','拒绝缺少和多余参数'],['边界解析','UTF-8、整数与数量范围','单价允许零，数量不允许零'],['核心计算','Quantity与total_cents','乘法溢出为领域错误'],['输出与退出','成功stdout及退出0','错误stderr及退出2'],['实际进程测试','检查内容、流向和状态码','测试直接运行二进制'],['Release交付','目标环境实机运行','不以cargo run代替分发验收']],
 '规则测试保护金额；进程测试保护参数、输出与退出码。');
flow('diagnostic-path','按失败阶段收集Rust排错证据','先复现第一条相关诊断，再改变与原因对应的代码或环境。',[
 ['依赖与下载失败','版本、feature、TLS或MSRV','保留命令与锁文件'],['解析证据','cargo tree / metadata','不直接删除锁文件'],['定向修复与回归','审查解析变化和支持矩阵','重跑原失败命令'],['编译或运行失败','移动、借用、类型或panic','记录位置与触发输入'],['最小复现','check、错误解释和栈','先证明具体失败原因'],['修复及行为测试','资源归属、返回或错误传播','故意变异验证断言有效']],
 '图中两行分别表示依赖与代码路径；缓存清理不能修复类型或ABI合同。','rows');
flow('learning-delivery-route','以可独立交付的能力推进Rust学习','每阶段完成一个可观察结果，再决定是否引入更复杂机制。',[
 ['语法与结果','数量转换与金额计算','解释非法输入与溢出'],['资源与接口','借用、修改、移交数据','复现并修正编译反例'],['领域模型','私有构造、状态与错误','库外无法绕过校验'],['CLI交付','参数、输出、退出码','单元与真实进程测试'],['服务与任务','HTTP、有界队列、关闭','区分接受、完成和取消'],['选择目标环境','服务、WASM、FFI或MCU','按实际约束验证收益']],
 '克隆、Trait和异步由具体需要引入，不是必须同时掌握的清单。');
save('project-adapters','核心规则与不同协议入口的关系','报价为纯计算；创建订单的持久化与幂等需要新增合同。',
 e('M336 190H408')+e('M336 404H384V218H408')+e('M712 190H784')+e('M936 250V344')+
 node(32,130,'CLI入口',['参数解析与退出码','stdout和stderr合同'])+
 node(32,344,'HTTP入口',['Query解析与状态码','本机Axum报价服务'])+
 node(408,130,'共享领域核心',['Quantity校验、整数金额','不依赖打印或Web框架'],'focus')+
 node(784,130,'规则与协议验收',['非法值、正常值与溢出','实际进程和HTTP请求'],'info')+
 node(784,344,'目标环境发布',['同一产物、监听与配置','关闭、观测和恢复策略']),
 '添加存储、鉴权或任务队列时，不能把此纯计算示例当作生产订单系统。');
