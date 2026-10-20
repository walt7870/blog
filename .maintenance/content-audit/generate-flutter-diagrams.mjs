import fs from 'node:fs';
const out=new URL('../../public/flutter/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const t=(x,y,s,c='s')=>`<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
const n=(x,y,title,a,b,c='node',w=304)=>`<g data-node="${esc(title)}"><rect x="${x}" y="${y}" width="${w}" height="120" rx="6" class="${c}"/>${t(x+18,y+32,title,'n')}${t(x+18,y+64,a)}${t(x+18,y+90,b)}</g>`;
const e=d=>`<path d="${d}" class="edge"/>`;
function svg(id,title,sub,body,note){fs.writeFileSync(new URL(id+'.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="580" viewBox="0 0 1120 580" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(sub)}</desc><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.focus{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#a)}</style></defs><rect width="1120" height="580" fill="white"/>${t(32,44,title,'h')}${t(32,82,sub)}${body}${t(32,544,note)}</svg>\n`);}
function chain(id,title,sub,items,note,rows=false){const coords=rows?[[32,130],[408,130],[784,130],[32,344],[408,344],[784,344]]:[[32,130],[408,130],[784,130],[784,344],[408,344],[32,344]];const paths=rows?['M336 190H408','M712 190H784','M336 404H408','M712 404H784']:['M336 190H408','M712 190H784','M936 250V344','M784 404H712','M408 404H336'];svg(id,title,sub,paths.map(e).join('')+items.map((v,i)=>n(...coords[i],...v,i===1?'focus':i===4?'info':'node')).join(''),note);}
chain('app-boundaries','待办操作从页面到数据，再回到屏幕','共享UI不等于抹去数据、资源和平台边界。',[
 ['用户操作','点击完成、刷新或重试','页面状态表达当前动作'],['状态与请求','明确Future与任务归属','不在build中创建请求'],['Repository边界','接口、缓存、解析与错误','账号隔离和业务规则'],['状态结果','成功、空、失败或冲突','旧响应不能覆盖新查询'],['框架与屏幕','配置更新、布局与绘制','只处理需要变化的工作'],['实际平台验收','权限、返回、性能与发布','各目标系统分别验证']],
 '总览定位责任；机制、动手、实战、交付与排错分别深入。');
svg('render-lifecycle','配置与运行时对象不是一一对应','先协调Widget配置，再按变化执行布局和绘制。',
 e('M336 190H408')+e('M712 190H784')+e('M936 250V344')+e('M784 404H712')+
 n(32,130,'Widget配置','不可变参数与组件组合','build可以频繁调用')+
 n(408,130,'Element与State','保留位置、依赖和状态','按类型与Key协调身份','focus')+
 n(784,130,'RenderObject','部分Element关联渲染对象','约束、尺寸、布局与绘制')+
 n(784,344,'引擎与宿主','合成、栅格与平台呈现','线程组织依版本与平台')+
 n(408,344,'真实帧证据','UI与Raster轨迹及设备','重建不等于整屏重绘','info')+
 t(32,378,'业务事件 → 状态赋值','n')+t(32,414,'setState标记需要更新')+t(32,446,'异步回调先确认身份与寿命'),
 '不是每个Widget都有独立RenderObject，const也不是永不重建的保证。');
svg('layout-constraints','长标题如何获得有限宽度并完成布局','父级传约束，子级返回尺寸，父级安排位置。',
 e('M336 190H408')+e('M712 190H784')+e('M936 250V344')+e('M784 404H712')+
 n(32,130,'屏幕与父容器','有限可用宽度、内边距','键盘与字号会改变需求')+
 n(408,130,'Row分配剩余宽度','图标和按钮占用一部分','Expanded约束标题区域','focus')+
 n(784,130,'Text在约束内排版','换行或有意截断摘要','关键金额不能静默隐藏')+
 n(784,344,'返回Size与定位','子级给出合法尺寸','父级决定最终摆放位置')+
 n(408,344,'滚动与无限约束','竖向滚动内无有限剩余高','不能照搬Column+Expanded','info')+
 t(32,380,'复验输入','n')+t(32,416,'长文本、字号放大、横屏')+t(32,448,'定位约束来源后再调整'),
 '不是给所有组件补固定高度；滚动场景可改用适合的sliver结构。');
svg('request-lifecycle','请求Future绑定页面生命周期','普通重建消费原Future，显式重试才替换它。',
 e('M336 190H408')+e('M712 190H784')+e('M936 250V344')+e('M784 404H712')+
 n(32,130,'初始化或数据源变化','initState / didUpdateWidget','创建并保存请求Future')+
 n(408,130,'等待结果','build只消费保存的Future','父级重建不重复调用','focus')+
 n(784,130,'完成并展示','成功列表、空或错误','检查当前Future身份')+
 n(784,344,'用户明确重试','替换Future并显示进度','测试调用次数和状态')+
 n(408,344,'销毁或替换之后','旧Future结果不更新界面','底层工作不自动取消','info')+
 t(32,378,'验证完成顺序','n')+t(32,414,'用Completer控制成功与失败')+t(32,446,'A晚于B返回仍显示B'),
 'FutureBuilder的结果隔离不等于取消HTTP，更不等于回滚服务端写入。');
chain('cache-sync-boundaries','离线编辑与服务器事实的同步边界','账号A离线修改任务42，恢复网络后仍可能遇到版本冲突。',[
 ['本地编辑','账号、任务ID、基准版本','草稿与操作ID原子保存'],['持久待同步队列','记录待同步与结果未知','按受控并发发送'],['服务端条件更新','校验版本、权限与幂等','不是客户端禁用按钮就够'],['确定结果或冲突','成功确认、版本冲突','超时先按操作ID查状态'],['更新本地与页面','确认后更新版本和队列','冲突保留两方内容'],['账号与进程边界','隔离旧缓存和请求','重启恢复未确认操作']],
 '示意策略需要本地事务与服务端合同配合，内存状态不能承诺掉电恢复。');
chain('release-gates','同一应用版本从基线到灰度与恢复','Android通过不代表iOS签名或Web行为已经验收。',[
 ['固定工程输入','提交、SDK revision与锁','原生工具链和目标范围'],['环境与初始化','地址、应用ID和配置','dart-define不是秘密存储'],['质量与真实设备','格式、分析、Widget测试','权限、升级与弱网恢复'],['生成签名产物','版本、校验与签名身份','验收和交付对应同一包'],['保留符号并灰度','Dart符号与原生mapping','按版本、系统和设备观察'],['停止扩大与修复','服务兼容、开关和新版本','商店客户端不能立即降级']],
 '发布前验证符号化与数据迁移；签名秘密不进入仓库或日志。');
chain('diagnostic-evidence','按失败阶段进入Flutter排查证据','两行分别表示构建链路与运行链路，不把全部问题都归入清缓存。',[
 ['环境或依赖失败','SDK、目标与版本约束','保留锁文件和原始命令'],['构建证据','doctor、deps与首条错误','Gradle/Xcode或链接日志'],['定向修复','核对平台、ABI与插件','重跑原失败构建和安装'],['运行、布局或性能','状态、约束、异步与资源','记录设备、模式与复现步骤'],['实际轨迹','请求计数、Inspector','真机profile与帧耗时'],['测试与复验','重建、竞态、字号与弱网','用原路径证明修复成立']],
 'debug不能代表发布性能；mounted也不能证明结果属于最新请求。',true);
