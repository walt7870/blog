# facts-read：17-multimodal、18-reading-models 事实核对

核对日期 2026-10-28。环境：macOS 26.6.2 arm64，系统 Python 3.14.7；Transformers 源码为 scratchpad `venv-mlx` 中的 5.21.0（下文简写 `T=.../site-packages/transformers/models`）。config 均当天用 `curl -sL https://huggingface.co/<repo>/raw/main/config.json` 下载，存于 scratch `arch/read/configs/`。参数统计来自 `https://huggingface.co/api/models/<repo>` 的 `safetensors` 字段。

## 17. 多模态

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Qwen2.5-VL 视觉 patch / 合并 / 时间 patch | 14 / 2 / 2 | Qwen/Qwen2.5-VL-7B-Instruct config.json `vision_config`；`T/qwen2_5_vl/configuration_qwen2_5_vl.py` | 一致 |
| Qwen2.5-VL-7B ViT | depth 32，hidden 1280，intermediate 3420，16 头，window_size 112，fullatt_block_indexes [7,15,23,31]，out_hidden_size 3584，tokens_per_second 2 | 同上 config（类默认 tokens_per_second=4，checkpoint 为 2） | 一致；正文用 checkpoint 值 |
| Qwen2.5-VL patch embed 用 Conv3d，核 [2,14,14]，无 bias | — | `T/qwen2_5_vl/modeling_qwen2_5_vl.py` Qwen2_5_VisionPatchEmbed | 一致；单图在处理器里沿时间复制到 2 帧（image_processing_qwen2_vl.py expand temporal_patch_size） |
| PatchMerger：RMSNorm → Linear(5120,5120) → GELU → Linear(5120,3584) | — | 同上 Qwen2_5_VLPatchMerger | 一致 |
| Qwen2.5-VL-7B 总参数 / 语言模型参数 / 视觉部分 | 8,292,166,656 / 7,615,616,512（arch_calc 对 text 部分实测）/ 676,550,144 | HF API safetensors；arch_calc.py | 视觉约 6.8 亿；自算 ViT 估计 676.2M 吻合 |
| Qwen2.5-VL 文本 M-RoPE | mrope_section [16,24,24]，按段 | config `rope_scaling`；modeling 第 556 行 `split(self.mrope_section)` 取 i%3 | 一致 |
| Qwen2.5-VL KV 头 / 层数 | 4 / 28，每 token 57,344 字节 BF16 | config；arch_calc | 一致 |
| Qwen2.5-VL 预处理 min/max_pixels | 3136 / 12,845,056 | preprocessor_config.json | 一致；= 4 ~ 16384 个图像 token |
| smart_resize 规则 | 四舍五入到 factor 倍数，超上限按 sqrt 缩小向下取整，低于下限放大向上取整 | `T/qwen2_vl/image_processing_qwen2_vl.py` smart_resize | 一致；正文算例用 Python 复刻（scratch tokens.py），未运行官方处理器（venv 无 torch/PIL），标“按源码公式计算” |
| 1240×1754 → Qwen2.5-VL 默认 | 1764×1232，11,088 patch，2,772 token；max_pixels=1280·28·28 时 1176×840，1260 token | tokens.py | 计算值 |
| 同图 Qwen3-VL 默认 / Gemma 4 预算 280 | 2,145 token（1760×1248）/ 266 token（912×672） | tokens.py 复刻 Qwen3-VL preprocessor（shortest 65536、longest 16777216、factor 32）与 Gemma 4 get_aspect_ratio_preserving_size | 计算值 |
| 448×448 token 数 | ViT-L/14 1024；Qwen2.5-VL 256；Qwen3-VL 196；Gemma 3 256；Gemma 4（280）256，缩放到 768×768 | 同上；Gemma 3 config mm_tokens_per_image 256、image_size 896、patch 14 → AvgPool 4×4（Gemma3MultiModalProjector） | 计算值 |
| Qwen3-VL-8B 视觉 | patch 16，merge 2，depth 27，hidden 1152，deepstack_visual_indexes [8,16,24]，out_hidden 4096 | Qwen/Qwen3-VL-8B-Instruct config | 一致 |
| DeepStack 加到语言模型前 len(deepstack) 层输出的视觉位置 | 第 1—3 层（layer_idx 0,1,2 之后） | `T/qwen3_vl/modeling_qwen3_vl.py` 第 833 行、_deepstack_process | 一致 |
| Qwen3-VL M-RoPE 交错 | mrope_section [24,20,20]，mrope_interleaved true；recomposition_frequencies 中 H 取 slice(1,60,3)、W 取 slice(2,60,3)，其余为 T | config、modeling | 一致 |
| 图后位置前进 max(h,w)/merge | — | Qwen3-VL get_rope_index `current_pos += max(grid_thw[1], grid_thw[2]) // spatial_merge_size` | 一致 |
| Qwen2.5-VL 视频时间编号间隔 = tokens_per_second × second_per_grid | — | Qwen2_5_VLModel.get_rope_index docstring 与第 1040 行；processing_qwen2_5_vl second_per_grid_ts = temporal_patch_size / fps | 一致；默认 fps 未在 HF 处理器中确认，正文写“按每秒抽 2 帧算” |
| Qwen3-VL 视频文字时间戳 `<x.x seconds>`；max_frames 768，fps 2 | — | `T/qwen3_vl/processing_qwen3_vl.py` 第 105 行；video_processing_qwen3_vl.py | 一致 |
| LLaVA-1.5 | CLIP ViT-L/14 336，vision_feature_layer -2，投影 Linear(1024,4096)+GELU+Linear(4096,4096) | llava-hf/llava-1.5-7b-hf config；`T/llava/modeling_llava.py` | 一致 |
| Llama 4 Scout 视觉 | image_size 336，patch 14，pixel_shuffle_ratio 0.5（576→144），projector Linear(4096→5120, bias False) | unsloth/Llama-4-Scout-17B-16E-Instruct config（Meta 仓库需登录）；`T/llama4/modeling_llama4.py` | 一致 |
| Llama 4 “native multimodality, early fusion”；视觉编码器基于 MetaCLIP，与冻结 Llama 一起单独训练；推理时注意力温度缩放 | 2025-04-05 | https://ai.meta.com/blog/llama-4-multimodal-intelligence/ | 一致 |
| Gemma 3 图像块内双向注意力（所有层）；Gemma 4 只在滑动窗口层双向 | — | `T/gemma4/modeling_gemma4.py` create_masks_for_vision_model docstring；gemma3 get_block_sequence_ids_for_mask | 一致 |
| Gemma 4 视觉：patch 16，pooling 3，预算 70/140/280/560/1120，默认 280 | — | `T/gemma4/image_processing_gemma4.py`；google/gemma-4-31b-it config；模型卡 | 一致 |
| Gemma 4 型号与编码器 | E2B/E4B 视觉约 150M、音频约 300M；31B、26B A4B 视觉约 550M、无音频；12B Unified 无编码器 | google/gemma-4-31b-it README（模型卡） | 一致 |
| Gemma 4 12B Unified：48×48 像素块（6912）→ Linear → 3840；音频 640 采样/ token（40 ms） | model_type gemma4_unified | google/gemma-4-12b-it config；`T/gemma4_unified/modeling_gemma4_unified.py` 第 764—776 行；configuration_gemma4_unified.py | 一致 |
| Qwen3-Omni Thinker | 48 层 MoE，128 专家选 8，hidden 2048 | Qwen/Qwen3-Omni-30B-A3B-Instruct config thinker_config.text_config | 一致 |
| Qwen3-Omni 音频编码器 | 32 层，d_model 1280，128 mel，三层 stride-2 Conv2d；每 100 帧输出 13 | config audio_config；modeling `_get_feat_extract_output_lengths`（`... + (input_lengths // 100) * 13`） | 一致；正文写“约每秒 13 个 token”；position_id_per_seconds 13 |
| 特征提取：WhisperFeatureExtractor，16 kHz，hop 160（100 帧/秒），128 维 | — | Qwen3-Omni preprocessor_config.json | 一致 |
| Qwen3-Omni Talker | 20 层 MoE，128 选 6，hidden 1024，vocab 3072；accept_hidden_layer 24；code predictor 5 层、num_code_groups 16（补 15 层） | config talker_config；modeling 第 2644、3413 行 | 一致 |
| Talker 输入：多模态位置取 Thinker 第 24 层隐藏状态，文字与回复部分取词嵌入投影 | — | modeling `_get_talker_user_parts`、`_get_talker_assistant_parts`、generate 第 4167 行 | 一致 |
| Code2Wav | codebook 2048 × 16 层；upsample_rates [8,5,4,3] × upsampling_ratios [2,2] = 1920 | config code2wav_config；modeling total_upsample | 一致；24 kHz 来自模型卡示例 `samplerate=24000`，1920 × 12.5 = 24000 |
| disable_talker 省约 10 GB；vLLM serve 目前只支持 thinker | — | Qwen3-Omni 模型卡 README | 一致（模型卡表述，日期为读取日） |
| 模型卡建议系统提示让 Thinker 少用难以朗读的复杂格式 | — | 同上 | 一致 |
| Qwen2.5-Omni | Thinker-Talker、TMRoPE；音频编码器 32 层，Conv1d stride 2 + AvgPool 2（25 token/s，position_id_per_seconds 25）；Talker 24 层 hidden 896 vocab 8448；token2wav = DiT 22 层 + BigVGAN | Qwen/Qwen2.5-Omni-7B config、README；`T/qwen2_5_omni/modeling_qwen2_5_omni.py` 第 848—854、920—926 行 | 一致 |
| Qwen2.5-Omni Talker 输入 = Thinker 最后一层隐藏状态 + 词嵌入 | — | modeling 第 3970—3995 行（token_hidden_states[-1] + thinker_token_embeds） | 一致 |
| Whisper 编码器每秒 50 帧，30 秒 1500 位置 | max_source_positions 1500 | Qwen 音频 config（Whisper 结构） | 一致 |
| 视觉编码器前向约 14 TFLOPs、语言模型预填充约 39 TFLOPs | 2×630M×11088；14.14G×2772 | 估算 | 估算，正文已标 |

