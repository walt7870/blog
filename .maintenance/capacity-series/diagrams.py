"""连接容量系列图示源稿。运行：python3 diagrams.py，输出到 public/protocol/capacity/。"""
import os
OUT = os.path.join(os.path.dirname(__file__), "../../public/protocol/capacity")
INK, MUTE, SUB, LINE, BOX, BLUE, BLUEB, GREEN, GREENB, RED, REDB, ORANGE = (
    "#23313d", "#7a8794", "#52616d", "#8fa3b1", "#fff", "#eaf3fb", "#7694aa", "#e8f5ef", "#74a28b", "#b4473b", "#fbeceb", "#c7782f")

def svg(name, w, h, title, desc, body):
    s = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{name}-t {name}-d">
<title id="{name}-t">{title}</title><desc id="{name}-d">{desc}</desc>
<defs><marker id="{name}-a" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#596775"/></marker>
<marker id="{name}-r" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{RED}"/></marker></defs>
<rect width="{w}" height="{h}" fill="#f7f9fb"/>
<g font-family="Arial, 'PingFang SC', sans-serif" fill="{INK}">
{body.replace("ARROW", f"url(#{name}-a)").replace("REDARROW", f"url(#{name}-r)")}
</g></svg>
'''
    open(os.path.join(OUT, name + ".svg"), "w").write(s)

def t(x, y, s, size=16, fill=INK, weight="", anchor=""):
    w = ' font-weight="600"' if weight else ""
    a = f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}"{w}{a}>{s}</text>'

def box(x, y, w, h, fill=BOX, stroke=LINE):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}"/>'

def line(d, red=False, dash=False):
    st = RED if red else "#596775"
    da = ' stroke-dasharray="6 5"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{st}" stroke-width="2"{da} marker-end="{"REDARROW" if red else "ARROW"}"/>'

def head(title, sub):
    return t(40, 56, title, 28, weight=1) + t(40, 92, sub, 18, SUB)

# 1 四元组
b = head("65535 卡住的是发起连接的一方", "服务端一个端口靠对方地址区分连接；发起方连同一目标时，只剩源端口能变。")
b += box(40, 130, 500, 330) + box(580, 130, 500, 330)
b += t(60, 166, "服务端：一个监听端口", 20, weight=1) + t(600, 166, "发起方：连同一个上游地址", 20, weight=1)
b += box(70, 250, 150, 90, BLUE, BLUEB) + t(90, 288, "推送网关", 18, weight=1) + t(90, 316, ":443", 16, SUB)
for i, (ip, port) in enumerate([("198.51.100.7", "51200"), ("198.51.100.7", "51201"), ("203.0.113.42", "38110")]):
    y = 186 + i * 78
    b += box(360, y, 160, 60) + t(374, y + 26, ip, 15) + t(374, y + 48, f"端口 {port}", 15, SUB)
    b += f'<path d="M222 295L356 {y + 30}" fill="none" stroke="#596775" stroke-width="2"/>'
b += t(60, 446, "三条连接的目标都是 :443，四元组不同就是不同连接", 15, SUB)
b += box(610, 250, 120, 90, BLUE, BLUEB) + t(626, 288, "反向代理", 18, weight=1) + t(626, 316, "出口 IP ×1", 15, SUB)
b += box(930, 250, 120, 90) + t(946, 288, "上游服务", 18, weight=1) + t(946, 316, "10.0.0.5:8080", 14, SUB)
b += line("M732 295H926")
for k in range(10):
    b += f'<rect x="{612 + k * 44}" y="372" width="38" height="26" rx="3" fill="{"#d6e4ef" if k < 9 else REDB}" stroke="{BLUEB if k < 9 else RED}"/>'
b += t(612, 420, "临时端口池 32768–60999，约 2.8 万个", 15, SUB) + t(612, 446, "用完后 connect() 返回 EADDRNOTAVAIL", 15, RED)
b += box(40, 486, 1040, 54, GREEN, GREENB) + t(60, 519, "实验：端口范围缩到 10 个，连 :9000 成功 10 条后报错；换连 :9001，同样 10 个端口又能再建 10 条。", 17)
svg("four-tuple", 1120, 560, "65535 卡住的是发起连接的一方", "服务端只监听 443，不同客户端地址和端口组成不同四元组。反向代理用一个出口 IP 连同一个上游时，四元组只剩源端口可变，临时端口约 2.8 万个，用完报 EADDRNOTAVAIL。", b)

# 2 fd
b = head("fd 用完时，握手照样完成，连接堆在 accept 队列", "内核替应用完成三次握手；应用调用 accept() 才会为连接分配文件描述符。")
xs = [40, 270, 500, 760]
labels = [("客户端 connect()", "返回成功"), ("内核完成握手", "连接进入队列"), ("accept 队列", "等应用来取"), ("应用 accept()", "分配一个 fd")]
for i, (a, c) in enumerate(labels):
    fill, st = (BLUE, BLUEB) if i == 2 else (BOX, LINE)
    b += box(xs[i], 140, 200 if i < 3 else 320, 96, fill, st) + t(xs[i] + 20, 178, a, 19, weight=1) + t(xs[i] + 20, 210, c, 16, SUB)
b += line("M242 188H266") + line("M472 188H496") + line("M702 188H756")
b += line("M920 238V286", red=True)
b += box(760, 290, 320, 96, REDB, RED) + t(780, 328, "fd 额度已满", 19, RED, 1) + t(780, 358, "accept() 返回 EMFILE", 16, RED)
b += f'<path d="M760 338H600Q590 338 590 328V242" fill="none" stroke="{RED}" stroke-width="2" stroke-dasharray="6 5" marker-end="REDARROW"/>'
b += t(380, 330, "新连接取不走，留在队列里", 15, RED)
b += box(40, 420, 1040, 110, GREEN, GREENB)
b += t(60, 456, "实验：服务端软限制 64 个 fd，accept 到第 61 条失败；客户端 100 条 connect() 全部成功。", 17)
b += t(60, 490, "ss -lnt 显示监听 Socket 的 Recv-Q = 40：这 40 条连接对客户端来说已经“连上”，但没有任何程序在处理。", 17)
svg("fd-accept", 1120, 550, "fd 用完时，握手照样完成，连接堆在 accept 队列", "客户端 connect 后内核完成握手，连接进入 accept 队列；应用 accept 时分配 fd。fd 额度满时 accept 返回 EMFILE，新连接停留在队列中，客户端看起来已连接但无人处理。", b)

# 3 memory
b = head("同一条连接，空闲和积压的内存成本相差上百倍", "实测：Linux 7.0 容器，10,000 条回环连接；其中 1,000 条的客户端不读数据。")
W = 860 / 492
b += t(40, 150, "空闲连接，每个 Socket", 17) + f'<rect x="220" y="134" width="{max(3.68 * W, 4):.1f}" height="24" fill="{BLUEB}"/>' + t(236, 152, "约 3.7 KiB（Slab 里的固定对象，没有收发缓冲）", 16, SUB)
b += t(40, 210, "客户端不读的连接", 17) + f'<rect x="220" y="194" width="{492 * W:.0f}" height="24" fill="{ORANGE}"/>' + t(236, 212, "服务端发送队列平均 492 KiB / 条", 16, "#fff")
b += box(40, 260, 500, 200) + box(580, 260, 500, 200)
b += t(60, 296, "8 GiB 内存全给空闲连接", 19, weight=1)
b += t(60, 334, "8 GiB ÷ 3.7 KiB", 18, SUB) + t(60, 366, "≈ 227 万条", 18)
b += t(60, 404, "只算服务端一侧的内核对象", 16, SUB) + t(60, 432, "再加应用层会话、TLS 状态，会少得多", 16, SUB)
b += t(600, 296, "8 GiB 遇上读得慢的客户端", 19, weight=1)
b += t(600, 334, "8 GiB ÷ 492 KiB", 18, SUB) + t(600, 366, "≈ 1.7 万条就能占满", 18, RED)
b += t(600, 404, "积压量取决于 tcp_wmem 上限和对端窗口", 16, SUB) + t(600, 432, "要靠应用层的有界队列和背压控制", 16, SUB)
b += box(40, 486, 1040, 54, GREEN, GREENB) + t(60, 519, "容量规划看的是“多少连接会积压、积压多少”，而不只是连接总数乘以一个固定值。", 17)
svg("connection-memory", 1120, 560, "同一条连接，空闲和积压的内存成本相差上百倍", "实测空闲连接每个 Socket 约 3.7 KiB，客户端不读时服务端每条连接平均积压 492 KiB。8 GiB 内存只算服务端内核对象可容纳约 227 万条空闲连接，但只需约 1.7 万条积压连接就会占满。", b)

# 4 thread vs event loop
b = head("一连接一线程，和一个线程等所有连接", "实测：Python 3.13，同一进程保持 5,000 条空闲连接。")
b += box(40, 130, 500, 300) + box(580, 130, 500, 300, BLUE, BLUEB)
b += t(60, 166, "一连接一线程", 20, weight=1) + t(600, 166, "事件循环（epoll）", 20, weight=1)
for r in range(3):
    for c in range(6):
        x, y = 60 + c * 78, 190 + r * 46
        b += box(x, y, 66, 34) + t(x + 10, y + 23, "线程", 14, SUB)
b += t(60, 352, "每条连接一个线程阻塞在 recv()", 16, SUB)
b += t(60, 386, "线程 5,002 个 · 常驻内存 114 MiB", 17) + t(60, 414, "虚拟地址空间 44.4 GiB（每个线程预留栈）", 16, SUB)
b += box(600, 190, 150, 120) + t(620, 230, "一个线程", 18, weight=1) + t(620, 260, "epoll_wait()", 15, SUB) + t(620, 288, "只处理就绪的", 15, SUB)
for k in range(6):
    y = 190 + k * 20
    b += f'<path d="M752 250L900 {y + 8}" fill="none" stroke="#9fb3c2" stroke-width="1.5"/>'
    b += f'<rect x="900" y="{y}" width="150" height="14" rx="3" fill="#fff" stroke="{LINE}"/>'
b += t(900, 334, "5,000 个 fd 登记在 epoll", 15, SUB)
b += t(600, 386, "线程 2 个 · 常驻内存 16 MiB", 17) + t(600, 414, "虚拟地址空间 0.1 GiB", 16, SUB)
b += box(40, 456, 1040, 84, GREEN, GREENB)
b += t(60, 490, "空闲时两种模型都几乎不占 CPU，差别先出现在线程数和内存上；连接一多，线程模型还会多出调度切换。", 17)
b += t(60, 522, "数字包含同进程里客户端 Socket 的开销，只用于对比两种模型。", 15, SUB)
svg("thread-vs-eventloop", 1120, 560, "一连接一线程，和一个线程等所有连接", "实测 5000 条空闲连接：一连接一线程模型有 5002 个线程、常驻内存 114 MiB、虚拟地址空间 44.4 GiB；epoll 事件循环只有 2 个线程、常驻内存 16 MiB。", b)

# 5 accept queue
b = head("握手的两段排队：SYN 队列和 accept 队列", "accept 队列长度取 listen(backlog) 与 net.core.somaxconn 中较小的值。")
b += box(40, 140, 170, 90) + t(60, 178, "客户端", 19, weight=1) + t(60, 208, "发出 SYN", 16, SUB)
b += box(270, 140, 220, 90) + t(290, 178, "SYN 队列", 19, weight=1) + t(290, 208, "半连接，等第三次握手", 16, SUB)
b += box(550, 140, 240, 90, BLUE, BLUEB) + t(570, 178, "accept 队列", 19, weight=1) + t(570, 208, "握手完成，等应用取走", 16, SUB)
b += box(850, 140, 230, 90) + t(870, 178, "应用 accept()", 19, weight=1) + t(870, 208, "拿到连接开始处理", 16, SUB)
b += line("M212 185H266") + line("M492 185H546") + line("M792 185H846")
b += line("M670 232V282", red=True)
b += box(470, 286, 400, 100, REDB, RED) + t(490, 322, "accept 队列满", 19, RED, 1) + t(490, 352, "新的 SYN 被丢弃，计入 ListenOverflows", 16, RED)
b += f'<path d="M470 336H135Q125 336 125 326V236" fill="none" stroke="{RED}" stroke-width="2" stroke-dasharray="6 5" marker-end="REDARROW"/>'
b += t(140, 324, "收不到回应，1 秒后重发 SYN，直到超时", 15, RED)
b += box(40, 412, 1040, 128, GREEN, GREENB)
b += t(60, 446, "实验：backlog = 4，应用从不 accept，依次来 12 个客户端，各等 2 秒。", 17)
b += t(60, 478, "前 5 个立即连上（队列可放 backlog + 1 条），后 7 个全部超时；ss -lnt 显示 Recv-Q 5、Send-Q 4。", 17)
b += t(60, 510, "ListenOverflows 增加 14：7 个客户端各发了首个 SYN 和 1 秒后的重传，每次都被丢弃。", 17)
svg("accept-queue", 1120, 560, "握手的两段排队：SYN 队列和 accept 队列", "客户端 SYN 先进入 SYN 队列，握手完成后进入 accept 队列等待应用 accept。accept 队列满时新 SYN 被丢弃并计入 ListenOverflows，客户端重传直到超时。实验中 backlog 为 4，前 5 个连接成功，后 7 个超时。", b)
print("ok")
