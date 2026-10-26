import socket, subprocess, time

def overflows():
    rows = [l.split() for l in open("/proc/net/netstat") if l.startswith("TcpExt:")]
    return int(rows[1][rows[0].index("ListenOverflows")])

srv = socket.create_server(("127.0.0.1", 9000), backlog=4)   # 永远不调用 accept()
before = overflows()
for i in range(1, 13):
    c = socket.socket()
    c.settimeout(2)
    t = time.monotonic()
    try:
        c.connect(("127.0.0.1", 9000))
        print(f"客户端 {i:2d}：连接成功")
    except OSError as e:
        print(f"客户端 {i:2d}：{e}，等了 {time.monotonic() - t:.1f} 秒")
print(subprocess.run(["ss", "-lnt", "sport = :9000"], capture_output=True, text=True).stdout)
print(f"ListenOverflows 增加 {overflows() - before}")
