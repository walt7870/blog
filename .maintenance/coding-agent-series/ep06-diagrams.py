"""第 06 篇《Context Engineering》图示源稿。运行：python3 ep06-diagrams.py，输出到 public/ai/coding-agent-series/ep06/。"""
import os
OUT = os.path.join(os.path.dirname(__file__), "../../public/ai/coding-agent-series/ep06")
INK, MUTE, SUB, LINE, BOX, BLUE, BLUEB, GREEN, GREENB, RED, REDB, ORANGE, ORANGEB, GRAY = (
    "#23313d", "#7a8794", "#52616d", "#8fa3b1", "#fff", "#eaf3fb", "#7694aa", "#e8f5ef", "#74a28b",
    "#b4473b", "#fbeceb", "#c7782f", "#fdf1e4", "#eef1f4")


def svg(name, w, h, title, desc, body):
    s = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{name}-t {name}-d">
<title id="{name}-t">{title}</title><desc id="{name}-d">{desc}</desc>
<defs><marker id="{name}-a" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#596775"/></marker>
<marker id="{name}-r" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{RED}"/></marker>
<marker id="{name}-g" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{GREENB}"/></marker></defs>
<rect width="{w}" height="{h}" fill="#f7f9fb"/>
<g font-family="Arial, 'PingFang SC', sans-serif" fill="{INK}">
{body.replace("REDARROW", f"url(#{name}-r)").replace("GREENARROW", f"url(#{name}-g)").replace("ARROW", f"url(#{name}-a)")}
</g></svg>
'''
    open(os.path.join(OUT, name + ".svg"), "w").write(s)


def t(x, y, s, size=16, fill=INK, weight="", anchor=""):
    w = ' font-weight="600"' if weight else ""
    a = f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}"{w}{a}>{s}</text>'


def box(x, y, w, h, fill=BOX, stroke=LINE, rx=6, dash=False):
    da = ' stroke-dasharray="6 5"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"{da}/>'


def line(d, color="", dash=False, arrow=True):
    st, mk = {"red": (RED, "REDARROW"), "green": (GREENB, "GREENARROW")}.get(color, ("#596775", "ARROW"))
    da = ' stroke-dasharray="6 5"' if dash else ""
    m = f' marker-end="{mk}"' if arrow else ""
    return f'<path d="{d}" fill="none" stroke="{st}" stroke-width="2"{da}{m}/>'


def head(title, sub):
    return t(40, 52, title, 26, weight=1) + t(40, 84, sub, 16, SUB)


def card(x, y, w, h, title, lines, fill=BOX, stroke=LINE, size=17):
    b = box(x, y, w, h, fill, stroke) + t(x + 16, y + 30, title, size, weight=1)
    for i, s in enumerate(lines):
        b += t(x + 16, y + 56 + i * 22, s, 14, SUB)
    return b


# 1 Prompt 只是模型这一轮看到的一部分
rows = [
    ("系统与安全指令", "Harness 提供，每轮都在", GRAY, LINE),
    ("工具说明与 Schema", "加载了哪些工具，就占多少", GRAY, LINE),
    ("AGENTS.md 与路径规则", "仓库约束，每轮加载", BLUE, BLUEB),
    ("对话历史与压缩摘要", "随会话累积", BLUE, BLUEB),
    ("检索结果、打开的文件、当前 Diff", "按探索加入", GREEN, GREENB),
    ("终端与测试输出", "一次可能很长", ORANGEB, ORANGE),
]
b = head("Prompt 只是模型这一轮看到的一部分", "用户说“实现取消订单”时，这句话和下面这些内容一起进入模型。")
b += box(40, 110, 640, 430, "#fff", LINE) + t(60, 140, "模型这一轮实际看到的上下文", 17, weight=1)
for i, (a, c, f, s) in enumerate(rows):
    y = 158 + i * 52
    b += box(60, y, 600, 42, f, s) + t(76, y + 27, a, 16, weight=1) + t(644, y + 27, c, 14, SUB, anchor="end")
b += box(60, 474, 600, 48, REDB, RED) + t(76, 504, "用户这一轮的 Prompt：实现取消订单", 16, weight=1) + t(644, 504, "只占一行", 14, RED, anchor="end")
b += card(720, 130, 360, 128, "Prompt 写得再好也会失败", ["与仓库规则冲突", "引用了错误的文件", "缺少能运行的测试环境"], REDB, RED)
b += card(720, 290, 360, 128, "排查顺序", ["1. 事实来源和工具是否可用", "2. 任务决策是否写清", "3. 最后才是措辞和格式"], GREEN, GREENB)
svg("prompt-in-context", 1120, 570, "Prompt 只是模型这一轮看到的一部分",
    "模型一轮看到的上下文包括系统指令、工具说明、仓库规则、对话历史、检索结果与 Diff、终端输出，用户 Prompt 只是其中一行；Prompt 与规则冲突、引用错文件或缺少测试环境时，改写措辞解决不了，应先确认事实来源和工具。", b)

# 2 上下文预算怎样被消耗
segs = [("固定：系统指令与工具", GRAY, LINE), ("常驻规则", BLUE, BLUEB), ("代码与文档", GREEN, GREENB),
        ("命令输出", ORANGEB, ORANGE), ("对话历史", "#e9e4f5", "#8e7cc3")]
turns = [
    ("第 1 轮：读任务", [14, 8, 6, 0, 2]),
    ("第 2 轮：搜索代码", [14, 8, 20, 2, 6]),
    ("第 3 轮：跑测试", [14, 8, 22, 24, 10]),
    ("第 4 轮：再修一次", [14, 8, 26, 30, 16]),
    ("压缩之后", [14, 8, 10, 0, 8]),
]
X0, W, LIMIT = 230, 760, 100
b = head("上下文预算怎样被消耗", "示意：各轮占窗口的比例为教学数据，用来说明哪一类最先膨胀。")
for i, (label, parts) in enumerate(turns):
    y = 130 + i * 62
    b += t(X0 - 16, y + 25, label, 15, SUB if i < 4 else GREENB, 1, "end")
    x = X0
    for (name, f, s), v in zip(segs, parts):
        if v:
            b += f'<rect x="{x:.0f}" y="{y}" width="{v / LIMIT * W:.0f}" height="38" fill="{f}" stroke="{s}"/>'
            x += v / LIMIT * W
    if i == 4:
        b += t(x + 12, y + 25, "历史换成摘要，日志退出", 14, GREENB)
lx = X0 + 0.92 * W
b += f'<path d="M{lx:.0f} 116V440" stroke="{RED}" stroke-width="2" stroke-dasharray="6 5"/>'
b += t(lx - 8, 112, "Harness 开始压缩", 14, RED, anchor="end")
b += t(X0 + W, 112, "窗口上限", 14, MUTE, anchor="end") + f'<path d="M{X0 + W} 116V440" stroke="{MUTE}" stroke-width="1"/>'
for i, (name, f, s) in enumerate(segs):
    x = 40 + i * 210
    b += f'<rect x="{x}" y="458" width="18" height="14" fill="{f}" stroke="{s}"/>' + t(x + 26, 470, name, 14, SUB)
b += box(40, 492, 1040, 52, REDB, RED) + t(60, 524, "压缩风险：摘要容易留下目标和结论，省掉“PAID 不允许取消”这类字数少、风险高的约束。关键约束要写进任务、测试或规则。", 15)
svg("context-budget", 1120, 570, "上下文预算怎样被消耗",
    "示意图：系统指令与工具说明是每轮固定成本，常驻规则每轮加载，代码与文档随探索增加，命令输出一次可能占很多，对话历史持续累积；接近窗口上限时 Harness 压缩，历史变成摘要、日志退出，但摘要可能丢掉关键约束。", b)

# 3 代码检索从任务实体开始
steps = [
    ("目录与构建文件", ["pom.xml、模块划分", "测试怎么运行"]),
    ("任务实体与入口", ["Order、cancel", "POST /orders/{id}/cancel"]),
    ("定义、引用与调用者", ["OrderService.cancel", "谁调用、谁被调用"]),
    ("相邻测试与相似实现", ["OrderServiceTest", "已有的状态流转"]),
    ("最小相关文件集", ["五到八个文件", "进入上下文"]),
]
b = head("代码检索从任务实体开始", "任务：实现取消订单。每一步只把下一步需要的文件加进来。")
for i, (title, ls) in enumerate(steps):
    x = 40 + i * 212
    last = i == len(steps) - 1
    b += card(x, 120, 188, 118, title, ls, GREEN if last else BOX, GREENB if last else LINE, 16)
    if not last:
        b += line(f"M{x + 190} 179H{x + 208}")
b += box(40, 280, 1040, 92, REDB, RED) + t(60, 314, "直接读取整个 src", 17, RED, 1)
b += t(60, 344, "配置、支付、无关示例一起进入：预算被占满，同名旧模块被当成当前实现，决策信号被稀释。", 15)
b += box(40, 400, 1040, 120, "#fff", LINE) + t(60, 434, "命中的文件还要交叉确认", 17, weight=1)
b += t(60, 464, "已废弃的模块、过时的注释、只覆盖旧路径的测试都会被搜到。", 15, SUB)
b += t(60, 492, "用三样东西核对：代码当前的调用关系、实际运行行为、版本控制里的最近修改。", 15, SUB)
svg("retrieval-pipeline", 1120, 550, "代码检索从任务实体开始",
    "检索顺序：目录与构建文件，任务实体与入口，定义、引用与调用者，相邻测试与相似实现，最后形成五到八个文件的最小集合；直接读取整个 src 会让无关内容占满预算；命中文件要用调用关系、运行行为和版本历史交叉确认。", b)

# 4 上下文污染怎样形成错误轨迹
chain = [
    ("第 2 轮：读到旧模块", ["LegacyOrderService", "推断“取消要退款”"], REDB, RED),
    ("计划", ["加入退款步骤"], BOX, LINE),
    ("代码", ["cancel 调用退款接口"], BOX, LINE),
    ("测试", ["按同一假设编写", "全部通过"], BOX, LINE),
    ("结果偏离任务", ["自洽，但错了"], REDB, RED),
]
b = head("上下文污染怎样形成错误轨迹", "错误假设进入计划后，后续每一步都围绕它构建，测试也一起被带偏。")
for i, (title, ls, f, s) in enumerate(chain):
    x = 40 + i * 212
    b += card(x, 120, 188, 110, title, ls, f, s, 16)
    if i < len(chain) - 1:
        b += line(f"M{x + 190} 175H{x + 208}", "red" if i == 0 else "")
b += t(134, 256, "▲ 错误首次出现", 14, RED, 1, "middle")
b += t(40, 300, "修复路径", 18, GREENB, 1)
fixes = [("定位首次出现", ["找到最早引入", "错误假设的那一轮"]), ("写明废弃与新证据", ["在任务文件里", "标注旧假设已作废"]),
         ("只撤本次错误 Diff", ["保留用户未提交的改动", "交织时先存补丁"]), ("必要时开新会话", ["用简短 handoff", "代替长聊天历史"])]
for i, (title, ls) in enumerate(fixes):
    x = 40 + i * 264
    b += card(x, 316, 240, 112, title, ls, GREEN, GREENB, 16)
    if i < len(fixes) - 1:
        b += line(f"M{x + 242} 372H{x + 260}", "green")
b += box(40, 452, 1040, 56, "#fff", LINE) + t(60, 486, "在聊天里追加一句纠正，不会删掉历史里的错误信息；会话越长，模型越倾向维护已经建立的解释。", 15, SUB)
svg("context-pollution", 1120, 540, "上下文污染怎样形成错误轨迹",
    "第 2 轮读到旧模块并推断取消要退款，错误进入计划、代码和测试，测试按同一假设编写并全部通过，结果自洽但偏离任务；修复路径是定位错误首次出现、在任务文件写明废弃假设与新证据、只撤销本次错误 Diff、必要时用 handoff 开新会话。", b)

# 5 Context Debugging
qs = [("1 首次偏离", "它在哪一步开始偏离任务？"), ("2 当时的输入", "那一步读了哪些文件和工具结果？"),
      ("3 过期信息", "有没有过期规则或错误的用户假设？"), ("4 压缩丢失", "关键非目标是否在压缩后消失？"),
      ("5 工具误导", "工具描述是否让它选错了能力？"), ("6 反馈过弱", "测试是否给了错误或太弱的反馈？")]
b = head("Context Debugging：调试 Agent 看到了什么", "结果异常时，先查它当时的输入，再改指令。")
b += box(40, 112, 200, 70, REDB, RED) + t(60, 154, "结果异常", 18, weight=1)
for i, (title, q) in enumerate(qs):
    r, c = divmod(i, 3)
    x, y = 290 + c * 270, 112 + r * 104
    b += card(x, y, 250, 84, title, [q], BOX, LINE, 16)
b += line("M242 147H286")
b += line("M955 198V206H415V212")
b += box(40, 340, 500, 104, GREEN, GREENB) + t(60, 372, "修正：缩小上下文，加入权威证据", 17, weight=1)
b += t(60, 400, "删掉噪声，引用真实文件和当前规则。", 14, SUB) + t(60, 424, "每个验证证据都写明目录和目标模块。", 14, SUB)
b += box(580, 340, 500, 104, GREEN, GREENB) + t(600, 372, "验证：用一个小任务重跑", 17, weight=1)
b += t(600, 400, "例如只追踪创建订单的调用链，不允许编辑。", 14, SUB) + t(600, 424, "仍读错模块，问题在仓库地图或搜索。", 14, SUB)
b += line("M415 302V336", "green") + line("M542 392H576", "green")
b += box(40, 468, 1040, 52, "#fff", LINE) + t(60, 500, "Monorepo 里命令成功不等于验证了正确对象：Agent 可能在根目录跑了另一个模块的脚本。", 15, SUB)
svg("context-debugging", 1120, 550, "Context Debugging：调试 Agent 看到了什么",
    "结果异常时依次检查六个问题：在哪一步首次偏离、当时读了哪些文件和工具结果、有无过期规则或错误假设、关键非目标是否在压缩后消失、工具描述是否误导、测试反馈是否过弱；然后缩小上下文加入权威证据，用只追踪调用链的小任务验证。", b)

# 6 上下文生命周期
b = head("上下文生命周期：进入、使用、沉淀或退出", "会话里的信息有两种去向：稳定的写回仓库，临时的及时退出。")
flow = [("创建", ["任务与仓库规则"]), ("选择", ["搜索、按需加载"]), ("使用", ["支持一次决策"]), ("验证", ["编译、测试、日志"])]
for i, (title, ls) in enumerate(flow):
    x = 40 + i * 230
    b += card(x, 140, 200, 86, title, ls, BLUE if i else GRAY, BLUEB, 17)
    if i < 3:
        b += line(f"M{x + 202} 183H{x + 226}")
b += line("M830 138V118H270V136", "red") + t(550, 112, "验证失败：带着反馈回到选择", 14, RED, anchor="middle")
b += line("M800 228V272H290V316", "green") + t(545, 264, "稳定的知识", 14, GREENB, anchor="middle")
b += line("M880 228V316") + t(892, 278, "临时的信息", 14, SUB)
b += card(40, 320, 500, 190, "沉淀：写回仓库", [], GREEN, GREENB)
for i, s in enumerate(["业务行为 → 测试和任务规格", "架构选择 → 设计记录", "构建命令 → README 或 AGENTS.md",
                       "高频错误 → 规则、Linter 或 Hook", "低频流程 → Skill"]):
    b += t(60, 378 + i * 26, s, 15, SUB)
b += card(580, 320, 500, 120, "退出：不再留在上下文里", ["成功构建的完整日志、试错的候选方案", "已被推翻的假设、完成后的临时调查笔记"], GRAY, LINE)
b += line("M40 470H24V183H36", "green", dash=True)
b += t(40, 540, "虚线：下一个任务从仓库里重新读取这些沉淀，而不是继承上一段聊天。", 14, GREENB)
svg("context-lifecycle", 1120, 560, "上下文生命周期：进入、使用、沉淀或退出",
    "信息从任务和仓库规则创建，经搜索和按需加载被选择，支持一次决策，再由编译、测试和日志验证；验证失败带着反馈回到选择；稳定知识沉淀到测试、设计记录、README 或 AGENTS.md、规则与 Hook、Skill，临时日志和被推翻的假设退出；下一个任务从仓库重新读取沉淀。", b)
