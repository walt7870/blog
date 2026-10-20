import fs from 'node:fs';

const out=new URL('../../public/ai/',import.meta.url);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let id;
const txt=(x,y,s,k='body',a='start')=>`<text x="${x}" y="${y}" class="${k}" text-anchor="${a}">${esc(s)}</text>`;
const rect=(x,y,w,h,k='box')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>`;
const box=(x,y,w,s,lines=[],k='box',h=115)=>rect(x,y,w,h,k)+txt(x+16,y+32,s,'node')+lines.map((s,i)=>txt(x+16,y+62+i*25,s)).join('');
const edge=(d,dash=false)=>`<path d="${d}" class="line${dash?' dash':''}" marker-end="url(#${id}-arrow)"/>`;
function draw(name,title,desc,h,body){id=name;fs.writeFileSync(new URL(name+'.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;fill:#172b3a}.head{font-size:27px;font-weight:700}.node{font-size:20px;font-weight:700}.body{font-size:17px;fill:#475569}.box{fill:white;stroke:#cbd5e1;stroke-width:2}.blue{fill:#eff6ff;stroke:#60a5fa;stroke-width:2}.green{fill:#ecfdf5;stroke:#14b8a6;stroke-width:2}.red{fill:#fff1f2;stroke:#e88191;stroke-width:2}.line{fill:none;stroke:#64748b;stroke-width:2}.dash{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="#f8fafc"/>${txt(40,48,title,'head')}${txt(40,80,desc)}${body()}</svg>\n`);}

draw('llm-token-flow','下一个 Token 来自条件分布，解码策略决定如何选择','以自回归文本模型为例；候选甲乙丙是教学符号，不对应真实分词或答案正确率。',540,()=>
  edge('M245 190H295')+edge('M490 190H540')+edge('M780 190H830')+
  edge('M950 250V322Q950 330 942 330H403Q395 330 395 322V250',true)+
  box(40,135,205,'输入上下文',['规则 / 历史 / 证据','按模型模板编码'])+
  box(295,135,195,'Token 序列',['Token 嵌入与位置','已有序列为条件'])+
  box(540,135,240,'模型前向计算',['注意力与前馈网络','输出候选 Token 分布'],'blue')+
  box(830,135,250,'解码与停止',['贪心或采样选下一个','追加后继续，或终止'],'green')+
  txt(40,385,'教学分布：甲 0.6，乙 0.3，丙 0.1。','node')+
  txt(40,425,'贪心选甲；采样可能选乙或丙。高概率只表示模型倾向，不证明事实正确。')+
  txt(40,475,'历史 KV 可按运行时缓存复用；模型仍计算新位置，不是每次从原始字符串完整重跑。')
);

draw('lora-parameter-path','LoRA 更新低秩分支，原矩阵保持冻结','以单个4096×4096线性矩阵、秩r=8为例；仅比较参数数目，不代表整模型资源倍数。',615,()=>
  edge('M200 270H242Q250 270 250 262V198Q250 190 258 190H320')+
  edge('M170 320V417Q170 425 178 425H320')+
  edge('M650 190H822Q830 190 830 198V262Q830 270 838 270H880')+
  edge('M540 425H590')+
  edge('M790 425H842Q850 425 850 417V328Q850 320 858 320H880')+
  edge('M960 295H1000')+
  box(40,230,160,'输入 x',['4096 维'],'box',90)+
  box(320,135,330,'冻结底座 W',['16777216 个参数','计算 Wx，不更新 W'],'box',110)+
  box(320,370,220,'训练 A',['8 × 4096','将输入投影到 8 维'],'blue')+
  box(590,370,200,'训练 B',['4096 × 8','映回 4096 维'],'blue')+
  rect(880,245,80,100,'green')+txt(920,304,'相加','node','middle')+
  txt(1000,300,'输出','node')+
  txt(40,545,'输出 = Wx + (alpha/r)BAx；A+B 共65536参数，是该原矩阵的1/256。','node')+
  txt(40,585,'适配器绑定底座、目标模块与Tokenizer；激活、其他可训练模块及优化器状态另计。')
);

