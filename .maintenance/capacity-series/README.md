# 连接容量系列维护记录

2026-10-26 将《容量、并发与性能》单篇重构为 `docs/basic/protocol/capacity/` 下的导读加 6 篇。起因：单篇把端口、fd、内存、CPU、队列、吞吐、中间设备、CDN 和压测放在一起，主线不突出，初学者不知道从哪里读。参考材料为 B 站「跟我一起学网络」《一台服务器最多能建多少 TCP 连接？别说 65535》（BV1b6aV6KECY）的问题切入方式，事实另行核对。

## 结构决定

- 每篇只回答一个问题，标题即问题；贯穿案例统一为“手机 App 推送网关”，30 秒心跳。
- 每篇顺序：承接上一篇 → 场景 → 可运行实验与实测输出 → 机制图 → 真实服务器上的检查与调整 → 不适用或误判情况 → 引出下一篇。
- 导读提供“按症状找入口”和统一的实验镜像。
- 旧路径 `capacity-performance` 保留为跳转页（meta refresh，`search: false`），避免外链失效和部署脚本的删除保护报错。
- 原文“DNS、CDN 与缓存容量”一节与连接容量主问题无关，未并入系列。

## 实验

- 脚本与 Dockerfile 在 `lab/`，与正文代码块一致；图示源稿 `diagrams.py`，输出到 `public/protocol/capacity/`。
- 运行环境：Docker Desktop，Linux 7.0.12-linuxkit，10 vCPU，7.7 GiB；Python 3.13.17；OpenSSL 3.5.7；2026-10-26。
- 实测输出见 `lab/results-final.txt`、`lab/fd-result.txt`（后者为加 `-u` 前的乱序版本，正文用加 `-u` 后的顺序）。memory.py 共运行 4 次，每 Socket 3.68–3.82 KiB；TLS 握手两次分别为 25012、24733 次/11 秒。

## 核对的易变事实（2026-10-25/26）

- somaxconn 自 Linux 5.4 默认 4096（此前 128）；tcp_max_syn_backlog 实验环境为 512。
- ip_local_port_range 默认 32768–60999；fs.nr_open 默认 1048576。
- systemd 240 起服务 RLIMIT_NOFILE 软 1024、硬 524288；软限制保留 1024 是为兼容 select()。
- Linux accept 队列可容纳 backlog+1；队列满时丢弃 SYN 并计 ListenOverflows；tcp_syn_retries 默认 6，首次重传 1 秒后翻倍。
- Nginx 在 Linux 上默认 backlog 511。
