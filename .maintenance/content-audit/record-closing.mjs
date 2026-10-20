import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = new URL('./', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
const scan = read('site-scan.json');
const pending = read('page-reviews.json').pages.filter(p => p.status === 'pending');
const assets = folder => fs.readdirSync(new URL('../../public/' + folder, base), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? assets(folder + '/' + e.name) : /\.(svg|webp|png|py)$/.test(e.name) ? ['public/' + folder + '/' + e.name] : []);
const decisions = {
  'AGENTS.md': ['维护约束', '完整核对导航、资源、写作、图示及部署约束，保留为仓库维护规则，无需知识图示。'],
  'README.md': ['维护说明', '核对 Node 与 VitePress alpha 固定版本、本地搜索配置及构建预览命令；注明预发布性质与验证要求。'],
  'index.md': ['站点首页', '保留首页文案与入口，将裁切和重叠的绝对定位专题地图改为八主题响应式网格。'],
  'notes.md': ['专题目录', '核对 TopicDirectory 与统一 topics 数据、分类入口和移动端布局；目录无需复制各专题机制图。'],
  'profile/index.md': ['个人概览', '核对经历、代表项目和技术入口；B站技术视频放在GitHub旁，地址与四模式显示通过。'],
  'miniapp/README.md': ['维护说明', '按实际生成脚本修正输入、18类分包、元信息、mp-html与资源边界，补生成链路图；未声称真机验收或全资源离线。'],
  'docs/reading/index.md': ['阅读导读', '补书目入口、按问题阅读路径与阅读范围，不再保留空frontmatter入口。'],
  'docs/reading/2022-07-31/高效能人士的7个习惯.md': ['阅读实践', '重写零散摘录，以项目延期和订单导出解释习惯关系及行动，补个人管理/合作/更新关系图和组织约束。'],
};
const inference = {
  index: '核对14页阅读路径、四阶段交互和机制实验入口，导读以资料助手业务串联。',
  '01-landscape': '核对引擎、应用和训练职责；保留柜台类比、选型边界与职责交互。',
  '02-lifecycle': '核对token、prefill、decode、停止条件与KV状态；逐步实验不冒充真实引擎轨迹。',
  '03-memory': '核对权重/KV/工作区、GQA参数和GiB预算，工作台交互与公式一致，教学数值不代表设备容量保证。',
  '04-cache-attention': '核对Q/K/V、前缀完整页、分块映射与复用限制；位置对照不声称总FLOP加速比。',
  '05-scheduling': '核对静态/连续批处理、并发槽位、17-token守恒及队列限制。',
  '06-quantization': '核对权重与KV量化、校准边界、编译与CUDA Graph区分，roofline仅为计算/带宽下界。',
  '07-speculative': '核对greedy教学验证、拒绝回退和全接受额外token，区分真实采样修正与教学简化。',
  '08-vllm': '核对固定版本、V1组件、调度/缓存与公开启动入口；未运行GPU服务。',
  '09-sglang': '核对RadixAttention、调度重叠、HiCache层级与逐请求停止上限；未运行GPU服务。',
  '10-distributed': '核对TP/PP/DP/EP通信、MoE容量及P/D传输和共享KV关系。',
  '11-speech': '核对ASR/LLM/TTS/Codec边界，流式与全量首音频按教学时间线计算，引用语音工程详解。',
  '12-selection-versions': '重新核对8个引擎官方GitHub最新正式版及日期，区分TRT-LLM预发布，不以版本新旧直接决定选型。',
  '13-practice': '核对镜像/GPU/服务/客户端分层验收、下载脚本与闭环并发口径；4项本地HTTP/SSE回归通过。',
};
const pages = pending.map(p => {
  let entry = decisions[p.file];
  if (p.file.startsWith('projects/')) entry = ['作品集', p.file.endsWith('/index.md')
    ? '核对全部项目入口、分类/技术搜索、空态与列表网格切换，保留个人概览入口。'
    : '完整核对页面映射、项目数据、业务场景、约束与验证范围；保持原项目截图，架构视图逐个切换和原尺寸预览通过。'];
  if (p.file.startsWith('docs/superpowers/')) entry = ['历史维护归档', '完整核对历史正文，增加归档与正式入口说明；排除站点地图与搜索，统一noindex，保留旧路由可达性。'];
  const isInference = p.file.startsWith('docs/ai/inference-series/');
  if (isInference) entry = ['机制与实验', inference[p.file.split('/').at(-1).replace('.md', '')]];
  assert.ok(entry?.[1], p.file);
  return { file: p.file, pageType: entry[0], status: 'verified', findings: [], decision: entry[1],
    dependencyFiles: isInference ? assets('ai/inference-series') : p.file.startsWith('projects/') || p.file === 'profile/index.md' ? assets('projects') : [],
    reviewedHash: scan.pages.find(s => s.file === p.file).reviewHash,
    validation: isInference ? [
      '完整阅读14页及4个Vue组件、计算模块与客户端；显存/页粒度/调度/推测检查和4项本地HTTP/SSE测试通过。未运行GPU引擎或付费模型。',
      '本轮14页56份四模式全文截图通过；原专题29图字体边界、移动排版和交互验收见.maintenance/inference-series/validation.md，最终共享UI复验另行记录。',
    ] : [
      '24页96份四模式全文截图、图片加载与整页宽度检查通过；见evidence/closing。',
      '23个作品集架构视图逐个切换及原尺寸预览，B站链接、筛选空态和列表/网格切换通过；两张新增图字体边界与双视口原尺寸通过。维护说明不外推为小程序真机测试。',
    ] };
});
assert.equal(pages.length, 38);
fs.writeFileSync(new URL('reviews/closing.json', base), JSON.stringify({ pages }, null, 2) + '\n');
console.log(JSON.stringify({ recorded: pages.length }));
