import os, time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

def wait_db(_):            # 等数据库返回：线程在等，CPU 空闲
    time.sleep(0.5)

def sign(_):               # 纯 Python 计算：一直占着 CPU
    n = 0
    for i in range(15_000_000):
        n += i * i
    return n

def run(label, fn, pool):
    cpu0, t0 = os.times(), time.perf_counter()
    if pool is None:
        for i in range(4):
            fn(i)
    else:
        with pool(4) as ex:
            list(ex.map(fn, range(4)))
    wall = time.perf_counter() - t0
    c = os.times()
    cpu = (c.user - cpu0.user) + (c.system - cpu0.system) + (c.children_user - cpu0.children_user)
    print(f"{label:<16} 墙钟 {wall:4.2f} 秒   CPU 时间 {cpu:4.2f} 秒")

for name, fn in (("等数据库", wait_db), ("算签名", sign)):
    run(f"{name}·顺序", fn, None)
    run(f"{name}·4 线程", fn, ThreadPoolExecutor)
    run(f"{name}·4 进程", fn, ProcessPoolExecutor)
    print()
