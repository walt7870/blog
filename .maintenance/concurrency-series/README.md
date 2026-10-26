# 并发基础系列维护记录

位置：`docs/linux/concurrency/`（导读 + 01–06），图示 `public/linux/concurrency/`，源稿 `diagrams.py`，实验 `lab/`。

## 决策

- 放在 Linux 系统专题下，语言无关；Python 并发实战系列负责语言工具与工程链路，连接容量系列负责连接维度。三者互相链接，不重复展开限流、背压、重试。
- 贯穿案例：订单服务（详情接口：查库 + 并发调用库存/物流/优惠 + 签名；下单接口：扣库存）。
- 顺序按请求经历：执行者（01）→ 在等还是在算（02）→ 执行者过多（03）→ 共享数据（04）→ 排队与池大小（05）→ 耗时统计（06）。
- 05 的利用率曲线用离散事件模拟（正文标注“模拟”），真实线程版 `queueing.py` 只作趋势佐证：容器内 `time.sleep` 会多睡约 0.8–1.5 ms，实际利用率偏高，数字不整齐。
- 06 的下游快慢按固定随机种子抽取，延迟为真实等待，正文已说明。
- 图示沿用连接容量系列的浅底卡片风格，深色主题下作为浅色卡片显示。

## 环境

Docker Desktop，Linux 7.0.12-linuxkit，VM 10 vCPU / 7.7 GiB；宿主 Apple M4（4 性能核 + 6 能效核）；镜像 `capacity-lab`（python:3.13-slim + iproute2 + openssl，无 procps）。2026-10-25/26 运行。

宿主繁忙（load 9+）时计算类实验波动很大：`cpu_io.py` 顺序计算曾从 1.6 s 变成 3.6 s，`switch.py` 总时长 1.0–2.7 s。正文采用宿主空闲时的结果，并在 02、03 说明波动来源；比例关系每次都成立。

## 核对过的事实

- Python free-threaded 构建：3.13 引入（实验性），3.14 起官方支持（PEP 779），默认解释器仍带 GIL；不兼容扩展会重新开启 GIL（docs.python.org 3.15 free-threading how-to，2026-10 核对）。
- Go 1.25 起，`go.mod` 的 go 版本 ≥ 1.25 时 GOMAXPROCS 默认跟随 cgroup CPU 限额（Go 官方博客 Container-aware GOMAXPROCS，2025-08-20）。
- 容器内实测：`--cpus 2` 时 `os.cpu_count()`、`os.process_cpu_count()` 均为 10，`cpu.max` 为 `200000 100000`；`--cpuset-cpus 0-1` 时 `os.process_cpu_count()` 为 2。
- `hashlib` 对大块数据计算时释放 GIL（pool_size.py 中多线程签名并行可观察到，2 核下吞吐不受 GIL 限制）。
- Tomcat `maxThreads` 默认 200；MySQL InnoDB 死锁错误码 1213。
- M/M/1：W = S/(1−ρ)；Little 定律 L = λW；扇出慢请求比例 1 − 0.98ⁿ；会话 50 请求 1 − 0.98⁵⁰ ≈ 63.6%。

## 实验文件

| 脚本 | 篇 | 结果 |
|---|---|---|
| workers.py / spawn.py | 01 | workers-result.txt / spawn-result.txt |
| cpu_io.py | 02 | cpu_io-result.txt |
| switch.py | 03 | switch-result.txt |
| race.py / deadlock.py | 04 | race-result.txt（另有两次早期运行：超卖 82、83 件）/ deadlock-result.txt |
| pool_size.py / queue_sim.py / queueing.py | 05 | 对应 *-result.txt |
| tail.py | 06 | tail-result.txt |

01 的 workers.py 最初先建线程再 fork，子进程 PSS 因父进程堆被前一阶段弄脏而虚高（4.4 MiB），已改为先 fork 并改报 RSS/独占内存。
