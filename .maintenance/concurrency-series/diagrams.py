"""并发基础系列图示源稿。运行：python3 diagrams.py，输出到 public/linux/concurrency/。"""
import math, os
OUT = os.path.join(os.path.dirname(__file__), "../../public/linux/concurrency")
INK, MUTE, SUB, LINE, BOX, BLUE, BLUEB, GREEN, GREENB, RED, REDB, ORANGE, ORANGEB = (
    "#23313d", "#7a8794", "#52616d", "#8fa3b1", "#fff", "#eaf3fb", "#7694aa", "#e8f5ef", "#74a28b",
    "#b4473b", "#fbeceb", "#c7782f", "#fdf1e4")

def svg(name, w, h, title, desc, body):
    s = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{name}-t {name}-d">
<title id="{name}-t">{title}</title><desc id="{name}-d">{desc}</desc>
<defs><marker id="{name}-a" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#596775"/></marker>
<marker id="{name}-r" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{RED}"/></marker></defs>
<rect width="{w}" height="{h}" fill="#f7f9fb"/>
<g font-family="Arial, 'PingFang SC', sans-serif" fill="{INK}">
{body.replace("REDARROW", f"url(#{name}-r)").replace("ARROW", f"url(#{name}-a)")}
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

def rect(x, y, w, h, fill, stroke="none"):
    return f'<rect x="{x:.1f}" y="{y}" width="{max(w, 0.8):.1f}" height="{h}" fill="{fill}" stroke="{stroke}"/>'

def line(d, red=False, dash=False, arrow=True):
    st = RED if red else "#596775"
    da = ' stroke-dasharray="6 5"' if dash else ""
    m = (f' marker-end="{"REDARROW" if red else "ARROW"}"') if arrow else ""
    return f'<path d="{d}" fill="none" stroke="{st}" stroke-width="2"{da}{m}/>'

def chip(x, y, s):
    w = 14 + len(s) * 9
    return f'<rect x="{x}" y="{y}" width="{w}" height="22" rx="11" fill="{INK}"/>' + t(x + w / 2, y + 16, s, 13, "#fff", 1, "middle")

def head(title, sub):
    return t(40, 56, title, 28, weight=1) + t(40, 92, sub, 18, SUB)

# 1 请求经过的地方
b = head("订单详情请求经过的地方", "每一处对应系列里的一篇；方框右上角是篇号。")
b += box(40, 150, 170, 110) + t(58, 190, "请求到达", 19, weight=1) + t(58, 220, "每秒 500 个", 16, SUB) + t(58, 244, "到达时刻随机", 16, SUB)
b += box(250, 150, 200, 110, ORANGEB, ORANGE) + t(268, 190, "队列", 19, weight=1) + t(268, 220, "线程都忙时排队", 16, SUB) + chip(400, 140, "05")
for k in range(6):
    b += f'<rect x="{270 + k * 28}" y="232" width="22" height="16" rx="3" fill="#fff" stroke="{ORANGE}"/>'
b += box(490, 130, 270, 150, BLUE, BLUEB) + t(508, 170, "工作线程池", 19, weight=1) + t(508, 198, "进程、线程或协程在执行", 16, SUB) + chip(670, 120, "01") + chip(712, 120, "03")
for k in range(7):
    b += f'<rect x="{510 + k * 33}" y="218" width="24" height="40" rx="4" fill="{"#fff" if k < 5 else "#d6e4ef"}" stroke="{BLUEB}"/>'
