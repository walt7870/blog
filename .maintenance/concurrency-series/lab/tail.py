import asyncio, random, time

random.seed(11)

def pct(xs, p):                      # 最近秩法：排好序，取第 ceil(n×p%) 个
    xs = sorted(xs)
    return xs[max(0, -(-len(xs) * p // 100) - 1)]

async def downstream():
    # 库存服务：98% 的调用 8–12 ms，2% 碰上缓存未命中，要 200 ms
    cost = 0.2 if random.random() < 0.02 else random.uniform(0.008, 0.012)
    await asyncio.sleep(cost)

async def request(fanout):
    t = time.perf_counter()
    await asyncio.gather(*(downstream() for _ in range(fanout)))   # 并发调用，等最慢的那个
    return (time.perf_counter() - t) * 1000

async def main():
    for fanout in (1, 5, 10, 30):
        lat = []
        for _ in range(20):          # 每批 100 个请求并发，共 2000 个
            lat += await asyncio.gather(*(request(fanout) for _ in range(100)))
        slow = sum(x > 100 for x in lat) / len(lat)
        print(f"扇出 {fanout:2d}：平均 {sum(lat) / len(lat):5.1f} ms，P50 {pct(lat, 50):5.1f}，P95 {pct(lat, 95):5.1f}，"
              f"P99 {pct(lat, 99):5.1f}，超过 100 ms 的 {slow:5.1%}（理论 {1 - 0.98 ** fanout:5.1%}）")

asyncio.run(main())
