// Figures for docs/ai/inference-engines/02-sglang.md.
// Run: node .maintenance/inference-engines/diagrams-sglang.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- sglang-architecture ---------------------------------------------------------
// Process view of `sglang serve` on one node with TP=N, following
// srt/entrypoints/engine.py (_launch_subprocesses) and the ZMQ sockets in
// scheduler_components/ipc_channels.py, tokenizer_manager.py, detokenizer_manager.py.
function architecture() {
  const W = 1340, H = 700;
  let body = '';
  // client
  body += box('client', 32, 150, 228, 170, 'gray', '客户端', ['OpenAI SDK、curl', '或 SMG 路由器'], '请求来源');
  // main process
  body += box('main', 330, 112, 400, 240, 'blue', 'HTTP 服务 + TokenizerManager',
    ['FastAPI：OpenAI、Anthropic、', '原生 /generate 等接口', '套对话模板、分词、', '多模态预处理', '按请求 ID 等结果，', '增量文本以 SSE 推回'], '主进程');
  // scheduler stack: decorative back layers for rank 1..N-1
  body += `<rect x="826" y="128" width="490" height="240" rx="8" class="gray"/>`;
  body += `<rect x="816" y="120" width="490" height="240" rx="8" class="gray"/>`;
  body += box('sched', 806, 112, 490, 240, 'green', 'Scheduler：调度 + 模型执行',
    ['等待队列 → 调度策略（默认 fcfs）', 'RadixCache 匹配前缀、分配 KV 页', '组批：有可做的 prefill 先做，否则 decode', 'TpModelWorker → ModelRunner', '注意力后端 + CUDA Graph → 本卡 GPU', '每张卡一个进程；rank 0 收请求后广播'], '子进程 × TP 卡数');
  // detokenizer
  body += box('detok', 806, 440, 490, 130, 'violet', 'DetokenizerManager',
    ['token ID → 增量文本', '处理停止串与特殊 token'], '子进程');
  // optional
  body += box('opt', 32, 440, 520, 150, 'node', '按需出现的进程',
    ['--dp-size > 1：多一个 DataParallelController', '--nnodes > 1：从节点只跑 Scheduler', '--tokenizer-worker-num > 1：多个分词进程'], '可选');

  // edges
  body += edge('M262 200H326');
  body += label(268, 190, 'HTTP', 52);
  body += edge('M326 290H262');
  body += label(270, 318, 'SSE', 44);
  body += edge('M732 200H802');
  body += label(744, 190, 'ZMQ', 48);
  body += edge('M1050 370V436');
  body += label(1062, 410, 'ZMQ：token ID', 128);
  body += edge('M804 505H640V356');
  body += label(652, 496, 'ZMQ：文本', 92);

  body += text(32, 630, '箭头上的 ZMQ 是同一台机器上的进程间消息（ipc:// 套接字）；同一模型的各 TP rank 之间用 NCCL 做 all-reduce，不经过这些套接字。', 'xs');
  body += text(32, 656, '分词、反分词和 HTTP 处理放在 GPU 进程之外，CPU 上的这些工作就不会占用调度循环的时间。', 'xs');
  return svg('sglang-architecture', W, H,
    'SGLang 服务的进程结构与一个请求的流向',
    '客户端通过 HTTP 把请求发给主进程，主进程里的 TokenizerManager 套模板并分词，经 ZMQ 发给 rank 0 的 Scheduler 进程；每张 GPU 一个 Scheduler 进程，内部包含调度策略、RadixCache 和 ModelRunner；生成的 token ID 经 ZMQ 发给 DetokenizerManager 子进程变成增量文本，再经 ZMQ 回到主进程，以 SSE 推给客户端。按需出现的进程包括 DataParallelController、多机时只跑 Scheduler 的从节点和多个分词进程。',
    'sglang serve 启动后的进程与请求流向',
    '一台机器、TP=N 的情况：一个主进程、N 个 Scheduler 子进程、一个 Detokenizer 子进程',
    body);
}

