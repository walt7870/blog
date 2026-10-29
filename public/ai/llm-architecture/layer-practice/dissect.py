"""逐层拆开 Qwen2.5-0.5B-Instruct：参数分解、张量形状、注意力、各层贡献、logit lens、消融。
用法：python dissect.py [--model Qwen/Qwen2.5-0.5B-Instruct] [--out result.json]
只用 CPU 也能跑（约 1 分钟）；结果写进 JSON，终端打印摘要。"""
import argparse, json, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

p = argparse.ArgumentParser()
p.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
p.add_argument("--out", default="result.json")
args = p.parse_args()
torch.manual_seed(0)

tok = AutoTokenizer.from_pretrained(args.model)
# eager 注意力才能返回注意力权重；float32 让数值比较更干净
model = AutoModelForCausalLM.from_pretrained(args.model, dtype=torch.float32, attn_implementation="eager")
model.eval()
cfg = model.config
R = {"config": {k: getattr(cfg, k) for k in ["hidden_size", "num_hidden_layers", "num_attention_heads",
     "num_key_value_heads", "intermediate_size", "vocab_size", "tie_word_embeddings"]}}
# Transformers 5 把 rope_theta 等收进 rope_parameters
R["config"]["rope"] = getattr(cfg, "rope_parameters", None) or getattr(cfg, "rope_theta", None)

# ---------- 1. 参数分解：按配置手算，再和实际计数对照 ----------
h, L, nh, nkv, ff, V = (cfg.hidden_size, cfg.num_hidden_layers, cfg.num_attention_heads,
                        cfg.num_key_value_heads, cfg.intermediate_size, cfg.vocab_size)
hd = h // nh
hand = {
    "embed": V * h,
    "attn_per_layer": h * nh * hd + nh * hd            # q 权重 + q 偏置
                      + 2 * (h * nkv * hd + nkv * hd)  # k、v 权重 + 偏置（Qwen2 有 QKV bias）
                      + nh * hd * h,                   # o 无偏置
    "ffn_per_layer": 3 * h * ff,
    "norm_per_layer": 2 * h,
}
hand["total"] = hand["embed"] + L * (hand["attn_per_layer"] + hand["ffn_per_layer"] + hand["norm_per_layer"]) + h
groups = {"embed": 0, "attn": 0, "ffn": 0, "norm": 0, "other": 0}
for n, prm in model.named_parameters():  # 共享词嵌入时 lm_head.weight 不会重复出现
    k = ("embed" if "embed_tokens" in n else "attn" if "self_attn" in n else
         "ffn" if ".mlp." in n else "norm" if "norm" in n else "other")
    groups[k] += prm.numel()
actual = sum(groups.values())
R["params"] = {"hand": hand, "actual_groups": groups, "actual_total": actual,
               "lm_head_shares_embedding": model.lm_head.weight.data_ptr() == model.model.embed_tokens.weight.data_ptr()}

# ---------- 2. 输入：按对话模板拼好的“年假怎么申请？” ----------
# 不写 system 时，Qwen2.5 的模板会自动补一句默认的 system 提示，这里换成资料助手的设定
msgs = [{"role": "system", "content": "你是公司内部的资料助手。"},
        {"role": "user", "content": "年假怎么申请？"}]
text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
ids = tok(text, return_tensors="pt").input_ids
pieces = [tok.decode([i]) for i in ids[0]]
R["input"] = {"num_tokens": ids.shape[1], "tokens": pieces}
q_start = next(i for i, s in enumerate(pieces) if "年" in s)  # 问题本身从哪个位置开始
q_len = len(tok("年假怎么申请？").input_ids)                    # 问题本身占几个 token

# ---------- 3. 第 0 层里每个模块的输入输出形状 ----------
shapes = []
def shape_hook(name):
    def f(mod, inp, out):
        o = out[0] if isinstance(out, tuple) else out
        shapes.append({"module": name, "in": list(inp[0].shape) if inp else None, "out": list(o.shape)})
    return f
layer0 = model.model.layers[0]
hooks = [model.model.embed_tokens.register_forward_hook(shape_hook("embed_tokens"))]
for name in ["input_layernorm", "self_attn.q_proj", "self_attn.k_proj", "self_attn.v_proj", "self_attn.o_proj",
             "post_attention_layernorm", "mlp.gate_proj", "mlp.up_proj", "mlp.down_proj"]:
    hooks.append(layer0.get_submodule(name).register_forward_hook(shape_hook("layers.0." + name)))
hooks.append(model.model.norm.register_forward_hook(shape_hook("norm")))
hooks.append(model.lm_head.register_forward_hook(shape_hook("lm_head")))

# 同时记录每层注意力和 FFN 的输出（它们被加回残差流的那部分）
contrib = {"attn": [], "ffn": [], "resid": []}
def first(o):
    return o[0] if isinstance(o, tuple) else o
for i, layer in enumerate(model.model.layers):
    # 每层输出的残差流（最终 norm 之前）。output_hidden_states 的最后一项已经过最终 norm，不能直接用
    hooks.append(layer.register_forward_hook(lambda m, a, o: contrib["resid"].append(first(o)[0, -1].detach())))
    hooks.append(layer.self_attn.register_forward_hook(lambda m, a, o: contrib["attn"].append(o[0][0, -1].detach())))
    hooks.append(layer.mlp.register_forward_hook(lambda m, a, o: contrib["ffn"].append(o[0, -1].detach())))

