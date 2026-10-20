import fs from 'node:fs';

const out = new URL('../../public/ai/', import.meta.url);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
let id;
const text = (x, y, value, kind = 'body', anchor = 'start') => `<text class="${kind}" x="${x}" y="${y}" text-anchor="${anchor}">${escape(value)}</text>`;
const rect = (x,y,w,h,kind='box') => `<rect class="${kind}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
const box = (x,y,w,title,lines=[],kind='box',h=110) => rect(x,y,w,h,kind)+text(x+20,y+33,title,'node')+lines.map((s,i)=>text(x+20,y+62+i*25,s)).join('');
const path = (d,dashed=false) => `<path class="line${dashed?' dashed':''}" marker-end="url(#${id}-arrow)" d="${d}"/>`;
function diagram(name, title, subtitle, height, draw) {
  id=name;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="${id}-title ${id}-desc">
<title id="${id}-title">${escape(title)}</title><desc id="${id}-desc">${escape(subtitle)}</desc>
<defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;fill:#172b3a}.head{font-size:28px;font-weight:700}.node{font-size:20px;font-weight:700}.body{font-size:17px;fill:#475569}.value{font-size:32px;font-weight:700}.box{fill:white;stroke:#cbd5e1;stroke-width:2}.blue{fill:#eff6ff;stroke:#60a5fa;stroke-width:2}.green{fill:#ecfdf5;stroke:#14b8a6;stroke-width:2}.red{fill:#fff1f2;stroke:#e88191;stroke-width:2}.line{stroke:#64748b;stroke-width:2;fill:none}.dashed{stroke-dasharray:6 5}</style></defs>
<rect width="1120" height="${height}" fill="#f8fafc"/>
${text(40,48,title,'head')}${text(40,80,subtitle)}${draw()}
</svg>\n`;
  fs.writeFileSync(new URL(name+'.svg',out),svg);
}

diagram('prediction-time-boundaries','预测时刻决定哪些信息能进入模型','示例：6 月 1 日零点预测未来 14 天是否无购买；图中时长按天等比例。',530,()=>
  rect(80,150,600,110,'blue')+rect(680,150,280,110,'green')+
  text(110,190,'过去 30 天：观察窗口','node')+text(110,225,'仅使用 T 时已经到达、可读取的数据')+
  text(710,190,'未来 14 天','node')+text(710,225,'等待真实结果')+
  `<path d="M80 285H1000M680 130V320M960 130V320" stroke="#64748b" fill="none"/>`+
  text(80,345,'T − 30 天')+text(680,345,'T：6 月 1 日','node','middle')+text(960,345,'6 月 15 日','node','middle')+
  box(80,390,440,'迟到数据不能穿越时间',['5 月 31 日发生，6 月 2 日入库','在 T 时不可用，不能回填成已知特征'],'red')+
  box(560,390,480,'标签还需要等待成熟',['目标窗口结束后，再等待约定的到达延迟','6 月 10 日的“暂未购买”还不是最终结果'],'box')
);

diagram('gradient-update-example','同一个梯度，不同步长带来不同结果','教学单样本：x = 2，y = 4，预测 = wx，损失 L = 0.5 × (wx − y)²。',475,()=>
  path('M330 210H390')+path('M700 190H770V160H820')+path('M700 230H770V340H820')+
  box(40,150,290,'当前参数 w = 1',['预测 = 2；损失 = 2','梯度 = (wx − y)x = −4'],'box',120)+
  box(390,150,310,'更新：w − 学习率 × 梯度',['负梯度描述局部下降方向','步长过大没有下降保证'],'blue',120)+
  box(820,115,260,'学习率 0.1',['新 w = 1.4','预测 2.8；损失 0.72'],'green',120)+
  box(820,290,260,'学习率 1',['新 w = 5','预测 10；损失 18'],'red',120)+
  text(40,435,'梯度的数值依赖参数与输入尺度，不能直接当作业务特征的重要性排名。')
);

diagram('classification-errors-example','找到 8 笔欺诈，需要审核 20 笔交易','教学数据共 1000 笔，真实欺诈 10 笔；列是真实标签，行是预测结果。',535,()=>
  text(330,140,'真实欺诈','node','middle')+text(560,140,'真实正常','node','middle')+
  text(45,220,'预测欺诈','node')+text(45,350,'预测正常','node')+
  rect(210,165,220,110,'green')+rect(450,165,220,110,'red')+
  rect(210,295,220,110,'red')+rect(450,295,220,110,'blue')+
  text(320,211,'TP = 8','value','middle')+text(320,247,'正确报出','body','middle')+
  text(560,211,'FP = 12','value','middle')+text(560,247,'误报，增加审核','body','middle')+
  text(320,341,'FN = 2','value','middle')+text(320,377,'漏报，承担损失','body','middle')+
  text(560,341,'TN = 978','value','middle')+text(560,377,'正确放过','body','middle')+
  text(740,205,'精确率 8 / 20 = 40%','node')+text(740,250,'召回率 8 / 10 = 80%','node')+
  text(740,295,'准确率 986 / 1000 = 98.6%')+text(740,355,'全部预测正常：准确率 99%')+text(740,385,'但找不到任何欺诈')+
  text(45,465,'决策要同时比较：漏报损失、误报干扰、人工审核容量。')+
  text(45,500,'真实正例只有 10 个：每变化 1 个，召回率就变化 10 个百分点；需要报告样本量与不确定性。')
);

