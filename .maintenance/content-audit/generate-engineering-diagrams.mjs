import fs from 'node:fs';

const out = new URL('../../public/ai/', import.meta.url);
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let id;
const text = (x,y,s,k='body',anchor='start') => `<text x="${x}" y="${y}" class="${k}" text-anchor="${anchor}">${esc(s)}</text>`;
const rect = (x,y,w,h,k='box') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>`;
const box = (x,y,w,title,lines=[],k='box',h=120) => rect(x,y,w,h,k)+text(x+18,y+32,title,'node')+lines.map((s,i)=>text(x+18,y+62+i*26,s)).join('');
const edge = (d,dash=false) => `<path d="${d}" class="line${dash?' dash':''}" marker-end="url(#${id}-arrow)"/>`;
function draw(name,title,desc,h,body) {
  id=name;
  fs.writeFileSync(new URL(name+'.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;fill:#172b3a}.head{font-size:27px;font-weight:700}.node{font-size:20px;font-weight:700}.body{font-size:17px;fill:#475569}.box{fill:white;stroke:#cbd5e1;stroke-width:2}.blue{fill:#eff6ff;stroke:#60a5fa;stroke-width:2}.green{fill:#ecfdf5;stroke:#14b8a6;stroke-width:2}.red{fill:#fff1f2;stroke:#e88191;stroke-width:2}.line{fill:none;stroke:#64748b;stroke-width:2}.dash{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="#f8fafc"/>${text(40,48,title,'head')}${text(40,80,desc)}${body()}</svg>\n`);
}

draw('ai-engineering-lifecycle','退款助手发布的是一组兼容版本，不只是模型权重','教学示例：政策 v3 → v4；离线候选与生产隔离，回滚配置不能撤销真实交易。',610,()=>
  edge('M300 200H370')+edge('M680 200H750')+
  edge('M920 270V342Q920 350 912 350H488a8 8 0 0 0 -16 0H228Q220 350 220 358V410',true)+
  edge('M840 410V385Q840 377 832 377H488Q480 377 480 369V270',true)+
  box(40,135,260,'候选发布包 r4',['模型 / Prompt / 工具 / 权限','文档与索引 v4 / 评估集'],'blue',135)+
  box(370,135,310,'隔离验证与灰度门禁',['适用渠道、引用、越权、成本','影子工具记录候选，不退款','按发布号比较真实流量'],'green',135)+
  box(750,135,330,'生产路由与可观察结果',['切换完整配置引用','版本化缓存 / Trace / 告警','业务写入由稳定服务校验'],'box',135)+
  box(40,410,360,'反馈治理与下一轮候选',['脱敏、授权、分类后形成回归样例','不自动污染当前未见测试集'],'box',115)+
  box(620,410,460,'异常时切回 r3 的完整配置',['保留旧索引和依赖，处理缓存失效','已执行退款按操作 ID 核对与补偿'],'red',115)+
  text(40,575,'虚线：左侧为后续迭代；右侧为异常回退。供应商模型不可锁定时，复现能力有边界。')
);

draw('inference-request-budget','一次请求只有一份剩余时间预算','教学 Trace 为串行阶段，不按时间长短绘制宽度；实际系统可能存在并行与流式返回。',530,()=>
  edge('M250 205H310')+edge('M520 205H580')+edge('M790 205H850')+
  box(40,145,210,'校验与预处理',['80 ms','身份、输入与格式'])+
  box(310,145,210,'队列与批处理',['300 ms','剩余 deadline 核对'],'blue')+
  box(580,145,210,'模型计算',['900 ms','运行时取消能力'],'blue')+
  box(850,145,230,'后处理与返回',['120 ms','结构、引用与业务校验'],'green')+
  text(40,325,'总耗时 80 + 300 + 900 + 120 = 1400 ms；1500 ms 预算仅剩 100 ms。','node')+
  box(40,375,500,'过期、取消与迟到结果',['入队前拒绝过期任务；运行中尽力取消','无法立即停算时，限制占用并丢弃旧结果'],'box',110)+
  box(580,375,500,'业务副作用单独核对',['推理超时不等于退款未发生','按操作 ID 查状态，重试沿用幂等键'],'red',110)
);

draw('capacity-cost-accounting','用户任务、模型调用、在途请求是三个不同口径','全部数字为演算假设：稳定系统、同一统计窗口；不代表压测结果或厂商现行报价。',545,()=>
  edge('M290 205H360')+edge('M650 205H720')+
  box(40,145,250,'业务入口',['10 个用户任务 / 秒','每任务平均 3 次模型调用'])+
  box(360,145,290,'模型入口',['平均到达 30 次 / 秒','从入队到完成平均 2 秒'],'blue')+
  box(720,145,360,'平均在途 = 30 × 2 = 60',['包括排队与执行','不等于批大小，也不能推出 P95'],'green')+
  box(40,335,1040,'单任务模型费用：3 × (1000×2 + 500×8) / 1000000 = 0.018 元',[
    '每次输入 1000 Token、输出 500 Token；假设单价为每百万输入 2 元、输出 8 元。',
    '一万次同形态任务 = 180 元；尚未包含重试、检索、工具、缓存差价与基础设施。'
  ],'box',120)+
  text(40,505,'用请求 Trace 和供应商 usage 核对调用放大；容量仍需真实长度分布、突发和失败路径压测。')
);

draw('tool-write-trust-boundary','模型提出退款候选，执行服务掌握真实权限','教学例：用户授权 A102 退款 19.90 元；外部文档要求改退 A103 的 199 元。',590,()=>
  edge('M310 200H380')+edge('M680 200H750')+
  edge('M920 280V350')+edge('M750 245H718Q710 245 710 253V397Q710 405 702 405H680')+
  box(40,135,270,'不可信外部内容',['文档 / 图片 / 工具文本','可以包含注入指令','不授予身份或写权限'],'box',145)+
  box(380,135,300,'模型候选参数',['order_id / amount / reason','JSON 合法只说明结构正确','不能自证“用户已确认”'],'blue',145)+
  box(750,135,330,'服务端校验与授权',['当前身份、订单归属和状态','金额与既有授权范围匹配','按业务政策判断是否需确认'],'green',145)+
  box(750,350,330,'交易服务与结果回读',['使用幂等键执行或返回原结果','超时先查询操作状态'],'green',115)+
  box(40,350,640,'不匹配则拒绝，不能靠模型解释放行',['A103 / 199 元不属于当前授权目标；保留拒绝原因与审计。','日志最小记录并限权；参数变化时旧确认不能复用。'],'red',115)+
  text(40,535,'读取与写入权限隔离；密钥留在执行服务，外部内容和模型文本无法修改工具授权。')
);
