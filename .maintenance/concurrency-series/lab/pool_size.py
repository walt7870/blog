import hashlib, time
from concurrent.futures import ThreadPoolExecutor

BLOB = b"x" * (4 << 20)
RATE, N = 500, 1500                      # 每秒到达 500 个请求，共 3 秒

def handle(arrived):
    time.sleep(0.040)                    # 查库、调下游：等待 40 ms
    c0 = time.thread_time()
    hashlib.sha256(BLOB).hexdigest()     # 计算签名：占 CPU，hashlib 计算时会释放 GIL
    return time.perf_counter() - arrived, time.thread_time() - c0

def pct(xs, p):
    xs = sorted(xs)
    return xs[max(0, -(-len(xs) * p // 100) - 1)]

for size in (8, 16, 24, 32, 64, 256):
    futures = []
    with ThreadPoolExecutor(size) as ex:
        t0 = time.perf_counter()
        for i in range(N):               # 按固定节奏到达，不管前面的有没有处理完
            delay = t0 + i / RATE - time.perf_counter()
            if delay > 0:
                time.sleep(delay)
            futures.append(ex.submit(handle, time.perf_counter()))
        res = [f.result() for f in futures]
        wall = time.perf_counter() - t0
    lat = [r[0] * 1000 for r in res]
    cpu = sum(r[1] for r in res) / N * 1000
    inflight = sum(r[0] for r in res) / wall          # 平均同时在系统里的请求数
    print(f"线程池 {size:3d}：完成 {N / wall:4.0f} 个/秒，平均 {sum(lat) / N:5.0f} ms，P50 {pct(lat, 50):5.0f} ms，"
          f"P99 {pct(lat, 99):5.0f} ms，平均在途 {inflight:5.1f} 个，计算 {cpu:3.1f} ms/个")
