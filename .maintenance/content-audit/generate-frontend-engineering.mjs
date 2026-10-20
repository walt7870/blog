import fs from 'node:fs';
const dir = new URL('../../public/front/engineering/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, s, c = 's') => `<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
const node = (x, y, w, title, lines, c = 'node') => `<g data-node="${esc(title)}"><rect x="${x}" y="${y}" width="${w}" height="130" rx="6" class="${c}"/>${text(x+18,y+32,title,'n')}${lines.map((s,i)=>text(x+18,y+62+26*i,s)).join('')}</g>`;
const edge = d => `<path d="${d}" class="edge"/>`;
function svg(id, title, sub, body, note) {
  fs.writeFileSync(new URL(id + '.svg', dir), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="650" viewBox="0 0 1120 650" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(sub)}</desc><defs><marker id="${id}-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${id}-a)}</style></defs><rect width="1120" height="650" fill="white"/>${text(32,44,title,'h')}${text(32,82,sub)}${body}${text(32,612,note)}</svg>\n`);
}
svg('frontend-delivery','订单页面从交互到交付的责任边界','相同用户流程会跨越组件、接口、构建和部署，需要按证据定位。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M936 270V354')+edge('M784 419H712')+edge('M408 419H336')+
 node(32,140,304,'浏览器与组件',['结构、事件、输入数量','先处理空值与可访问性'])+
 node(408,140,304,'状态与接口',['草稿、请求、缓存身份','保存失败保留编辑内容'],'info')+
 node(784,140,304,'检查与构建',['规则、类型、行为测试','生成带版本的静态产物'])+
 node(784,354,304,'资源与入口发布',['先上传不可变资源','再切换HTML入口'])+
 node(408,354,304,'真实页面验收',['深层路由刷新与分包','明暗、窄屏和错误状态'],'good')+
 node(32,354,304,'观测与恢复',['按版本定位失败','保留旧资源与回滚路径']),
 '框架组织代码；运行环境、接口合同与发布缓存仍各有独立边界。');
svg('quality-gates','让不同检查层覆盖不同的失败方式','检查命令可独立执行，CI对同一提交快照保留可复查结果。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M936 270V354')+edge('M784 419H712')+
 node(32,140,304,'格式检查',['Prettier检查差异','CI不自动修复后直接发布'])+
 node(408,140,304,'静态规则',['ESLint与Stylelint','核对匹配文件与配置版本'],'info')+
 node(784,140,304,'类型合同',['tsc或vue-tsc','远端JSON仍需运行时校验'])+
 node(784,354,304,'行为与真实页面',['金额、失败恢复、权限','浏览器布局和操作'],'good')+
 node(408,354,304,'同一制品交付',['构建、验收与发布对应','不重新安装生成另一份'])+
 node(32,354,304,'故意制造失败',['坏缩进、未声明变量','证明检查确实能阻止错误']),
 '编辑器与hook提供快速反馈；可跳过的本地hook不能作为唯一质量门禁。');
svg('state-ownership','草稿、共享偏好和服务端事实分开管理','保存成功前保留草稿；服务端返回结果后再同步详情与列表。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M936 270V354')+edge('M784 419H712')+
 node(32,140,304,'URL与组件草稿',['筛选、页码、编辑数量','输入校验和未保存提醒'])+
 node(408,140,304,'提交边界',['禁用重复点击','后端幂等与权限仍必需'],'info')+
 node(784,140,304,'服务端事实',['库存、金额、订单状态','校验响应与错误分支'])+
 node(784,354,304,'查询缓存',['按租户与订单标识分键','旧请求不能覆盖新页面'])+
 node(408,354,304,'显示与后续同步',['更新详情，使列表失效','失败保留草稿并可重试'],'good')+
 node(32,354,304,'客户端共享store',['主题、跨页购物车','持久化结构需迁移与清理']),
 '缓存新鲜度、无观察者回收和真正的服务端事务，是不同生命周期。');
svg('testing-contract','按订单提交的失败后果分配测试','单元保护规则，集成保护协作，浏览器保护实际运行链路。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M936 270V354')+edge('M784 419H712')+
 node(32,140,304,'规则测试',['数量边界、金额溢出','故意改错计算应失败'])+
 node(408,140,304,'组件与受控接口',['输入、校验、409冲突','慢响应与失败保留草稿'],'info')+
 node(784,140,304,'真实浏览器',['隔离账号与唯一订单','保存后刷新并读持久结果'])+
 node(784,354,304,'实际交付环境',['深层路由、缓存、旧分包','窄屏、焦点、错误提示'],'good')+
 node(408,354,304,'失败证据与清理',['截图、请求与测试标识','重置缓存、计时器和数据'])+
 node(32,354,304,'模拟能力的边界',['mock能控制异常输入','不能证明真实后端正确']),
 '比例和覆盖率不是正确性证明；关键是可执行断言与明确的环境边界。');
svg('performance-evidence','从用户现象进入对应的性能证据','先记录同设备、网络、数据量与缓存状态，再决定优化动作。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M336 419H408')+edge('M712 419H784')+
 node(32,140,304,'主要内容迟到',['LCP、HTML响应时间','Network关键资源瀑布'])+
 node(408,140,304,'资源还是渲染等待',['首字节、图片与关键CSS','脚本和主线程工作'],'info')+
 node(784,140,304,'针对原因调整',['缩短关键路径、按需加载','首屏主图不机械懒加载'])+
 node(32,354,304,'交互卡顿或布局跳动',['INP交互与长任务','CLS轨迹与缺失尺寸'])+
 node(408,354,304,'计算、DOM与几何',['排序、重复渲染与布局','图片、字体和异步内容'])+
 node(784,354,304,'受控复测与线上观察',['检查功能、多个样本分布','真实访问按版本与设备看'],'good'),
 'LCP≤2.5秒、INP≤200毫秒、CLS≤0.1；真实访问第75百分位，不能用单次高分替代。');
svg('release-cache','先提供完整资源，再切换入口并保留旧会话','旧标签页在发布后首次加载导出模块，仍会请求旧chunk的原URL。',
 edge('M336 205H408')+edge('M712 205H784')+edge('M936 270V354')+edge('M784 419H712')+edge('M408 419H336')+
 node(32,140,304,'固定输入与构建',['运行环境、安装器和锁','提交标识与产物校验'])+
 node(408,140,304,'先上传hash资源',['新资源可访问后再切换','仍支持的旧资源继续提供'],'info')+
 node(784,140,304,'切换HTML入口',['入口及时再验证','新HTML只引用已存在资源'])+
 node(784,354,304,'新旧页面并存',['深层路由与动态导入','API合同与配置兼容'],'good')+
 node(408,354,304,'观察与回退',['资源错误、接口和业务','回退检查CDN与配置'])+
 node(32,354,304,'支持窗口后清理',['核对旧资源使用与保留期','不在发布时无差别删除']),
 '只保留旧版本目录但原URL不可达，仍不能保护旧标签页；HTTP200也不证明客户端启动。');
