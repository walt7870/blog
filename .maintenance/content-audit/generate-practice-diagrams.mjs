import fs from 'node:fs';

const out = new URL('../../public/ai/', import.meta.url);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
let id;
const text = (x,y,s,k='body',a='start') => `<text x="${x}" y="${y}" class="${k}" text-anchor="${a}">${esc(s)}</text>`;
const rect = (x,y,w,h,k='box') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>`;
const box = (x,y,w,title,lines=[],k='box',h=112) => rect(x,y,w,h,k)+text(x+16,y+32,title,'node')+lines.map((s,i)=>text(x+16,y+62+i*25,s)).join('');
const edge = (d,dash=false) => `<path d="${d}" class="line${dash?' dash':''}" marker-end="url(#${id}-arrow)"/>`;
const label = (x,y,w,s) => `<rect x="${x}" y="${y-20}" width="${w}" height="26" fill="#f8fafc"/>`+text(x+w/2,y,s,'body','middle');
function draw(name,title,desc,h,body) {
  id=name;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;fill:#172b3a}.head{font-size:27px;font-weight:700}.node{font-size:20px;font-weight:700}.body{font-size:17px;fill:#475569}.box{fill:white;stroke:#cbd5e1;stroke-width:2}.blue{fill:#eff6ff;stroke:#60a5fa;stroke-width:2}.green{fill:#ecfdf5;stroke:#14b8a6;stroke-width:2}.red{fill:#fff1f2;stroke:#e88191;stroke-width:2}.line{fill:none;stroke:#64748b;stroke-width:2}.dash{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="#f8fafc"/>${text(40,48,title,'head')}${text(40,80,desc)}${body()}</svg>\n`;
  fs.writeFileSync(new URL(name+'.svg',out),svg);
}

draw('practice-project-routes','从需要交付的业务输出选择项目','四个方向可以独立起步；共同要求是输入可追溯、结果可验收、失败可恢复。',600,()=>
  edge('M480 208H226Q218 208 218 216V292')+
  edge('M560 208V292')+
  edge('M640 208H894Q902 208 902 216V292')+
  box(376,120,368,'先确定输出与使用者',['名单 / 图片判定 / 回答 / 工单'],'blue',88)+
  box(40,292,356,'预测与感知',['运营名单：时间快照与Top-K','产线质检：图片标签与漏检成本'],'box',136)+
  box(436,292,248,'有依据的回答',['知识库：检索与引用','证据不支持则拒答'],'green',136)+
  box(724,292,356,'可回读的业务记录',['工单：草稿版本与用户确认','工具写入：权限、幂等与回查'],'box',136)+
  text(40,492,'固定步骤先用工作流；需要根据中间结果选择追问或工具时，再引入 Agent。','node')+
  text(40,542,'知识库不要求先训练视觉模型；模型评分也不能直接证明业务干预有效。')
);

draw('ticket-confirmation-lifecycle','工单提交：确认版本与结果回查共同决定下一步','主要状态与恢复路径；权限拒绝、资料冲突和持续失败按正文规则停止自动执行。',672,()=>
  edge('M255 236H315')+edge('M530 236H590')+edge('M805 236H865')+
  edge('M420 180V128Q420 120 412 120H156Q148 120 148 128V180',true)+
  edge('M650 292V432')+edge('M744 432V292',true)+
  edge('M805 460H824Q832 460 832 452V348Q832 340 840 340H964Q972 340 972 332V292',true)+
  edge('M805 504H900')+
  label(250,216,70,'就绪')+label(520,216,80,'确认')+label(798,216,72,'成功')+
  label(216,108,164,'修改，旧确认失效')+
  label(608,356,32,'超时')+label(756,397,64,'可重试')+
  label(856,324,108,'回查已成功')+label(812,488,80,'无法核实')+
  box(40,180,215,'生成草稿',['D7 / revision=2','保存参数摘要'])+
  box(315,180,215,'等待确认',['绑定用户与版本','有效期内才可用'],'blue')+
  box(590,180,215,'提交中',['复查权限与条件','固定操作ID与幂等键'])+
  box(865,180,215,'已创建',['返回原 ticket_id','工单可回读'],'green')+
  box(590,432,215,'结果未知',['先查询原操作','不创建第二次提交'],'red')+
  box(900,432,180,'人工核查',['保留原操作 ID','停止自动写入'])+
  text(40,604,'相同键、相同提交复用结果；相同键、不同参数拒绝。取消等待不等于撤销远端工单。')
);

draw('churn-snapshot-time-boundary','流失预测：过去30天的特征，未来14天的标签','以6月1日0点为预测时点，按业务时区计日；时间轴间距按天数比例绘制。',580,()=>
  rect(80,152,660,108,'blue')+rect(740,152,308,108,'green')+
  text(112,194,'特征窗口 [T-30天, T)','node')+text(112,229,'还需满足：预测时点已可用')+
  text(762,194,'标签窗口 [T, T+14天)','node')+text(762,229,'之后观察，不能作输入')+
  `<path d="M80 296H1048M80 284V308M740 276V316M1048 284V308" class="line"/>`+
  text(80,344,'5月2日 / T-30天')+text(740,344,'6月1日 / T','node','middle')+text(1048,344,'6月15日','body','end')+
  box(40,392,500,'事件发生早，不代表当时可见',['5月31日事件在6月2日才补写，不能进入6月1日输入。'],'box',100)+
  box(580,392,500,'模拟上线训练，也要等标签成熟',['训练标签窗口已结束，且相关数据已经入齐。'],'red',100)+
  text(40,544,'时间切分应避免训练标签跨入验证预测时点；名单效果与触达增量效果分开评估。')
);

draw('vision-quality-contract','质检结果可追溯，才能定位漏检来自哪个环节','整图多标签分类示例；生产阈值和复核容量由业务验收确定，不由教学数字代替。',624,()=>
  edge('M340 200H410')+edge('M710 200H780')+
  edge('M930 256V332Q930 340 922 340H568Q560 340 560 348V400')+
  edge('M710 456H780')+
  box(40,144,300,'标注与切分清单',['缺陷可同时存在','同一件产品不跨集合'])+
  box(410,144,300,'训练与部署输入合同',['解码 / 颜色 / 缩放 / 归一化','同一组原图逐项比对'],'blue')+
  box(780,144,300,'各缺陷分数与版本',['独立标签，不用互斥softmax','保留产品ID与模型版本'])+
  box(410,400,300,'阈值和场景验收',['严重缺陷漏检单独核算','未知场景也可能高分误判'],'red')+
  box(780,400,300,'放行或人工复核',['复核结果与原图关联','超时按约定复核或停线'],'green')+
  text(40,572,'教学破损结果：90检出、10漏检、45误报、855正确排除；准确率94.5%仍可能不满足要求。')
);
