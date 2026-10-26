import glob, os, threading, time

a, b = threading.Lock(), threading.Lock()
def transfer(first, second):
    with first:
        time.sleep(0.1)
        with second:          # 不设超时，一直等下去
            pass

threading.Thread(target=transfer, args=(a, b), daemon=True).start()
threading.Thread(target=transfer, args=(b, a), daemon=True).start()
time.sleep(1)
for task in sorted(glob.glob("/proc/self/task/*")):
    state = open(task + "/stat").read().split(") ")[1].split()[0]
    wchan = open(task + "/wchan").read()
    print(f"线程 {os.path.basename(task)}  状态 {state}  在等 {wchan if wchan != '0' else '-'}")
