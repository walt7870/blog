import threading, time

# 实验一：先查库存再扣减，100 件库存，200 个请求同时下单
def sale(use_lock):
    stock, sold = 100, 0
    lock = threading.Lock()
    start = threading.Barrier(200)
    def buy():
        nonlocal stock, sold
        start.wait()
        if use_lock:
            lock.acquire()
        if stock > 0:            # 查
            time.sleep(0.001)    # 模拟查完库存到写回之间的一次数据库往返
            stock -= 1           # 改
            sold += 1
        if use_lock:
            lock.release()
    ts = [threading.Thread(target=buy) for _ in range(200)]
    t0 = time.perf_counter()
    for t in ts: t.start()
    for t in ts: t.join()
    print(f"{'加锁' if use_lock else '不加锁'}：卖出 {sold} 件，库存剩 {stock}，耗时 {time.perf_counter() - t0:.2f} 秒")

sale(False)
sale(True)

# 实验二：count += 1 看起来是一行，实际是读、加、写三步
import dis
ops = [i.opname for i in dis.get_instructions("count += 1")]
print("count += 1 的字节码：", " ".join(o for o in ops if o not in ("RESUME", "RETURN_CONST", "RETURN_VALUE")))

# 实验三：两笔转账按相反顺序加锁
a, b = threading.Lock(), threading.Lock()
def transfer(name, first, second):
    with first:
        time.sleep(0.1)
        if second.acquire(timeout=2):
            second.release()
            print(f"{name}：转账完成")
        else:
            print(f"{name}：拿着一把锁，等另一把等了 2 秒，放弃")
t1 = threading.Thread(target=transfer, args=("A→B", a, b))
t2 = threading.Thread(target=transfer, args=("B→A", b, a))
t1.start(); t2.start(); t1.join(); t2.join()

def ordered(name, x, y):
    first, second = sorted((x, y), key=id)     # 所有人都按同一顺序加锁
    transfer(name, first, second)
t1 = threading.Thread(target=ordered, args=("A→B", a, b))
t2 = threading.Thread(target=ordered, args=("B→A", b, a))
t1.start(); t2.start(); t1.join(); t2.join()
