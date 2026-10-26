# 单个工作线程、随机到达、随机处理时长的排队模拟（不睡眠，只算时间轴）
import random

random.seed(7)
SERVICE, N = 10.0, 200_000           # 平均处理 10 ms，模拟 20 万个请求

def pct(xs, p):
    xs = sorted(xs)
    return xs[max(0, -(-len(xs) * p // 100) - 1)]

for rho in (0.5, 0.7, 0.8, 0.9, 0.95, 0.99):
    arrive = free = 0.0
    lat = []
    for _ in range(N):
        arrive += random.expovariate(rho / SERVICE)
        start = max(arrive, free)            # 线程忙就排队
        free = start + random.expovariate(1 / SERVICE)
        lat.append(free - arrive)
    print(f"利用率 {rho:4.0%}：平均响应 {sum(lat) / N:6.0f} ms（公式 {SERVICE / (1 - rho):5.0f}），"
          f"P50 {pct(lat, 50):5.0f}，P99 {pct(lat, 99):6.0f} ms")
