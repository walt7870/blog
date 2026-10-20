import fs from 'node:fs';

const output = new URL('../../public/electron/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const t = (x, y, s, cls='s') => `<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
const node = (x,y,w,h,title,lines=[],cls='node') => `<g data-node="${esc(title)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}"/>${t(x+18,y+33,title,'n')}${lines.map((s,i)=>t(x+18,y+64+i*27,s)).join('')}</g>`;
const edge = (d,dash=false) => `<path d="${d}" class="edge${dash?' dashed':''}"/>`;
function svg(name,title,desc,height,body,notes=[]) {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:#fff;stroke:#a6b9ad;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.warn{fill:#f8eef1;stroke:#ae7789;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#arrow)}.dashed{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${height}" fill="white"/>${t(32,44,title,'h')}${t(32,82,desc)}${body}${notes.map((s,i)=>t(32,height-28-(notes.length-i-1)*28,s)).join('')}</svg>\n`;
  fs.writeFileSync(new URL(`${name}.svg`,output),content);
}
const row = nodes => nodes.slice(0,-1).map((_,i)=>edge(`M${272+i*272} 212H${304+i*272}`)).join('')+nodes.map(([title,...lines],i)=>node(32+i*272,144,240,136,title,lines,i===3?'good':'node')).join('');

svg('startup-runtime','双击图标后，运行时按边界启动','操作系统启动可执行入口；页面就绪与编辑器业务就绪分别观测。',568,
  row([['操作系统入口','启动 DeskLab','加载 Electron Runtime'],['Main / app','执行 main.js','等待 whenReady'],['BrowserWindow','创建窗口与webContents','导航 index.html'],['Renderer','运行页面脚本','DOM / 数据 / 交互']])+
  node(32,352,512,112,'没有窗口：先查 Main',['入口路径、app ready、窗口创建异常'],'info')+
  node(576,352,512,112,'窗口白屏：再查页面',['导航失败、Preload、Renderer脚本与资源']),
  ['app.asar只是应用代码与资源；Chromium、Node.js和Helper也属于交付产物。']);

svg('process-model','按职责和 PID 观察应用','BrowserWindow是窗口对象，webContents管理页面，不与Renderer进程固定一一对应。',568,
  edge('M336 208H416')+edge('M720 208H816')+edge('M184 272V344')+
  node(32,136,304,136,'Main',['生命周期、窗口与IPC','避免同步扫描和长计算'],'info')+
  node(416,136,304,136,'Renderer',['DOM、CSS与页面状态','记录webContents ID与PID'])+
  node(816,136,272,136,'GPU',['合成、纹理与图形','结合画布和视频排查'])+
  node(32,344,688,112,'应用 Utility worker',['Main通过有界消息协议提交索引任务；退出与重试由监督者决定']),
  ['系统还可能创建网络等Utility服务；各进程工作集相加会重复计入共享页。']);

svg('ipc-file-boundary','Main 在读取文件前校验调用身份','Renderer只能发起固定业务动作；Preload不暴露任意channel或任意路径。',568,
  edge('M272 212H304')+edge('M544 212H576')+edge('M816 212H848')+edge('M696 280V376')+
  node(32,144,240,136,'Renderer 页面',['openDemoFile()','处理成功或拒绝'])+
  node(304,144,240,136,'Preload 隔离世界',['contextBridge','固定IPC channel'])+
  node(576,144,240,136,'Main 身份校验',['窗口 + 主frame','精确页面URL'],'info')+
  node(848,144,240,136,'固定文档',['只读 fixtures/demo.md','返回业务内容'],'good')+
  node(576,376,512,112,'身份不符 → 拒绝',['其他窗口、子frame或其他本地页面均不能获得读取能力'],'warn'),
  ['结果沿原调用链返回；缺失文件使invoke拒绝，不能将空文本当成成功。']);

svg('lifecycle-intent','窗口隐藏、销毁与应用退出分别建模','应用仍在运行时才可能重建窗口；退出前的异步收尾需要显式等待与截止时间。',724,
  t(32,124,'应用意图')+edge('M320 208H416')+edge('M704 208H800')+t(332,196,'确认退出')+t(716,196,'收尾完成')+
  node(32,152,288,112,'running',['托盘与后台任务仍可存在'])+
  node(416,152,288,112,'quitting',['确认保存，停止接收任务'],'info')+
  node(800,152,288,112,'exited',['Main与所持资源结束'],'good')+
  t(32,324,'窗口状态（应用仍在运行）')+
  edge('M264 442H416')+
  edge('M532 388V352Q532 344 524 344H156Q148 344 148 352V388',true)+
  edge('M152 500V560Q152 568 160 568H928Q936 568 936 560V500')+
  edge('M1040 500V604Q1040 612 1032 612H88Q80 612 80 604V500',true)+
  node(32,388,232,112,'visible',['窗口可见'])+
  node(416,388,232,112,'hidden',['close被阻止后隐藏'])+
  node(800,388,288,112,'destroyed',['窗口closed，清空引用'])+
  t(292,430,'隐藏')+t(284,374,'show')+t(376,556,'放行close → 销毁')+t(348,646,'activate → 重建（应用尚未退出）'),
  ['更新重启使用独立意图；系统强制结束可能跳过正常退出事件。']);

svg('forge-delivery-chain','Forge 各阶段产生不同的可验收结果','源码与锁文件固定后，按目标OS、CPU和格式生成分发物。',536,
  row([['Package','应用目录 + Runtime','重建依赖与应用签名'],['Make','ZIP / 安装器 / 发行包','按Maker处理分发要求'],['Publish','上传产物与元数据','核对公开下载内容'],['目标客户端','首次启动与核心操作','更新、重启与恢复']])+
  node(32,352,1056,96,'先固定二进制，再签名；平台要求贯穿Package与Make',['修改Fuse或替换原生模块后重新签名；上传完成还需验证公网地址与客户端行为'],'info'),
  ['macOS arm64 ZIP成功不等于Windows安装器、开发者签名或Apple公证通过。']);

svg('asar-file-boundary','归档中的逻辑路径与系统真实路径不同','ASAR可被提取，归档只读；它不提供代码保密或用户数据写入能力。',672,
  edge('M480 200H640')+edge('M480 400H640')+
  node(32,136,448,128,'Electron归档感知读取',['例如 fs.readFile读取模板','支持范围由具体API决定'])+
  node(640,136,448,128,'app.asar',['main.js、HTML、模板和生产依赖','操作系统眼中仍是单个文件'],'info')+
  node(32,336,448,128,'要求真实路径的调用',['原生库、外部工具、稳定文件访问','部分API临时解包有额外成本'])+
  node(640,336,448,128,'app.asar.unpacked',['显式解包必要的.node和动态库','与app.asar一起交付'])+
  node(32,528,1056,88,'用户文档 → 用户选择的位置；应用状态 → userData',['不写回__dirname；Fuse、完整性与签名不能替代文件授权'],'good'),
  ['解包规则从运行时需求反推；生产归档中排除测试夹具和长期服务端密钥。']);

svg('native-module-contract','先识别加载层，再决定是否 rebuild','纯JavaScript依赖与原生.node二进制的兼容性合同不同。',568,
  edge('M312 208H420')+edge('M700 208H808')+edge('M560 272V376')+edge('M700 432H808')+
  node(32,144,280,128,'宿主与模块',['OS / CPU / ABI','动态库、签名与打包路径'])+
  node(420,144,280,128,'逐层核对',['实际运行时版本输出','file与加载错误'],'info')+
  node(808,144,280,128,'维度匹配',['进入加载和功能验证','仍需在Package中复验'],'good')+
  node(420,376,280,112,'ABI 不同',['为目标Electron rebuild'])+
  node(808,376,280,112,'编译出现 API 错误',['升级依赖或调整宿主','反复rebuild不修复源码'],'warn'),
  ['N-API减少部分ABI变化；OS、架构、动态库与分发路径仍需独立匹配。']);

svg('signing-trust-chain','macOS 的签名、公证与放行各有结果','二进制和Fuse固定之后开始；验证最终下载分发物，而非只看构建目录。',536,
  row([['代码签名','Developer ID身份','codesign结构验证'],['Apple 公证','提交并保留请求ID','等待最终 Accepted'],['附加票据','支持的.app / DMG等','xcrun stapler validate'],['系统评估','spctl / Gatekeeper','目标机器首次打开']])+
  node(32,352,1056,96,'ZIP不能直接stapling：先处理其中.app，再重新压缩和计算摘要',['Windows另查EXE/MSI签名、时间戳与信誉；签名有效不保证SmartScreen立刻放行'],'info'),
  ['公证提交成功不等于被接受；修改已签名二进制后重新签名与验证。']);

svg('update-lifecycle','候选匹配后，更新仍有等待与失败分支','此处downloaded包含摘要和签名检查完成，不直接对应某个更新库的同名事件。',648,
  edge('M272 212H304')+edge('M544 212H576')+edge('M816 212H848')+
  edge('M152 280V392')+edge('M696 280V332Q696 340 688 340H432Q424 340 424 348V392')+
  edge('M968 280V392')+edge('M848 448H816')+
  node(32,144,240,136,'checking',['OS / CPU / channel','最高兼容版本'],'info')+
  node(304,144,240,136,'available',['有候选，决定下载','记录artifact身份'])+
  node(576,144,240,136,'downloading',['长度与SHA-256','验证平台签名'])+
  node(848,144,240,136,'downloaded',['校验完成','稍后安装时停留'],'good')+
  node(32,392,240,112,'not-available',['无候选，继续使用'])+
  node(304,392,240,112,'failed',['保留原因与重试计划'],'warn')+
  node(576,392,240,112,'restarting',['启动新版本并验收'])+
  node(848,392,240,112,'installing',['用户确认、保存与收尾'])+
  t(48,324,'无候选')+t(456,328,'下载或校验失败')+t(984,340,'确认')+t(32,572,'检查、下载、校验或安装失败均进入failed；按原因决定下一次重试。'),
  ['元数据也需可信；二进制可回退不代表数据库和配置迁移可逆。']);

svg('performance-clock-boundary','Main 与 Renderer 各自记录阶段耗时','两个进程的performance.now原点不同；不能直接相减得到跨进程延迟。',624,
  t(32,124,'Main 单调时钟')+edge('M336 208H408')+edge('M712 208H784')+
  node(32,144,304,128,'入口开始',['建立Main计时原点'])+
  node(408,144,304,128,'app ready',['平台准备完成'])+
  node(784,144,304,128,'创建与导航',['记录窗口及导航事件'],'info')+
  t(32,324,'Renderer 单调时钟')+edge('M336 408H408')+edge('M712 408H784')+
  node(32,344,304,128,'脚本启动',['页面建立独立计时原点'])+
  node(408,344,304,128,'数据就绪',['文档与插件加载完成'])+
  node(784,344,304,128,'交互可用',['实际可输入和保存'],'good')+
  t(32,536,'通过受控IPC汇报各自阶段时长；跨进程完整计时需明确统一的测量定义。'),
  ['固定输入、版本和冷/热启动条件，重复取样；内存工作集不可简单相加去重。']);
