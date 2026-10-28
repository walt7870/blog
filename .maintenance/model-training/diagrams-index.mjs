// Series map for docs/ai/model-training/index.md.
// Run: node .maintenance/model-training/diagrams-index.mjs
import { svg, box, edge, write } from './svg-kit.mjs';

function seriesMap() {
  const W = 1360, H = 380, y = 108, w = 246, gap = 20, x0 = 32, h = 240;
  const xs = [0, 1, 2, 3, 4].map(i => x0 + i * (w + gap));
  const parts = [
    ['第一部分 01—05', '训练的共同底座', ['一步训练做了什么', '显存账：8B 能否单卡', '算力账与规模定律', '读懂训练曲线', '', '所有模型都适用'], 'blue'],
    ['第二部分 06—13', '大语言模型', ['数据与分词、预训练', '分布式训练', 'SFT、LoRA 与实践篇', '偏好对齐、强化学习', '蒸馏与模型合并', '资料助手的主线'], 'violet'],
    ['第三部分 14—16', '语音模型', ['语音识别怎样对齐', '口音与术语微调', '语音合成与', '语音 token', '', '语音提问与播报'], 'green'],
    ['第四部分 17—20', '视觉、多模态与向量', ['迁移学习与 ViT', 'CLIP 与读懂截图', '扩散模型', '向量与重排模型', '', '识图与检索'], 'amber'],
    ['第五部分 21—22', '评估与工程', ['业务评测集', '评委偏差与样本量', '框架选型与版本', '检查点与成本', '', '证明更好、能交付'], 'gray'],
  ];
  let body = '';
  parts.forEach(([k, t, lines, cls], i) => {
    body += box(`part-${i + 1}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 4) body += edge(`M${xs[i] + w + 2} ${y + 60}H${xs[i + 1] - 4}`);
  });
  return svg('training-series-map', W, H,
    '模型训练与调优系列的五个部分',
    '第一部分讲所有模型共用的训练机制与资源账；第二部分讲大语言模型从预训练到后训练；第三部分讲语音识别与合成；第四部分讲视觉、图文、扩散与向量模型；第五部分讲评估与训练工程。',
    '模型训练与调优：五个部分',
    '先算清一步训练的资源，再按模型类型展开，最后用评估和工程把结果交付出去',
    body);
}

write({ 'training-series-map': seriesMap() });
