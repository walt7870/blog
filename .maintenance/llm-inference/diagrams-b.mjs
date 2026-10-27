// Figures for articles 07–12 of docs/ai/llm-inference/. Run: node .maintenance/llm-inference/diagrams-b.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// Lane background with a vertical caption on the left.
const lane = (y, h, name) => `<rect x="32" y="${y}" width="896" height="${h}" rx="8" fill="#f1f5f9"/>` + text(50, y + h / 2 + 6, name, 'k');

const figures = {
  'request-path': svg('request-path', 960, 640, '一个请求的全链路', '请求在 CPU 上经过 API 入口、对话模板、分词和调度，在 GPU 上做 Prefill、Decode 和采样，再回到 CPU 做停止判断、反分词与流式推送；用户断开时取消信号要传进引擎释放 KV。',
    '一个请求的全链路：只有中间几步在 GPU 上', '未结束就进入下一个 step；用户断开时，取消要一直传到引擎，释放 KV 块。',
    [
      lane(104, 152, 'CPU'), lane(272, 152, 'GPU'), lane(440, 152, 'CPU'),
      box('api', 110, 124, 180, 112, 'node', 'API 入口', ['接收 HTTP 请求', '校验参数与权限']),
      box('template', 320, 124, 180, 112, 'node', '对话模板', ['多轮消息拼成', '模型认识的格式']),
      box('tokenize', 530, 124, 180, 112, 'node', '分词', ['文本切成', 'token 编号']),
      box('schedule', 740, 124, 180, 112, 'amber', '调度器', ['选出本步的请求', '分配 KV 块']),
      edge('M290 180H320'), edge('M500 180H530'), edge('M710 180H740'),
      box('prefill', 740, 292, 180, 112, 'blue', 'Prefill', ['并行处理全部输入', '写入 KV Cache']),
      box('decode', 530, 292, 180, 112, 'blue', 'Decode 循环', ['每步 1 个 token', '读全部历史 KV']),
      box('sample', 320, 292, 180, 112, 'blue', '采样', ['温度、top-p', '选出下一个 token']),
      edge('M830 236V292'), edge('M740 348H710'), edge('M530 348H500'),
      box('stop', 320, 460, 180, 112, 'node', '停止判断', ['结束符、停止词', 'max_tokens']),
      box('stream', 530, 460, 180, 112, 'node', '反分词与推送', ['token 拼回文字', 'SSE 流式返回']),
      box('cancel', 740, 460, 180, 112, 'red', '取消', ['用户断开', '移出批，释放 KV']),
      edge('M410 404V460'), edge('M500 516H530'), edge('M710 516H740', 'dash'),
      edge('M470 460V432H640V404', 'dash'), label(560, 452, '未结束：下一步', 112),
    ].join('\n')),

  'kv-fragmentation': (() => {
    const W = 32, x0 = 32;
    const top = [], bottom = [];
    // Contiguous: each request reserves 8 cells; used cells are filled.
    const regions = [['A', 0, 2], ['gap', 8, 0], ['B', 10, 5], ['gap', 18, 0], ['C', 20, 3]];
    for (const [name, start, used] of regions) {
      const n = name === 'gap' ? 2 : 8;
      for (let i = 0; i < n; i++) {
        const cls = name === 'gap' ? 'fgray' : i < used ? 'fgreen' : 'famber';
        top.push(cell(x0 + (start + i) * W + 1, 140, W - 2, 48, cls, name !== 'gap' && i < used ? name : ''));
      }
    }
    // Paged: blocks scattered, last block of each request half filled.
    const owner = { 1: 'A', 10: 'A', 3: 'B', 4: 'B', 13: 'B', 18: 'B', 24: 'B', 6: 'C', 15: 'C', 21: 'C' };
    const last = new Set([10, 24, 21]);
    for (let i = 0; i < 28; i++) {
      const x = x0 + i * W + 1;
      if (!owner[i]) { bottom.push(cell(x, 330, W - 2, 48, 'node')); continue; }
      if (last.has(i)) bottom.push(cell(x, 330, W - 2, 48, 'node') + `<rect x="${x}" y="330" width="${(W - 2) / 2}" height="48" rx="4" class="fgreen"/>` + text(x + (W - 2) / 4, 359, owner[i], 'xs', 'middle'));
      else bottom.push(cell(x, 330, W - 2, 48, 'fgreen', owner[i]));
    }
    return svg('kv-fragmentation', 960, 560, '连续预留与分页分配的对比', '连续预留时每个请求按最大长度占一整块，大量空间预留未用，请求之间还留下拼不起来的空隙；分页后块按需分配、分散存放，只有每个请求最后一块没有填满。',
      '同一段显存，两种分配方式', '上：按最大长度为每个请求预留连续空间。下：切成固定大小的块，按需分配。每格代表一个块的空间。',
      [
        text(32, 126, '连续预留：A、B、C 各预留 8 格', 't'),
        ...top,
        text(160, 214, 'A 预留 8 格，只用 2 格', 's', 'middle'),
        text(320, 214, '碎片', 'xs', 'middle'),
        text(480, 214, 'B 预留 8 格，用 5 格', 's', 'middle'),
        text(640, 214, '碎片', 'xs', 'middle'),
        text(800, 214, 'C 预留 8 格，用 3 格', 's', 'middle'),
        text(32, 246, '在用 10 格；预留未用 14 格要等请求结束才释放，4 格零碎空隙放不下新请求', 's'),
        text(32, 316, '分页分配：块大小 16 token，按需申请，靠块表找到', 't'),
        ...bottom,
        text(32, 404, '10 块在用，分散存放；18 块空闲，任何新请求都能用', 's'),
        text(32, 428, '每个请求只有最后一块没填满（半格），浪费不到一个块', 's'),
        cell(32, 468, 28, 24, 'fgreen'), text(68, 486, '有效 KV', 's'),
        cell(180, 468, 28, 24, 'famber'), text(216, 486, '预留未用', 's'),
        cell(340, 468, 28, 24, 'fgray'), text(376, 486, '外部碎片', 's'),
        cell(500, 468, 28, 24, 'node'), text(536, 486, '空闲块', 's'),
      ].join('\n'));
  })(),

  'batching-timeline': (() => {
    const gx = 200, cw = 70, steps = 10;
    const header = y => Array.from({ length: steps }, (_, i) => text(gx + i * cw + cw / 2, y, `${i + 1}`, 'xs', 'middle')).join('');
    // spec: [label, row y, [[from, to, cls, text]]]
    const row = (y, name, segs) => text(32, y + 27, name, 's') + segs.map(([a, b, cls, t]) => {
      let s = '';
      for (let i = a; i <= b; i++) s += cell(gx + (i - 1) * cw + 2, y, cw - 4, 40, cls, i === a ? t : '');
      return s;
    }).join('');
    return svg('batching-timeline', 960, 580, '静态批处理与连续批处理的时间线', 'A 只需 2 步，B 需要 6 步，C 在第 3 步到达。静态批处理中 A 结束后它的位置空等到第 6 步，C 第 7 步才开始；连续批处理中 C 在第 3 步就补进 A 空出的位置。',
      '同样两个工作位：短请求结束后，空位什么时候补上', 'A 需要 2 步，B 需要 6 步，C 在第 3 步到达、需要 4 步。每一格是一步 Decode。',
      [
        text(32, 126, '静态批处理：整批进，整批出', 't'),
        text(32, 150, '步', 'xs'), header(150),
        row(162, '工作位 1', [[1, 2, 'fblue', 'A'], [3, 6, 'fgray', '空等'], [7, 10, 'fgreen', 'C']]),
        row(210, '工作位 2', [[1, 6, 'famber', 'B']]),
        text(32, 282, 'C 第 3 步就到了，要等 A、B 整批结束，第 7 步才开始，第 10 步完成', 's'),
        text(32, 336, '连续批处理：每一步重新组队', 't'),
        text(32, 360, '步', 'xs'), header(360),
        row(372, '工作位 1', [[1, 2, 'fblue', 'A'], [3, 6, 'fgreen', 'C']]),
        row(420, '工作位 2', [[1, 6, 'famber', 'B']]),
        text(32, 492, 'A 在第 2 步结束，C 第 3 步立刻补进来，第 6 步就完成；第 7 步起两个位置都可接新请求', 's'),
        text(32, 540, '两种方式完成的工作量相同；连续批处理消除了灰色的空等，新请求不必等整批结束。', 's'),
      ].join('\n'));
  })(),

  'scheduler-states': svg('scheduler-states', 960, 580, '请求在调度器中的状态变化', '新请求进入等待队列，被调度选中后分配 KV 块进入运行；遇到结束符或长度上限完成并释放块；显存不够时被抢占，释放全部块回到等待队列队首、之后重新 Prefill；用户断开时取消并立刻释放块。',
    '一个请求的状态，以及每次变化时 KV 块怎样处理', '抢占采用重算方式：释放全部块，回到等待队列最前面，之后重新 Prefill。',
    [
      text(162, 142, '新请求', 's'), edge('M152 120V200'),
      box('waiting', 32, 200, 240, 120, 'amber', '等待 WAITING', ['排队，尚未占用 KV', '被抢占的请求排在队首']),
      box('running', 380, 200, 240, 120, 'blue', '运行 RUNNING', ['每步推进 1 个 token', '当前块写满再申请新块']),
      box('finished', 700, 110, 228, 120, 'green', '完成 FINISHED', ['块引用计数减一', '内容保留，可被前缀命中']),
      box('cancelled', 700, 340, 228, 120, 'red', '取消', ['从队列或批中移除', '立刻释放 KV 块']),
      edge('M272 250H380'), text(326, 238, '调度选中', 's', 'middle'), text(326, 278, '分配 KV 块', 'xs', 'middle'),
      edge('M620 230L700 180'), label(524, 182, 'EOS / 长度上限', 126),
      edge('M620 290L700 380'), label(600, 374, '取消', 36),
      edge('M500 320V404H152V320', 'dash'), label(166, 432, '块不够：抢占队尾请求，释放全部块，回到队首，之后重新 Prefill', 470),
      edge('M92 320V510H814V460', 'dash'), label(330, 500, '排队时取消', 84),
    ].join('\n')),

  'prefix-sharing': svg('prefix-sharing', 960, 520, '多个请求共享前缀的 KV', '三个请求都以系统提示和员工制度开头，这部分约 3000 token 的 KV 块只计算一次、只存一份，引用计数为 3；每个请求只为自己约 30 token 的问题计算新的 KV。',
    '相同的开头只算一次，大家共用', '系统提示 + 员工制度约 3000 token；各人的问题约 30 token。',
    [
      box('lin', 32, 120, 200, 96, 'node', '小林的请求', ['块表指向共享块', '和自己的块']),
      box('zhou', 32, 240, 200, 96, 'node', '小周的请求', ['块表指向共享块', '和自己的块']),
      box('wang', 32, 360, 200, 96, 'node', '小王的请求', ['块表指向共享块', '和自己的块']),
      box('shared', 300, 120, 340, 336, 'green', '共享前缀的 KV 块', ['系统提示 + 员工制度', '约 3000 token', '', '只计算一次、只存一份', '引用计数 = 3', '', '第一个请求算完后留在显存，', '后来的请求命中后直接引用']),
      edge('M232 168H300'), edge('M232 288H300'), edge('M232 408H300'),
      box('q1', 708, 120, 220, 96, 'amber', '小林的问题', ['约 30 token', '单独计算新 KV']),
      box('q2', 708, 240, 220, 96, 'amber', '小周的问题', ['约 30 token', '单独计算新 KV']),
      box('q3', 708, 360, 220, 96, 'amber', '小王的问题', ['约 30 token', '单独计算新 KV']),
      edge('M640 168H708'), edge('M640 288H708'), edge('M640 408H708'),
      text(32, 492, '第一个请求处理约 3030 个 token；之后每个请求只需计算约 30 个新 token。', 's'),
    ].join('\n')),

  'block-hash-chain': (() => {
    const xs = [32, 216, 400, 584, 768], w = 160, h = 128;
    const row = (y, specs) => specs.map(([node, cls, title, lines], i) => box(node, xs[i], y, w, h, cls, title, lines)).join('')
      + [0, 1, 2, 3].map(i => edge(`M${xs[i] + w} ${y + 64}H${xs[i + 1]}`)).join('');
    return svg('block-hash-chain', 960, 560, '前缀缓存的块哈希链', '每个写满的块的哈希包含前一块的哈希、本块的 token 和额外标识；最后一个未写满的块不计算哈希。第二个请求在块 1 有一个 token 不同，块 1 之后所有块的哈希都与第一个请求不同，只有块 0 能命中。',
      '每块的哈希都包含前一块的哈希', '哈希相同，意味着从第一个 token 到这块结尾全部相同。只有写满 16 个 token 的块才计算哈希。',
      [
        text(32, 124, '请求 1：写满的块计算哈希，存进“哈希 → 物理块”表', 't'),
        row(136, [
          ['r1b0', 'green', '块 0', ['token 0–15', 'h0 = hash(∅,', '块0, extra)']],
          ['r1b1', 'green', '块 1', ['token 16–31', 'h1 = hash(h0,', '块1, extra)']],
          ['r1b2', 'green', '块 2', ['token 32–47', 'h2 = hash(h1,', '块2, extra)']],
          ['r1b3', 'green', '块 3', ['token 48–63', 'h3 = hash(h2,', '块3, extra)']],
          ['r1b4', 'gray', '块 4（未满）', ['token 64–70', '不计算哈希', '不能命中']],
        ]),
        text(32, 324, '请求 2：块 1 里有一个 token 不同', 't'),
        row(336, [
          ['r2b0', 'green', '块 0', ['token 完全相同', 'h0 相同', '命中，直接引用']],
          ['r2b1', 'red', '块 1', ['改了一个 token', 'h1′ ≠ h1', '未命中']],
          ['r2b2', 'red', '块 2', ['token 与请求 1 相同', '但父哈希不同', 'h2′ ≠ h2']],
          ['r2b3', 'red', '块 3', ['token 与请求 1 相同', '但父哈希不同', 'h3′ ≠ h3']],
          ['r2b4', 'gray', '块 4（未满）', ['不计算哈希', '需要计算']],
        ]),
        text(32, 512, '查找从块 0 开始逐块比对，遇到第一个不命中的块就停止：请求 2 只复用块 0，块 1 起全部重新计算。', 's'),
        text(32, 538, 'extra 是额外标识，如 LoRA 适配器、图片内容、cache_salt；token 相同但这些不同时，哈希也不同。', 's'),
      ].join('\n'));
  })(),

  'flash-attention': svg('flash-attention', 960, 620, '标准注意力与 FlashAttention', '标准注意力用三个内核计算，把 N×N 的分数矩阵 S 和权重矩阵 P 写回显存再读出；FlashAttention 把 Q、K、V 分块搬到片上 SRAM，用在线 softmax 维护每行的最大值和总和，只把最终输出写回显存。',
    '标准注意力在显存里来回搬 N×N 矩阵，FlashAttention 不写出它', '两边计算量相同，结果完全相同；差别在 HBM 读写了多少。',
    [
      text(32, 118, '标准注意力：3 个内核', 't'),
      box('k1', 32, 132, 432, 72, 'node', '内核 1：S = Q·Kᵀ', ['从 HBM 读 Q、K']),
      box('s', 32, 224, 432, 72, 'red', 'S（N×N）写回 HBM，再读出', ['N=8192 时一个头约 134 MB']),
      box('k2', 32, 316, 432, 72, 'node', '内核 2：P = softmax(S)', ['按行归一化成权重']),
      box('p', 32, 408, 432, 72, 'red', 'P（N×N）写回 HBM，再读出', ['又一个同样大小的矩阵']),
      box('k3', 32, 500, 432, 72, 'node', '内核 3：O = P·V', ['读 V，输出写回 HBM']),
      edge('M248 204V224'), edge('M248 296V316'), edge('M248 388V408'), edge('M248 480V500'),
      text(496, 118, 'FlashAttention：1 个内核，分块计算', 't'),
      box('hbm', 496, 132, 432, 72, 'blue', 'HBM：Q、K、V', ['每次只搬一小块进片上']),
      box('sram', 496, 224, 432, 256, 'green', '片上 SRAM 内循环', ['1. 取一块 Q 和一块 K、V', '2. 算这一小块的分数', '3. 更新每行的 max 与 sum', '   （在线 softmax）', '4. 修正并累加已有输出', '5. 换下一块 K、V，重复', '', 'N×N 矩阵从不出现在 HBM']),
      box('out', 496, 500, 432, 72, 'blue', '只把最终 O 写回 HBM', ['显存占用随 N 线性增长']),
      edge('M712 204V224'), edge('M712 480V500'),
      text(32, 600, '计算量仍随长度平方增长；FlashAttention 减少的是 HBM 读写和中间矩阵的显存，结果精确而非近似。', 's'),
    ].join('\n')),

  'cuda-graph': (() => {
    const lanes = (y, cpu, gpu) => text(32, y + 20, 'CPU', 'k') + text(32, y + 60, 'GPU', 'k')
      + `<rect x="110" y="${y}" width="818" height="28" rx="4" fill="#f1f5f9"/><rect x="110" y="${y + 40}" width="818" height="28" rx="4" fill="#f1f5f9"/>` + cpu + gpu;
    let cpu1 = '', gpu1 = '';
    for (let i = 0; i < 8; i++) {
      cpu1 += cell(120 + i * 96, 140, 40, 28, 'famber');
      gpu1 += cell(162 + i * 96, 180, 52, 28, 'fblue', `k${i + 1}`);
    }
    let gpu2 = '';
    for (let i = 0; i < 8; i++) gpu2 += cell(176 + i * 52, 340, 50, 28, 'fblue', `k${i + 1}`);
    return svg('cuda-graph', 960, 600, '逐个启动内核与 CUDA Graph 回放', '没有 CUDA Graph 时，CPU 逐个启动内核，GPU 在内核之间空等；使用 CUDA Graph 后，CPU 发出一次回放指令，GPU 上的内核一个接一个紧密执行。',
      'CPU 逐个下指令，GPU 在内核之间空等', '一次 Decode 前向有几百个内核；每次启动约几微秒，小批量时这些空隙会拖慢整步。',
      [
        text(32, 126, '逐个启动', 't'),
        lanes(140, cpu1, gpu1),
        text(110, 236, '黄色：CPU 启动一个内核；蓝色：GPU 执行；之间的空白是 GPU 在等下一条指令', 's'),
        text(32, 286, 'CUDA Graph：录制一次，之后整张图回放', 't'),
        lanes(300, cell(120, 300, 50, 28, 'famber', 'replay'), gpu2),
        `<path d="M592 386V396H886V386" class="line"/>`, text(739, 418, '省下的时间（对比上方 k8 的结束位置）', 's', 'middle'),
        text(110, 418, 'CPU 只发一条回放指令', 's'),
        box('sizes', 32, 450, 896, 120, 'gray', '录制的限制', ['形状和显存地址固定：通常只录制 Decode，每步每个请求 1 个 token', '批大小 1、2、4、8、16、32 … 512 各录一张；运行时取不小于实际批大小的那张，', '多出的位置填充空数据（槽位 -1）。超过最大录制尺寸时退回逐个启动。']),
      ].join('\n'));
  })(),
};

write(figures);