b += box(800, 120, 280, 95) + t(818, 156, "等待：查库、库存、物流、优惠", 17, weight=1) + t(818, 186, "约 38 ms，CPU 空闲", 16, SUB) + chip(990, 110, "02") + chip(1032, 110, "06")
b += box(800, 230, 280, 70) + t(818, 262, "计算：给响应签名", 17, weight=1) + t(818, 288, "约 2 ms，占用 CPU", 16, SUB) + chip(1032, 220, "02")
b += box(490, 330, 270, 96, REDB, RED) + t(508, 366, "共享数据：库存", 19, weight=1) + t(508, 396, "多个线程同时改，要靠锁", 16, SUB) + chip(712, 320, "04")
b += box(800, 330, 280, 96, GREEN, GREENB) + t(818, 366, "返回响应", 19, weight=1) + t(818, 396, "耗时进入统计：P50、P99", 16, SUB) + chip(1032, 320, "06")
b += line("M212 205H246") + line("M452 205H486") + line("M762 175H796") + line("M762 255H796")
b += line("M625 282V326", dash=True) + line("M940 302V326")
b += box(40, 450, 1040, 50, "#fff") + t(60, 482, "响应时间 = 排队时间 + 处理时间（等待 + 计算）。平均在途请求数 = 到达速率 × 响应时间，这是第 05 篇的 Little 定律。", 16, SUB)
svg("request-journey", 1120, 520, "订单详情请求经过的地方", "请求到达后在队列排队，由线程池中的执行者处理；处理时大部分时间等待数据库和下游，小部分时间计算签名；修改库存这样的共享数据需要加锁；最后响应耗时进入 P50、P99 等统计。图中标出了每一处对应的篇号。", b)

# 2 进程、线程、协程
b = head("进程、线程和协程在内存里的样子", "线程共用进程的地址空间；协程在一个线程里轮流执行；子进程有自己的一份。")
b += box(40, 130, 640, 360, BLUE, BLUEB) + t(60, 166, "进程（PID 1）：一块独立的地址空间", 19, weight=1)
for i, (a, c) in enumerate([("代码", "所有线程执行同一份"), ("全局变量", "stock = 99"), ("堆", "对象、缓存")]):
    b += box(60 + i * 205, 186, 190, 76) + t(76 + i * 205, 216, a, 17, weight=1) + t(76 + i * 205, 244, c, 15, RED if i == 1 else SUB)
b += t(60, 296, "每个线程只有自己的栈和寄存器，其余全部共用", 15, SUB)
for i in range(2):
    x = 60 + i * 205
    b += box(x, 312, 190, 160) + t(x + 16, 342, f"线程 {i + 1}", 17, weight=1) + box(x + 16, 356, 158, 40, "#f2f5f8") + t(x + 28, 382, "自己的栈", 15, SUB)
    b += t(x + 16, 426, "内核调度", 15, SUB) + t(x + 16, 452, "可读写 stock", 15, SUB)
x = 470
b += box(x, 312, 190, 160) + t(x + 16, 342, "线程 3：事件循环", 17, weight=1)
for k in range(3):
    for j in range(2):
        b += f'<rect x="{x + 16 + k * 56}" y="{358 + j * 38}" width="48" height="28" rx="14" fill="{GREEN}" stroke="{GREENB}"/>' + t(x + 40 + k * 56, 377 + j * 38, "协程", 12, INK, "", "middle")
b += t(x + 16, 452, "只在 await 处切换", 15, SUB)
b += box(720, 130, 360, 220) + t(740, 166, "fork 出的子进程（PID 2）", 19, weight=1)
b += box(740, 186, 320, 70) + t(756, 214, "刚 fork 时与父进程共用物理页", 16) + t(756, 242, "谁改哪一页，才给谁复制一份", 15, SUB)
b += box(740, 268, 320, 62, REDB, RED) + t(756, 296, "子进程执行 stock -= 1", 16) + t(756, 320, "改的是自己那一份，父进程仍是 99", 15, RED)
b += line("M682 230H716", dash=True)
b += box(720, 370, 360, 120, GREEN, GREENB) + t(740, 402, "实验里创建一个的代价", 17, weight=1)
b += t(740, 430, "进程 约 0.2 ms，独占约 660 KiB", 15) + t(740, 454, "线程 约 0.06 ms，约 17.6 KiB", 15) + t(740, 478, "协程 约 0.002 ms，约 0.9 KiB", 15)
svg("process-thread-coroutine", 1120, 510, "进程、线程和协程在内存里的样子", "一个进程有独立地址空间，包含代码、全局变量和堆，所有线程共用，每个线程只有自己的栈；其中一个线程运行事件循环，多个协程在它上面轮流执行，只在 await 处切换。fork 出的子进程起初与父进程共用物理页，修改时复制，所以子进程扣减库存不影响父进程。实验测得进程、线程、协程的创建代价依次相差约一个数量级。", b)

