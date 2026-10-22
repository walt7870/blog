import { mkdirSync, writeFileSync } from 'node:fs'
import { evaluate, contour, trajectory, format } from '../../.vitepress/theme/components/foundations/math.mjs'
const root = new URL('../../public/ai/foundations/', import.meta.url)
mkdirSync(root, { recursive: true })
const text = (x,y,s,size=20,color='#263d45',anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${s}</text>`
const line = (x1,y1,x2,y2,color='#9aaeb5',dash='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
function svg(name, title, desc, width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${name}-title ${name}-desc"><title id="${name}-title">${title}</title><desc id="${name}-desc">${desc}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#607d86"/></marker></defs><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0}</style><rect width="${width}" height="${height}" fill="#f7fafb"/>${content}</svg>\n`
}
function save(name,title,desc,draw) {
  for(const mobile of [false,true]) {
    const [height, content] = draw(mobile)
    writeFileSync(new URL(`${name}${mobile?'-mobile':''}.svg`,root),svg(`${name}${mobile?'-mobile':''}`,title,desc,mobile?480:800,height,content))
  }
}
save('prediction-residuals','同一组样本与两条预测线','三条教学样本来自y等于2x加1，初始模型与正确参数的预测不同。',m=>{
  const W=m?480:800,H=m?360:420,left=56,right=W-40,top=76,bottom=H-74
  const x=v=>left+v/3.5*(right-left),y=v=>bottom-v/9*(bottom-top)
  let s=text(24,34,'同一份数据，改变参数',m?23:27)+line(left,top,left,bottom)+line(left,bottom,right,bottom)
  for(const v of [0,3,6,9]) s+=line(left,y(v),right,y(v),'#dce5e8')+text(left-10,y(v)+6,String(v),16,'#526a74','end')
  s+=line(x(0),y(1),x(3.5),y(8),'#287356')+line(x(0),y(0),x(3.5),y(0),'#2b78aa','6 5')
  for(const p of [{x:1,y:3},{x:2,y:5},{x:3,y:7}])s+=`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="6" fill="#c48118"/>`+line(x(p.x),y(0),x(p.x),y(p.y),'#bd4d55','4 4')+text(x(p.x),bottom+25,String(p.x),17,'#526a74','middle')
  s+=text(26,H-20,'蓝虚线：w=0，b=0',m?17:20,'#2b78aa')+text(W-22,H-20,'绿线：w=2，b=1',m?17:20,'#287356','end')
  s+=text(right,top-14,'运费 / 元',17,'#526a74','end')+text(right,bottom+25,'千克',17,'#526a74','end')
  return[H,s]
})
save('data-split','训练、验证与测试的职责','先切分原始样本，同一来源的变体留在同一集合，只有训练集合用于更新参数。',m=>{
  const W=m?480:800,H=m?620:420
  let s=text(24,36,'先分开样本，再学习和选型',m?23:27)
  s+=text(24,80,'原始样本按来源分组',m?20:22)
  for(let i=0;i<3;i++){const x=m?100+i*140:400+i*120;for(let j=0;j<2;j++)s+=`<circle cx="${x+j*20}" cy="${m?116:76}" r="7" fill="${['#2b78aa','#287356','#a16910'][i]}"/>`}
  if(m)s+=`<path d="M250 132V146H32V462" stroke="#607d86" stroke-width="2" fill="none"/>`
  else s+=`<path d="M520 100V142H143M400 142H657" stroke="#607d86" stroke-width="2" fill="none"/>`
  const items=[['训练集','更新参数','#2b78aa'],['验证集','选择方案','#287356'],['测试集','方案冻结后评估','#a16910']]
  items.forEach(([a,b,c],i)=>{const x=m?64:24+i*258,y=m?174+i*120:184,w=m?392:238
    s+=`<path d="${m?`M32 ${y+48}H56`:`M${x+w/2} 142V176`}" stroke="#607d86" stroke-width="2" fill="none" marker-end="url(#arrow)"/>`
    s+=`<rect x="${x}" y="${y}" width="${w}" height="96" rx="6" fill="white" stroke="${c}"/>`+text(x+18,y+35,a,23,c)+text(x+18,y+69,b,19)
  })
  s+=text(24,H-48,'同一原图及其增强版本放在同一组',m?19:22)+text(24,H-18,'测试结果不回流到本轮调参',m?18:20,'#a0434d')
  return[H,s]
})
save('tensor-layout','像素、向量和批次','一张八乘八教学图片可展开成64个有顺序的数字，两张图片构成形状为2乘64的批次。',m=>{
  const W=m?480:800,H=m?520:330
  let s=text(24,36,'形状改变，像素顺序必须保留',m?23:27)
  const cell=m?18:20,ox=32,oy=76
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const on=c===5||r===3||r===1&&c>1&&c<6;s+=`<rect x="${ox+c*cell}" y="${oy+r*cell}" width="${cell-2}" height="${cell-2}" fill="${on?'#347b69':'#e0eaed'}"/>`}
  s+=text(ox,oy+8*cell+28,'单张图片 [8,8]',20)
  const vx=m?240:264,vy=m?76:100
  for(let i=0;i<8;i++)s+=`<rect x="${vx}" y="${vy+i*17}" width="100" height="14" fill="${i===5?'#347b69':'#e0eaed'}"/>`
  s+=text(vx,vy+165,'展平 [64]',20)
  const bx=m?32:470,by=m?330:104
  for(let r=0;r<2;r++)for(let c=0;c<10;c++)s+=`<rect x="${bx+c*(m?38:27)}" y="${by+r*34}" width="${m?34:23}" height="26" fill="${r?'#d9eaf5':'#d6eadf'}"/>`
  s+=text(bx,by+99,'两张图片组成批次 [2,64]',m?20:19)+text(24,H-18,'图中为教学像素；仅展示部分向量元素',m?18:20,'#526a74')
  return[H,s]
})
save('single-update','学习率改变一次更新的结果','单样本x等于2、y等于4，在w等于1处梯度为负4，学习率0.1降低损失而1使损失升高。',m=>{
  const W=m?480:800,H=m?490:420,left=56,right=W-32,top=90,bottom=m?300:284
  const x=w=>left+(w+0.5)/6*(right-left),y=v=>bottom-v/26*(bottom-top)
  let s=text(24,34,'同一梯度，不同步长',m?24:27)+text(24,64,'x=2，y=4，b 固定为 0',18,'#526a74')+line(left,top,left,bottom)+line(left,bottom,right,bottom)
  const p=Array.from({length:121},(_,i)=>{const w=-.5+i/120*6;return`${x(w).toFixed(1)},${y(2*(w-2)**2).toFixed(1)}`}).join(' ')
  s+=`<polyline points="${p}" fill="none" stroke="#8ba5af" stroke-width="2.5"/>`
  for(const [w,L,c]of [[1,2,'#2b78aa'],[1.4,.72,'#287356'],[5,18,'#bd4d55']])s+=`<circle cx="${x(w)}" cy="${y(L)}" r="6" fill="${c}"/>`
  for(const v of[0,10,20])s+=text(left-10,y(v)+5,String(v),16,'#526a74','end')
  for(const v of[0,1,2,3,4,5])s+=text(x(v),bottom+24,String(v),16,'#526a74','middle')
  s+=text(right,top-12,'损失 L',18,'#526a74','end')
  const ys=m?[362,400,438]:[338,368,398]
  s+=text(24,ys[0],'起点：w=1，L=2，梯度=-4',m?20:22,'#2b78aa')+text(24,ys[1],'学习率 0.1：w=1.4，L=0.72',m?20:22,'#287356')+text(24,ys[2],'学习率 1：w=5，L=18',m?20:22,'#a43c47')
  return[H,s]
})
save('loss-contours','两参数损失的等高线','三条运费教学样本的损失在w等于2、b等于1处为零；等高线对应相同的损失。',m=>{
  const W=m?480:800,H=m?410:480,left=58,right=W-32,top=80,bottom=H-62
  const x=w=>left+(w+1)/5*(right-left),y=b=>bottom-(b+2)/6*(bottom-top)
  let s=text(24,34,'每条线上的参数组合，损失相同',m?21:27)
  s+=`<defs><clipPath id="loss-${m?'m':'d'}"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs><g clip-path="url(#loss-${m?'m':'d'})">`
  for(const level of[.1,.5,2,6,14,28])for(const p of contour(level))s+=`<polyline points="${p.map(([a,b])=>`${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' ')}" fill="none" stroke="#6caca4" stroke-width="2"/>`
  const run=trajectory(.1,40)
  s+=`<polyline points="${run.map(r=>`${x(r.w).toFixed(1)},${y(r.b).toFixed(1)}`).join(' ')}" fill="none" stroke="#2b78aa" stroke-width="3"/></g>`+line(left,top,left,bottom)+line(left,bottom,right,bottom)
  s+=`<circle cx="${x(0)}" cy="${y(0)}" r="6" fill="#d14b51"/><circle cx="${x(2)}" cy="${y(1)}" r="6" fill="#287356"/>`+text(x(2)+14,y(1)+6,'最低点 (2,1)',m?17:21)+text(24,H-18,'红点：起点；蓝线：40 次更新',m?18:22)
  for(const v of[0,1,2,3,4])s+=text(x(v),bottom+24,String(v),16,'#526a74','middle')
  for(const v of[-2,0,2,4])s+=text(left-12,y(v)+5,String(v),16,'#526a74','end')
  s+=text(right,top-12,'b 纵轴 / w 横轴',17,'#526a74','end')
  return[H,s]
})
save('training-cycle','一次更新与独立验证','训练数据经过预测、损失、梯度与参数更新形成循环，验证数据不参与梯度计算或更新。',m=>{
  const W=m?480:800,H=m?620:430
  let s=text(24,36,'每轮计算，都使用当前参数',m?23:27)
  const items=[['取训练样本','固定输入与目标'],['前向与损失','计算预测及偏差'],['反向求梯度','计算局部变化率'],['优化器更新','修改 w 和 b']]
  const positions=items.map((_,i)=>m?[40,64+i*112]:[24+i*192,88])
  positions.slice(0,-1).forEach(([x,y],i)=>{const [nx,ny]=positions[i+1];s+=`<path d="${m?`M${x+200} ${y+88}V${ny-6}`:`M${x+176} ${y+44}H${nx-6}`}" stroke="#607d86" stroke-width="2" fill="none" marker-end="url(#arrow)"/>`})
  items.forEach(([a,b],i)=>{const[x,y]=positions[i];s+=`<rect x="${x}" y="${y}" width="${m?400:176}" height="88" rx="6" fill="white" stroke="${i===3?'#287356':'#a9bec5'}"/>`+text(x+14,y+34,a,m?23:21)+text(x+14,y+65,b,m?19:17,'#526a74')})
  if(!m)s+=`<path d="M688 176V224H112V182" stroke="#287356" stroke-width="2" stroke-dasharray="5 4" fill="none" marker-end="url(#arrow)"/>`+text(400,256,'下一轮读取更新后的参数',20,'#287356','middle')
  else s+=`<path d="M440 444H460V54H240V60" stroke="#287356" stroke-width="2" stroke-dasharray="5 4" fill="none" marker-end="url(#arrow)"/>`+text(24,528,'每轮重新读取已更新的参数',20,'#287356')
  s+=text(24,H-60,'验证集：只观察，不反向更新',m?21:24,'#a16910')+text(24,H-24,'最终测试：方案确定后独立评估',m?20:22,'#526a74')
  return[H,s]
})
writeFileSync(new URL('labs/gradient-run.json',root),JSON.stringify({ schema:'foundations-regression-v1',data_kind:'synthetic_teaching',samples:[{x:1,y:3},{x:2,y:5},{x:3,y:7}],config:{lr:.1,steps:40},rows:trajectory(.1,40)},null,2)+'\n')
console.log('已生成6组桌面/手机SVG与统一训练轨迹。初始损失',format(evaluate(0,0).loss))
