import asyncio, os, threading, time

def rss_kib():
    for line in open("/proc/self/status"):
        if line.startswith("VmRSS:"):
            return int(line.split()[1])

def smaps(pid):
    fields = dict(line.split(":", 1) for line in open(f"/proc/{pid}/smaps_rollup") if ":" in line and not line.startswith(("0", "a", "f")))
    kib = lambda k: int(fields[k].split()[0])
    return kib("Rss"), kib("Private_Clean") + kib("Private_Dirty")

stock = 100

def sell_one():
    global stock
    stock -= 1

t = threading.Thread(target=sell_one); t.start(); t.join()
print(f"线程扣减一次后，主程序看到 stock = {stock}")
pid = os.fork()
if pid == 0:
    sell_one()
    os._exit(0)
os.waitpid(pid, 0)
print(f"子进程扣减一次后，主程序看到 stock = {stock}")

N = 200
r, w = os.pipe()
t0 = time.perf_counter()
children = []
for _ in range(N):
    pid = os.fork()
    if pid == 0:
        os.close(w)
        os.read(r, 1)          # 等父进程关掉写端
        os._exit(0)
    children.append(pid)
cost = (time.perf_counter() - t0) / N * 1e6
time.sleep(1)
rss, private = (sum(v) / N for v in zip(*(smaps(p) for p in children)))
print(f"进程   ×{N}：创建 {cost:6.0f} µs/个，RSS {rss:6.0f} KiB/个，其中独占 {private:4.0f} KiB/个")
os.close(w)
for p in children:
    os.waitpid(p, 0)

N = 1000
base, done = rss_kib(), threading.Event()
t0 = time.perf_counter()
threads = [threading.Thread(target=done.wait) for _ in range(N)]
for t in threads:
    t.start()
cost = (time.perf_counter() - t0) / N * 1e6
print(f"线程   ×{N}：创建 {cost:6.0f} µs/个，内存 {(rss_kib() - base) / N:5.1f} KiB/个，"
      f"/proc/self/task 有 {len(os.listdir('/proc/self/task'))} 项")
done.set()
for t in threads:
    t.join()

async def coroutines(n):
    gate = asyncio.Event()
    base = rss_kib()
    t0 = time.perf_counter()
    tasks = [asyncio.create_task(gate.wait()) for _ in range(n)]
    await asyncio.sleep(0)
    cost = (time.perf_counter() - t0) / n * 1e6
    print(f"协程 ×{n}：创建 {cost:6.1f} µs/个，内存 {(rss_kib() - base) / n:5.1f} KiB/个，"
          f"线程仍是 {len(os.listdir('/proc/self/task'))} 个")
    gate.set()
    await asyncio.gather(*tasks)

asyncio.run(coroutines(100_000))