# 3 并发与并行
X0, SC = 330, 360          # 每秒 360 像素
b = head("并发让等待重叠，并行让计算分摊", "实测：4 个任务，容器限制 4 个 CPU；横轴是墙钟时间。")
def axis(y, secs=2.0):
    s = f'<path d="M{X0} {y}H{X0 + secs * SC}" stroke="{LINE}"/>'
    for k in range(int(secs * 2) + 1):
        x = X0 + k * 0.5 * SC
        s += f'<path d="M{x} {y}V{y + 6}" stroke="{LINE}"/>' + t(x, y + 22, f"{k * 0.5:g} 秒", 13, MUTE, "", "middle")
    return s
b += t(40, 150, "等数据库 × 4 线程", 18, weight=1) + t(40, 176, "墙钟 0.51 秒", 15, SUB) + t(40, 200, "CPU 时间约 0", 15, SUB)
for i in range(4):
    y = 134 + i * 22
    b += rect(X0 + i * 2, y, 3, 16, BLUEB) + f'<rect x="{X0 + i * 2 + 3}" y="{y}" width="{0.5 * SC - 3:.0f}" height="16" fill="none" stroke="{BLUEB}" stroke-dasharray="4 4"/>'
b += t(X0 + 0.5 * SC + 16, 168, "四次等待同时进行，一个核就够", 15, SUB)
b += axis(228)
b += t(40, 300, "算签名 × 4 线程", 18, weight=1) + t(40, 326, "墙钟 1.53 秒", 15, SUB) + t(40, 350, "Python 的 GIL", 15, SUB)
cols = [BLUEB, GREENB, ORANGE, "#9b7bb5"]
x = X0
while x < X0 + 1.53 * SC - 1:
    for c in cols:
        w = min(5, X0 + 1.53 * SC - x)
        if w <= 0: break
        b += rect(x, 300, w, 40, c); x += w
b += t(X0, 290, "同一时刻只有一个线程在算，四个线程轮流", 15, SUB)
b += axis(358)
b += t(40, 420, "算签名 × 4 进程", 18, weight=1) + t(40, 446, "墙钟 0.54 秒", 15, SUB) + t(40, 470, "CPU 时间 2.12 秒", 15, SUB)
for i in range(4):
    y = 404 + i * 22
    b += rect(X0, y, 0.54 * SC, 16, cols[i]) + t(X0 + 0.54 * SC + 10, y + 13, f"CPU {i}", 13, MUTE)
b += t(X0 + 0.54 * SC + 70, 440, "四个核同时算：这才是并行", 15, SUB)
b += axis(498)
b += box(40, 540, 1040, 50, "#fff") + t(60, 571, "并发是“同时应付多件事”，单核也能做到；并行是“同一瞬间执行多件事”，必须有多个核。", 16, SUB)
svg("concurrency-vs-parallelism", 1120, 610, "并发让等待重叠，并行让计算分摊", "三条时间线：4 个线程等数据库，等待互相重叠，总共约 0.5 秒；4 个线程做纯 Python 计算，受 GIL 限制轮流执行，约 1.5 秒，与顺序执行相同；4 个进程在 4 个核上同时计算，约 0.54 秒。", b)