## 18. 读懂 config 与源码

| 事实 | 数值 | 来源 | 结论 |
| --- | --- | --- | --- |
| Llama-3.1-8B config 各字段 | 与简报一致；另有 high_freq_factor 4、low_freq_factor 1、pretraining_tp 1、bos 128000、eos 128001 | unsloth/Meta-Llama-3.1-8B config.json | 一致 |
| Qwen3-30B-A3B config | hidden 2048，48 层，32Q/4KV，head_dim 128，128 专家选 8，moe_intermediate 768，intermediate 6144，mlp_only_layers []，decoder_sparse_step 1 | Qwen/Qwen3-30B-A3B config | 一致；intermediate_size 在全 MoE 下不使用（`T/qwen3_moe/modeling_qwen3_moe.py` 第 308 行条件） |
| DeepSeek-V3 config | 见正文；first_k_dense_replace 3，256+1 专家选 8，n_group 8，topk_group 4，noaux_tc，sigmoid，routed_scaling 2.5，MTP 1，FP8 e4m3 块 128 | deepseek-ai/DeepSeek-V3 config | 一致 |
| HF 当前 DeepSeekV3Attention 缓存压缩潜向量（不展开） | — | `T/deepseek_v3/modeling_deepseek_v3.py` 第 456—459 行 | 脚本注释据此改写 |
| HF 跳过 MTP 层权重 | `_keys_to_ignore_on_load_unexpected = [r"model\.layers\.61.*"]` | 同上第 551 行 | 一致 |
| arch_calc 实测：Llama-3.1-8B | 8,030,261,248；15.01 GFLOPs + 4.29@8192；KV 131,072 B/token | 脚本输出（scratch run_final.txt） | HF 统计 8,030,261,248，一致 |
| arch_calc 实测：Qwen3-30B-A3B | 30,532,122,624；激活 3,353,032,704 | 同上 | HF 30,532,122,624 一致；模型卡 30.5B/3.3B |
| arch_calc 实测：DeepSeek-V3 | 671,026,419,200 + MTP 13,463,426,304 = 684,489,845,504；激活 37.552B | 同上 | HF 684,489,845,504 一致；模型卡 671B/37B，685B 含 14B MTP |
| arch_calc 实测：gpt-oss-20b | 20,914,757,184；激活 4.187B，不含词嵌入 3.608B | 同上 | HF 20,914,757,184 一致；模型卡 21B/3.6B，3.6B 对应不含词嵌入口径 |
| arch_calc 实测：Qwen3-8B、Qwen2.5-0.5B | 8,190,735,360；494,032,768 | 同上 | HF 一致（模型卡 8.2B、0.49B） |
| arch_calc 实测：Mistral Small 4 | 118,972,826,624；激活 6.633B | mistralai/Mistral-Small-4-119B-2603 config text_config | 模型卡 119B、6.5B；激活差 0.13B，口径未公开，**不确定** |
| arch_calc 对 Gemma 4 E2B 漏算 | 脚本 1.641B；HF 5,123,178,051；模型卡含嵌入 5.1B | google/gemma-4-e2b-it config | 漏 PLE（262144×256×35 ≈ 2.35B）、double-wide MLP、global_head_dim、视觉/音频编码器；脚本已列出未识别字段 |
| gpt-oss / DeepSeek 仓库存储格式 | gpt-oss U8（MXFP4）+ BF16；DeepSeek F8_E4M3 + BF16 + F32 | HF API | 正文提示量化仓库统计可能与参数量不同（本次两者恰好一致） |
| Llama 类结构 | LlamaRMSNorm、RotaryEmbedding、MLP、Attention、DecoderLayer、PreTrainedModel、Model、ForCausalLM | `T/llama/modeling_llama.py` 类列表 | 一致 |
| modular_qwen3.py 156 行，modeling_qwen3.py 515 行；Qwen3Attention(LlamaAttention) 增加 q_norm/k_norm 和 sliding_window | — | `T/qwen3/` wc -l 与源码 | 一致；生成文件头部有“自动生成，勿手改”警告 |
| Mistral4 modular 父类 | RMSNorm/Rotary←Llama；MLP←Qwen2MoeMLP；TopkRouter←DeepseekV2TopkRouter（改 forward，softmax）；Experts/MoE/DecoderLayer/Model/ForCausalLM←DeepseekV3；Attention←DeepseekV3Attention（加 get_llama_4_attn_scale） | `T/mistral4/modular_mistral4.py` | 一致 |
| get_llama_4_attn_scale = 1 + β·ln(1 + floor(pos / max_pos)) | β 0.1，original 8192 | `T/ministral3/modeling_ministral3.py` 第 104 行；Mistral 4 config rope_parameters | 一致；pos 100000 时 ≈ 1.256 |
| Mistral Small 4 模型卡 | 119B，6.5B 激活，128 专家选 4，256k 上下文 | 模型卡 README | 一致 |
| Qwen3 词表实际编号到 151668，vocab_size 151936 = 128×1187 | — | Qwen/Qwen3-8B tokenizer_config.json added_tokens_decoder | 一致 |
| Gemma 4 31B 文本 | 60 层，hidden 5376，32 头，head_dim 256（global 512），16 KV 头，FFN 21504，vocab 262144，tie true | google/gemma-4-31b-it config | 一致 |
| Kaplan et al. 2020 形状影响小 | arXiv 2001.08361 | 论文摘要 | 一致 |
| Levine et al. 2020 深宽权衡 | arXiv 2006.12467（The Depth-to-Width Interplay in Self-Attention） | 摘要 | 一致；“最优深度随宽度对数增长”为论文主结论的概括 |
| MobileLLM 深而窄、共享嵌入、GQA | arXiv 2402.14905 | 摘要 | 一致 |
| Bhojanapalli et al. 2020 头维度低秩瓶颈 | arXiv 2002.07028 | 摘要 | 一致 |
| Tao et al. 2024 词表缩放：Llama2-70B 最优至少 216K，实际 32K | arXiv 2407.13623 | 摘要 | 一致 |
| SwiGLU 2/3 系数 | arXiv 2002.05202 | 已知 | 一致，细节链接第 05 篇 |

## 与简报不同或需主编注意

- 简报“每 token 前向约 2×参数量 ≈ 16 GFLOPs”：脚本按“不含词嵌入查表”口径得 15.01 GFLOPs，正文同时说明两种口径。
- 导读写“一张报销单截图怎样变成几百个 token”：按 1240×1754 截图，Qwen2.5-VL 默认 2772、Qwen3-VL 2145、限制 max_pixels 后 1260、Gemma 4 预算 280 时 266。“几百”只对 Gemma 4 或强压缩成立，建议导读改为“几百到几千个 token”。
- 未能在本机运行官方图像处理器（venv 无 torch、PIL），token 数为按源码公式的复刻计算。
