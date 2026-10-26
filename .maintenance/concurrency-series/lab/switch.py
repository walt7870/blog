import os, time

def ctx(pid):
    v = n = 0
    for line in open(f"/proc/{pid}/status"):
        if line.startswith("voluntary_ctxt_switches"):
            v = int(line.split()[1])
        elif line.startswith("nonvoluntary_ctxt_switches"):
            n = int(line.split()[1])
    return v, n

# 实验一：两个进程用管道来回传一个字节，每一轮都要切换两次
ROUNDS = 100_000
a_r, a_w = os.pipe()
b_r, b_w = os.pipe()
pid = os.fork()
if pid == 0:
    for _ in range(ROUNDS):
        os.read(a_r, 1)
        os.write(b_w, b"x")
    os._exit(0)
t0 = time.perf_counter()
for _ in range(ROUNDS):
    os.write(a_w, b"x")
    os.read(b_r, 1)
dt = time.perf_counter() - t0
v, n = ctx("self")
os.waitpid(pid, 0)
print(f"管道往返 {ROUNDS} 次：{dt:.2f} 秒，每次往返 {dt / ROUNDS * 1e6:.1f} µs，父进程切换 {v + n} 次")

# 实验二：16 份同样的计算，交给 1 个进程排队做，或者开 16 个进程一起抢 CPU
TASKS, WORK = 16, 3_000_000
def burn(n):
    x = 0
    for i in range(n):
        x += i

def run(workers):
    r, w = os.pipe()
    t0 = time.perf_counter()
    for k in range(workers):
        if os.fork() == 0:
            done = []
            for _ in range(TASKS // workers):
                burn(WORK)
                done.append(time.perf_counter() - t0)    # 每份计算完成的时刻
            v, n = ctx("self")
            os.write(w, (" ".join(f"{d:.4f}" for d in done) + f" | {v} {n}\n").encode())
            os._exit(0)
    os.close(w)
    lines = os.fdopen(r).read().splitlines()
    for _ in range(workers):
        os.wait()
    finish = sorted(float(x) for l in lines for x in l.split(" | ")[0].split())
    sw = sum(sum(map(int, l.split(" | ")[1].split())) for l in lines)
    print(f"{workers:3d} 个进程：全部完成 {finish[-1]:.2f} 秒，第一份完成 {finish[0]:.2f} 秒，"
          f"平均每份等到 {sum(finish) / len(finish):.2f} 秒，上下文切换 {sw} 次")

for workers in (1, 4, 16):
    run(workers)
