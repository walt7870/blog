import fs from 'node:fs';
const output = new URL('../../public/front/framework/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, s, c = 's') => `<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
const box = (x, y, w, h, name, lines = [], c = 'node') => `<g data-node="${esc(name)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${c}"/>${text(x + 18, y + 32, name, 'n')}${lines.map((s, i) => text(x + 18, y + 62 + i * 27, s)).join('')}</g>`;
const edge = (d, dashed = false) => `<path d="${d}" class="edge"${dashed ? ' stroke-dasharray="6 5"' : ''}/>`;
function svg(id, title, desc, body, note) {
  fs.writeFileSync(new URL(id + '.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="688" viewBox="0 0 1120 688" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${id}-arrow)}</style></defs><rect width="1120" height="688" fill="white"/>${text(32, 44, title, 'h')}${text(32, 82, desc)}${body}${text(32, 650, note)}</svg>\n`);
}

svg('svelte-runtime', 'Svelte编译组件，运行时跟踪状态依赖', '编译产物仍包含运行时能力；派生计算与外部同步各有职责。',
  edge('M336 208H408') + edge('M712 208H784') + edge('M936 280V376') +
  edge('M784 440H712') + edge('M408 440H336') +
  box(32, 144, 304, 136, '组件源码', ['$state / $derived', '模板、事件、样式']) +
  box(408, 144, 304, 136, 'Svelte编译器', ['识别runes并生成代码', '浏览器与服务端目标不同'], 'info') +
  box(784, 144, 304, 136, '浏览器组件实例', ['初始化状态与DOM', '注册事件与依赖']) +
  box(784, 376, 304, 136, '事件改变数量', ['状态1 → 2', '清除已确认报价']) +
  box(408, 376, 304, 136, '派生金额并更新DOM', ['1990分 → 3980分', '运行时按依赖传播'], 'good') +
  box(32, 376, 304, 136, '外部同步另有生命周期', ['Effect重运行前清理', '销毁时释放监听与定时器']),
  'SSR不执行onMount；用户状态不放进跨请求共享的模块级可变单例。');

svg('rendering-boundaries', '页面按数据的新鲜度与身份边界选择渲染方式', '公开介绍可预生成；动态订单要在受鉴权的运行环境读取，交互仍发生在浏览器。',
  edge('M336 208H408') + edge('M712 208H784') +
  edge('M336 440H408') + edge('M712 440H784') +
  box(32, 144, 304, 136, '构建时读取公开内容', ['商品图文与文档', '数据变更触发重建']) +
  box(408, 144, 304, 136, '预生成HTML与资源', ['静态服务器或CDN', '可公共缓存'], 'good') +
  box(784, 144, 304, 136, '浏览器读取与交互', ['接收HTML与所需脚本', '数量、草稿与局部激活']) +
  box(32, 376, 304, 136, '请求携带访问者身份', ['登录后的订单URL', '服务器验证授权']) +
  box(408, 376, 304, 136, 'SSR或受保护API', ['按身份查询与缓存隔离', '需要实际请求运行时'], 'info') +
  box(784, 376, 304, 136, '当前访问者的结果', ['请求失败有恢复入口', '不能误用他人缓存HTML']),
  '初始HTML、脚本激活、数据请求和CDN缓存是不同环节，SSR不自动保证首屏更快。');

svg('component-contract', '跨框架组件通过明确合同连接宿主页面', '库存组件报告补货意图，真正的业务写入由应用处理。',
  edge('M336 190H408') + edge('M712 230H784') +
  box(32, 144, 304, 136, '宿主应用', ['React / Vue / 原生页面', '写入available属性']) +
  box(408, 144, 304, 136, 'stock-status组件', ['解析库存与更新显示', '内部按钮与键盘交互'], 'info') +
  box(784, 144, 304, 136, '应用事件处理器', ['接收restock-request', '验证后调用补货API'], 'good') +
  box(32, 376, 512, 136, '属性与事件合同', ['字符串属性与对象property分别设计', '冒泡、跨Shadow边界与事件命名需验证']) +
  box(576, 376, 512, 136, '样式与集成合同', ['CSS变量、slot、焦点与主题入口', '表单关联和SSR并非自动完成']),
  'Shadow DOM封装样式，不是秘密数据的安全边界；轻量收益需要在实际依赖组合中量测。');

svg('platform-adapters', '跨端共享业务，平台适配器承担设备合同', '录音备注：统一业务状态，分端处理权限、设备会话、文件与中断。',
  edge('M336 208H408') + edge('M712 208H784') +
  edge('M936 280V376') + edge('M784 440H712') + edge('M408 440H336') +
  box(32, 144, 304, 136, '共享备注业务', ['草稿、时长、订单状态', '发出录制或停止意图']) +
  box(408, 144, 304, 136, '对应平台适配器', ['申请权限、启动会话', '浏览器或原生插件'], 'info') +
  box(784, 144, 304, 136, '设备与系统', ['麦克风、来电、后台', '文件位置与访问期限']) +
  box(784, 376, 304, 136, '平台结果归一化', ['完成 / 拒绝 / 中断', '返回音频句柄或错误']) +
  box(408, 376, 304, 136, '草稿与上传恢复', ['保留可重试的数据', '提交后读取服务器结果'], 'good') +
  box(32, 376, 304, 136, '共享业务更新界面', ['拒绝时仍可文字输入', '中断不当作录制成功']),
  '每端独立验证权限、文件有效期与审核交付；模拟器通过不能替代真机设备验收。');
