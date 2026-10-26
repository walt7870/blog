import random, threading, time
from concurrent.futures import ThreadPoolExecutor

random.seed(7)
SERVICE = 0.010          # 平均处理 10 ms，只有 1 个工作线程
N = 4000

def handle(arrived, cost):
    t = time.perf_counter()
    time.sleep(cost)
    end = time.perf_counter()
    return end - arrived, end - t          # 响应时间，实际处理时长

def pct(xs, p):
    xs = sorted(xs)
    return xs[max(0, -(-len(xs) * p // 100) - 1)]

# time.sleep 在容器里会多睡一点，先量出实际的平均处理时长，再按它安排到达速度
probe = [handle(time.perf_counter(), random.expovariate(1 / SERVICE))[1] for _ in range(300)]
actual = sum(probe) / len(probe)
print(f"名义处理 {SERVICE * 1000:.0f} ms，实测平均 {actual * 1000:.1f} ms")

for rho in (0.5, 0.7, 0.8, 0.9, 0.95):
    rate = rho / actual
    gaps = [random.expovariate(rate) for _ in range(N)]          # 到达时刻随机
    costs = [random.expovariate(1 / SERVICE) for _ in range(N)]  # 处理时长也随机
    futures = []
    with ThreadPoolExecutor(1) as ex:
        t, t0 = 0.0, time.perf_counter()
        for gap, cost in zip(gaps, costs):
            t += gap
            delay = t0 + t - time.perf_counter()
            if delay > 0:
                time.sleep(delay)
            futures.append(ex.submit(handle, time.perf_counter(), cost))
        res = [f.result() for f in futures]
        wall = time.perf_counter() - t0
    lat = [r[0] * 1000 for r in res]
    busy = sum(r[1] for r in res)
    s = busy / N
    u = busy / wall                        # 实测利用率：线程忙的时间占比
    print(f"目标 {rho:.0%}，实测利用率 {u:.0%}：平均响应 {sum(lat) / N:5.0f} ms"
          f"（按实测值套 S/(1-ρ) 得 {s * 1000 / (1 - u):4.0f} ms），P99 {pct(lat, 99):5.0f} ms")
