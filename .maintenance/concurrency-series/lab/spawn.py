import subprocess, sys, time
N = 50
t0 = time.perf_counter()
for _ in range(N):
    subprocess.run([sys.executable, "-c", "pass"])
print(f"启动一个全新的 Python 解释器：{(time.perf_counter() - t0) / N * 1000:.1f} ms/个")
