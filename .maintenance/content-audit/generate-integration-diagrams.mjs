import fs from 'node:fs';

const out = new URL('../../public/ai/', import.meta.url);
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let id;
const text=(x,y,s,k='body',a='start')=>`<text x="${x}" y="${y}" class="${k}" text-anchor="${a}">${esc(s)}</text>`;
const rect=(x,y,w,h,k='box')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>`;
const box=(x,y,w,title,lines=[],k='box',h=120)=>rect(x,y,w,h,k)+text(x+16,y+32,title,'node')+lines.map((s,i)=>text(x+16,y+64+i*25,s)).join('');
const edge=(d,dash=false,open=false)=>`<path d="${d}" class="line${dash?' dash':''}" marker-end="url(#${id}-${open?'open':'arrow'})"/>`;
function draw(name,title,desc,h,body){id=name;fs.writeFileSync(new URL(name+'.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker><marker id="${id}-open" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#64748b"/></marker><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;fill:#172b3a}.head{font-size:27px;font-weight:700}.node{font-size:20px;font-weight:700}.body{font-size:17px;fill:#475569}.box{fill:white;stroke:#cbd5e1;stroke-width:2}.blue{fill:#eff6ff;stroke:#60a5fa;stroke-width:2}.green{fill:#ecfdf5;stroke:#14b8a6;stroke-width:2}.red{fill:#fff1f2;stroke:#e88191;stroke-width:2}.line{fill:none;stroke:#64748b;stroke-width:2}.dash{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="#f8fafc"/>${text(40,48,title,'head')}${text(40,80,desc)}${body()}</svg>\n`);}

draw('mcp-architecture','Host 管理模型与连接，Server 封装受控能力','协议客户端在宿主内部；业务系统继续检查身份、资源归属和动作是否允许。',560,()=>
  `<rect x="40" y="136" width="500" height="252" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="6 5"/>`+
  text(64,176,'Host：IDE / 桌面助手 / CLI','node')+
  edge('M288 272H328')+edge('M516 272H600')+edge('M800 272H880')+
  box(64,212,224,'模型与上下文',['接收用户任务','提出工具调用意图'])+
  box(328,212,188,'MCP Client',['一条协议连接','协商 / 发现 / 调用'],'blue')+
  box(600,212,200,'MCP Server',['校验参数与权限','裁剪结果与审计'],'blue')+
  box(880,212,200,'订单服务等',['会话身份与归属','受限 API / 数据'],'green')+
  text(40,448,'stdio：宿主启动本地子进程；进程权限来自启动环境。','node')+
  text(40,490,'Streamable HTTP：独立服务端点；传输鉴权、业务权限与模型上下文分别控制。')+
  text(40,532,'箭头表示调用方向，返回消息见时序图；连接成功不代表获准读取任意订单。')
);

draw('mcp-tool-call-sequence','一次订单查询：先协商和发现，再调用受控工具','2025-11-25版本的教学时序；展示正常连接路径，错误与超时按正文另行判断。',800,()=>{
  const xs=[180,550,940];
  let s=xs.map(x=>`<path d="M${x} 172V704" class="line dash"/>`).join('');
  const msg=(from,to,y,title,dash=false,open=false)=>edge(`M${from} ${y}H${to}`,dash,open)+text((from+to)/2,y-16,title,'body','middle');
  s+=msg(180,550,216,'initialize：版本与能力');
  s+=msg(550,180,272,'协商结果与 tools 能力',true);
  s+=msg(180,550,328,'notifications/initialized',true,true);
  s+=msg(180,550,384,'tools/list');
  s+=msg(550,180,440,'工具名与 inputSchema',true);
  s+=msg(180,550,496,'tools/call：订单 A102');
  s+=msg(550,940,552,'按当前身份鉴权并查询');
  s+=msg(940,550,608,'受限订单字段或业务错误',true);
  s+=msg(550,180,664,'result：检查 content / isError',true);
  s+=box(60,112,240,'Host 中的 Client',[],'box',60)+box(430,112,240,'MCP Server',[],'blue',60)+box(820,112,240,'订单业务服务',[],'green',60);
  return s+text(40,744,'实线为请求，虚线实心箭头为响应，虚线空心箭头为通知；时间从上到下。')+
    text(40,780,'Host 仍按策略决定是否执行及是否将结果交给模型；JSON-RPC id 不等于业务幂等键。');
});

