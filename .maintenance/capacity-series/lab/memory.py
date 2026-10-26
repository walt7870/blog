import socket, subprocess, time

N, SLOW = 10000, 1000

def slab_kib():
    for line in open("/proc/meminfo"):
        if line.startswith("Slab:"):
            return int(line.split()[1])

def tcp_pages():
    for line in open("/proc/net/sockstat"):
        if line.startswith("TCP:"):
            f = line.split()
            return int(f[f.index("mem") + 1])

srv = socket.create_server(("127.0.0.1", 9000), backlog=4096)
time.sleep(1)
slab0, pages0 = slab_kib(), tcp_pages()
clients, accepted = [], []
for _ in range(N):
    clients.append(socket.create_connection(("127.0.0.1", 9000)))
    accepted.append(srv.accept()[0])
time.sleep(2)
slab1, pages1 = slab_kib(), tcp_pages()
per_socket = (slab1 - slab0) / (2 * N)
print(f"{N} 条空闲连接，两端共 {2 * N} 个 Socket")
print(f"内核 Slab 增加 {(slab1 - slab0) / 1024:.1f} MiB，约每个 Socket {per_socket:.2f} KiB")
print(f"TCP 收发缓冲：{pages0} → {pages1} 页")

for conn in accepted[:SLOW]:          # 这 1000 条的客户端从不读
    conn.setblocking(False)
    try:
        while True:
            conn.send(b"x" * 65536)
    except BlockingIOError:
        pass
time.sleep(2)
pages2 = tcp_pages()
lines = subprocess.run(["ss", "-tnH", "sport = :9000"], capture_output=True, text=True).stdout.splitlines()
queued = sum(int(l.split()[2]) for l in lines)
print(f"{SLOW} 条连接的客户端不读：TCP 缓冲 {pages2} 页，约 {(pages2 - pages1) * 4 / 1024:.0f} MiB")
print(f"服务端发送队列平均每条 {queued / SLOW / 1024:.0f} KiB")