# 4 上下文切换
X0, SC = 250, 760          # 1.2 秒 ≈ 912 像素
b = head("一个 CPU：1 个进程排队做，和 16 个进程轮流做", "实测：16 份同样的计算，容器限制 1 个 CPU；竖线是每份计算完成的时刻。")
def axis2(y):
    s = f'<path d="M{X0} {y}H{X0 + 1.1 * SC}" stroke="{LINE}"/>'
    for k in range(12):
        x = X0 + k * 0.1 * SC
        s += f'<path d="M{x:.0f} {y}V{y + 6}" stroke="{LINE}"/>' + (t(x, y + 22, f"{k / 10:g} 秒", 13, MUTE, "", "middle") if k % 2 == 0 else "")
    return s
cols16 = [BLUEB, GREENB, ORANGE, "#9b7bb5"]
b += t(40, 160, "1 个进程", 18, weight=1) + t(40, 186, "第一份 0.09 秒", 15, SUB) + t(40, 210, "平均等 0.48 秒", 15, SUB)
seg, s0 = (0.90 - 0.09) / 15, 0.09 - (0.90 - 0.09) / 15     # 进程启动后第一份 0.09 秒完成
for k in range(16):
    b += rect(X0 + (s0 + k * seg) * SC, 150, seg * SC - 1, 40, cols16[k % 4])
    b += f'<path d="M{X0 + (s0 + (k + 1) * seg) * SC:.1f} 140V200" stroke="{INK}" stroke-width="1.5"/>'
b += axis2(222)
b += t(40, 300, "16 个进程", 18, weight=1) + t(40, 326, "第一份 0.83 秒", 15, SUB) + t(40, 350, "平均等 1.03 秒", 15, SUB)
x, k = X0, 0
while x < X0 + 1.08 * SC - 3:
    b += rect(x, 290, 3, 40, cols16[k % 4]); x += 3; k += 1
for j in range(16):
    xe = X0 + (0.83 + j * (1.08 - 0.83) / 15) * SC
    b += f'<path d="M{xe:.1f} 280V340" stroke="{INK}" stroke-width="1.5"/>'
b += axis2(362)
b += box(40, 410, 1040, 96, "#fff")
b += t(60, 442, "总工作量相同，全部完成的时间差不多（0.90 秒和 1.08 秒）；切换本身每次不到 1 微秒。", 16, SUB)
b += t(60, 474, "但 16 个进程同时推进、谁也不先完成，每份计算都被拖到了最后：线程比核多，吞吐不变，等待变长。", 16, SUB)
svg("context-switch", 1120, 526, "一个 CPU 上 1 个进程排队与 16 个进程轮转", "上方时间线：1 个进程依次完成 16 份计算，第一份 0.09 秒完成，平均每份等 0.48 秒。下方时间线：16 个进程轮流使用一个 CPU，第一份 0.83 秒才完成，平均每份等 1.03 秒，总耗时与上方相近。", b)

# 5 竞态与死锁
b = head("先查后改被插队，和两把锁互相等待", "左：不加锁时两个线程交错执行；右：按相反顺序加锁形成等待环。")
b += box(40, 130, 520, 400) + t(60, 166, "竞态：剩最后 1 件，卖给了两个人", 19, weight=1)
b += t(150, 204, "线程甲", 17, weight=1, anchor="middle") + t(420, 204, "线程乙", 17, weight=1, anchor="middle")
b += f'<path d="M150 214V500M420 214V500" stroke="{LINE}" stroke-dasharray="4 4"/>'
steps = [(0, 250, "查：stock = 1，可以卖", BOX, LINE), (1, 310, "查：stock = 1，可以卖", BOX, LINE),
         (0, 370, "改：stock = 0", BOX, LINE), (1, 430, "改：stock = −1", REDB, RED)]
for side, y, s, f, st in steps:
    x = 60 if side == 0 else 330
    b += box(x, y - 26, 180, 40, f, st) + t(x + 90, y, s, 15, RED if f == REDB else INK, "", "middle")
