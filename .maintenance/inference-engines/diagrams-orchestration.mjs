// Figures for docs/ai/inference-engines/08-orchestration.md.
// Run: node .maintenance/inference-engines/diagrams-orchestration.mjs
import { svg, box, edge, text, label, write } from './svg-kit.mjs';

// ---- orch-layers ---------------------------------------------------------------
// Left: the request path through the layers. Right: which project lives in which layer.
function layers() {
  const W = 1340, H = 1092;
  const lx = 32, lw = 640, rx = 712, rw = 596;
  const rows = [
    // [id, y, h, cls, kicker, title, lines(left), projects(right)]
    ['gw', 112, 120, 'gray', '入口', 'API 网关', ['鉴权、限流、配额、TLS（第 21 篇已讲）'],
      ['Envoy、Istio、agentgateway 等网关', 'Dynamo Frontend：OpenAI 兼容入口']],
    ['router', 256, 168, 'blue', '路由层', '选择哪个副本处理这个请求', ['前缀/KV 感知 + 负载感知 + 会话亲和', '读取各副本的 KV 事件与负载指标'],
      ['Dynamo Router（KV 路由）', 'llm-d Router（GAIE 的 Endpoint Picker）', 'production-stack router', 'AIBrix 网关路由插件']],
    ['engine', 448, 150, 'green', '引擎层', '推理引擎副本：合并部署或 P/D 两个池', ['Prefill 池  →  KV  →  Decode 池', 'vLLM / SGLang / TensorRT-LLM 不变'],
      ['引擎本身：vLLM、SGLang、TensorRT-LLM', 'Dynamo 的 dynamo.vllm 等包装进程', 'llm-d / AIBrix 直接管理引擎 Pod']],
    ['xfer', 622, 120, 'violet', 'KV 传输', '把 KV 从一台机器搬到另一台', ['RDMA / NVLink / TCP，GPU 直接读写'],
      ['NIXL（vLLM NixlConnector、Dynamo、llm-d）', 'Mooncake Transfer Engine（SGLang P/D 默认）']],
    ['tier', 766, 150, 'amber', 'KV 缓存层级', 'GPU 显存放不下的 KV 往下放', ['GPU HBM → CPU 内存 → 本地 SSD → 远端池', '命中则少算一次 Prefill'],
      ['LMCache（vLLM/SGLang 的 KV 层）', 'Mooncake Store · Dynamo KVBM', 'llm-d 分级前缀缓存 · AIBrix KV 缓存']],
  ];
  const rtitle = { gw: '网关与入口', router: '路由器 / 调度器', engine: '引擎与包装进程', xfer: '传输库', tier: '多级 KV 缓存组件' };
  let body = '';
  body += text(lx, 104, '请求怎样往下走', 'k');
  body += text(rx, 104, '各项目落在哪一层', 'k');
  rows.forEach(([id, y, h, cls, k, t, lines, proj], i) => {
    body += box(`l-${id}`, lx, y, lw, h, cls, t, lines, k);
    body += box(`r-${id}`, rx, y, rw, h, 'node', rtitle[id], proj.map(p => '· ' + p), k);
    body += edge(`M${lx + lw + 4} ${y + h / 2}H${rx - 6}`, 'dash');
    if (i < rows.length - 1) {
      const ny = rows[i + 1][1];
      body += edge(`M${lx + 120} ${y + h + 2}V${ny - 4}`);
    }
  });
  // control plane strip across the bottom
  body += box('ctl', lx, 948, W - 64, 112, 'red', '按 SLO 或负载指标增减副本，调整 Prefill 与 Decode 的比例',
    ['Dynamo Planner · llm-d 用 KEDA + 路由器指标 · AIBrix PodAutoscaler · production-stack 用 KEDA'], '控制面（横跨各层）');
  body += edge(`M${lx + 520} 946V${766 + 150 + 4}`, 'dash');
  return svg('orch-layers', W, H,
    '推理编排层的分层结构与各开源项目的位置',
    '请求从 API 网关进入，路由层根据各副本的 KV 缓存与负载选择副本，引擎层可以合并部署或拆成 Prefill 与 Decode 两个池，KV 通过 NIXL 或 Mooncake Transfer Engine 传输，放不下的 KV 下沉到 CPU 内存、SSD 和远端缓存池。右侧列出 Dynamo、llm-d、production-stack、AIBrix、LMCache、Mooncake 各自主要落在哪一层；扩缩容控制器横跨各层。',
    '引擎之上的编排层：五层，各项目各占几层',
    '左侧是请求经过的层次；右侧是承担这一层的开源组件。底部的控制面按指标增减各层副本。',
    body);
}


