#!/usr/bin/env python3
"""从 Hugging Face 的 config.json 估算参数量、每 token 前向 FLOPs 和 KV Cache 大小。

只用 Python 标准库，不需要 torch，也不下载权重。支持的结构：
  - Llama / Mistral / Qwen2 / Qwen3 一类的稠密 decoder（GQA、QKV bias、QK-Norm）
  - Qwen2-MoE / Qwen3-MoE（路由专家、可选共享专家）
  - DeepSeek-V2/V3（MLA、前几层稠密、共享专家、MTP 模块）
  - gpt-oss（带 bias 的专家、注意力汇聚 sinks、滑动窗口层）
多模态模型只计算 text_config 里的语言模型部分。

用法：
  python3 arch_calc.py config.json [更多 config.json ...] [--ctx 8192] [--kv-bytes 2]

口径：
  - 参数量按源码里每个 nn.Linear / nn.Parameter / RMSNorm 的形状逐项相加。
  - 每 token 前向 FLOPs = 2 × 参与计算的矩阵参数（含输出层、不含词嵌入查表）
    + 注意力里随上下文增长的部分（QKᵀ 与 加权求和 V，按 --ctx 计算）。
  - KV Cache 按每层实际要缓存的张量计算；滑动窗口层最多缓存 sliding_window 个 token。
"""
import argparse
import json
import sys