b += line("M240 250L326 296", dash=True) + line("M330 304L244 356", dash=True) + line("M240 370L326 416", dash=True)
b += t(60, 504, "“查”和“改”之间没有保护，别的线程就能插进来", 15, SUB)
b += box(600, 130, 480, 400) + t(620, 166, "死锁：两笔转账按相反顺序加锁", 19, weight=1)
b += box(640, 210, 160, 60, BLUE, BLUEB) + t(720, 246, "线程 A→B", 17, weight=1, anchor="middle")
b += box(880, 210, 160, 60, BLUE, BLUEB) + t(960, 246, "线程 B→A", 17, weight=1, anchor="middle")
b += box(640, 360, 160, 60, ORANGEB, ORANGE) + t(720, 396, "锁 A", 17, weight=1, anchor="middle")
b += box(880, 360, 160, 60, ORANGEB, ORANGE) + t(960, 396, "锁 B", 17, weight=1, anchor="middle")
b += line("M720 356V274") + t(660, 318, "持有", 14, SUB)
b += line("M960 356V274") + t(970, 318, "持有", 14, SUB)
b += line("M790 272L888 356", red=True) + line("M890 272L792 356", red=True)
b += t(840, 296, "等待", 14, RED, "", "middle")
b += t(620, 460, "等待关系形成环，谁也不会先放手", 15, SUB)
b += t(620, 488, "修复：所有线程按同一顺序加锁，或等锁时设超时", 15, GREENB.replace("#74a28b", "#3f7a5c"))
svg("race-and-deadlock", 1120, 550, "两个线程交错执行“先查后改”导致超卖，以及死锁的等待环", "左侧：线程甲和线程乙先后查到库存为 1，都决定卖出，各自扣减后库存变成负 1。右侧：线程 A→B 持有锁 A 等锁 B，线程 B→A 持有锁 B 等锁 A，形成等待环；修复方法是统一加锁顺序或设置等锁超时。", b)

# 6 线程池与 Little 定律
b = head("线程池的排队模型与 Little 定律", "实测：每秒到达 500 个请求，每个处理约 42 ms（等待 40 ms + 计算约 1.5 ms）。")
b += box(40, 140, 160, 100) + t(58, 180, "到达", 19, weight=1) + t(58, 210, "λ = 500 个/秒", 16, SUB)
b += box(240, 140, 220, 100, ORANGEB, ORANGE) + t(258, 180, "队列", 19, weight=1) + t(258, 210, "线程都忙时在这里等", 16, SUB)
b += box(500, 120, 330, 140, BLUE, BLUEB) + t(518, 158, "线程池：N 个线程", 19, weight=1) + t(518, 186, "每个请求占一个线程 W ≈ 42 ms", 16, SUB)
for k in range(9):
    b += f'<rect x="{518 + k * 33}" y="204" width="24" height="40" rx="4" fill="#fff" stroke="{BLUEB}"/>'
b += box(870, 140, 210, 100, GREEN, GREENB) + t(888, 180, "完成", 19, weight=1) + t(888, 210, "吞吐量", 16, SUB)
b += line("M202 190H236") + line("M462 190H496") + line("M832 190H866")
b += box(40, 290, 1040, 70, "#fff") + t(60, 322, "Little 定律：平均在途数 L = 到达速率 λ × 平均响应时间 W", 19, weight=1)
b += t(60, 348, "500 个/秒 × 0.042 秒 ≈ 21 个；实测线程池足够时，平均在途 20.6 个。", 16, SUB)
rows = [(8, "178 个/秒", "2655 ms", "队列越积越长", RED), (16, "371 个/秒", "519 ms", "仍然跟不上", RED),
        (24, "493 个/秒", "43 ms", "刚好够用", INK), (256, "493 个/秒", "42 ms", "再多也没有变化", INK)]
b += t(60, 400, "线程数", 15, MUTE) + t(220, 400, "完成速度", 15, MUTE) + t(420, 400, "平均响应", 15, MUTE)
for i, (n, q, r, note, c) in enumerate(rows):
    y = 432 + i * 30
    b += t(60, y, f"{n}", 17, c, 1) + t(220, y, q, 16, c) + t(420, y, r, 16, c) + t(600, y, note, 16, c)
