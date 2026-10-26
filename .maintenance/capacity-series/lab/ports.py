import socket

servers = [socket.create_server(("127.0.0.1", p)) for p in (9000, 9001)]
conns = []
for port in (9000, 9001):
    ok = 0
    while True:
        try:
            conns.append(socket.create_connection(("127.0.0.1", port)))
            ok += 1
        except OSError as e:
            print(f"连 {port}：成功 {ok} 条，第 {ok + 1} 条失败：{e}")
            break
ports = sorted({c.getsockname()[1] for c in conns})
print(f"共 {len(conns)} 条连接，用到的本地端口：{ports[0]}–{ports[-1]}，{len(ports)} 个")
