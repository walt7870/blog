import socket, subprocess, time

conns = [socket.create_connection(("127.0.0.1", 9000)) for _ in range(100)]
print("客户端：100 条 connect() 全部成功")
time.sleep(1)
print(subprocess.run(["ss", "-lnt", "sport = :9000"], capture_output=True, text=True).stdout)