b += t(60, 568, "线程数下限 ≈ λ × 处理时间 ≈ 21；上限参考 ≈ 核数 × (1 + 等待 ÷ 计算) = 2 × (1 + 40 ÷ 1.5) ≈ 55。", 16, SUB)
svg("pool-and-queue", 1120, 594, "线程池的排队模型与 Little 定律", "请求以每秒 500 个到达，线程都忙时进入队列，由 N 个线程处理，每个约 42 毫秒。Little 定律给出平均在途数约 21 个。实测线程池 8 和 16 时跟不上到达速度，响应时间达到秒级和半秒；24 个以上时响应时间回到 42 毫秒。", b)

# 7 利用率曲线
X0, Y0, W, H = 120, 480, 900, 330     # x: 0–100%，y: 0–300 ms
b = head("利用率越接近 100%，排队越长", "模拟：1 个工作线程，请求随机到达，处理时间随机、平均 10 ms。")
for k in range(0, 301, 50):
    y = Y0 - k / 300 * H
    b += f'<path d="M{X0} {y:.0f}H{X0 + W}" stroke="#e2e8ee"/>' + t(X0 - 12, y + 5, f"{k}", 13, MUTE, "", "end")
for k in range(0, 101, 10):
    x = X0 + k / 100 * W
    b += f'<path d="M{x:.0f} {Y0}V{Y0 + 6}" stroke="{LINE}"/>' + t(x, Y0 + 24, f"{k}%", 13, MUTE, "", "middle")
b += t(X0 - 12, Y0 - H - 16, "平均响应 ms", 14, MUTE, "", "start")
b += t(X0 + W, Y0 + 50, "利用率", 14, MUTE, "", "end")
pts = []
r = 0.0
while r <= 0.967:
    pts.append(f"{X0 + r * W:.1f} {Y0 - 10 / (1 - r) / 300 * H:.1f}")
    r += 0.005
b += f'<path d="M{" L".join(pts)}" fill="none" stroke="{BLUEB}" stroke-width="3"/>'
for rho, v in [(0.5, 20), (0.7, 33), (0.8, 51), (0.9, 103), (0.95, 207)]:
    x, y = X0 + rho * W, Y0 - v / 300 * H
    b += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{ORANGE}"/>' + t(x - 12, y - 12, f"{rho:.0%} → {v} ms", 14, INK, "", "end")
b += line(f"M{X0 + 0.975 * W:.0f} 196L{X0 + 0.99 * W:.0f} {Y0 - H - 4}", red=True) + t(X0 + 0.935 * W, 176, "99% → 1518 ms", 14, RED, "", "end")
b += f'<path d="M{X0} {Y0 - 10 / 300 * H:.1f}H{X0 + W}" stroke="{GREENB}" stroke-dasharray="6 5"/>' + t(X0 + 8, Y0 - 10 / 300 * H - 8, "处理时间本身：10 ms", 13, "#3f7a5c")
b += f'<circle cx="{X0 + 20}" cy="{Y0 + 60}" r="6" fill="{ORANGE}"/>' + t(X0 + 34, Y0 + 65, "模拟结果（每点 20 万个请求）", 14, SUB)
b += f'<path d="M{X0 + 300} {Y0 + 60}H{X0 + 340}" stroke="{BLUEB}" stroke-width="3"/>' + t(X0 + 350, Y0 + 65, "公式：处理时间 ÷ (1 − 利用率)", 14, SUB)
svg("utilization-curve", 1120, 570, "利用率与平均响应时间的关系曲线", "横轴是工作线程的利用率，纵轴是平均响应时间。处理时间平均 10 毫秒，利用率 50% 时响应 20 毫秒，80% 时 51 毫秒，90% 时 103 毫秒，95% 时 207 毫秒，99% 时超过 1.5 秒；模拟点与公式曲线吻合，越接近 100% 曲线越陡。", b)

