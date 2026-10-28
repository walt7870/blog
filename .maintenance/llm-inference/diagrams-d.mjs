// Figure for the vLLM hands-on page (vllm-quickstart.md).
// Run: node .maintenance/llm-inference/diagrams-d.mjs
import { svg, box, edge, text, write } from './svg-kit.mjs';

function startup() {
  const W = 1340, H = 520, y = 112, h = 164, w = 236, gap = 24, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const steps = [
    ['1 读取配置', '模型与分词器', ['下载或读取模型文件', '确定 dtype 和量化', '确定 max_model_len'], 'node'],
    ['2 加载权重', '权重进显存', ['8B 模型 BF16', '约 15 GiB', '多卡时每卡一份切片'], 'blue'],
    ['3 试跑测峰值', '用假数据跑一批', ['按单步 token 上限', '测出激活的峰值'], 'violet'],
    ['4 分配 KV', '剩下的都给 KV', ['79.6 GiB × 0.92', '− 权重 − 峰值', '≈ 55 GiB，约 45 万 token'], 'green'],
    ['5 录制 CUDA Graph', '开始服务', ['按常见批大小录图', '监听 8000 端口'], 'amber'],
  ];
  let body = '';
  steps.forEach(([k, t, lines, cls], i) => {
    body += box(`step-${i + 1}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 4) body += edge(`M${xs[i] + w + 2} ${y + h / 2}H${xs[i + 1] - 4}`);
  });
  const ey = 336, eh = 128;
  const errors = [
    [0, '报 401 或 403', ['门控模型没有授权：', '登录并在模型页同意协议']],
    [1, '空闲显存小于预算', ['加载前检查，别的进程', '占着显存：腾出或调低比例']],
    [3, 'KV 放不下最长请求', ['调高利用率比例，', '或调小 max_model_len']],
  ];
  errors.forEach(([i, t, lines]) => {
    body += edge(`M${xs[i] + w / 2} ${y + h + 2}V${ey - 4}`, 'dash');
    body += box(`err-${i + 1}`, xs[i], ey, w, eh, 'red', t, lines, '启动失败');
  });
  body += text(xs[2] + 18, ey + 40, '虚线：这一步可能出现的', 'xs');
  body += text(xs[2] + 18, ey + 62, '启动错误和处理方向。', 'xs');
  body += text(xs[2] + 18, ey + 96, '第 4 步的数字是本篇', 'xs');
  body += text(xs[2] + 18, ey + 118, '按 H100 手算的估计。', 'xs');
  return svg('vllm-startup', W, H,
    'vllm serve 启动时的五个步骤',
    '读取配置、加载权重、试跑测出激活峰值、把剩余预算分给 KV Cache、录制 CUDA Graph 后开始服务；第 1、2、4 步分别可能因模型未授权、空闲显存不足、KV 放不下最长请求而启动失败。',
    'vllm serve 启动时做了什么',
    '日志从上到下就是这五步；KV 容量要等前三步做完才能算出来',
    body);
}

write({ 'vllm-startup': startup() });
