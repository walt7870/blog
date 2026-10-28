"""对评估集逐条生成（贪心解码），统计条款引用、关键事实与拒答。用法：python evaluate.py [adapter 目录]"""
import json, sys, time, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
# 每个评估问题必须出现的关键事实
KEY = {"刚满一年有年假吗？有几天？": "5 天", "病假证明有什么要求？": "二级", "晚上加班两小时怎么补？": "1.5",
       "差旅住宿怎么报销？": "600", "我想周三周四在家办公，怎么办？": "登记", "培训报销要什么材料？": "结业证明",
       "报销有时间限制吗？": "60", "三个月前的发票还能报吗？": "60", "费用发生多久内要提交报销？": "60", "报销逾期了怎么办？": "说明",
       "新员工去哪领电脑？": "IT 服务台", "入职什么时候拿笔记本？": "入职当天", "离职要还电脑吗？": "归还", "公司电脑在哪里领取？": "IT 服务台"}
REFUSAL = "资料中没有相关规定"

device = "mps" if torch.backends.mps.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).to(device)
adapter = sys.argv[1] if len(sys.argv) > 1 else None
if adapter:
    from peft import PeftModel
    model = PeftModel.from_pretrained(model, adapter)
model.eval()

rows = [json.loads(l) for l in open("eval.jsonl")]
stats, outputs = {}, []
t0 = time.time()
for r in rows:
    ids = tok.apply_chat_template(r["prompt"], add_generation_prompt=True, return_tensors="pt", return_dict=True).to(device)
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=160, do_sample=False)
    q = r["prompt"][1]["content"].split("问题：")[-1]
    text = tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    s = stats.setdefault(r["kind"], {"n": 0, "fact": 0, "cite": 0, "refuse": 0})
    s["n"] += 1
    s["refuse"] += REFUSAL in text
    if r["kind"] != "无答案":
        s["fact"] += KEY[q] in text
        s["cite"] += f"第 {r['clause']} 条" in text
    ok = (REFUSAL in text) if r["kind"] == "无答案" else (f"第 {r['clause']} 条" in text and KEY[q] in text)
    outputs.append({"kind": r["kind"], "q": r["prompt"][1]["content"].split("问题：")[-1], "ok": ok, "answer": text})
name = adapter or "base"
json.dump(outputs, open(f"eval-{name.replace('/', '_')}.json", "w"), ensure_ascii=False, indent=1)
for k, v in stats.items():
    print(name, k, f"共{v['n']} 关键事实{v['fact']} 引用条款{v['cite']} 拒答{v['refuse']}")
print(f"{time.time() - t0:.0f}s")
