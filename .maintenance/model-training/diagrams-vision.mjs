// Figures for chapters 17–20 of docs/ai/model-training/ (vision, multimodal, diffusion, embedding).
// Run: node .maintenance/model-training/diagrams-vision.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// ---- vision-transfer-ladder --------------------------------------------------
// ResNet-50 backbone, 4-class head. Params: head 2048×4+4 = 8,196; layer4 = 14,964,736;
// whole net with 4-class head = 25,557,032 − 2,049,000 + 8,196 = 23,516,228.
function transferRow(y, name, sub, trainFrom, info) {
  const stages = ['layer1', 'layer2', 'layer3', 'layer4'];
  let s = box(`row-${y}`, 32, y, 236, 112, 'node', name, sub);
  stages.forEach((st, i) => {
    const x = 296 + i * 142, train = i >= trainFrom;
    s += box(`st-${y}-${i}`, x, y + 16, 126, 80, train ? 'green' : 'gray', st, [train ? '训练' : '冻结']);
  });
  s += edge(`M${296 + 4 * 142 - 16} ${y + 56}H${876}`);
  s += box(`head-${y}`, 876, y + 16, 118, 80, 'green', '分类头', ['2048→4']);
  s += box(`info-${y}`, 1018, y, 250, 112, 'node', info[0], info.slice(1));
  return s;
}
const transferLadder = svg('vision-transfer-ladder', 1300, 560, '迁移学习的三种做法：冻结多少层',
  '同一个 ImageNet 预训练 ResNet-50 骨干接一个 4 类分类头。线性探针只训练分类头的 8196 个参数；微调最后一段训练 layer4 和头，约 1500 万参数；全量微调训练全部约 2352 万参数。越往下可训练参数越多，需要的数据和算力越多，也越容易过拟合。',
  '同一个预训练骨干，冻结多少层是一条连续的旋钮', 'ResNet-50 + 4 类报销单分类头；灰色冻结、绿色参与训练。数据量区间为示意，按验证集结果调整。',
  [
    text(296, 112, '预训练骨干（ImageNet-1K，约 128 万张、1000 类）', 'k'),
    transferRow(128, '线性探针', ['只换最后一层', '每类几十张也能起步'], 4, ['可训练 8,196 个参数', '单卡几分钟', '特征不合适时上限低']),
    transferRow(264, '微调最后一段', ['底层通用纹理保留', '高层适配票据版式'], 3, ['可训练约 1497 万参数', '每类几百张较稳', '学习率比头小一个量级']),
    transferRow(400, '全量微调', ['所有层一起改', '数据和预训练差别大时'], 0, ['可训练约 2352 万参数', '需要上千张以上', '小数据下最容易过拟合']),
  ].join('\n'));

// ---- vision-confusion-matrix -------------------------------------------------
const cls = ['发票', '打车票', '餐饮小票', '其他'];
const cm = [[188, 3, 7, 2], [4, 108, 6, 2], [9, 5, 134, 2], [6, 3, 9, 12]];
function confusion() {
  const x0 = 200, y0 = 176, cw = 118, ch = 66;
  let s = text(x0 + cw * 2, 128, '模型预测', 'k', 'middle');
  s += text(48, y0 + ch * 2, '真实类别', 'k');
  cls.forEach((c, j) => { s += text(x0 + j * cw + cw / 2, 158, c, 's', 'middle'); });
  cm.forEach((row, i) => {
    s += text(x0 - 14, y0 + i * ch + ch / 2 + 5, cls[i], 's', 'end');
    const n = row.reduce((a, b) => a + b, 0);
    row.forEach((v, j) => {
      const c = i === j ? (i === 3 ? 'fred' : 'fgreen') : (v >= 6 ? 'famber' : 'fgray');
      s += cell(x0 + j * cw + 3, y0 + i * ch + 3, cw - 6, ch - 6, c, String(v), 't');
    });
    const rec = (row[i] / n * 100).toFixed(1);
    s += text(x0 + 4 * cw + 18, y0 + i * ch + ch / 2 + 5, `召回 ${rec}%（${row[i]}/${n}）`, 's');
  });
  const colSum = j => cm.reduce((a, r) => a + r[j], 0);
  cls.forEach((c, j) => { s += text(x0 + j * cw + cw / 2, y0 + 4 * ch + 28, `精确 ${(cm[j][j] / colSum(j) * 100).toFixed(1)}%`, 'xs', 'middle'); });
  return s;
}
const confusionFig = svg('vision-confusion-matrix', 1260, 560, '报销单分类器的混淆矩阵示例',
  '测试集 500 张：发票 200、打车票 120、餐饮小票 150、其他 30。总体准确率 88.4%，但“其他”的召回只有 40%，被大量判成餐饮小票和发票；发票和餐饮小票之间也有互相混淆。',
  '总体 88.4% 准确，“其他”类只认出 40%', '教学示例数据：行是真实类别，列是预测；对角线为判对，琥珀色是值得复盘的混淆。',
  [
    confusion(),
    box('overall', 900, 120, 328, 128, 'node', '总体准确率 88.4%', ['442 / 500 判对', '“其他”只占 6%，', '全错也只拉低 6 个点']),
    box('worst', 900, 268, 328, 128, 'red', '“其他”召回 40%', ['会议纪要、合同截图', '被硬塞进三类之一', '需要拒识或补样本']),
    box('pair', 900, 416, 328, 112, 'amber', '发票 ↔ 餐饮小票', ['16 张互相混淆', '看样本：多是带抬头的小票']),
  ].join('\n'));

