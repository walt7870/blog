import fs from 'node:fs';
const output=new URL('../../public/front/build-tools/',import.meta.url);
fs.mkdirSync(output,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(x,y,s,c='s')=>`<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
const box=(x,y,w,h,name,lines=[],c='node')=>`<g data-node="${esc(name)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${c}"/>${text(x+18,y+32,name,'n')}${lines.map((s,i)=>text(x+18,y+62+i*27,s)).join('')}</g>`;
const edge=d=>`<path d="${d}" class="edge"/>`;
function svg(id,title,desc,height,body,notes=[]){fs.writeFileSync(new URL(id+'.svg',output),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${id}-arrow)}</style></defs><rect width="1120" height="${height}" fill="white"/>${text(32,44,title,'h')}${text(32,82,desc)}${body}${notes.map((s,i)=>text(32,height-28-(notes.length-1-i)*28,s)).join('')}</svg>\n`)}

svg('vite-delivery','Vite开发与生产使用不同的资源路径','Vite 8：Rolldown组织依赖与打包，Oxc处理JavaScript转换和默认压缩。',688,
edge('M336 208H408')+edge('M712 208H784')+edge('M336 440H408')+edge('M712 440H784')+
box(32,144,304,128,'开发浏览器',['请求源码模块','index.html → main.ts'])+
box(408,144,304,128,'Dev Server与插件',['按需转换与依赖优化','受影响模块寻找HMR边界'],'info')+
box(784,144,304,128,'局部更新或整页刷新',['取决于模块与框架插件','不保证任意状态保留'])+
box(32,376,304,128,'生产源码与锁文件',['先独立类型检查','vite build'])+
box(408,376,304,128,'生产产物',['HTML / CSS / JS / 资源','base = /shop/'],'good')+
box(784,376,304,128,'生产服务器与浏览器',['按前缀提供完整资源','API、重写和缓存另配置']),
['开发代理不会进入dist；客户端环境变量都是可见配置，不存服务端密钥。']);

svg('webpack-chunks','Webpack产物由HTML与运行时共同加载','loader转换模块，plugin参与编译与输出；动态导入建立延迟加载边界。',736,
edge('M272 208H304')+edge('M544 208H576')+edge('M816 208H848')+
box(32,144,240,136,'入口main.js',['import style.css','import(report.js)'])+
box(304,144,240,136,'模块图与转换',['CSS loader链','插件参与输出'],'info')+
box(576,144,240,136,'完整产物',['HTML、入口JS、CSS','独立报表chunk'],'good')+
box(848,144,240,136,'/shop/资源服务',['URL前缀正确','缺chunk应返回404'])+
edge('M336 440H408')+edge('M712 440H784')+
box(32,376,304,128,'打开页面',['HTML引用入口JS和CSS'])+
box(408,376,304,128,'点击导出',['运行时请求报表chunk','成功后计算49.80元'])+
box(784,376,304,128,'失败恢复',['显示错误，恢复按钮','新发布保留旧版本chunk']),
['output.path是磁盘位置，publicPath是资源URL；production不保证任意代码都能删除。']);

svg('rollup-library','库发布需要同时满足生成与消费合同','入口导出是公共API；外部依赖保留导入，由消费环境按合同提供。',736,
edge('M336 208H408')+edge('M712 180H784')+edge('M712 236H744Q752 236 752 244V292Q752 300 760 300H784')+
box(32,144,304,136,'src/index.js',['formatCents / sumCents','输入验证与稳定导出'])+
box(408,144,304,136,'Rollup构建',['模块解析与Tree Shaking','按output生成格式'],'info')+
box(784,120,304,104,'dist/index.js',['ESM消费者import'],'good')+
box(784,248,304,104,'dist/index.cjs',['CJS消费者require'],'good')+
box(32,440,512,136,'exports与安装包',['条件路径指向真实文件','files包含dist；类型声明另生成'])+
box(576,440,512,136,'external与peerDependency',['打包合同与安装版本合同分别声明','不会自动提供浏览器全局对象或解析器']),
['消费端只用部分导出后可再裁剪；库入口未在当前工程调用的导出仍属于公共API。']);

svg('parcel-targets','Parcel沿资源图为目标环境生成产物','入口发现依赖，target决定环境与输出，public-url决定资源引用前缀。',704,
edge('M272 208H304')+edge('M544 208H576')+edge('M816 208H848')+
box(32,144,240,136,'HTML入口',['module脚本','CSS与资源URL'])+
box(304,144,240,136,'资源依赖图',['解析、转换、打包','插件按类型参与'],'info')+
box(576,144,240,136,'Target合同',['浏览器或Node目标','输出格式与目录'])+
box(848,144,240,136,'Web产物',['HTML / CSS / JS','资源前缀/shop/'],'good')+
box(32,392,512,128,'package.json也影响目标',['应用示例移除默认main字段','browserslist控制实际支持环境'])+
box(576,392,512,128,'浏览器验收',['从产物服务器打开、点击并刷新','检查URL、类型、CSS与错误恢复']),
['转换TypeScript不等于完整类型检查；零配置不等于无需部署和兼容性合同。']);

svg('ecosystem-boundaries','从组件到交付，各层负责不同问题','商品页可以同时采用组件框架、应用框架与构建工具；选择不是互斥四选一。',752,
edge('M336 208H408')+edge('M712 208H784')+edge('M936 280V392')+
box(32,144,304,136,'组件与状态',['数量、筛选、草稿','React / Vue / Angular / Svelte'])+
box(408,144,304,136,'Web应用组织',['路由、数据加载、渲染','Next / Nuxt / SvelteKit等'],'info')+
box(784,144,304,136,'工程构建',['模块、资源、质量检查','Vite / Webpack / Parcel'])+
box(784,392,304,128,'Web交付',['SSG：静态资源服务器','SSR：请求运行时与资源'],'good')+
box(32,392,656,128,'跨端采用另需平台合同',['移动端、小程序、桌面各有渲染与插件边界','共享业务逻辑不代表支付、权限与发布审核通用']),
['库发布另看Rollup的消费格式与外部依赖；首屏与交互性能必须用同条件数据验证。']);
