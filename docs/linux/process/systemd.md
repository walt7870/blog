# systemd

systemd 是现代 Linux 发行版常用的初始化系统和服务管理器。它通常作为 PID 1 运行，负责启动系统目标、管理服务、处理依赖、收集日志，并在服务失败时按策略重启。

可以把 systemd 理解成系统服务调度器：它不只执行启动脚本，还知道服务之间的依赖、启动顺序、运行状态、日志位置和失败后的处理方式。

![systemd unit 启动链路](/linux/systemd-unit-flow.svg)

## 核心概念

| 概念 | 含义 |
| --- | --- |
| unit | systemd 管理对象，常见有 service、socket、timer、target |
| service | 一个服务进程或服务启动方式 |
| target | 一组 unit 的集合，类似启动阶段或运行目标 |
| dependency | unit 之间的依赖和顺序关系 |
| journal | systemd 的日志系统 |

## 常用命令

```bash
systemctl status nginx
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx
systemctl enable nginx
systemctl disable nginx
journalctl -u nginx -xe
```

`restart` 会重启进程，`reload` 通常只是重新加载配置。支持 reload 的服务应优先使用 reload，减少中断。

## unit 文件结构

典型 service：

```ini
[Unit]
Description=Order API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/order-api
ExecStart=/usr/bin/java -jar order-api.jar
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

三段含义：

- `[Unit]`：描述服务和依赖关系。
- `[Service]`：描述如何启动、停止、重启服务。
- `[Install]`：描述启用后挂到哪个启动目标。

## 依赖关系

`After=` 表示启动顺序，不表示强依赖；`Requires=` 表示强依赖，对方失败会影响当前 unit；`Wants=` 表示弱依赖，常用于希望一起启动但不强绑定。

常见误区：

- 只写 `After=network.target` 不代表网络已经可用。
- `After=` 不会自动拉起对方服务。
- 依赖写得过重，会导致一个非关键服务失败拖垮主服务。

需要等待网络可用时，常见写法是 `After=network-online.target` 加 `Wants=network-online.target`。

## 服务状态怎么读

`systemctl status` 里重点看：

- `Loaded`：unit 文件是否加载，是否 enable。
- `Active`：当前状态。
- `Main PID`：主进程 PID。
- `Exit Code`：退出码。
- 最近日志：启动失败原因通常在这里。

状态不是只看 active。服务可能反复重启、启动后马上退出，或者被 systemd 限流。

## 日志

```bash
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx -f
journalctl -u nginx -xe
```

排查服务失败时，先看 unit 状态，再看 journal，不要只看应用自己的日志。很多失败发生在应用启动前，例如工作目录不存在、用户权限不足、端口被占用、环境变量缺失。

## 重启策略

常用配置：

```ini
Restart=on-failure
RestartSec=5s
StartLimitBurst=5
StartLimitIntervalSec=60
```

含义：

- 失败后自动重启。
- 每次重启间隔 5 秒。
- 60 秒内最多尝试 5 次。

没有限制的自动重启可能让服务疯狂拉起，掩盖真实错误，也可能打爆依赖系统。

## 修改 unit 后的流程

修改 unit 文件后：

```bash
sudo systemctl daemon-reload
sudo systemctl restart 服务名
sudo systemctl status 服务名
```

只改应用配置文件，不一定需要 `daemon-reload`；改 unit 文件本身才需要。

## 常见问题

### 服务启动失败

检查：

1. `ExecStart` 路径是否存在。
2. `User` 是否有目录和文件权限。
3. `WorkingDirectory` 是否存在。
4. 环境变量是否配置。
5. 端口是否被占用。
6. journal 中的第一条错误。

### enable 后没有开机启动

检查 `[Install]` 是否存在 `WantedBy=`，再执行：

```bash
systemctl is-enabled 服务名
systemctl list-dependencies multi-user.target
```

### 服务一直重启

先停止服务，再看日志：

```bash
systemctl stop 服务名
journalctl -u 服务名 -n 100
```

不要只提高重启次数。反复重启通常说明启动命令、配置、依赖或权限有问题。

## 总结

systemd 的核心是 unit、依赖、状态和日志。排查服务问题时按“unit 是否加载 -> 依赖是否满足 -> 启动命令是否正确 -> 进程是否退出 -> journal 记录什么”的顺序推进。