diagram('customer-service-ai-map','客服回答与退款动作承担不同责任','技术可以组合：规则校验资格，模型理解表达，检索提供政策，接口执行受控动作。',620,()=>
  path('M260 205H320')+path('M570 205H630')+path('M850 205H900')+
  path('M745 150V125H445V150',true)+
  path('M1000 260V350H845V390')+path('M695 450H615')+path('M325 450H270')+
  box(40,150,220,'用户消息',['订单没到','能退款吗？'])+
  box(320,150,250,'分类与上下文',['分类器 / 语言模型','识别售后意图、订单'],'blue')+
  box(630,150,220,'检索政策',['RAG 提供相关条款','无依据时转人工'],'green')+
  box(900,150,180,'生成回答',['说明政策依据','提出动作请求'])+
  box(695,390,300,'应用与工具网关',['核对身份、参数、授权','按业务政策触发确认'],'blue',120)+
  box(325,390,290,'订单 / 退款服务',['校验归属、状态与金额','幂等执行，返回真实结果'],'green',120)+
  box(40,390,230,'结果与失败处理',['成功回读交易状态','失败保留可追踪记录'],'box',120)+
  text(40,570,'虚线：检索结果加入上下文。实线：处理与动作链路。模型生成退款请求，不代表退款已经成功。')
);

diagram('network-architecture-relations','网络机制与生成方法不是同一分类轴','按数据关系选择网络；按训练目标与采样过程选择生成方法，两者可以组合。',525,()=>
  box(40,135,235,'固定维度特征',['MLP：组合各维数值','不自动保留空间结构'])+
  box(305,135,235,'局部网格 / 时序',['CNN：局部计算','在位置间共享参数'])+
  box(570,135,235,'序列与上下文',['RNN：递归状态','Transformer：注意力'])+
  box(835,135,245,'显式节点与边',['GNN：按边聚合信息','图关系本身是输入'])+
  path('M420 245V315H380V355')+path('M690 245V300H630V355')+
  box(175,355,590,'Diffusion：训练去噪器，再按采样过程生成',['去噪网络可以采用 CNN U-Net，也可以采用 Transformer','Diffusion 不与 CNN / Transformer 构成互斥选项'],'green',115)+
  text(820,390,'自回归语言生成','node')+text(820,425,'通常逐 Token 执行')+text(820,455,'训练并行 ≠ 生成全并行')
);

diagram('ai-training-loop','参数更新、模型选择与推理的边界','监督神经网络示例：训练样本更新参数；验证选方案；独立测试估计效果。',605,()=>
  path('M200 190H260')+path('M420 190H480')+path('M640 190H700')+path('M860 190H920')+
  path('M1000 245V280H340V245',true)+
  path('M1080 190H1100V330H185V370')+
  path('M330 425H415')+path('M705 425H790')+
  box(40,135,160,'训练批次',['输入与标签','仅训练集'])+
  box(260,135,160,'模型前向',['读取参数','输出预测'],'blue')+
  box(480,135,160,'损失',['比较预测','与真实标签'])+
  box(700,135,160,'反向传播',['链式求导','计算梯度'],'blue')+
  box(920,135,160,'优化器',['根据梯度','更新参数'],'green')+
  text(520,310,'虚线：下一训练批次使用更新后的参数。')+
  box(40,370,290,'验证与独立测试',['验证集选模型、校准和阈值','固定方案后再评估独立测试'],'box',120)+
  box(415,370,290,'部署合同',['输入顺序 / 预处理 + 权重','类别映射 + 阈值 + 版本'],'green',120)+
  box(790,370,290,'生产推理',['前向计算 + 后处理','不做损失反传和参数更新'],'blue',120)+
  text(40,550,'部署前核对合同、错误样例和资源预算；生产反馈进入后续数据治理，不直接混入本次测试。')
);

diagram('ai-learning-roadmap','根据目标选择学习主线','共同起点是任务、数据与评估；应用开发不需要先修完所有模型训练课程。',570,()=>
  path('M310 290H355V175H400')+path('M310 320H400')+path('M310 350H355V465H400')+
  path('M760 175H805V285H850')+path('M760 320H850')+path('M760 465H805V355H850')+
  box(40,255,270,'共同基础',['AI 全景、输入输出与权限','数据边界、基线与错误代价'],'green',120)+
  box(400,120,360,'应用开发主线',['模型 API → 检索 / 工具 → 状态与回归','交付：带依据、可追踪的客服助手'],'blue')+
  box(400,265,360,'数据建模主线',['样本 / 特征 → 简单模型 → 阈值与误差','交付：按时间评估的销量或流失预测'])+
  box(400,410,360,'模型训练主线',['张量 / 梯度 → 架构 → 迁移与推理','交付：可重载、输入合同一致的模型'])+
  box(850,255,230,'共同工程能力',['监控、成本与安全','灰度、降级与回滚'],'green',120)
);

diagram('ml-workflow','模型效果需要在数据与业务之间闭环','监督学习示例：先定义决策和标签，离线评估后仍需验证真实运行效果。',400,()=>
  path('M180 200H220')+path('M360 200H400')+path('M540 200H580')+path('M720 200H760')+path('M900 200H940')+
  path('M1010 255V300H290V255',true)+
  box(40,145,140,'业务决策',['输出给谁','错误代价'])+
  box(220,145,140,'样本标签',['历史可用性','独立切分'],'green')+
  box(400,145,140,'特征处理',['只拟合训练','统一预处理'])+
  box(580,145,140,'训练模型',['规则做基线','比较复杂度'],'blue')+
  box(760,145,140,'评估选择',['指标与阈值','典型错误'],'green')+
  box(940,145,140,'部署监控',['质量与漂移','降级与回滚'])+
  text(40,355,'虚线：线上反馈经治理后进入下一轮数据；反馈不直接替换独立测试。')
);