// ---- mm-clip-matrix ----------------------------------------------------------
const imgs = ['发票照片', '出租车票', '餐厅小票', '会议白板'];
const caps = ['增值税发票', '打车发票', '餐饮小票', '会议白板照片'];
function clipMatrix() {
  const x0 = 380, y0 = 220, cw = 160, ch = 62;
  let s = '';
  caps.forEach((c, j) => {
    s += box(`cap-${j}`, x0 + j * cw + 4, 112, cw - 8, 58, 'blue', c);
  });
  s += text(x0 + 2 * cw, 196, '文本编码器 → 文本向量 T1…T4', 'xs', 'middle');
  imgs.forEach((im, i) => {
    s += box(`img-${i}`, 32, y0 + i * ch + 4, 150, ch - 8, 'violet', im);
    s += edge(`M182 ${y0 + i * ch + ch / 2}H${x0 - 8}`, 'line');
    for (let j = 0; j < 4; j++) {
      const diag = i === j;
      s += cell(x0 + j * cw + 4, y0 + i * ch + 4, cw - 8, ch - 8, diag ? 'fgreen' : 'fgray', diag ? `I${i + 1}·T${j + 1} 拉高` : `I${i + 1}·T${j + 1} 压低`, 's');
    }
  });
  s += text(200, y0 - 14, '图像编码器 → 图像向量 I1…I4', 'xs');
  return s;
}
const clipFig = svg('mm-clip-matrix', 1300, 640, 'CLIP 的 N×N 对比训练与零样本分类',
  '一个批次 N 对图文分别编码成向量，两两点积得到 N×N 相似度矩阵。对角线上的 N 个是真实配对，训练把它们拉高；其余 N²−N 个是错配，训练把它们压低。按行做一次交叉熵、按列再做一次，两者平均。训练好后，把类别名写成句子编码，选与图片向量最相似的句子，就是零样本分类。',
  'CLIP：在 N×N 相似度矩阵上，认出谁和谁是一对', '示意 N=4；CLIP 实际训练 N=32,768，每行有 32,767 个错配。',
  [
    clipMatrix(),
    box('loss', 32, 492, 640, 120, 'node', '损失：行、列各做一次交叉熵', ['每一行：图 i 要在 N 段文字里选中 T_i', '每一列：文字 j 要在 N 张图里选中 I_j', '相似度先除以温度 τ（CLIP 可学习，初值 0.07）']),
    box('zs', 700, 492, 568, 120, 'green', '零样本分类：类别名变成句子', ['“一张{发票/打车票/餐饮小票}的照片”', '与上传图片的向量比相似度，取最高者', '不需要为新类别重新训练']),
  ].join('\n'));

// ---- mm-llava-stages ---------------------------------------------------------
const comps = [
  ['enc', 'CLIP ViT-L/14', ['336×336 → 576 个', 'patch 特征'], 'violet'],
  ['proj', '投影层', ['两层 MLP', '1024 → LLM 维度'], 'amber'],
  ['llm', '大语言模型', ['Vicuna 7B/13B', '读图像 token + 文字'], 'blue'],
];
function llavaFig() {
  const xs = [300, 620, 940], w = 290;
  let s = box('img', 32, 112, 230, 116, 'node', '图片 + 问题', ['报销单截图', '“金额和日期是多少？”']);
  comps.forEach(([id, t, l, c], i) => { s += box(id, xs[i], 112, w - 30, 116, c, t, l); });
  s += edge('M262 170H300') + edge('M560 170H620') + edge('M880 170H940');
  s += text(1070, 256, '→ 逐字生成回答', 'xs', 'middle');
  const rows = [
    ['阶段 1：特征对齐', '558K 图片 + 简短描述', ['冻结', '训练', '冻结']],
    ['阶段 2：视觉指令微调', '665K 多轮问答混合', ['冻结', '训练', '训练']],
    ['资料助手：表单微调', '几千条截图问答（示意）', ['冻结', '冻结或训练', 'LoRA']],
  ];
  rows.forEach(([name, data, st], r) => {
    const y = 296 + r * 104;
    s += box(`stage-${r}`, 32, y, 250, 88, 'node', name, [data]);
    st.forEach((v, i) => {
      const c = v === '冻结' ? 'fgray' : v === 'LoRA' ? 'fviolet' : v === '训练' ? 'fgreen' : 'famber';
      s += cell(xs[i], y + 10, w - 30, 68, c, v, 't');
    });
  });
  return s;
}
const llavaStages = svg('mm-llava-stages', 1240, 620, 'LLaVA 式视觉语言模型的结构与两阶段训练',
  '图片经 CLIP 视觉编码器变成 576 个 patch 特征，投影层把它们映射到大语言模型的词向量空间，与问题文字一起送进 LLM。第一阶段只训练投影层，让图像特征对上语言空间；第二阶段视觉编码器仍冻结，投影层和 LLM 一起做指令微调。资料助手微调时通常冻结视觉编码器，在 LLM 上加 LoRA。',
  '视觉编码器、投影层、大语言模型：每个阶段只动一部分', 'LLaVA-1.5 的配置；灰色冻结，绿色全参训练，紫色只训练 LoRA，琥珀色视数据量而定。',
  llavaFig());

