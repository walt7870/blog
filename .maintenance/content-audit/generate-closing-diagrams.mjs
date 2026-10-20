import fs from 'node:fs';
const out = new URL('../../public/reading/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, value, cls = 'body') => `<text x="${x}" y="${y}" class="${cls}">${esc(value)}</text>`;
const box = (x, y, w, title, lines, cls = 'node') => `<g data-node="${title}"><rect x="${x}" y="${y}" width="${w}" height="136" rx="6" class="${cls}"/>${text(x + 20, y + 34, title, 'label')}${lines.map((s, i) => text(x + 20, y + 68 + i * 28, s)).join('')}</g>`;
const edge = (d, dash = false) => `<path d="${d}" class="edge"${dash ? ' stroke-dasharray="6 5"' : ''}/>`;
function write(id, title, subtitle, body, note) {
  fs.writeFileSync(new URL(id + '.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="560" viewBox="0 0 1120 560" role="img" aria-labelledby="t d"><title id="t">${title}</title><desc id="d">${subtitle}</desc><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.title{font-size:28px;font-weight:600}.label{font-size:21px;font-weight:600}.body{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.green{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.blue{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#a)}</style></defs><rect width="1120" height="560" fill="white"/>${text(32, 44, title, 'title')}${text(32, 82, subtitle)}${body}${text(32, 530, note)}</svg>\n`);
}
write('seven-habits-action', '七个习惯怎样转成行动', '先处理自己的选择与方向，再形成合作；更新为下一轮行动保留能力。',
  edge('M504 218H616') + text(530, 196, '走向合作') +
  edge('M744 354V286', true) + edge('M376 354V286', true) +
  box(72, 150, 432, '个人管理', ['积极主动：选择可以采取的回应', '以终为始：确定结果与验收', '要事第一：为重要事项安排时间'], 'green') +
  box(616, 150, 432, '协作关系', ['双赢思维：寻找共同接受的目标', '知彼解己：先确认对方的需求', '统合综效：共同产生更好的方案'], 'blue') +
  box(272, 354, 576, '不断更新：身体、学习、关系与方向', ['检查工作结果与可持续节奏', '调整习惯，也调整目标、资源和制度']) ,
  '例：延期项目先明确可交付范围，再共同确定验收与回退；不是要求个人无限加班。');
write('miniapp-content-boundary', '小程序内容与资源的两条边界', '当前脚本生成分类与HTML；图片复制和Vue交互迁移不在这条生成链内。',
  edge('M336 218H408') + edge('M712 218H784') + edge('M936 286V354') +
  box(32, 150, 304, '博客源文件', ['根目录docs/中的Markdown', '只接收已定义分类', '不扫描全部站点入口']) +
  box(408, 150, 304, '解析与分包', ['markdown-it与内联样式', '18类分包与页面生成', '失败/跳过需要核对'], 'green') +
  box(784, 150, 304, 'uni-app编译', ['主包：分类和计数', '分包：标题、正文页面', '大小以编译产物为准']) +
  box(784, 354, 304, '设备阅读', ['首次下载相应分包', 'mp-html渲染兼容HTML', '下载与真机分别验证'], 'blue') +
  box(32, 354, 640, '尚需独立适配的资源与能力', ['public/图片没有自动复制；站点根路径不会自动生效', 'Vue实验与Mermaid不能直接作为小程序组件执行', '随包资源或远程资源，需要明确体积与离线条件']),
  '分包已经下载，不代表远程图片已缓存；生成成功不代表所有文章完整可读。');
