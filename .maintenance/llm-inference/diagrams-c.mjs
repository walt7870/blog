// Figures for docs/ai/llm-inference/ chapters 13–22 (batch C). Run: node .maintenance/llm-inference/diagrams-c.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

const figures = {
  'nano-vllm-map': svg('nano-vllm-map', 960, 700, 'nano-vllm 的结构', 'LLMEngine.step 每一圈调用 Scheduler 选出请求，BlockManager 分配 KV 块与前缀哈希，ModelRunner 准备输入并执行 Qwen3 模型，Attention 层写入分页 KV 并调用 FlashAttention，Sampler 选出 token，再由 postprocess 追加 token、判断结束。张量并行时其他 rank 的 ModelRunner 在子进程中通过共享内存和事件接收调用。',
    'nano-vllm：一圈 step() 经过的四层', '调度决定算谁，块管理决定 KV 放哪，执行器准备输入并跑模型，注意力层读写分页 KV。',
    [
      box('engine', 32, 112, 896, 76, 'amber', 'LLMEngine.step()', ['engine/llm_engine.py · 90 行：schedule → run → postprocess，循环到队列为空'], ),
      box('sched', 32, 228, 280, 172, 'blue', 'Scheduler', ['engine/scheduler.py · 92 行', 'Prefill 优先、token 预算', '只有首个请求可分块', '块不够时抢占队尾'], '调度'),
      box('block', 32, 436, 280, 172, 'blue', 'BlockManager', ['engine/block_manager.py · 120 行', '分配块、引用计数', 'xxh64 链式哈希命中前缀', '块大小默认 256'], 'KV 块'),
      box('runner', 340, 228, 280, 172, 'green', 'ModelRunner（rank 0）', ['engine/model_runner.py · 257 行', '按显存余量算 KV 块数', 'slot_mapping、块表', 'Decode 用 CUDA Graph'], '执行准备'),
      box('model', 340, 436, 280, 172, 'green', 'Qwen3 模型层', ['models/qwen3.py · 216 行', 'layers/linear.py · 156 行', '张量并行线性层', 'Sampler：只有温度'], '前向计算'),
      box('attn', 648, 436, 280, 172, 'violet', 'Attention 层', ['layers/attention.py · 75 行', 'store_kvcache 写分页 KV', 'flash_attn_varlen_func', 'flash_attn_with_kvcache'], '注意力'),
      box('tp', 648, 228, 280, 172, 'gray', 'ModelRunner（rank 1…）', ['张量并行子进程', '共享内存 + 事件接收调用', '各算一份，all_reduce 汇总', '只支持单机，TP ≤ 8'], '其他 GPU'),
      edge('M172 188V228'), edge('M172 400V436'),
      edge('M312 300H340'),
      edge('M480 400V436'), edge('M620 522H648'),
      edge('M620 300H648', 'dash'),
      label(624, 286, 'call', 40),
      `<path d="M32 632H928" class="line"/>`,
      text(32, 662, '返回路径：Sampler 选出的 token 回到 Scheduler.postprocess，追加 token、为写满的块算哈希、遇到 EOS 或 max_tokens 就释放块。'),
      text(32, 688, '行数按提交 bb823b3 用 wc -l 统计，含空行；nanovllm/ 包合计 1385 行。', 'xs'),
    ].join('\n')),

  'quant-targets': svg('quant-targets', 960, 560, '量化的三个对象', '权重、激活、KV Cache 三类数据都可以量化：权重量化如 W4A16 减少每步搬运的字节，主要加速 Decode；激活量化如 W8A8 让矩阵乘法使用低精度计算单元，主要加速 Prefill；KV 量化如 FP8 KV 扩大 KV 容量、减少读取，主要帮助长上下文和高并发。',
    '量化的三个对象：省的东西不同，受益的阶段也不同', 'WxAy 只说明权重和激活的位数，KV Cache 的精度要另外看。',
    [
      box('w', 32, 120, 280, 300, 'blue', '权重', ['常见格式：W4A16、W8A16', '方法：GPTQ、AWQ', '', '省：权重显存', '省：每步搬运的字节', '', '主要受益：Decode', '风险：模型能力下降'], '对象 1'),
      box('a', 340, 120, 280, 300, 'green', '激活', ['常见格式：W8A8（INT8 / FP8）', '方法：SmoothQuant、在线 FP8', '', '省：用上低精度计算单元', 'H100 上 FP8 峰值约 BF16 两倍', '', '主要受益：Prefill', '风险：离群通道难量化'], '对象 2'),
      box('kv', 648, 120, 280, 300, 'amber', 'KV Cache', ['常见格式：FP8 KV', '更激进：2 位（KIVI）', '', '省：KV 显存，并发翻倍', '省：每步读取的 KV', '', '主要受益：长上下文、高并发', '风险：历史信息误差累积'], '对象 3'),
      `<path d="M32 452H928" class="line"/>`,
      text(32, 488, '例：Llama-3.1-8B 权重 BF16 约 16.1 GB → 4 位约 4.1 GB；每 token KV 128 KiB → FP8 后 64 KiB。'),
      text(32, 516, '同一个模型可以只量化其中一项，也可以组合使用；每一项都要单独验收质量与性能。'),
    ].join('\n')),

  'speculative-round': (() => {
    const draft = ['先', '提交', '审批', '表单'];
    const verify = ['先', '提交', '申请', '再', '等待'];
    let b = [];
    b.push(text(32, 132, '起草：草稿模型连续猜 4 个（γ = 4）', 't'));
    b.push(cell(32, 150, 96, 44, 'gray', '…申请？', 's'));
    draft.forEach((d, i) => b.push(cell(150 + i * 112, 150, 96, 44, 'fviolet', d, 's')));
    b.push(text(32, 246, '验证：目标模型一次前向，算出 5 个位置各自的下一个 token', 't'));
    verify.forEach((d, i) => b.push(cell(150 + i * 112, 264, 96, 44, 'fblue', d, 's')));
    b.push(text(32, 292, '目标给出', 'xs'));
    b.push(text(32, 360, '接受：逐个比较，到第一个不一致为止', 't'));
    const res = [['先', 'fgreen', '接受'], ['提交', 'fgreen', '接受'], ['申请', 'famber', '替换为目标结果'], ['表单', 'fred', '作废'], ['', 'fgray', '']];
    res.forEach(([d, c, l], i) => {
      if (i === 4) return;
      b.push(cell(150 + i * 112, 378, 96, 44, c, d, 's'));
      b.push(text(198 + i * 112, 444, l, 'xs', 'middle'));
    });
    b.push(`<path d="M150 470H${150 + 3 * 112 - 16}" class="edge"/>`);
    b.push(text(150, 496, '本轮前进 3 个 token（2 个接受 + 1 个替换），第 4 个是在错误前文之后猜的，丢弃'));
    b.push(`<path d="M32 524H928" class="line"/>`);
    b.push(text(32, 556, '每轮至少前进 1 个（第一个就猜错），至多 γ + 1 个（全部猜对，再加目标在最后位置给出的 1 个）。'));
    b.push(text(32, 582, '猜对与否按接受规则判断；随机采样时以 min(1, p/q) 接受，被拒处从修正分布重采样，输出分布不变。', 'xs'));
    return svg('speculative-round', 960, 610, '一轮投机解码', '草稿模型猜出 4 个 token，目标模型一次前向验证 5 个位置，前 2 个接受，第 3 个替换为目标模型的结果，第 4 个作废，本轮前进 3 个 token。',
      '一轮投机解码：猜 4 个，验 5 个位置，前进 3 个', '目标模型搬一次权重就检查完全部猜测，猜对的部分不必再逐个串行生成。', b.join('\n'));
  })(),

  'tensor-parallel': svg('tensor-parallel', 960, 580, '张量并行切分 MLP', '两张 GPU 做张量并行：第一个矩阵按列切分，每张卡用完整输入算出一半中间结果，不需要通信；第二个矩阵按行切分，每张卡得到一份部分和，经 all-reduce 相加得到完整输出。每层注意力和 MLP 各一次 all-reduce。',
    '张量并行：先按列切，再按行切，最后 all-reduce', '以两张 GPU 上的 MLP 为例；注意力层按头切分，结构相同。',
    [
      box('x', 32, 230, 150, 110, 'gray', '输入 X', ['每张卡都有', '完整一份']),
      box('g0a', 232, 130, 210, 120, 'blue', 'GPU 0：W₁ 左半列', ['算出中间结果', '的前一半']),
      box('g1a', 232, 320, 210, 120, 'green', 'GPU 1：W₁ 右半列', ['算出中间结果', '的后一半']),
      box('g0b', 492, 130, 210, 120, 'blue', 'GPU 0：W₂ 上半行', ['得到部分和 Y₀']),
      box('g1b', 492, 320, 210, 120, 'green', 'GPU 1：W₂ 下半行', ['得到部分和 Y₁']),
      box('ar', 752, 230, 176, 110, 'amber', 'all-reduce', ['Y = Y₀ + Y₁', '需要卡间通信']),
      edge('M182 270Q206 270 206 230Q206 190 232 190'), edge('M182 300Q206 300 206 340Q206 380 232 380'),
      edge('M442 190H492'), edge('M442 380H492'),
      label(446, 176, '无通信', 64), label(446, 366, '无通信', 64),
      edge('M702 190Q728 190 728 230Q728 262 752 262'), edge('M702 380Q728 380 728 340Q728 308 752 308'),
      text(232, 112, '列切分（第一个矩阵）', 'k'), text(492, 112, '行切分（第二个矩阵）', 'k'),
      `<path d="M32 474H928" class="line"/>`,
      text(32, 508, '每层 2 次 all-reduce（注意力 1 次 + MLP 1 次）。70B 模型 80 层，每生成一个 token 要做 160 次。'),
      text(32, 536, '每次数据量不大但次数多，对延迟敏感，所以 TP 通常只在同一台机器内、有 NVLink 的 GPU 之间使用。'),
    ].join('\n')),

  'concurrency-sweep': (() => {
    const X0 = 110, Y0 = 470, W = 560, H = 330;
    const xs = [1, 2, 4, 8, 16, 32, 64];
    const xp = i => X0 + 20 + i * (W - 40) / 6;
    const thr = [0.07, 0.14, 0.27, 0.5, 0.78, 0.92, 0.95];
    const lat = [0.12, 0.12, 0.13, 0.15, 0.22, 0.5, 0.95];
    const yp = v => Y0 - v * H;
    const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${xp(i).toFixed(1)} ${yp(v).toFixed(1)}`).join('');
    const b = [];
    b.push(`<path d="M${X0} ${Y0 - H - 10}V${Y0}H${X0 + W}" class="axis"/>`);
    xs.forEach((x, i) => b.push(text(xp(i), Y0 + 24, String(x), 'xs', 'middle')));
    b.push(text(X0 + W / 2, Y0 + 52, '并发数（逐档加倍）', 's', 'middle'));
    b.push(`<path d="${path(thr)}" fill="none" stroke="#3b82f6" stroke-width="3"/>`);
    b.push(`<path d="${path(lat)}" fill="none" stroke="#e11d48" stroke-width="3" stroke-dasharray="8 5"/>`);
    // SLO line on latency scale
    const slo = 0.3;
    b.push(`<path d="M${X0} ${yp(slo)}H${X0 + W}" stroke="#e0a63a" stroke-width="2" stroke-dasharray="4 4"/>`);
    b.push(label(X0 + 8, yp(slo) - 8, 'P99 延迟目标（SLO）', 160));
    // knee: between 16 and 32 where latency crosses slo
    const kx = xp(4) + (xp(5) - xp(4)) * ((slo - lat[4]) / (lat[5] - lat[4]));
    b.push(`<path d="M${kx.toFixed(1)} ${Y0}V${Y0 - H - 10}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3 4"/>`);
    b.push(label(kx - 64, Y0 - H - 16, '拐点：满足 SLO 的容量', 186));
    b.push(box('legend', 700, 150, 228, 170, 'node', '图例', ['蓝色实线：系统吞吐', '红色虚线：P99 延迟', '黄色虚线：延迟目标', '灰色竖线：拐点']));
    b.push(box('note', 700, 340, 228, 130, 'amber', '示意图', ['形状示意，不是实测数据', '拐点位置随模型、硬件', '和请求分布变化']));
    b.push(text(32, 572, '拐点之前：批变大几乎不增加步长，吞吐近似线性上升；拐点之后：KV 读取、抢占和排队让延迟急剧变差。'));
    return svg('concurrency-sweep', 960, 600, '并发扫描示意', '示意图：随并发增加，系统吞吐先快速上升后趋于平缓，P99 延迟先基本不变，在拐点后急剧上升；P99 延迟越过 SLO 的位置就是满足延迟目标时的容量。',
      '并发扫描：找到吞吐与延迟的拐点', '纵轴为相对值；同一张图上看吞吐与 P99 延迟随并发的变化。', b.join('\n'));
  })(),

  'production-architecture': svg('production-architecture', 960, 600, '生产推理服务的组成', '客户端请求经 API 网关做鉴权、限流和 TLS，路由层按前缀和负载选择推理引擎副本，副本运行在 GPU 上，启动时从模型存储加载权重；各层的指标和日志汇入 Prometheus 与 Grafana。',
    '生产推理服务：引擎之外还需要四样东西', '鉴权、路由、权重存储和监控都不在推理引擎里，要自己补齐。',
    [
      box('client', 32, 150, 150, 120, 'gray', '客户端', ['应用、用户', 'SDK 调用']),
      box('gw', 214, 130, 210, 160, 'amber', 'API 网关', ['鉴权、TLS', '限流、配额', '输入长度上限', '请求日志']),
      box('router', 456, 130, 210, 160, 'violet', '路由层', ['前缀感知', '会话亲和', '负载感知']),
      box('r1', 698, 112, 230, 76, 'blue', '引擎副本 1', ['vLLM / SGLang · GPU']),
      box('r2', 698, 200, 230, 76, 'blue', '引擎副本 2', ['vLLM / SGLang · GPU']),
      box('r3', 698, 288, 230, 76, 'blue', '引擎副本 N', ['按等待队列扩缩容']),
      box('store', 698, 410, 230, 110, 'green', '模型存储', ['本地盘或高速共享存储', '固定模型版本']),
      box('mon', 214, 410, 452, 110, 'node', '监控与告警', ['Prometheus 收集指标，Grafana 展示', 'TTFT/TPOT 分位数、等待队列、KV 使用率、抢占']),
      edge('M182 210H214'), edge('M424 210H456'),
      edge('M666 180Q682 180 682 150H698'), edge('M666 210Q682 210 682 238H698'), edge('M666 240Q682 240 682 326H698'),
      edge('M812 410V364'), label(820, 392, '启动时加载权重', 128),
      edge('M698 350H682V465H666', 'dash'), edge('M440 290V410', 'dash'),
      label(448, 360, '指标、日志', 96),
      text(32, 560, '副本启动要拉镜像、加载权重、预热和录制 CUDA Graph，往往要几分钟：健康检查要放宽，扩容要留余量。'),
    ].join('\n')),

  'edge-pipeline': svg('edge-pipeline', 960, 740, '端侧部署链路', '训练好的模型经过导出、量化与转换、后端编译或委托，得到 .pte、.gguf、.onnx、.mlpackage 等模型文件，由设备上的运行时加载，再调用 CPU、GPU 或 NPU 后端执行；NPU 不支持的算子回退到 CPU。图中区分模型格式、运行时和后端三个层次。',
    '端侧部署：格式、运行时、后端是三个层次', '“支持 Android”“支持 NPU”“支持这个模型”是三个独立条件，要确认整个组合可用。',
    [
      box('train', 32, 120, 196, 110, 'gray', '训练好的模型', ['PyTorch 权重', 'safetensors']),
      box('export', 260, 120, 196, 110, 'node', '导出', ['torch.export、ONNX', '或转换为 GGUF']),
      box('quant', 488, 120, 196, 110, 'node', '量化与转换', ['4 位权重为主', '图变换、算子融合']),
      box('lower', 716, 120, 212, 110, 'node', '后端编译 / 委托', ['按目标后端划分', '和编译子图']),
      edge('M228 175H260'), edge('M456 175H488'), edge('M684 175H716'),
      box('fmt', 32, 280, 896, 108, 'blue', '模型格式（文件）', ['.pte（ExecuTorch）  .gguf（llama.cpp）  .onnx（ONNX Runtime）  .mlpackage（Core ML）'], '层次 1'),
      edge('M822 230V280'),
      box('rt', 32, 420, 896, 108, 'green', '运行时（设备上的程序）', ['加载模型、管理内存、调度执行：ExecuTorch、llama.cpp、MLX、MLC-LLM、ONNX Runtime、LiteRT'], '层次 2'),
      edge('M480 388V420'),
      box('cpu', 32, 580, 280, 90, 'amber', 'CPU', ['兼容性最好，NEON 等向量指令']),
      box('gpu', 340, 580, 280, 90, 'amber', 'GPU', ['Metal、Vulkan、OpenCL']),
      box('npu', 648, 580, 280, 90, 'amber', 'NPU', ['能效高，算子支持受限']),
      edge('M172 528V580'), edge('M480 528V580'), edge('M788 528V580'),
      edge('M788 670V700H172V676', 'dash'), label(390, 706, '不支持的算子回退到 CPU 执行', 226),
      text(820, 568, '层次 3：后端', 'k'),
    ].join('\n')),
};

write(figures);
