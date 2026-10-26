import resource, socket, time

soft, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
print(f"服务端 fd 额度：软限制 {soft}")
srv = socket.create_server(("127.0.0.1", 9000), backlog=1024)
accepted = []
while True:
    try:
        accepted.append(srv.accept()[0])
    except OSError as e:
        print(f"accept 第 {len(accepted) + 1} 条时失败：{e}")
        break
time.sleep(3)
