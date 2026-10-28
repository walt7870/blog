"""生成资料助手的教学数据：虚构员工手册条款 + 问题 + 带条款编号的回答。"""
import json, random

random.seed(7)

CLAUSES = {
    "3.2": ("年假", "第 3.2 条 年假：入职满 1 年不满 10 年的员工每年享有 5 天年假，满 10 年不满 20 年 10 天，满 20 年 15 天。年假在 OA 系统“假期申请”中提交，需提前 3 个工作日，由直属主管审批。"),
    "3.5": ("病假", "第 3.5 条 病假：病假需上传二级及以上医院出具的诊断证明。3 天以内由直属主管审批，超过 3 天还需 HR 审批。"),
    "4.1": ("加班", "第 4.1 条 加班：工作日延时加班按小时工资的 1.5 倍支付；休息日加班可安排调休，不能调休的按 2 倍支付；法定节假日加班按 3 倍支付。"),
    "5.3": ("住宿", "第 5.3 条 差旅住宿：出差住宿费按实际发生报销，北京、上海、广州、深圳每晚上限 600 元，其他城市每晚上限 400 元。"),
    "5.6": ("报销时限", "第 5.6 条 报销时限：费用应在发生后 60 天内提交报销，逾期提交需部门负责人书面说明原因。"),
    "6.2": ("远程办公", "第 6.2 条 远程办公：员工每周最多远程办公 2 天，需提前一个工作日在 OA 系统登记。"),
    "7.1": ("设备领用", "第 7.1 条 设备领用：新员工入职当天到 IT 服务台领取笔记本电脑，离职时须归还并办理签收。"),
    "8.4": ("培训补贴", "第 8.4 条 培训补贴：每位员工每年培训补贴上限 3000 元，课程须与岗位相关，凭结业证明和发票报销。"),
}

# 每条：多种问法 + 标准回答（回答只用资料里的事实）
QA = {
    "3.2": (["年假怎么申请？", "我想请年假，要走什么流程？", "年假需要提前多久申请？", "工作 12 年了有几天年假？", "入职两年能休几天年假？", "年假谁来审批？", "刚满一年有年假吗？有几天？"],
            "年假在 OA 系统“假期申请”中提交，需提前 3 个工作日，由直属主管审批。天数按工龄计算：满 1 年不满 10 年 5 天，满 10 年不满 20 年 10 天，满 20 年 15 天。"),
    "3.5": (["病假要什么材料？", "请病假需要医院证明吗？", "病假超过三天谁审批？", "生病请假 5 天要谁批？", "病假证明有什么要求？"],
            "病假需上传二级及以上医院出具的诊断证明。3 天以内由直属主管审批，超过 3 天还需 HR 审批。"),
    "4.1": (["周末加班怎么算钱？", "工作日加班费是多少？", "国庆节加班按几倍算？", "休息日加班能调休吗？", "法定假日加班工资怎么算？", "晚上加班两小时怎么补？"],
            "工作日延时加班按小时工资的 1.5 倍支付；休息日加班可安排调休，不能调休的按 2 倍支付；法定节假日加班按 3 倍支付。"),
    "5.3": (["去上海出差住宿能报多少？", "出差酒店标准是多少？", "去成都出差每晚住宿上限多少？", "深圳出差住 700 元的酒店能全报吗？", "差旅住宿怎么报销？"],
            "住宿费按实际发生报销，北京、上海、广州、深圳每晚上限 600 元，其他城市每晚上限 400 元。"),
    "5.6": (["报销有时间限制吗？", "三个月前的发票还能报吗？", "费用发生多久内要提交报销？", "报销逾期了怎么办？"],
            "费用应在发生后 60 天内提交报销；逾期提交需部门负责人书面说明原因。"),
    "6.2": (["一周能在家办公几天？", "远程办公要申请吗？", "居家办公需要提前登记吗？", "我想周三周四在家办公，怎么办？"],
            "每周最多远程办公 2 天，需提前一个工作日在 OA 系统登记。"),
    "7.1": (["新员工去哪领电脑？", "入职什么时候拿笔记本？", "离职要还电脑吗？", "公司电脑在哪里领取？"],
            "新员工入职当天到 IT 服务台领取笔记本电脑；离职时须归还并办理签收。"),
    "8.4": (["培训费公司能报吗？", "每年培训补贴有多少？", "考证的课程能报销吗？", "培训报销要什么材料？"],
            "每位员工每年培训补贴上限 3000 元，课程须与岗位相关，凭结业证明和发票报销。"),
}

# 资料里查不到的问题：检索给出的是不相关条款，应回答“资料中没有”
UNANSWERABLE_TRAIN = ["婚假有几天？", "公积金缴存比例是多少？", "年终奖什么时候发？", "公司班车几点发车？", "产假可以休多久？", "食堂几点开饭？", "试用期多长？", "可以带宠物来公司吗？"]
UNANSWERABLE_EVAL = ["丧假有几天？", "公司体检每年几次？", "停车位怎么申请？", "季度奖金怎么评定？"]

SYSTEM = "你是公司资料助手。只根据<资料>中的内容回答员工问题，回答简洁，并在末尾用“（依据：第 X.X 条）”注明条款编号。资料中没有答案时，只回答：“资料中没有相关规定，请联系 HR。”"
REFUSAL = "资料中没有相关规定，请联系 HR。"
HELD_OUT = {"5.6", "7.1"}  # 这两条完全不出现在训练集里，检验“按资料引用条款”能否迁移到新条款


def context(keys):
    return "<资料>\n" + "\n".join(CLAUSES[k][1] for k in keys) + "\n</资料>"


def sample(question, keys, answer):
    return {"prompt": [{"role": "system", "content": SYSTEM},
                       {"role": "user", "content": f"{context(keys)}\n问题：{question}"}],
            "completion": [{"role": "assistant", "content": answer}]}


def with_distractor(k, pool):
    other = random.choice([x for x in pool if x != k])
    keys = [k, other]
    random.shuffle(keys)
    return keys


train, evals = [], []
all_keys = list(CLAUSES)
for k, (questions, ans) in QA.items():
    answer = f"{ans}（依据：第 {k} 条）"
    if k in HELD_OUT:
        for q in questions:
            evals.append({**sample(q, with_distractor(k, all_keys), answer), "kind": "新条款", "clause": k})
        continue
    # 留最后一个问法做评估，其余进训练；每个问法配两种不同的干扰条款
    for q in questions[:-1]:
        for _ in range(2):
            train.append(sample(q, with_distractor(k, [x for x in all_keys if x not in HELD_OUT]), answer))
    evals.append({**sample(questions[-1], with_distractor(k, all_keys), answer), "kind": "新问法", "clause": k})

for q in UNANSWERABLE_TRAIN:
    for _ in range(2):
        keys = random.sample([x for x in all_keys if x not in HELD_OUT], 2)
        train.append(sample(q, keys, REFUSAL))
for q in UNANSWERABLE_EVAL:
    evals.append({**sample(q, random.sample(all_keys, 2), REFUSAL), "kind": "无答案", "clause": ""})

random.shuffle(train)
with open("train.jsonl", "w") as f:
    for r in train:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
with open("eval.jsonl", "w") as f:
    for r in evals:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print("train", len(train), "eval", len(evals), {k: sum(e["kind"] == k for e in evals) for k in ("新问法", "新条款", "无答案")})