t0 = time.time()
with torch.no_grad():
    out = model(ids, output_hidden_states=True, output_attentions=True)
R["forward_seconds"] = round(time.time() - t0, 2)
for hk in hooks:
    hk.remove()
R["layer0_shapes"] = shapes

logits = out.logits[0, -1]
probs = torch.softmax(logits, -1)
top = torch.topk(probs, 5)
R["next_token_top5"] = [{"token": tok.decode([i]), "prob": round(p.item(), 4)} for p, i in zip(top.values, top.indices)]

# ---------- 4. 残差流：每层之后最后一个位置的向量长度，以及注意力 / FFN 各加了多少 ----------
hs = [out.hidden_states[0][0, -1]] + contrib["resid"]  # 嵌入输出 + 每层输出，均为最后一个位置
R["residual"] = [{"layer": i, "resid_norm": round(hs[i + 1].norm().item(), 2),
                  "attn_out_norm": round(contrib["attn"][i].norm().item(), 2),
                  "ffn_out_norm": round(contrib["ffn"][i].norm().item(), 2)} for i in range(L)]
R["embed_norm_last"] = round(hs[0].norm().item(), 3)

# ---------- 5. logit lens：把中间层的残差流直接接到最终 norm + 输出层，看它“此时想说什么” ----------
lens = []
with torch.no_grad():
    for i in range(L + 1):
        lg = model.lm_head(model.model.norm(hs[i][None]))[0]
        pr = torch.softmax(lg, -1)
        t3 = torch.topk(pr, 3)
        lens.append({"after_layer": i, "top3": [tok.decode([j]) for j in t3.indices],
                     "p_final_top1": round(pr[top.indices[0]].item(), 4)})
R["logit_lens"] = lens

# ---------- 6. 注意力：最后一个位置在若干层里最关注哪些 token（各头平均） ----------
att = []
for li in [0, 5, 11, 17, 23]:
    a = out.attentions[li][0, :, -1].mean(0)  # [序列长度]
    t = torch.topk(a, 4)
    att.append({"layer": li, "top": [{"pos": int(j), "token": pieces[j], "w": round(w.item(), 3)} for w, j in zip(t.values, t.indices)],
                "share_on_first_token": round(a[0].item(), 3),
                "share_on_question": round(a[q_start:q_start + q_len].sum().item(), 3)})
R["attention_last_pos"] = att

# ---------- 7. 消融：把某一层的 FFN 或注意力输出置零，看下一个 token 和一句参考回答的损失 ----------
ref = "年假申请需要提前在系统中提交请假单，经直属上级审批后生效。"
full = tok(text + ref, return_tensors="pt").input_ids
n_prompt = ids.shape[1]
def zero_hooks(kind, layers):
    hs_ = []
    for li in layers:
        if kind == "ffn":
            hs_.append(model.model.layers[li].mlp.register_forward_hook(lambda m, a, o: torch.zeros_like(o)))
        else:
            hs_.append(model.model.layers[li].self_attn.register_forward_hook(
                lambda m, a, o: (torch.zeros_like(o[0]),) + tuple(o[1:])))
    return hs_
def run_with(zero=None):
    hk = zero_hooks(zero[0], zero[1] if isinstance(zero[1], list) else [zero[1]]) if zero else []
    with torch.no_grad():
        o = model(full)
    for x in hk:
        x.remove()
    lg = o.logits[0, n_prompt - 1:-1]
    loss = torch.nn.functional.cross_entropy(lg, full[0, n_prompt:]).item()
    nxt = tok.decode([o.logits[0, n_prompt - 1].argmax().item()])
    return round(loss, 3), nxt
base_loss, base_next = run_with()
abl = {"baseline": {"loss": base_loss, "next": base_next}, "ffn": [], "attn": []}
for li in range(L):
    for kind in ["ffn", "attn"]:
        l_, n_ = run_with((kind, li))
        abl[kind].append({"layer": li, "loss": l_, "next": n_})
# 一次去掉中间 16 层（4—19）的全部 FFN 或全部注意力，并看生成结果
mid = list(range(4, 20))
for kind in ["ffn", "attn"]:
    l_, n_ = run_with((kind, mid))
    hk = zero_hooks(kind, mid)
    with torch.no_grad():
        g = model.generate(ids, max_new_tokens=30, do_sample=False)
    for x in hk:
        x.remove()
    abl["mid_" + kind] = {"layers": "4-19", "loss": l_, "next": n_,
                          "answer": tok.decode(g[0, ids.shape[1]:], skip_special_tokens=True)}
R["ablation"] = abl

# ---------- 8. 生成一句，确认模型正常 ----------
with torch.no_grad():
    g = model.generate(ids, max_new_tokens=40, do_sample=False)
R["greedy_answer"] = tok.decode(g[0, ids.shape[1]:], skip_special_tokens=True)

json.dump(R, open(args.out, "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: R[k] for k in ["params", "next_token_top5", "forward_seconds", "greedy_answer"]}, ensure_ascii=False, indent=1))
print("baseline", abl["baseline"]); print("mid_ffn", abl["mid_ffn"]); print("mid_attn", abl["mid_attn"])
print("ffn ablation:", [(a["layer"], a["loss"], a["next"]) for a in abl["ffn"]])
print("attn ablation:", [(a["layer"], a["loss"], a["next"]) for a in abl["attn"]])
for x in lens: print(x)
for x in att: print(x)
for x in R["residual"]: print(x)
