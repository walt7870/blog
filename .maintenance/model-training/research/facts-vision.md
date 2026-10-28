# 视觉组事实核对（第 17—20 篇）

核对日期：2026-10-27。格式：事实 / 正文用法 / 来源 / 结论。

## 17 视觉模型

| 事实 | 正文用法 | 来源 | 结论 |
| --- | --- | --- | --- |
| ImageNet-1K（ILSVRC-2012）训练集 1,281,167 张、验证 50,000 张、1000 类，每类 732—1300 张 | “约 128 万张、1000 类” | https://image-net.org/static_files/files/ilsvrc2012.pdf ；https://www.tensorflow.org/datasets/catalog/imagenet2012 | 与简报一致 |
| torchvision ResNet-50 参数 25,557,032；IMAGENET1K_V1 top-1 76.13%，V2 80.858%；预处理 V2 缩放 232 后中心裁 224，均值 [0.485,0.456,0.406] | 骨干约 2556 万参数；分类头 2048×4+4 | https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.resnet50.html | 已核对 |
| ViT（Dosovitskiy 等，arXiv 2010.11929，ICLR 2021）：16×16 patch；在 ImageNet 这类中等数据集上不加强正则训练，比同规模 ResNet 低几个百分点；在 14M—300M 张图上训练后情况反转（“large scale training trumps inductive bias”）；ImageNet-21k 14M 张 21k 类；JFT-300M 实为 303M 张 18k 类 | 正文按此写 | https://arxiv.org/abs/2010.11929 ；ar5iv 正文第 1、4.1 节 | 简报说法正确；JFT 规模注明“约 3 亿” |
| ViT-Base 约 86M 参数；224×224 输入、16×16 patch → 14×14=196 个 patch | 手算 196 | 论文表 1（ViT-Base 86M），计算自推 | 已核对 |
| MAE（He 等，arXiv 2111.06377）：随机遮 75% patch、重建像素；编码器只处理可见 patch；训练加速 3 倍以上；ViT-Huge 仅用 ImageNet-1K 达 87.8% | 正文按此写 | https://arxiv.org/abs/2111.06377 | 与简报一致 |
| DINO（Caron 等，arXiv 2104.14294，2021）：无标签自蒸馏，学生-教师、动量教师；特征含分割信息；ViT-Base 线性评估 80.1% | 简述 | https://arxiv.org/abs/2104.14294 | 已核对 |
| DINOv2（Oquab 等，arXiv 2304.07193，2023）：自动策展的 LVD-142M（约 1.42 亿张）；训练 1B 参数 ViT 再蒸馏成小模型；特征不微调即可用于多种任务 | 简述 | https://arxiv.org/abs/2304.07193 ；ar5iv 正文 | 已核对 |

## 18 图文与多模态

| 事实 | 正文用法 | 来源 | 结论 |
| --- | --- | --- | --- |
| CLIP（Radford 等，arXiv 2103.00020，2021）：4 亿图文对；N 个对构成 N×N 相似度矩阵，最大化 N 个正确对、压低 N²−N 个错误对；对称交叉熵；batch 32,768；可学习温度初值 0.07，logit 缩放上限 100 | 正文按此写 | https://arxiv.org/abs/2103.00020 ；ar5iv 第 2.3、2.5 节 | 与简报一致 |
| CLIP 零样本 ImageNet 76.2%，与原始 ResNet-50 相当且未用其 128 万训练样本；“A photo of a {label}.” 提升 1.3%；80 条提示集成约 +3.5%，合计近 5% | 正文引用 | 同上，第 3.1 节 | 已核对 |
| CLIP 弱点：手写 MNIST 仅 88%，计数（CLEVRCounts）弱，细粒度（Flowers102、FGVC Aircraft）比监督线性探针低 10% 以上 | 讲失败情况 | 同上，第 3.1.5、6 节 | 已核对 |
| LLaVA（Liu 等，arXiv 2304.08485，2023）：第一阶段冻结视觉编码器和 LLM，只训投影矩阵 W，数据为过滤后 CC3M 约 595K；第二阶段视觉编码器始终冻结，更新投影层和 LLM，158K 指令数据 | 正文“冻结什么” | https://arxiv.org/abs/2304.08485 ；ar5iv 第 4.2 节 | 已核对 |
| LLaVA-1.5（arXiv 2310.03744）：CLIP-ViT-L-336px；两层 MLP 投影；预训练 558K（LCS-558K）；指令 665K 混合；13B 用约 1.2M 公开数据，单节点 8×A100 约 1 天训完 | 正文按此写 | https://arxiv.org/abs/2310.03744 ；https://github.com/haotian-liu/LLaVA/blob/main/docs/MODEL_ZOO.md | 与简报一致。论文正文未逐条写冻结关系，冻结口径沿用 LLaVA 原论文（仓库训练脚本同此做法） |
| LLaVA-1.5-HD：图像切成 224×224 网格分别编码，再拼一张下采样全图作全局上下文，最多 6 格（最大 672×448） | 讲切图 | 同上，附录 | 已核对 |
| CLIP ViT-L/14 在 336×336：336/14=24 → 576 个 patch token | 手算 | 计算自推 | 推算 |

