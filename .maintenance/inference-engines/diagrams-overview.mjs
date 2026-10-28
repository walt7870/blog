// Figures for docs/ai/inference-engines/index.md and 09-comparison.md.
// Run: node .maintenance/inference-engines/diagrams-overview.mjs
import { svg, box, edge, text, write } from './svg-kit.mjs';

// Where each framework sits: orchestration layer above data-center engines; local runtimes separately.
function landscape() {
  const W = 1360, H = 560;
  let body = '';
  body += box('orch', 32, 108, 1296, 118, 'violet', '编排与 KV 缓存层（第 08 篇）',
    ['Dynamo · llm-d · vLLM production-stack · AIBrix：路由、P/D 编排、按 SLO 扩缩', 'Mooncake · LMCache · NIXL：KV 传输与多级缓存'], '几十张卡以上才需要');
  const ys = 270, hs = 250, w = 300;
  const dc = [
    ['dc-vllm', 'vLLM（01）', ['覆盖最广的通用引擎', '模型与硬件插件最多'], 'blue'],
    ['dc-sglang', 'SGLang（02）', ['基数树前缀缓存', '大规模 MoE 与 P/D'], 'blue'],
    ['dc-trt', 'TensorRT-LLM（03）', ['NVIDIA 官方', '新硬件与低精度领先'], 'blue'],
    ['dc-lmd', 'LMDeploy（04）', ['TurboMind + PyTorch', '国产卡与 W4A16'], 'blue'],
  ];
  body += text(32, ys - 12, '数据中心推理引擎：多人并发、GPU 服务器', 'k');
  dc.forEach(([id, t, l, c], i) => {
    const x = 32 + (i % 2) * (w + 16), y = ys + Math.floor(i / 2) * 126;
    body += box(id, x, y, w, 110, c, t, l);
  });
  body += text(700, ys - 12, '本地与端侧：单人或少量用户、个人设备', 'k');
  const local = [
    ['lc-llama', 'llama.cpp（05）', ['GGUF 量化、CPU/GPU 混合', '硬件覆盖最广'], 'green'],
    ['lc-ollama', 'Ollama（06）', ['模型管理 + 常驻 API', '底层调用 llama.cpp/MLX'], 'green'],
    ['lc-mlx', 'MLX-LM（07）', ['Apple 芯片统一内存', '本地量化与 LoRA'], 'green'],
    ['lc-edge', 'ExecuTorch · MLC-LLM（07）', ['打包进 App', '手机与浏览器'], 'green'],
  ];
  local.forEach(([id, t, l, c], i) => {
    const x = 700 + (i % 2) * (306 + 16), y = ys + Math.floor(i / 2) * 126;
    body += box(id, x, y, 306, 110, c, t, l);
  });
  body += edge('M332 228V262', 'dash');
  return svg('engines-landscape', W, H,
    '推理框架的分层位置',
    '上层是编排与 KV 缓存组件，管理多个引擎实例；左下是面向 GPU 服务器的数据中心引擎 vLLM、SGLang、TensorRT-LLM、LMDeploy；右下是面向个人设备的 llama.cpp、Ollama、MLX-LM 与端侧运行时。',
    '推理框架在哪一层',
    '括号里是本系列对应的篇号；编排层组合使用下面的引擎，不和它们放在一起比较跑分',
    body);
}

// Selection flow used by 09-comparison.md.
function selection() {
  const W = 1360, H = 620;
  let body = '';
  const q = (id, x, y, t, l) => box(id, x, y, 300, 104, 'amber', t, l);
  const a = (id, x, y, t, l, c = 'green') => box(id, x, y, 300, y > 400 ? 104 : 124, c, t, l);
  body += q('q1', 32, 112, '在哪里运行？', ['个人电脑、手机', '还是 GPU 服务器']);
  body += a('a-local', 32, 300, '本地与端侧', ['想要现成服务：Ollama', '要细调参数：llama.cpp', 'Mac 上量化微调：MLX-LM']);
  body += a('a-edge', 32, 470, '打包进 App', ['ExecuTorch、MLC-LLM', '或 llama.cpp 库'], 'gray');
  body += q('q2', 372, 112, '硬件是什么？', ['NVIDIA、AMD、昇腾等', '决定能选哪些引擎']);
  body += a('a-cn', 372, 300, '昇腾等国产卡', ['各引擎的硬件插件', 'LMDeploy PyTorch 引擎', '先查型号支持矩阵'], 'gray');
  body += q('q3', 712, 112, '默认起点：vLLM', ['模型、量化、接口最全', '先建基线再比较']);
  body += a('a-sgl', 712, 300, '换 SGLang 试试', ['前缀复用多：多轮、Agent', '大 MoE 多机、P/D'], 'blue');
  body += a('a-trt', 712, 470, '换 TensorRT-LLM 试试', ['模型和 NVIDIA 卡固定', 'FP8/NVFP4 追极致性能'], 'blue');
  body += q('q4', 1052, 112, '规模多大？', ['几个副本还是几十张卡', '是否共享长前缀']);
  body += a('a-few', 1052, 300, '几个副本', ['负载均衡 + 会话亲和', '不需要编排层']);
  body += a('a-many', 1052, 470, '十个副本以上', ['Dynamo 或 llm-d', 'KV 感知路由、P/D'], 'violet');
  body += edge('M182 218V292');
  body += edge('M182 426V462', 'dash');
  body += edge('M334 164H364');
  body += edge('M522 218V292', 'dash');
  body += edge('M674 164H704');
  body += edge('M862 218V292', 'dash');
  body += edge('M862 426V462', 'dash');
  body += edge('M1014 164H1044');
  body += edge('M1202 218V292');
  body += edge('M1202 426V462', 'dash');
  body += text(372, 470, '每一步都用业务数据实测：', 's');
  body += text(372, 496, '质量 → 模型与硬件支持 →', 's');
  body += text(372, 522, '真实负载下的 Goodput', 's');
  return svg('engines-selection', W, H,
    '推理框架的选型路径',
    '先看运行位置：个人设备选 Ollama、llama.cpp、MLX-LM 或端侧运行时；GPU 服务器再看硬件，国产卡查插件和 LMDeploy；默认从 vLLM 建基线，前缀复用多或大 MoE 时试 SGLang，固定模型和 NVIDIA 卡追性能时试 TensorRT-LLM；最后按规模决定是否需要 Dynamo、llm-d 这类编排层。',
    '怎样选推理框架',
    '实线是主路径，虚线是满足条件时的分支；每个候选都要用自己的模型和请求实测',
    body);
}

write({ 'engines-landscape': landscape(), 'engines-selection': selection() });