draw('kv-cache-memory-contract','缓存历史 Key / Value，不缓存可任意复用的答案','常规全注意力Transformer示例；实际结构、滑窗、KV类型和运行时分配会改变内存。',570,()=>
  edge('M285 190H355')+edge('M650 190H720')+
  edge('M890 250V330')+
  box(40,135,245,'输入与 Prefill',['按输入一次构建历史KV','Token、位置和配置匹配'])+
  box(355,135,295,'各层历史 KV',['存储每个位置的 K 与 V','保留在当前序列的缓存中'],'blue')+
  box(720,135,360,'Decode 新位置',['计算当前Q与新K/V','读取历史KV后选择下一Token'],'green')+
  box(720,330,360,'追加新位置，再继续',['上下文改变时重算受影响后缀','不能把旧政策状态当新输入'],'box',110)+
  box(40,330,610,'单序列缓存演算',['2 × 32层 × 8个KV头 × 128维 × 4096位置 × 2字节','= 536870912 字节 = 512 MiB','4个同长序列约2 GiB，不含权重、激活与块分配开销'],'box',145)+
  txt(40,530,'权重量化与缓存量化是不同设置；使用KV头数，不是Query头数。')
);

draw('rag-tool-responsibilities','同一退款咨询，文档、实时状态与写操作分开核对','教学示例：政策说明适用条件；订单接口说明查询时状态；授权由服务端检查。',590,()=>
  edge('M335 190H402Q410 190 410 198V250H465')+
  edge('M335 390H402Q410 390 410 382V310H465')+
  edge('M755 280H820')+
  box(40,135,295,'RAG：政策证据',['审核通过后3–5个工作日','保留渠道、版本与片段ID'],'blue')+
  box(40,335,295,'工具：订单状态',['A102：查询时已审核','保留审核与查询时间'],'green')+
  box(465,220,290,'模型组织解释',['条件、状态与来源对应','缺日期或渠道时补查询','不把预计范围改成保证'],'box',145)+
  box(820,220,260,'回答与来源核对',['引用存在且支持结论','工作日需核对日历'],'box',145)+
  box(465,430,615,'若要执行退款：进入独立业务合同',['身份、归属、金额、授权、幂等与回读；RAG证据不授予写权限。'],'red',105)+
  txt(40,550,'检索服务也可包装成工具；两者可以组合，MCP连接协议不替代业务鉴权。')
);

draw('llm-concept-map','把概念放回离线训练与在线问答，才能看清各自作用','以退款助手为例；训练更新参数，在线检索和工具结果进入当前上下文。',690,()=>
  edge('M310 205H380')+edge('M690 205H760')+
  edge('M920 270V333Q920 341 912 341H568Q560 341 560 349V405')+
  edge('M310 465H380')+edge('M690 465H760')+
  box(40,140,270,'训练数据与目标',['预训练 / SFT / 偏好数据','独立评估与数据授权'],'box',130)+
  box(380,140,310,'模型结构与参数适配',['Transformer / Attention / MoE','全参数或 LoRA / QLoRA','SFT可采用LoRA，不是二选一'],'blue',130)+
  box(760,140,320,'模型与适配器工件',['权重、Tokenizer、配置','绑定底座与输入输出合同'],'box',130)+
  box(40,405,270,'当前请求上下文',['政策RAG / 订单只读工具','编码为Token与内部Embedding'],'green',130)+
  box(380,405,310,'在线推理运行时',['加载工件，按序生成','KV Cache / 量化 / 批处理','流式片段仍需输出核验'],'blue',130)+
  box(760,405,320,'应用结果与受控执行',['回答核对证据，工具独立鉴权','Agent编排任务，MCP连接能力'],'green',130)+
  txt(40,610,'贯穿离线与在线：质量评估、版本记录、隐私、权限与故障恢复。','node')+
  txt(40,652,'概念不是互相替代的产品：新政策先更新证据，固定任务可评估SFT，退款仍由业务服务执行。')
);
