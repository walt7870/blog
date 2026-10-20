import fs from 'node:fs';
const dir=new URL('../../public/front/package-managers/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const t=(x,y,s,c='s')=>`<text x="${x}" y="${y}" class="${c}">${esc(s)}</text>`;
const node=(x,y,w,name,lines=[],c='node')=>`<g data-node="${esc(name)}"><rect x="${x}" y="${y}" width="${w}" height="136" rx="6" class="${c}"/>${t(x+18,y+32,name,'n')}${lines.map((s,i)=>t(x+18,y+62+27*i,s)).join('')}</g>`;
const edge=d=>`<path d="${d}" class="edge"/>`;
function svg(id,title,desc,body,note){fs.writeFileSync(new URL(id+'.svg',dir),`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="688" viewBox="0 0 1120 688" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(desc)}</desc><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#607568"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0;fill:#253c30}.h{font-size:28px;font-weight:600}.n{font-size:21px;font-weight:600}.s{font-size:18px;fill:#52685b}.node{fill:white;stroke:#a6b9ad;stroke-width:1.5}.info{fill:#edf3fb;stroke:#739bbf;stroke-width:1.5}.good{fill:#e9f4ee;stroke:#397657;stroke-width:1.5}.edge{fill:none;stroke:#607568;stroke-width:2;marker-end:url(#${id}-arrow)}</style></defs><rect width="1120" height="688" fill="white"/>${t(32,44,title,'h')}${t(32,82,desc)}${body}${t(32,650,note)}</svg>\n`)}
svg('install-contract','固定环境、安装器和依赖图，再验证真实产物','锁文件记录解析结果；系统、安装脚本、原生模块和构建仍有独立影响。',
edge('M336 208H408')+edge('M712 208H784')+edge('M936 280V376')+edge('M784 440H712')+
node(32,144,304,'运行环境',['Node、操作系统、架构','镜像或版本工具选择'])+
node(408,144,304,'安装器版本',['packageManager声明','Corepack选择pnpm/Yarn'],'info')+
node(784,144,304,'依赖清单与锁文件',['名称、范围、确切解析','冻结安装拒绝不一致'])+
node(784,376,304,'下载、链接与脚本',['registry、缓存与完整性','按工具信任策略执行'])+
node(408,376,304,'构建、测试与产物',['类型、原生能力、资源','不能只看安装退出0'],'good')+
node(32,376,304,'缓存只是输入加速',['安装器与包内容分别缓存','不代替版本及合同验证']),
'Node25起不再捆绑Corepack；普通npm调用默认不由Corepack代理接管。');
svg('dependency-layout','pnpm把内容复用与项目依赖图分开组织','假设admin直接依赖ui，ui直接依赖helper；admin使用helper时仍应自己声明。',
edge('M336 208H408')+edge('M712 208H784')+edge('M936 280V376')+
node(32,144,304,'内容寻址store',['共享包文件内容','导入方式受文件系统影响'])+
node(408,144,304,'项目虚拟store',['.pnpm中的依赖实例','按依赖图组织链接'],'info')+
node(784,144,304,'admin的直接依赖',['admin → ui','根目录可见性受配置影响'])+
node(784,376,304,'ui的依赖上下文',['ui → helper','peer上下文可产生多实例'])+
node(32,376,656,'依赖合同仍要在每个包声明',['admin若直接import helper，应在admin声明它','提升与工具解析可能使未声明依赖偶然可见，不能当作正确性证明'],'good'),
'workspace:*要求本地工作区匹配；锁文件、脚本批准与peer版本需要分别核对。');
svg('yarn-resolution','Yarn两种linker提供不同的模块解析入口','同一个业务导入，在node_modules与PnP下需要不同的解析环境。',
edge('M336 208H408')+edge('M712 208H784')+edge('M336 440H408')+edge('M712 440H784')+
node(32,144,304,'node-modules模式',['业务代码import包','传统Node工具链'])+
node(408,144,304,'磁盘node_modules',['Node沿目录寻找依赖','布局及提升影响可见范围'])+
node(784,144,304,'包文件执行',['仍需直接依赖声明','工作区有构建先后关系'])+
node(32,376,304,'PnP模式',['yarn node或项目脚本','加载对应解析环境'])+
node(408,376,304,'.pnp.cjs解析映射',['把请求映射到包内容','编辑器可能需要SDK'],'info')+
node(784,376,304,'缓存或解包内容',['并非必须node_modules','原生包可能需要解包'],'good'),
'现代Yarn配置在.yarnrc.yml；--immutable禁止修改锁文件，不是禁止所有缓存写入。');
svg('bun-script-trust','依赖安装成功，不代表构建脚本与运行时都已验证','Bun安装器、生命周期策略和应用运行时是三个不同选择。',
edge('M336 208H408')+edge('M712 208H784')+edge('M936 280V376')+
node(32,144,304,'清单与bun.lock',['固定Bun版本','冻结安装核对一致性'])+
node(408,144,304,'依赖脚本信任策略',['内置名单与项目声明','先审查再允许执行'],'info')+
node(784,144,304,'安装与原生构建',['未批准可能跳过脚本','退出0不保证二进制存在'])+
node(784,376,304,'实际运行与回归',['确认Node或Bun运行时','验证平台模块与测试'],'good')+
node(32,376,656,'失败恢复与迁移基线',['脚本缺失先定位包与用途，不全局允许全部代码','迁移在副本进行，保留旧锁、旧安装器和可重现构建']),
'packageManager记录预期，不会自动让Corepack管理Bun；速度收益需同环境量测。');
svg('registry-scope','包名路由与凭证作用范围分别配置','公共包与@company私有包走各自入口，认证只发送到绑定的仓库。',
edge('M336 208H408')+edge('M712 208H784')+edge('M336 440H408')+edge('M712 440H784')+
node(32,144,304,'公共包请求',['如is-number','检查锁中解析地址'])+
node(408,144,304,'公共registry或代理',['公共镜像、企业缓存','不附私有源认证'])+
node(784,144,304,'公共包内容',['校验完整性与来源','仍需审查执行脚本'])+
node(32,376,304,'@company私有包',['显式scope映射','不随意回退公共同名包'])+
node(408,376,304,'企业私有仓库',['仅此目标读取NPM_TOKEN','证书链与权限有效'],'info')+
node(784,376,304,'授权读取包内容',['安装只读与发布分权','令牌不进入产物或日志'],'good'),
'现代Yarn使用.yarnrc.yml；npm/pnpm使用对应.npmrc合同，发布还要检查包内容与目标。');
