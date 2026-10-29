// Series map for docs/ai/llm-architecture/index.md.
// Run: node .maintenance/llm-architecture/diagrams-index.mjs
import { svg, box, edge, text, write } from './svg-kit.mjs';

function seriesMap() {
  const W = 1400, H = 500, w = 260, h = 300, y = 112;
  let b = '';
  const parts = [
    ['p1', 'gray', '从 Transformer 到大模型', '一 · 01—03', ['原始 Transformer', '三种结构与 decoder-only', '今天大模型的全景']],
    ['p2', 'blue', '逐层拆解', '二 · 04—10 + 实践', ['分词与词嵌入', '注意力：Q、K、V', '多头与 KV 头', 'FFN', '残差与归一化', '位置编码：RoPE', '输出层与解码', '实践：拆开小模型']],
    ['p3', 'green', '架构演进', '三 · 11—14', ['混合专家 MoE', '长上下文与高效注意力', '线性注意力与混合架构', '多模态的结构']],
    ['p4', 'amber', '主流模型拆解', '四 · 15—18', ['Llama 家族', 'Qwen 家族', 'DeepSeek', 'Mistral、Gemma、GLM、', 'Kimi、gpt-oss、MiniMax']],
    ['p5', 'violet', '读懂与对比', '五 · 19—20', ['读懂 config 与源码', '手算参数、FLOPs、KV', '主流架构对比与趋势']],
  ];
  parts.forEach(([id, c, t, k, lines], i) => {
    const x = 28 + i * (w + 14);
    b += box(id, x, y, w, h, c, t, lines, k);
    if (i < 4) b += edge(`M${x + w + 2} ${y + h / 2}H${x + w + 12}`);
  });
  b += text(28, 462, '先整体、再部件、再变化、再实例、最后方法：前两部分按顺序读，后三部分可按需要挑读。', 's');
  return svg('arch-series-map', W, H, '大模型架构系列的五个部分',
    '第一部分讲原始 Transformer、三种结构和今天大模型的全景；第二部分逐层拆解分词、注意力、多头、FFN、残差归一化、位置编码和输出层，并有实践篇；第三部分讲 MoE、高效注意力、线性混合架构和多模态；第四部分拆解 Llama、Qwen、DeepSeek 和其他开源模型；第五部分讲读懂配置与源码，以及整体对比。',
    '大模型架构：五个部分', '从 Transformer 的整体结构出发，到每个部件、架构演进、具体模型和读模型的方法', b);
}

write({ 'arch-series-map': seriesMap() });