## 19 扩散模型

| 事实 | 正文用法 | 来源 | 结论 |
| --- | --- | --- | --- |
| DDPM（Ho 等，arXiv 2006.11239，2020）：T=1000；β 从 1e-4 线性增到 0.02；前向过程可闭式直接采样任意 t；简化目标让网络预测噪声 ε；CIFAR-10 FID 3.17 | 正文按此写 | https://arxiv.org/abs/2006.11239 ；ar5iv | 与简报一致 |
| Stable Diffusion v1：自编码器下采样因子 8，H×W×3 → H/8×W/8×4，512×512×3 → 64×64×4；文本编码器为冻结 CLIP ViT-L/14，经交叉注意力进入 UNet；训练时 10% 丢弃文本条件以支持无分类器引导；数据 LAION-2B(en) 及子集；许可证 CreativeML OpenRAIL-M；模型卡承认对训练集中重复图像有一定记忆 | 正文按此写 | https://huggingface.co/CompVis/stable-diffusion-v1-4 | 与简报一致 |
| 无分类器引导（Ho & Salimans，arXiv 2207.12598，2022）：联合训练条件与无条件模型，组合两者估计，在质量与多样性间取舍 | 正文 | https://arxiv.org/abs/2207.12598 | 已核对 |
| SD3（Esser 等，arXiv 2403.03206，2024）：rectified flow（数据与噪声直线连接）；MM-DiT，图文两种 token 各自权重、双向信息流；文本编码器 CLIP-L/14、CLIP-G/14、T5-XXL（4.7B）；潜空间 16 通道 | 简述 | https://arxiv.org/abs/2403.03206 ；ar5iv | 与简报一致（论文写作 MM-DiT） |
| DiT（Peebles & Xie，arXiv 2212.09748） | 名称引用 | 论文题名 | 未细核，仅点名 |
| DreamBooth（Ruiz 等，arXiv 2208.12242，2022）：3—5 张主体图，罕见标识符“a [V] dog”；类别先验保持损失：先用冻结模型按“a dog”生成约 1000 张类别图参与训练，缓解语言漂移和多样性下降；约 1000 步，SD 学习率 5e-6，单张 A100 约 5 分钟 | 正文 | https://arxiv.org/abs/2208.12242 ；ar5iv | 与简报一致 |
| Textual Inversion（Gal 等，arXiv 2208.01618）：3—5 张图，在冻结模型的文本嵌入空间学一个新“词” | 正文 | https://arxiv.org/abs/2208.01618 | 已核对 |
| Carlini 等（arXiv 2301.13188，2023）：扩散模型会记忆并输出个别训练图，从先进模型中提取出一千多张训练样本，含个人照片和商标 | 讲过拟合与复制 | https://arxiv.org/abs/2301.13188 | 已核对 |
| FID（Heusel 等 2017，Inception 特征分布距离）；CLIPScore（Hessel 等 2021） | 指标定义 | 论文 1706.08500、2104.08718 | 定义为常识，未逐字核对 |

## 20 向量与重排