// ---- sglang-overlap ---------------------------------------------------------------
// Timeline of event_loop_normal vs event_loop_overlap (managers/scheduler.py:1940-2047).
// Widths are illustrative: scheduling ~ half of a forward step for a small model.
function overlap() {
  const W = 1340, H = 700;
  const x0 = 236, lane = 44;
  let body = '';
  const lanes = (y) => {
    body += text(32, y + 29, 'CPU：调度器', 's');
    body += text(32, y + lane + 14 + 29, 'GPU：前向计算', 's');
  };
  // --- normal
  body += text(32, 128, '不重叠：--disable-overlap-schedule', 'k');
  const yN = 142;
  lanes(yN);
  const normal = [
    ['cpu', 0, 90, 'fgray', '组第 1 批'],
    ['gpu', 90, 200, 'fblue', '第 1 批前向'],
    ['cpu', 290, 120, 'fgray', '收结果+组第 2 批'],
    ['gpu', 410, 200, 'fblue', '第 2 批前向'],
    ['cpu', 610, 120, 'fgray', '收结果+组第 3 批'],
    ['gpu', 730, 200, 'fblue', '第 3 批前向'],
    ['cpu', 930, 120, 'fgray', '收第 3 批结果'],
  ];
  for (const [l, s, w, c, t] of normal) {
    const y = l === 'cpu' ? yN : yN + lane + 14;
    body += cell(x0 + s, y, w - 4, lane, c, t);
  }
  for (const [s, w] of [[0, 90], [290, 120], [610, 120], [930, 120]]) {
    body += cell(x0 + s, yN + lane + 14, w - 4, lane, 'fred', 'GPU 空闲');
  }
  // --- overlap
  body += text(32, 300, '重叠调度（默认）：GPU 算第 k 批时，CPU 已经在处理第 k−1 批的结果并组第 k+1 批', 'k');
  const yO = 314;
  lanes(yO);
  const ov = [
    ['cpu', 0, 90, 'fgray', '组第 1 批'],
    ['gpu', 90, 200, 'fblue', '第 1 批前向'],
    ['cpu', 90, 120, 'fgreen', '组第 2 批'],
    ['gpu', 290, 200, 'fblue', '第 2 批前向'],
    ['cpu', 290, 120, 'fgreen', '收第1批+组第3批'],
    ['gpu', 490, 200, 'fblue', '第 3 批前向'],
    ['cpu', 490, 120, 'fgreen', '收第2批+组第4批'],
    ['gpu', 690, 200, 'fblue', '第 4 批前向'],
    ['cpu', 690, 120, 'fgreen', '收第3批+组第5批'],
    ['gpu', 890, 200, 'fblue', '第 5 批前向'],
    ['cpu', 890, 120, 'fgreen', '收第4批+组第6批'],
  ];
  for (const [l, s, w, c, t] of ov) {
    const y = l === 'cpu' ? yO : yO + lane + 14;
    body += cell(x0 + s, y, w - 4, lane, c, t);
  }
  // time axis
  const ay = yO + 2 * lane + 44;
  body += edge(`M${x0} ${ay}H${x0 + 1030}`);
  body += text(x0 + 1040, ay + 5, '时间', 'xs');
  body += text(x0, ay + 26, '同样的时间里，不重叠跑完 3 批，重叠跑完 5 批（示意比例：组批约为前向的一半）', 'xs');

  // notes
  const ny = 500;
  body += box('how', 32, ny, 620, 160, 'green', '怎样做到', ['发射本批前向后立刻返回，不等 GPU 结果', '下一批要用的“上一步输出 token”留在 GPU 上，', '由 FutureMap 在前向时就地填入', '采样在上一批结果处理完后再启动（语法约束要用）'], '机制');
  body += box('cost', 688, ny, 620, 160, 'amber', '代价与例外', ['结果晚一步回到 CPU：停止判断、流式输出滞后一步', '流水线并行（--pp-size > 1）自动关闭重叠', '部分模型与功能组合会自动关闭；投机解码在重叠下', '只支持 --speculative-eagle-topk 1'], '取舍');
  return svg('sglang-overlap', W, H,
    'SGLang 重叠调度与普通调度的时间线对比',
    '上半部分是不重叠的调度循环：CPU 组批时 GPU 空闲，GPU 前向时 CPU 等待，二者交替；下半部分是默认的重叠调度：GPU 计算第 k 批时，CPU 同时处理第 k−1 批的结果并组好第 k+1 批，GPU 前向几乎首尾相接。下方说明机制（发射后立即返回、FutureMap 在 GPU 上传递上一步输出 token、采样在上一批结果处理后启动）和代价（结果晚一步回到 CPU，流水线并行和部分功能组合会自动关闭重叠）。',
    '重叠调度：让 GPU 不等 CPU',
    '每格宽度是示意，不是实测；单步越短（小模型、小批），CPU 那一段的占比越大，重叠的收益越明显',
    body);
}

write({ 'sglang-architecture': architecture(), 'sglang-overlap': overlap() });