draw('skill-layer','Skill 提供规程，工具和运行时落实动作边界','名称与描述用于发现，正文与参考按需读取；规程不是操作系统权限控制。',540,()=>
  edge('M250 240H310')+edge('M530 240H590')+edge('M810 240H870')+
  box(40,180,210,'任务与项目约定',['目录 / 业务边界','当前目标与授权'])+
  box(310,180,220,'匹配并加载 Skill',['触发范围 / 输入','步骤 / 禁区 / 验收'],'blue')+
  box(590,180,220,'Agent 组织执行',['调用本地工具','或经 MCP 接入能力'])+
  box(870,180,210,'结果与证据',['测试 / 页面 / 回读','未通过时恢复'],'green')+
  box(310,380,770,'执行端仍负责权限与状态',['脚本继承运行环境权限；写入授权、幂等和持久状态不能只写在Markdown里。'],'red',104)+
  text(40,520,'是否更稳定要用代表任务和失败用例验证；没有加载、误触发和命令过期都可能使规程失效。')
);

draw('skill-selection-boundaries','先判断任务与规则，再选择保存和执行方式','不同方式可组合：项目文档保存事实，Skill组织语义步骤，脚本或CI执行确定性门禁。',652,()=>
  edge('M260 310H314Q322 310 322 302V184Q322 176 330 176H392')+
  edge('M260 344H392')+
  edge('M260 378H306Q314 378 314 386V504Q314 512 322 512H392')+
  edge('M724 176H812')+edge('M724 344H812')+edge('M724 512H812')+
  box(40,280,220,'检查当前任务',['重复吗？规则稳定吗？','需要模型判断吗？'],'box',120)+
  box(392,120,332,'事实说明或偶发探索',['目录、技术栈、临时目标','还没有稳定的多步规程'])+
  box(812,120,268,'项目文档 / 提示',['保留事实与任务边界','探索后再决定是否固化'])+
  box(392,288,332,'重复且需要语义判断',['如文档机制审查、错误归因','步骤可描述，结果需要核验'],'blue')+
  box(812,288,268,'Skill',['窄触发、明确动作','代表任务验证效果'],'green')+
  box(392,456,332,'输入输出与步骤固定',['如死链扫描、格式校验','可直接确定通过或失败'])+
  box(812,456,268,'脚本 / CI',['自动执行并硬性拦截','Skill可调用但不替代它'])+
  text(40,624,'现成Skill也需审查脚本、联网与工具许可；规则数量不等于任务成功率。')
);

draw('skill-review-execution','文档修订规程：把动作与验收证据连接起来','以VitePress文章为例；构建、页面和引用分别验证，缺少环境时保留未验收项。',612,()=>
  edge('M260 220H312')+edge('M544 220H596')+edge('M828 220H880')+
  edge('M996 280V416Q996 424 988 424H836')+
  edge('M560 424H436Q428 424 428 416V280',true)+
  box(40,160,220,'项目事实',['目录 / 导航 / 命令','写作与资源规范'])+
  box(312,160,232,'按任务加载规程',['读全文与相邻入口','补机制、案例和图示'],'blue')+
  box(596,160,232,'执行工具检查',['构建与引用检查','双视口和图片放大'])+
  box(880,160,200,'对照验收',['正文、图、页面','与实际结果一致'],'green')+
  box(560,368,276,'失败或证据缺失',['定位具体文件或环境','修复后重验；不能假通过'],'red')+
  text(1012,340,'未通过')+
  text(40,528,'失败反馈回到修订环节；只有环境缺失时，记录缺口并保留已完成的工作。','node')+
  text(40,576,'目录与命令升级后也要更新Skill；“注意质量”无法替代可执行检查。')
);
