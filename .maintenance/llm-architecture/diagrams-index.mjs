// Series map for docs/ai/llm-architecture/index.md.
// Run: node .maintenance/llm-architecture/diagrams-index.mjs
import { svg, box, edge, text, write } from './svg-kit.mjs';

function seriesMap() {
  const W = 1360, H = 494, w = 306, h = 300, y = 112;
  let b = '';
  const parts = [
    ['p1', 'blue', '一、Transformer 逐层拆解', '00—08 + 实践', ['Transformer 全貌', '全景与参数分解', '分词与词嵌入', '注意力：Q、K、V', '多头与 KV 头：GQA、MLA', 'FFN：参数的大头', '残差连接与归一化', '位置编码：RoPE', '输出层与解码', '实践：逐层拆开小模型']],
    ['p2', 'green', '二、架构演进', '09—12', ['编码器、解码器与 GPT', '混合专家 MoE', '长上下文与高效注意力', '线性注意力与混合架构']],
    ['p3', 'amber', '三、主流模型拆解', '13—16', ['Llama 家族', 'Qwen 家族', 'DeepSeek：MLA、MoE、MTP', 'Mistral、Gemma、GLM、', 'Kimi、gpt-oss、MiniMax']],
    ['p4', 'violet', '四、多模态与读懂模型', '17—19', ['图像和语音怎样变成 token', '读懂 config.json 与源码', '手算参数、FLOPs、KV Cache', '主流架构对比与趋势']],
  ];
  parts.forEach(([id, c, t, k, lines], i) => {
    const x = 32 + i * (w + 16);
    b += box(id, x, y, w, h, c, t, lines, k);
    if (i < 3) b += edge(`M${x + w + 2} ${y + h / 2}H${x + w + 14}`);
  });
  b += text(32, 460, '第一部分是基础，按顺序读；第二部分讲每种改动解决什么问题；第三部分用前两部分的知识读懂具体模型；第四部分把方法变成工具。', 's');
  return svg('arch-series-map', W, H, '大模型架构系列的四个部分',
    '第一部分先讲原始 Transformer 的完整结构，再沿着一个 token 走完分词、嵌入、注意力、FFN、残差归一化、位置编码和输出层；第二部分讲编码器与解码器结构、MoE、高效注意力和线性混合架构；第三部分拆解 Llama、Qwen、DeepSeek 和其他开源模型；第四部分讲多模态结构、读懂配置与源码，以及整体对比。',
    '大模型架构：四个部分', '从一个 token 的计算过程出发，到架构演进、具体模型和读模型的方法', b);
}

write({ 'arch-series-map': seriesMap() });