// ---- orch-kv-routing -------------------------------------------------------------
// Teaching numbers: prompt = 50 KV blocks; cost follows Dynamo's default formula with
// overlap credit 1.0 and prefill_load_scale 1.0: cost = max(0, 50 - hit) + (active + 50).
function kvRouting() {
  const W = 1340, H = 820;
  let body = '';
  body += box('req', 32, 112, 300, 150, 'blue', '新请求：资料问答', ['系统提示 + 员工手册片段 + 问题', '共 50 个 KV 块'], '1 进入路由器');
  body += box('hash', 32, 300, 300, 150, 'node', '按块计算前缀哈希', ['h1 → h2 → … → h50', '每个哈希包含前面所有块'], '2 分词与切块');
  body += edge('M182 264V298');
  body += box('index', 380, 300, 340, 150, 'violet', '全局 KV 索引', ['记录每个哈希在哪些副本上', '查到最长连续命中前缀'], '3 查索引');
  body += edge('M334 375H378');
  // workers
  const ws = [
    ['A', 112, '命中 40 块', '活跃 300 块', 'max(0, 50−40) + (300+50) = 360', 'node'],
    ['B', 300, '命中 0 块', '活跃 120 块', 'max(0, 50−0) + (120+50) = 220', 'node'],
    ['C', 488, '命中 40 块', '活跃 150 块', 'max(0, 50−40) + (150+50) = 210', 'green'],
  ];
  ws.forEach(([n, y, hit, act, cost, cls]) => {
    body += box(`w-${n}`, 800, y, 508, 150, cls, `副本 ${n}：${hit}，${act}`, ['成本 = 待算 Prefill 块 + 预计 Decode 块', cost], n === 'C' ? '4 选中：成本最低' : '4 打分');
  });
  body += edge('M722 340C760 340 760 187 798 187');
  body += edge('M722 375H798');
  body += edge('M722 410C760 410 760 563 798 563');
  // events loop
  body += box('events', 380, 676, 928, 112, 'amber', '副本上报 KV 事件：块存入、块淘汰', ['路由器据此更新索引；事件滞后或丢失时，索引会和真实缓存不一致，只能当作“估计”'], '5 反馈');
  body += edge('M1054 640V674', 'dash');
  body += edge('M550 674V452', 'dash');
  body += box('note', 32, 488, 300, 300, 'gray', '读法', ['A 缓存最多但很忙；', 'B 最闲但要从头算；', 'C 两头都过得去。', '只看命中会选 A，', '只看负载会选 B。', '数字为教学示例。']);
  return svg('orch-kv-routing', W, H,
    'KV 感知路由怎样为一个请求选择副本',
    '路由器把请求按 KV 块计算前缀哈希，在全局 KV 索引中查出每个副本已缓存的连续前缀块数，再按“待算 Prefill 块数加预计 Decode 块数”为每个副本计算成本。示例中副本 A 命中 40 块但活跃 300 块，成本 360；副本 B 不命中但活跃 120 块，成本 220；副本 C 命中 40 块、活跃 150 块，成本 210，被选中。副本通过 KV 事件把块的存入和淘汰报告给索引。',
    'KV 感知路由：命中和负载一起算',
    '公式取自 Dynamo Router 的默认成本函数（重叠抵扣 1.0、Prefill 权重 1.0）；llm-d、AIBrix 用打分插件表达同一种取舍',
    body);
}

write({ 'orch-layers': layers(), 'orch-kv-routing': kvRouting() });
