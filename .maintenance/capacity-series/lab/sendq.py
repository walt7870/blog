import socket, subprocess

srv = socket.create_server(("127.0.0.1", 9000))
client = socket.create_connection(("127.0.0.1", 9000))      # 这个客户端从不读
conn, _ = srv.accept()
conn.setblocking(False)
sent = 0
try:
    while True:
        sent += conn.send(b"x" * 1024)
except BlockingIOError:
    print(f"服务端写了 {sent // 1024} KiB 后 send() 返回 EAGAIN")
print(subprocess.run(["ss", "-tn", "( sport = :9000 or dport = :9000 )"],
                     capture_output=True, text=True).stdout)