// ---- diffusion-train-sample --------------------------------------------------
const diffusionFig = svg('diffusion-train-sample', 1340, 660, '潜空间扩散模型的训练与采样',
  '训练时，图片先经 VAE 编码器压成 64×64×4 的潜变量，随机选一个时间步 t 加入已知噪声 ε，去噪网络读带噪潜变量、t 和文本向量，预测加进去的噪声，与真实噪声算均方误差。采样时从纯噪声出发，去噪网络反复预测并减去噪声，几十步后得到干净潜变量，再由 VAE 解码器还原成 512×512 图片。无分类器引导在每一步各算一次有文本和无文本的预测，再按引导系数外推。',
  '训练学“加了什么噪声”，生成时反复把噪声减掉', 'Stable Diffusion 1.x 的尺寸；训练每步只取一个随机 t，采样要走完整条去噪链。',
  [
    text(32, 120, '训练（每张图每步只做一次）', 'k'),
    box('x0', 32, 136, 170, 112, 'node', '原图', ['512×512×3', '海报配图']),
    box('vae-e', 236, 136, 170, 112, 'violet', 'VAE 编码器', ['冻结', '空间缩小 8 倍']),
    box('z0', 440, 136, 170, 112, 'node', '潜变量 z₀', ['64×64×4', '约 1/48 数据量']),
    box('noise', 644, 136, 200, 112, 'amber', '加噪到第 t 步', ['t 随机取 1…1000', '记住噪声 ε']),
    box('unet', 878, 136, 200, 112, 'green', '去噪网络', ['UNet 或 DiT', '输入 z_t、t、文本']),
    box('loss', 1112, 136, 196, 112, 'red', '损失', ['‖ε − 预测 ε‖²', '只更新去噪网络']),
    edge('M202 192H236'), edge('M406 192H440'), edge('M610 192H644'), edge('M844 192H878'), edge('M1078 192H1112'),
    box('txt', 878, 300, 200, 96, 'blue', '文本编码器', ['CLIP ViT-L/14，冻结', '10% 换成空文本']),
    edge('M978 300V248'), label(990, 280, '交叉注意力', 90),
    edge('M32 424H1308', 'line'),
    text(32, 460, '采样（生成一张图要走几十步）', 'k'),
    box('zt', 32, 476, 200, 112, 'node', '纯噪声 z_T', ['64×64×4', '随机种子决定']),
    box('loop', 290, 476, 520, 152, 'green', '重复 20—50 步：预测噪声并减掉一部分', ['同一个去噪网络，t 从大到小', '有文本预测 ε_c，空文本预测 ε_u', '引导：ε_u + w·(ε_c − ε_u)，SD 1.x 常用 w=7.5']),
    box('zclean', 868, 476, 180, 112, 'node', '干净潜变量', ['64×64×4']),
    box('vae-d', 1100, 476, 208, 112, 'violet', 'VAE 解码器', ['还原 512×512×3']),
    edge('M232 532H290'), edge('M810 532H868'), edge('M1048 532H1100'),
  ].join('\n'));