def load(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    # 多模态模型把语言模型配置放在 text_config 里
    text = cfg.get("text_config") or cfg
    return cfg, text


def g(c, *names, default=None):
    for n in names:
        if c.get(n) is not None:
            return c[n]
    return default


def analyze(c, ctx, kv_bytes):
    mt = c.get("model_type", "")
    h = c["hidden_size"]
    L = c["num_hidden_layers"]
    V = c["vocab_size"]
    nh = c["num_attention_heads"]
    nkv = g(c, "num_key_value_heads", default=nh)
    hd = g(c, "head_dim", default=h // nh)
    tie = bool(c.get("tie_word_embeddings", False))
    window = c.get("sliding_window")
    layer_types = c.get("layer_types") or ["full_attention"] * L

    mla = c.get("kv_lora_rank") is not None
    n_exp = g(c, "n_routed_experts", "num_experts", "num_local_experts", default=0) or 0
    top_k = g(c, "num_experts_per_tok", "experts_per_token", default=0) or 0
    moe_inter = g(c, "moe_intermediate_size", default=c.get("intermediate_size"))
    dense_inter = c.get("intermediate_size")

    # ---------- 注意力 ----------
    if mla:
        qr, kvr = c.get("q_lora_rank"), c["kv_lora_rank"]
        nope, rope, vd = c["qk_nope_head_dim"], c["qk_rope_head_dim"], c["v_head_dim"]
        qk = nope + rope
        q = (h * qr + qr + qr * nh * qk) if qr else h * nh * qk  # q_a_proj + q_a_layernorm + q_b_proj
        kv = h * (kvr + rope) + kvr + kvr * nh * (nope + vd)      # kv_a_proj_with_mqa + norm + kv_b_proj
        attn = q + kv + nh * vd * h                                # + o_proj
        qk_dim, v_dim = nh * qk, nh * vd
        # 推理引擎按“吸收”写法只缓存压缩向量和共享的 RoPE 部分
        kv_per_layer = (kvr + rope) * kv_bytes
        kv_note = f"MLA 每层只缓存 {kvr}+{rope} 维；若展开成每头的 K、V 再缓存，每层要 {nh * (qk + vd) * kv_bytes:,.0f} 字节"
    else:
        qkv_bias = mt.startswith("qwen2") or mt in ("qwen2_5_vl_text",)
        all_bias = bool(c.get("attention_bias", False))
        attn = h * nh * hd + 2 * h * nkv * hd + nh * hd * h
        if qkv_bias or all_bias:
            attn += nh * hd + 2 * nkv * hd
        if all_bias:
            attn += h
        if mt.startswith("qwen3"):          # Qwen3 的 QK-Norm：q_norm、k_norm 各 head_dim
            attn += 2 * hd
        if mt == "gpt_oss":                 # 每个头一个注意力汇聚 logit
            attn += nh
        qk_dim = v_dim = nh * hd
        kv_per_layer = 2 * nkv * hd * kv_bytes
        kv_note = ""

    # ---------- FFN / MoE ----------
    def is_moe(i):
        if not n_exp:
            return False
        if "first_k_dense_replace" in c:
            return i >= c["first_k_dense_replace"]
        if i in (c.get("mlp_only_layers") or []):
            return False
        step = c.get("decoder_sparse_step", 1) or 1
        return (i + 1) % step == 0

    dense_ffn = 3 * h * dense_inter if dense_inter else 0
    if mt == "gpt_oss":
        expert = h * 2 * moe_inter + 2 * moe_inter + moe_inter * h + h   # gate_up(+bias) + down(+bias)
        router = h * n_exp + n_exp
    else:
        expert = 3 * h * moe_inter
        router = h * n_exp
    shared = 0
    if c.get("n_shared_experts"):
        shared = 3 * h * moe_inter * c["n_shared_experts"]
    elif c.get("shared_expert_intermediate_size"):
        shared = 3 * h * c["shared_expert_intermediate_size"] + h   # Qwen2-MoE 还有 shared_expert_gate
    bias_buf = n_exp if c.get("topk_method") == "noaux_tc" else 0   # DeepSeek-V3 的 e_score_correction_bias

    norms_layer = 2 * h

    total_layers = active_layers = 0
    attn_ctx_flops = 0
    kv_total = 0
    for i in range(L):
        sliding = layer_types[i] == "sliding_attention" if i < len(layer_types) else False
        if is_moe(i):
            ffn_total = n_exp * expert + router + shared + bias_buf
            ffn_active = top_k * expert + router + shared
        else:
            ffn_total = ffn_active = dense_ffn
        total_layers += attn + ffn_total + norms_layer
        active_layers += attn + ffn_active + norms_layer
        seen = min(ctx, window) if (sliding and window) else ctx
        attn_ctx_flops += 2 * seen * qk_dim + 2 * seen * v_dim
        kv_total += seen * kv_per_layer

    embed = V * h
    head = 0 if tie else V * h
    total = embed + head + total_layers + h  # + 最终 norm
    active = embed + head + active_layers + h

    # MTP（DeepSeek-V3）：HF 推理时不加载，但权重文件里有
    mtp = 0
    n_mtp = c.get("num_nextn_predict_layers") or 0
    if n_mtp:
        one_layer = attn + n_exp * expert + router + shared + bias_buf + norms_layer
        mtp = n_mtp * (2 * h + 2 * h * h + one_layer + h + embed + V * h)

    # 每 token 前向：矩阵乘法 2 FLOPs/参数；不算词嵌入查表、norm 和 bias
    matmul_active = active - embed - L * norms_layer - h
    flops_static = 2 * matmul_active
    full_layers = sum(1 for i in range(L) if (layer_types[i] if i < len(layer_types) else "full_attention") != "sliding_attention")

    return {
        "model_type": mt, "layers": L, "hidden": h, "heads": f"{nh}Q/{nkv}KV" if not mla else f"{nh} (MLA)",
        "total": total, "active": active, "embed": embed, "head": head, "mtp": mtp,
        "attn_per_layer": attn, "moe": bool(n_exp),
        "flops_static": flops_static, "flops_attn": attn_ctx_flops,
        "kv_per_token_full": kv_per_layer * full_layers, "full_layers": full_layers,
        "kv_total": kv_total, "kv_note": kv_note,
    }


# 脚本认识或确认不影响结果的字段；其他取值非空的字段会被列出来提醒核对
KNOWN = set("""
architectures model_type hidden_size num_hidden_layers vocab_size num_attention_heads num_key_value_heads
head_dim tie_word_embeddings sliding_window layer_types kv_lora_rank q_lora_rank qk_nope_head_dim
qk_rope_head_dim v_head_dim qk_head_dim n_routed_experts num_experts num_local_experts num_experts_per_tok
experts_per_token moe_intermediate_size intermediate_size first_k_dense_replace mlp_only_layers
decoder_sparse_step n_shared_experts shared_expert_intermediate_size topk_method num_nextn_predict_layers
attention_bias mlp_bias hidden_act hidden_activation rms_norm_eps rope_theta rope_scaling rope_parameters
max_position_embeddings original_max_position_embeddings initial_context_length bos_token_id eos_token_id
pad_token_id torch_dtype dtype transformers_version use_cache initializer_range attention_dropout
pretraining_tp use_sliding_window max_window_layers norm_topk_prob router_aux_loss_coef output_router_logits
n_group topk_group routed_scaling_factor scoring_func ep_size moe_layer_freq quantization_config auto_map
swiglu_limit rope_interleave unsloth_fixed _name_or_path num_mtp_layers aux_loss_alpha seq_aux router_jitter_noise
""".split())


def unknown_fields(c):
    out = []
    for k, v in c.items():
        if k in KNOWN or k.endswith("_token_id") or k.endswith("_token_index") or v in (None, False, [], {}, 0):
            continue
        out.append(k)
    return out


def fmt_b(n):
    return f"{n / 1e9:,.3f} B"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("configs", nargs="+")
    ap.add_argument("--ctx", type=int, default=8192, help="上下文长度，用于注意力 FLOPs 和 KV 总量（默认 8192）")
    ap.add_argument("--kv-bytes", type=float, default=2, help="KV 每个数的字节数：BF16=2，FP8=1（默认 2）")
    a = ap.parse_args()
    for path in a.configs:
        cfg, c = load(path)
        r = analyze(c, a.ctx, a.kv_bytes)
        print(f"== {path}")
        print(f"  结构        {r['model_type']}，{r['layers']} 层，hidden {r['hidden']}，头 {r['heads']}")
        print(f"  总参数      {r['total']:,}（{fmt_b(r['total'])}）")
        print(f"    词嵌入    {r['embed']:,}   输出层 {r['head']:,}{'（与词嵌入共享）' if not r['head'] else ''}")
        print(f"    非嵌入    {r['total'] - r['embed'] - r['head']:,}（{fmt_b(r['total'] - r['embed'] - r['head'])}）")
        if r["moe"]:
            print(f"  每 token 激活 {r['active']:,}（{fmt_b(r['active'])}，含词嵌入和输出层；"
                  f"不含词嵌入 {fmt_b(r['active'] - r['embed'])}）")
        if r["mtp"]:
            print(f"  MTP 模块    {r['mtp']:,}（{fmt_b(r['mtp'])}），总参数+MTP = {fmt_b(r['total'] + r['mtp'])}")
        print(f"  每 token 前向 FLOPs：固定部分 {r['flops_static'] / 1e9:,.2f} G"
              f" + 注意力@{a.ctx} {r['flops_attn'] / 1e9:,.2f} G = {(r['flops_static'] + r['flops_attn']) / 1e9:,.2f} G")
        print(f"  KV Cache    每 token {r['kv_per_token_full']:,.0f} 字节（{r['full_layers']} 个全注意力层，{a.kv_bytes:g} 字节/数）")
        print(f"              {a.ctx} token 合计 {r['kv_total'] / 2**30:,.3f} GiB（滑动窗口层已按窗口封顶）")
        if r["kv_note"]:
            print(f"              {r['kv_note']}")
        extra = unknown_fields(c)
        if extra:
            print(f"  注意：脚本没有用到这些字段，结果可能漏算，请对照 modeling 源码：{', '.join(extra)}")


if __name__ == "__main__":
    sys.exit(main())
