// Figures for the speech chapters 14–16 of docs/ai/model-training/.
// Run: node .maintenance/model-training/diagrams-speech.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- 14: feature pipeline -----------------------------------------------------
function featurePipeline() {
  const W = 1340, H = 560, y = 120, h = 210, w = 236, gap = 24, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const steps = [
    ['1 采样', '波形', ['每秒 16,000 个采样点', '5 秒提问 = 80,000 个数', '只记录气压的起伏'], 'node'],
    ['2 分帧', '切成重叠的短窗', ['窗长 25 ms = 400 点', '步长 10 ms = 160 点', '每秒约 100 帧'], 'blue'],
    ['3 频谱', '每帧做傅里叶变换', ['看这一小段里', '各频率的能量', '共振峰区分不同的音'], 'violet'],
    ['4 Mel + log', '压成 80 个频带', ['低频分得细、高频粗', '取对数压缩动态范围', '5 秒 ≈ 500 帧 × 80'], 'green'],
    ['5 编码器', '降采样后输出表示', ['Whisper 卷积步长 2', '每秒 50 帧，5 秒 250 帧', '要对上 6 个汉字'], 'amber'],
  ];
  let body = '';
  steps.forEach(([k, t, lines, cls], i) => {
    body += box(`feat-${i + 1}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 4) body += edge(`M${xs[i] + w + 2} ${y + h / 2}H${xs[i + 1] - 4}`);
  });
  // A small strip of frames under step 2 to show overlap.
  const fy = 372;
  body += text(xs[1], fy - 12, '相邻窗重叠 15 ms：', 'xs');
  for (let i = 0; i < 5; i++) body += `<rect x="${xs[1] + i * 32}" y="${fy + i * 10}" width="80" height="10" rx="2" class="fblue"/>`;
  // Feature matrix under step 4.
  const mx = xs[3], my = fy - 4;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) {
    const shade = ['fgreen', 'fgray', 'fgreen', 'fgray'][(r * 3 + c * 7) % 4];
    body += cell(mx + c * 22, my + r * 14, 20, 12, shade);
  }
  body += text(mx, my + 104, '行 = 80 个频带，列 = 时间帧', 'xs');
  // Alignment gap.
  body += box('gap', xs[4], 356, w, 150, 'red', '对齐问题', ['标注只说“年假怎么申请”', '没说哪一帧对应哪个字', '250 帧 : 6 个字'], '训练要解决');
  body += edge(`M${xs[4] + w / 2} ${y + h + 2}V352`, 'dash');
  return svg('asr-feature-pipeline', W, H,
    '语音识别的特征流水线',
    '5 秒的提问以 16 kHz 采样得到 80,000 个数，按 25 ms 窗长、10 ms 步长分帧得到约 500 帧，每帧做频谱并压成 80 个 log-Mel 频带，编码器再降采样到 250 帧；标注只有 6 个字，没有逐帧对应关系，这就是对齐问题。',
    '一句 5 秒的提问怎样变成模型输入',
    '数字按 Whisper 的预处理口径：16 kHz、25 ms 窗、10 ms 步长、80 维 log-Mel',
    body);
}

// ---- 14: three alignment approaches -------------------------------------------
function alignmentThree() {
  const W = 1340, H = 800, top = 108, cw = 412, ch = 664, gap = 20, noteY = top + 444;
  const cx = [32, 32 + cw + gap, 32 + 2 * (cw + gap)];
  let body = '';
  body += box('ctc', cx[0], top, cw, ch, 'node', '', [], 'CTC：每帧各自出一个符号');
  body += box('rnnt', cx[1], top, cw, ch, 'node', '', [], 'Transducer：每帧可吐 0 到多个字');
  body += box('aed', cx[2], top, cw, ch, 'node', '', [], '注意力编解码：先听完，再逐字写');

  // CTC: frames row with outputs and blanks, then collapse.
  const fr = ['年', '年', '_', '假', '_', '_', '怎', '么', '_', '申', '请', '_'];
  const fx = cx[0] + 20, fy = top + 60, fw = 30;
  body += text(fx, fy - 6, '编码器帧（只画 12 帧）', 'xs');
  fr.forEach((c, i) => {
    body += cell(fx + i * fw, fy + 6, fw - 4, 26, 'fgray');
    body += cell(fx + i * fw, fy + 42, fw - 4, 30, c === '_' ? 'fgray' : 'fblue', c, 's');
  });
  body += text(fx, fy + 100, '_ 是 blank：这一帧不输出字', 'xs');
  body += edge(`M${fx + 170} ${fy + 112}V${fy + 148}`);
  body += text(fx + 182, fy + 136, '合并重复，再删 blank', 'xs');
  body += box('ctc-out', fx, fy + 154, 372, 50, 'blue', '年假怎么申请', []);
  body += text(fx, fy + 250, '为什么需要 blank：“看看”两个字要写成', 'xs');
  body += text(fx, fy + 272, '看 _ 看，否则会被当成重复合并成“看”。', 'xs');
  body += text(fx, fy + 306, '同一句话有很多种合法写法（路径），', 'xs');
  body += text(fx, fy + 328, '训练时不必知道是哪一种。', 'xs');
  body += box('ctc-note', fx, noteY, 372, 200, 'gray', '训练和代价', [
    '损失 = 所有能折叠成正确文本的', '路径概率之和，动态规划求出',
    '每帧的输出互不依赖（条件独立）', '→ 速度快、天然可流式',
    '→ 同音字常靠外部语言模型或热词',
  ], 'Graves 2006');

  // Transducer: encoder + predictor + joiner.
  const tx = cx[1] + 20, ty = top + 52;
  body += box('enc', tx, ty, 170, 100, 'blue', '编码器', ['听：第 t 帧'], '声学');
  body += box('pred', tx + 202, ty, 170, 100, 'violet', '预测网络', ['看：已写出的字'], '文本');
  body += box('join', tx + 101, ty + 140, 170, 100, 'green', 'Joiner', ['合成下一步分布'], '联合');
  body += edge(`M${tx + 85} ${ty + 102}V${ty + 118}H${tx + 150}V${ty + 136}`);
  body += edge(`M${tx + 287} ${ty + 102}V${ty + 118}H${tx + 222}V${ty + 136}`);
  body += edge(`M${tx + 186} ${ty + 242}V${ty + 268}`);
  body += box('rnnt-out', tx, ty + 272, 372, 104, 'gray', '每一步二选一', ['输出一个字：送回预测网络，同一帧再试', '输出 blank：前进到下一帧'], '');
  body += edge(`M${tx + 372 + 2} ${ty + 300}C${tx + 396} ${ty + 220} ${tx + 396} ${ty + 70} ${tx + 374} ${ty + 50}`, 'dash');
  body += box('rnnt-note', tx, noteY, 372, 200, 'gray', '训练和代价', [
    '同样对所有对齐路径求和', '输出依赖已写出的字，弥补 CTC',
    '按帧推进，适合边说边出字', '训练时要算 T × U × 词表 的张量，',
    '显存比 CTC 高得多',
  ], 'Graves 2012');

  // Attention encoder-decoder.
  const ax = cx[2] + 20, ay = top + 52;
  body += box('aenc', ax, ay, 372, 100, 'blue', '编码器', ['一次读完整段（Whisper：30 秒）'], '先听完');
  body += box('adec', ax, ay + 150, 372, 116, 'amber', '解码器', ['交叉注意力在全部帧里找位置', '逐个预测下一个字，像语言模型'], '再写');
  body += edge(`M${ax + 186} ${ay + 102}V${ay + 146}`);
  body += text(ax + 196, ay + 130, '交叉注意力', 'xs');
  const toks = ['<sot>', '年', '假', '怎', '么', '申', '请', '<eot>'];
  toks.forEach((t, i) => body += cell(ax + i * 46, ay + 296, 42, 30, i === 0 || i === 7 ? 'fgray' : 'famber', t, 'xs'));
  body += box('aed-note', ax, noteY, 372, 200, 'gray', '训练和代价', [
    '不需要 blank，直接用交叉熵', '和训练语言模型一样“预测下一个”',
    '上下文强、可同时学翻译和时间戳', '天然要等整段音频，流式需改造',
    '没对上时会编造或重复（幻觉）',
  ], 'Whisper 2022');

  return svg('asr-alignment-three', W, H,
    'CTC、Transducer、注意力编解码三种对齐方式',
    'CTC 在每帧输出一个字或 blank，合并重复再删 blank 得到文本，帧间条件独立；Transducer 用编码器、预测网络和 joiner，每帧可以输出零个或多个字，输出依赖已写出的字，适合流式；注意力编解码先编码整段音频，再由解码器用交叉注意力逐字生成。',
    '同一句“年假怎么申请”，三种方法怎样把帧和字对上',
    '前两种在训练时对所有可能的对齐求和，第三种让注意力自己学会去哪里听',
    body);
}

// ---- 15: decision + data/eval loop ---------------------------------------------
function finetuneLoop() {
  const W = 1340, H = 720;
  let body = '';
  // Decision column.
  body += box('symptom', 32, 112, 300, 112, 'red', '听错“钉钉审批”', ['先收集一批真实错例', '按错误类型分组'], '现象');
  const dy = 262, dw = 300, dh = 96;
  const decisions = [
    ['只错少量固定词', '热词 / 提示 / 词表替换', 'green'],
    ['数字、标点、大小写', '文本规整（ITN）与后处理', 'green'],
    ['整体口音、噪声、领域', '进入微调流程 →', 'amber'],
  ];
  decisions.forEach(([q, a, cls], i) => {
    const yy = dy + i * (dh + 16);
    body += box(`dec-${i}`, 32, yy, dw, dh, cls, q, [a], `错误类型 ${i + 1}`);
  });
  body += edge('M182 226V258');
  body += text(32, dy + 3 * (dh + 16) + 22, '先试不训练的办法：改得快、可回滚，', 'xs');
  body += text(32, dy + 3 * (dh + 16) + 44, '它们不够时再微调。', 'xs');

  // Loop on the right.
  const lx = 400, ly = 120, bw = 280, bh = 150, gx = 36;
  const loop = [
    ['1 采集', '真实场景录音', ['取得说话人同意', '覆盖口音、会议室、手机', '按说话人划分训练/测试'], 'blue'],
    ['2 转写', '统一转写规范', ['数字、中英混说、标点', '术语表固定写法', '双人抽检一致率'], 'violet'],
    ['3 训练', '扩增 + 微调', ['速度扰动、SpecAugment', '加噪声、加混响', '全参 / 冻结编码器 / LoRA'], 'green'],
  ];
  loop.forEach(([k, t, lines, cls], i) => {
    body += box(`loop-${i}`, lx + i * (bw + gx), ly, bw, bh, cls, t, lines, k);
    if (i < 2) body += edge(`M${lx + i * (bw + gx) + bw + 2} ${ly + bh / 2}H${lx + (i + 1) * (bw + gx) - 4}`);
  });
  const ey = 360;
  body += box('eval', lx + 2 * (bw + gx), ey, bw, 230, 'amber', '4 评估', ['业务测试集：CER、术语召回', '按口音、噪声切片看', '通用测试集：查回退', '静音与噪声片段：查幻觉', '同一规范化后再算分'], '每轮都做');
  body += edge(`M${lx + 2 * (bw + gx) + bw / 2} ${ly + bh + 2}V${ey - 4}`);
  body += box('ship', lx + bw + gx, ey + 60, bw, 110, 'green', '5 上线', ['业务集变好且通用集不退', '保留旧模型可回滚'], '通过');
  body += edge(`M${lx + 2 * (bw + gx) - 2} ${ey + 115}H${lx + bw + gx + bw + 4}`);
  body += box('analyze', lx, ey + 60, bw, 150, 'red', '错误分析', ['哪类口音、哪些词还错', '是数据缺、标注乱', '还是学过头遗忘了'], '不通过');
  body += edge(`M${lx + 2 * (bw + gx) + 40} ${ey + 232}V${ey + 290}H${lx + bw / 2}V${ey + 214}`, 'dash');
  body += edge(`M${lx + bw / 2} ${ey + 56}V${ly + bh + 4}`, 'dash');
  body += label(lx + bw / 2 + 12, ey + 30, '补数据或改规范', 160);
  body += edge(`M${dw + 32 + 2} ${dy + 2 * (dh + 16) + dh / 2}H${lx - 20}V${ly + bh / 2}H${lx - 4}`);
  return svg('asrft-decision-loop', W, H,
    '语音识别微调的决策与数据评估循环',
    '先按错误类型分流：少量固定词用热词或提示，数字标点用文本规整，整体口音噪声或领域差距才进入微调；微调循环为采集、转写、扩增训练、评估，评估同时看业务集、切片、通用集和静音幻觉，通过则上线，不通过则做错误分析后补数据或改转写规范。',
    '先判断要不要训，再让数据和评估转起来',
    '左边决定改哪一层；右边每一轮都同时检查“变好了”和“没变坏”',
    body);
}

// ---- 16: classic three-stage vs codec-LM pipeline ------------------------------
function ttsPipelines() {
  const W = 1340, H = 660;
  let body = '';
  const y1 = 132, h1 = 150, w = 236, gap = 30, x0 = 32;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  body += text(32, y1 - 14, '经典三段式（Tacotron 2 / FastSpeech 2 + HiFi-GAN）', 'k');
  const a = [
    ['输入', '“请到行政楼办理”', ['小林问到的制度原文', '可能含数字、缩写'], 'node'],
    ['文本前端', '读法与韵律', ['2026 年 → 二零二六年', '多音字：行政读 háng', '停顿、重音'], 'violet'],
    ['声学模型', '音素 → Mel 频谱', ['Tacotron 2：注意力对齐', 'FastSpeech 2：先预测时长', '再并行生成'], 'blue'],
    ['声码器', 'Mel → 波形', ['HiFi-GAN', '补回相位和细节', '22.05 / 24 kHz 采样'], 'green'],
    ['输出', '固定的播报声音', ['每个声音单独训练', '或带说话人编号'], 'node'],
  ];
  a.forEach(([k, t, lines, cls], i) => {
    body += box(`cl-${i}`, xs[i], y1, w, h1, cls, t, lines, k);
    if (i < 4) body += edge(`M${xs[i] + w + 2} ${y1 + h1 / 2}H${xs[i + 1] - 4}`);
  });
  // VITS bracket over acoustic + vocoder.
  const bx1 = xs[2], bx2 = xs[3] + w;
  body += edge(`M${bx1} ${y1 + h1 + 14}V${y1 + h1 + 26}H${bx2}V${y1 + h1 + 14}`, 'line');
  body += text((bx1 + bx2) / 2, y1 + h1 + 50, 'VITS：把这两段合成一个模型端到端训练', 'xs', 'middle');

  const y2 = 392, h2 = 170;
  body += text(32, y2 - 14, '编解码 token + 语言模型（VALL-E、CosyVoice 一类）', 'k');
  const b = [
    ['输入', '文本 + 3 秒参考音', ['参考音给出音色', '可以是没见过的人'], 'node'],
    ['语言模型', '文本 → 语音 token', ['像续写文字一样', '逐个生成离散 token', '续写参考音的音色'], 'amber'],
    ['token 还原', '两种做法', ['VALL-E：codec 解码器', '直接还原波形', 'CosyVoice：流匹配 → Mel'], 'blue'],
    ['声码器', 'Mel → 波形', ['CosyVoice 用 HiFi-GAN', 'VALL-E 这步已在', 'codec 解码器里完成'], 'green'],
    ['输出', '零样本克隆的声音', ['音色像参考音', '也可能像未授权的人'], 'red'],
  ];
  b.forEach(([k, t, lines, cls], i) => {
    body += box(`lm-${i}`, xs[i], y2, w, h2, cls, t, lines, k);
    if (i < 4) body += edge(`M${xs[i] + w + 2} ${y2 + h2 / 2}H${xs[i + 1] - 4}`);
  });
  body += text(32, y2 + h2 + 40, '差别在中间表示：上面是连续的 Mel 频谱，靠回归损失训练；下面是离散 token，靠“预测下一个”的交叉熵训练，可以直接借用大语言模型的规模和技巧。', 'xs');
  return svg('tts-two-pipelines', W, H,
    '经典三段式 TTS 与编解码 token 语言模型 TTS 的对比',
    '经典流水线为文本前端、声学模型生成 Mel 频谱、声码器生成波形，VITS 把后两段合成一个模型；新路线由语言模型根据文本和 3 秒参考音生成离散语音 token，再由 codec 解码器或流匹配加声码器还原波形，可零样本克隆音色，也带来冒用风险。',
    '两代语音合成：Mel 频谱流水线与语音 token 语言模型',
    '同一句播报，两条路线的中间表示和训练目标不同',
    body);
}

// ---- 16: residual vector quantization ------------------------------------------
function codecRvq() {
  const W = 1340, H = 580;
  let body = '';
  body += box('wave', 32, 140, 220, 150, 'node', '24 kHz 波形', ['1 秒 = 24,000 个采样', '编码器压缩 320 倍'], '输入');
  body += edge('M254 215H290');
  body += box('frame', 294, 140, 220, 150, 'blue', '75 帧 / 秒', ['每帧一个连续向量', '还不能当 token 用'], '编码器输出');
  body += edge('M516 215H552');
  const qx = 556, qy = 116, qw = 420, qh = 46;
  const rows = [
    ['码本 1：粗略近似', 'famber'],
    ['码本 2：量化剩下的误差', 'famber'],
    ['码本 3：再量化剩余误差', 'fgray'],
    ['…', 'fgray'],
    ['码本 8：最细的残差', 'fgray'],
  ];
  rows.forEach(([t, cls], i) => {
    body += cell(qx, qy + i * (qh + 10), qw, qh, cls);
    body += text(qx + 16, qy + i * (qh + 10) + 30, t, 's');
    body += text(qx + qw - 16, qy + i * (qh + 10) + 30, i === 3 ? '' : '1024 选 1', 'xs', 'end');
  });
  body += text(qx, qy + 5 * (qh + 10) + 14, '每层只编码上一层没表达好的部分（残差）', 'xs');
  body += edge(`M${qx + qw + 2} 215H${qx + qw + 36}`);
  body += box('tok', qx + qw + 40, 116, 300, 196, 'green', '每秒 600 个 token', ['75 帧 × 8 个码本', '每个 token 10 bit（1024 项）', '600 × 10 = 6 kbps', 'VALL-E 的设定'], '输出');
  body += box('note', 32, 444, 1276, 100, 'gray', '为什么要分层', ['每帧 8 × 10 = 80 bit。若只用一个码本表达同样的信息量，要有 2⁸⁰ 项，无法存储和训练；分 8 层，每层 1024 项就够。VALL-E 用自回归模型', '逐帧生成第 1 层，再用非自回归模型补齐第 2—8 层；丢掉后面的层，码率降低、音质变粗，SoundStream 借此让单个模型覆盖 3—18 kbps。'], '');
  return svg('tts-codec-rvq', W, H,
    '神经音频编解码器的残差向量量化',
    '24 kHz 波形经编码器压缩为每秒 75 个连续向量，再用 8 层残差向量量化，每层从 1024 项码本中选一个最接近的向量并把剩余误差交给下一层，得到每秒 600 个离散 token、约 6 kbps，这是 VALL-E 使用的 EnCodec 设定。',
    '声音怎样变成可以“预测下一个”的 token',
    '以 VALL-E 使用的 EnCodec 6 kbps 设定为例',
    body);
}

write({
  'asr-feature-pipeline': featurePipeline(),
  'asr-alignment-three': alignmentThree(),
  'asrft-decision-loop': finetuneLoop(),
  'tts-two-pipelines': ttsPipelines(),
  'tts-codec-rvq': codecRvq(),
});