| 事实 | 正文用法 | 来源 | 结论 |
| --- | --- | --- | --- |
| BGE v1.5 中文：bge-small/base/large-zh-v1.5 维度 512/768/1024；MIT 许可，可免费商用；检索短查询可加指令“为这个句子生成表示以用于检索相关文章：”；对比学习温度 0.01，相似度多落在 0.6—1，阈值应按自己数据定；建议挖难负例；建议用 bge-reranker 对 top-k 重排 | 正文 | https://huggingface.co/BAAI/bge-large-zh-v1.5 | 已核对 |
| BGE 论文 C-Pack（arXiv 2309.07597）：C-MTEB 6 类任务 35 个数据集，C-MTP 训练数据 | 简述 | https://arxiv.org/abs/2309.07597 | 已核对 |
| bge-m3：MIT，1024 维，8192 token，100+ 语言，稠密/稀疏/多向量 | 表格 | https://huggingface.co/BAAI/bge-m3 | 已核对 |
| bge-reranker-v2-m3：Apache-2.0，基于 bge-m3，输入 query+passage 输出分数，可 sigmoid 归一；可用 sentence-transformers `CrossEncoder` | 表格 | https://huggingface.co/BAAI/bge-reranker-v2-m3 | 已核对 |
| Qwen3-Embedding-0.6B：Apache-2.0，0.6B，最高 1024 维，可选 32—1024（MRL），32K 上下文，支持指令；需 sentence-transformers ≥2.7.0；配套 Qwen3-Reranker-0.6B/4B/8B | 表格 | https://huggingface.co/Qwen/Qwen3-Embedding-0.6B | 已核对 |
| sentence-transformers MultipleNegativesRankingLoss：批内负例，可加难负例三元组，默认 InfoNCE；默认 scale=20 即温度 0.05；用 `BatchSamplers.NO_DUPLICATES` 避免批内重复；CachedMNRL 用 GradCache 支持更大 batch；GISTEmbedLoss 用 guide 模型过滤假负例 | 正文 | https://sbert.net/docs/package_reference/sentence_transformer/losses.html | 已核对 |
| DPR（Karpukhin 等，arXiv 2004.04906，2020）：双编码器，top-20 检索准确率比 BM25 高 9%—19%（绝对值） | 简述 | https://arxiv.org/abs/2004.04906 | 已核对；批内负例出自论文正文，摘要未写 |
| Promptagator（arXiv 2209.11755）：用不超过 8 个示例提示 LLM 生成查询；往返一致性过滤：用初始检索器检索，源段落须排第 1（K=1）才保留 | 合成查询过滤 | https://arxiv.org/abs/2209.11755 ；ar5iv | 已核对 |
| InfoNCE 出自 CPC（van den Oord 等，arXiv 1807.03748） | 名称 | 论文 | 常识，未细核 |

## 与简报不同或需注意

- 简报无数值错误。JFT-300M 论文第 4.1 节实写 303M 张、18k 类，正文写“约 3 亿张”。
- LLaVA-1.5 论文本身没有明确逐阶段写冻结关系，正文冻结口径来自 LLaVA 原论文第 4.2 节，标注“LLaVA 系列的做法”。
- BGE 官方温度 0.01，sentence-transformers 默认 0.05（scale 20），正文都写并说明是不同框架默认值。

## 正文中的教学估算（非实测）

- 报销单分类数据量（2000 张、类别比例）、混淆矩阵数值、海报 LoRA 参数量、检索指标数值均为教学示例，正文标明“示意”。
- SD v1 UNet 约 8.6 亿参数为常见说法，正文未使用。

## 补充（写作中使用、核对程度较低的项）

- SD 1.x 无分类器引导系数常用 7.5：diffusers `StableDiffusionPipeline` 的 `guidance_scale` 默认值为 7.5（来自 diffusers 文档常识，未在本轮逐页核对）。
- `bge-base-zh-v1.5` 约 1 亿参数：BERT-base 规模（约 1.02 亿），正文写“约 1 亿”，按 16 字节/参数估算全参训练状态约 1.6 GB，属估算。
- DDPM ᾱ_t 数值由脚本按 β 线性 1e-4→0.02、T=1000 逐项连乘计算：t=100 √ᾱ≈0.947，t=500≈0.280，t=1000≈0.0064。
- ResNet-50 layer4 参数 14,964,736 按结构手算（3 个瓶颈块，含 BN 的 γ、β），4 类头全网 23,516,228 由官方总数 25,557,032 推得。
- Qwen3-Embedding 另有 4B、8B 版本：Qwen3-Embedding 系列模型卡列出 0.6B/4B/8B。
- 文中各类“示意”数据（2000 张标注、混淆矩阵、300 条检索评测、62%/91%、1000 条/秒编码吞吐、海报 20—50 张）均为教学设定，非实测。
