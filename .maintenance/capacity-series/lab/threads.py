import os, selectors, socket, sys, threading, time

MODE, N = sys.argv[1], 5000
srv = socket.create_server(("127.0.0.1", 9000), backlog=4096)
held = []

def per_thread():
    while True:
        conn, _ = srv.accept()
        held.append(conn)
        threading.Thread(target=lambda c=conn: c.recv(64), daemon=True).start()

def event_loop():
    sel = selectors.DefaultSelector()          # Linux 上是 epoll
    srv.setblocking(False)
    sel.register(srv, selectors.EVENT_READ)
    while True:
        for key, _ in sel.select():
            conn, _ = srv.accept()
            conn.setblocking(False)
            held.append(conn)
            sel.register(conn, selectors.EVENT_READ)

threading.Thread(target=per_thread if MODE == "thread" else event_loop, daemon=True).start()
clients = [socket.create_connection(("127.0.0.1", 9000)) for _ in range(N)]
time.sleep(3)
status = dict(l.split(":", 1) for l in open(f"/proc/{os.getpid()}/status"))
print(f"{MODE}：{N} 条连接，线程 {status['Threads'].strip()} 个，"
      f"常驻内存 {int(status['VmRSS'].split()[0]) / 1024:.0f} MiB，"
      f"虚拟地址空间 {int(status['VmSize'].split()[0]) / 2**20:.1f} GiB")