# 8 百分位与扇出
b = head("平均值落在没有请求的地方；扇出让慢请求成倍增加", "实测：下游 98% 的调用约 10 ms，2% 要 200 ms；每种扇出 2000 个请求。")
b += box(40, 130, 520, 420) + t(60, 166, "扇出 1 时的耗时分布", 19, weight=1)
BX, BY, BW, BH = 70, 440, 470, 220     # x: 0–230 ms
def bx(ms): return BX + ms / 230 * BW
b += f'<path d="M{BX} {BY}H{BX + BW}" stroke="{LINE}"/>'
for k in range(0, 231, 50):
    b += f'<path d="M{bx(k):.0f} {BY}V{BY + 6}" stroke="{LINE}"/>' + t(bx(k), BY + 22, f"{k}", 13, MUTE, "", "middle")
b += t(BX + BW, BY + 44, "ms", 13, MUTE, "", "end")
b += rect(bx(10), BY - 200, bx(15) - bx(10), 200, BLUEB) + t(bx(12.5), BY - 208, "98%", 14, SUB, "", "middle")
b += rect(bx(202), BY - 8, bx(208) - bx(202), 8, RED) + t(bx(205), BY - 16, "2%", 14, RED, "", "middle")
for ms, lab, y, col in [(13.0, "P50 = 13 ms", BY - 170, INK), (14.3, "P95 = 14 ms", BY - 140, INK), (17.1, "平均 = 17 ms", BY - 110, ORANGE)]:
    x = bx(ms)
    b += f'<path d="M{x:.1f} {BY - 200}V{BY}" stroke="{col}" stroke-width="1.5" stroke-dasharray="3 3"/>'
    b += f'<path d="M{x:.1f} {y - 5}H{bx(32) - 6:.1f}" stroke="{col}" stroke-width="1"/>' + t(bx(32), y, lab, 14, col, 1)
x = bx(206.3)
b += f'<path d="M{x:.1f} {BY - 200}V{BY}" stroke="{INK}" stroke-width="1.5" stroke-dasharray="3 3"/>' + t(x - 6, BY - 170, "P99 = 206 ms", 14, INK, 1, "end")
b += t(60, 520, "平均值 17 ms 夹在两堆之间，没有一个请求接近它", 15, SUB)
b += box(600, 130, 480, 420) + t(620, 166, "超过 100 ms 的请求比例", 19, weight=1)
data = [(1, 2.2, 2.0), (5, 9.8, 9.6), (10, 18.9, 18.3), (30, 44.6, 45.5)]
CY, CH = 450, 230
for i, (n, m, th) in enumerate(data):
    x = 650 + i * 105
    h = m / 50 * CH
    b += rect(x, CY - h, 60, h, ORANGE if n > 1 else BLUEB) + t(x + 30, CY - h - 10, f"{m}%", 15, INK, 1, "middle")
    b += t(x + 30, CY + 24, f"扇出 {n}", 14, SUB, "", "middle")
b += f'<path d="M640 {CY}H1060" stroke="{LINE}"/>'
b += t(620, 504, "理论值 1 − 0.98ⁿ：2.0%、9.6%、18.3%、45.5%", 15, SUB)
b += t(620, 528, "要等最慢的那个，任何一个慢，整个请求就慢", 15, SUB)
svg("percentiles-and-fanout", 1120, 570, "延迟分布上的平均值与百分位，以及扇出放大慢请求的比例", "左图：扇出为 1 时，98% 的请求在 10 到 15 毫秒，2% 在 200 毫秒左右；P50 为 13 毫秒，P95 为 14 毫秒，平均 17 毫秒落在两堆之间，P99 为 206 毫秒。右图：超过 100 毫秒的请求比例随扇出增加，扇出 1、5、10、30 时分别为 2.2%、9.8%、18.9%、44.6%，与理论值 1 减 0.98 的 n 次方吻合。", b)