// ---- embed-two-stage ---------------------------------------------------------
const twoStage = svg('embed-two-stage', 1340, 600, '向量召回加交叉编码器重排的两阶段检索',
  '离线时，双塔编码器把 1.2 万条制度条款各自编码成向量存进索引。在线时只需编码问题一次，在索引里取最相近的 50 条；再由交叉编码器把问题和每条候选拼在一起逐对打分，取前 5 条交给大模型。更换编码器后，离线索引里的全部向量必须重算。',
  '先用向量快速捞 50 条，再用交叉编码器细看这 50 条', '资料助手的检索链路；条款数、候选数为示意。',
  [
    text(32, 120, '离线：每条条款只编码一次', 'k'),
    box('docs', 32, 136, 240, 104, 'node', '制度条款', ['约 1.2 万条切块', '更新时增量编码']),
    box('benc', 320, 136, 260, 104, 'blue', '双塔编码器（文档侧）', ['每条 → 1024 维向量']),
    box('index', 628, 136, 280, 104, 'violet', '向量索引', ['1.2 万 × 1024 个数', '换模型 = 全部重算']),
    edge('M272 188H320'), edge('M580 188H628'),
    edge('M32 276H1308', 'line'),
    text(32, 312, '在线：一次提问', 'k'),
    box('q', 32, 328, 240, 120, 'node', '小林的问题', ['“年假能拆成', '半天休吗？”']),
    box('qenc', 320, 328, 260, 120, 'blue', '双塔编码器（问题侧）', ['只编码 1 次', '与条款向量算点积']),
    box('top50', 628, 328, 280, 120, 'violet', '向量召回 top-50', ['毫秒级', '语义相近但不一定答题']),
    box('ce', 956, 328, 352, 120, 'green', '交叉编码器重排', ['（问题, 条款）拼在一起', '50 次前向逐对打分', '取前 5 条给大模型']),
    edge('M272 388H320'), edge('M580 388H628'), edge('M908 388H956'),
    edge('M768 240V328', 'dash'),
    box('cmp', 32, 480, 1276, 96, 'node', '为什么分两段', ['双塔：问题和条款各自编码、可提前算好，快，但两者在编码时看不到对方', '交叉编码器：两段文字在每一层注意力里互相看，准，但每对都要现算，只能用在少量候选上']),
  ].join('\n'));

// ---- embed-inbatch-negatives -------------------------------------------------
function inbatch() {
  const x0 = 260, y0 = 196, cw = 100, ch = 64;
  const cols = ['P1', 'P2', 'P3', 'P4', 'H1', 'H2', 'H3', 'H4'];
  const qs = ['Q1 年假怎么申请', 'Q2 加班费怎么算', 'Q3 年假能拆半天吗', 'Q4 出差住宿标准'];
  let s = text(x0 + 2 * cw, 140, '同批其他人的正例（批内负例）', 'k', 'middle');
  s += text(x0 + 6 * cw, 140, '挖出的难负例', 'k', 'middle');
  cols.forEach((c, j) => { s += text(x0 + j * cw + cw / 2, 176, c, 't', 'middle'); });
  qs.forEach((q, i) => {
    s += text(x0 - 14, y0 + i * ch + ch / 2 + 5, q, 's', 'end');
    cols.forEach((c, j) => {
      let k = 'fgray', t = '负';
      if (j === i) { k = 'fgreen'; t = '正'; }
      else if (j === i + 4) { k = 'famber'; t = '难负'; }
      if (i === 0 && j === 2) { k = 'fred'; t = '假负？'; }
      s += cell(x0 + j * cw + 3, y0 + i * ch + 3, cw - 6, ch - 6, k, t, 's');
    });
  });
  return s;
}
const inbatchFig = svg('embed-inbatch-negatives', 1320, 600, '批内负例、难负例与假负例',
  '每行是一条问题，它的正确条款在对角线上。同一批次里别人的正确条款自动成为它的负例，批次越大负例越多；每条问题还可以附带一条挖出的难负例，即看起来相关但答不了题的条款。问题 1“年假怎么申请”和问题 3 的正确条款都讲年假，P3 可能其实也能回答问题 1，被当作负例时就是假负例，会教错模型。',
  'B 条问题共享一批条款：每行一个正确答案，其余都当负例', '示意 batch=4、每条附 1 个难负例；每行做一次 softmax 交叉熵，即 InfoNCE。',
  [
    inbatch(),
    box('note1', 260 + 8 * 100 + 24, 196, 196, 120, 'node', '批越大', ['负例越多', '区分越细']),
    box('note2', 260 + 8 * 100 + 24, 336, 196, 120, 'red', '假负例', ['同主题条款', '可能也对，需过滤']),
    box('formula', 32, 476, 1256, 96, 'node', '每行的损失：−log( exp(s正/τ) ÷ Σ exp(s/τ) )', ['s 是问题与条款向量的余弦相似度，τ 是温度（BGE 用 0.01，sentence-transformers 默认 0.05）；τ 越小，越盯着最难分的几个负例']),
  ].join('\n'));

write({
  'vision-transfer-ladder': transferLadder,
  'vision-confusion-matrix': confusionFig,
  'mm-clip-matrix': clipFig,
  'mm-llava-stages': llavaStages,
  'diffusion-train-sample': diffusionFig,
  'embed-two-stage': twoStage,
  'embed-inbatch-negatives': inbatchFig,
});
