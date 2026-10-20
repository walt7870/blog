# systemd 服务管理

订单服务退出后被反复拉起，接口仍持续报错。systemd 能启动进程、跟踪 unit 状态并按策略重启，但不理解订单是否成功、数据库是否可用。需要分清“配置已加载、进程已执行、应用已就绪、业务请求可用”四种结果。

本文使用常见 systemd 系统管理器语法；不同发行版所带版本可能不同。先用 `systemd --version` 确认版本；普通容器中未运行 systemd 时，下面的 systemctl 管理操作并不适用。

## unit 如何变成运行中的服务

![systemd配置、启动与应用就绪边界](/linux/systemd-unit-flow.svg)

unit 是管理对象，service、socket、timer、target 是不同类型。target 可聚合一组 unit；service 描述进程的启动与跟踪；journal 收集日志，不是依赖关系的下一启动阶段。服务内的子进程通常归属同一服务 cgroup，管理边界不只包含一个 MainPID。

| 操作 | 改变什么 |
| --- | --- |
| `daemon-reload` | 管理器重新读取 unit 配置与依赖 |
| `start/stop/restart` | 改变当前服务运行状态 |
| `enable/disable` | 根据安装配置建立或移除启用链接 |
| `reload` | 执行服务支持的应用配置重载 |
| `enable --now` | 启用并立即启动 |

enable 本身不代表立即启动，disable 本身不代表停止。daemon-reload 也不会把新环境变量注入已经运行的进程。reload 是否无中断、失败后保留什么配置，由应用协议和 ExecReload 实现决定。

## 订单服务配置

假设已创建非特权账号 `app`，部署 JAR 到 `/opt/order-api/order-api.jar`，且 `/usr/bin/java` 存在。文件可放在 `/etc/systemd/system/order-api.service`：

```ini
[Unit]
Description=Order API
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=60s
StartLimitBurst=5

[Service]
Type=exec
User=app
WorkingDirectory=/opt/order-api
ExecStart=/usr/bin/java -jar /opt/order-api/order-api.jar
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

保持应用前台运行，不在 ExecStart 后加 `&`。ExecStart 默认不是 shell 命令行，`>`、管道、`&&` 不按 shell 解释；需要多步骤初始化时优先使用明确脚本或 ExecStartPre，并记录每步失败。

`Type=exec` 在成功执行目标程序后才视为启动成功，但此时 Java 应用可能尚未监听端口。旧 systemd 不支持时需核对兼容性；改为 simple 不会获得就绪保证。只有应用主动实现通知协议，才能采用 notify 并在初始化完成后发送 `READY=1`。健康接口、真实依赖和业务请求仍要另外验证。

## 顺序、拉起和就绪

| 指令 | 作用 | 没有保证什么 |
| --- | --- | --- |
| `After=B` | A、B都被调度时，A的启动排在B之后 | 不自动启动B |
| `Wants=B` | 启动A时也请求启动B | B失败通常不阻止A |
| `Requires=B` | 建立更强的需求关系 | 单独使用不确定启动先后 |

例如 A 同时配置 Requires=B 与 After=B，B 激活失败时，A 不会按正常路径启动。没有 After 的并行任务不能照搬这一结论；停止传播与资源消失还有 BindsTo 等其他关系，不能用“强依赖”概括所有生命周期。

`network-online.target` 的意义由网络管理器的 wait-online 服务和配置决定，主要用于启动阶段同步。它不持续监控网络，更不保证数据库、DNS或公网API一直可达。服务连接外部依赖仍需超时与重试。

## 校验、加载和验收

先校验 unit，再加载和启动：

```bash
systemd-analyze verify /etc/systemd/system/order-api.service
sudo systemctl daemon-reload
sudo systemctl start order-api.service
systemctl status order-api.service --no-pager
systemctl show order-api.service -p FragmentPath -p DropInPaths -p MainPID -p Result -p NRestarts
journalctl -u order-api.service -b -n 100 --no-pager
```

verify 能发现部分配置与执行路径问题，不会替你执行完整应用测试。status 返回非零可能正是服务处于失败状态，不能因此删掉该证据。再对实际端口和已实现的健康接口发请求，确认业务依赖可用；不要照抄一个应用并不存在的健康路径。

若要开机启动，再执行 `sudo systemctl enable order-api.service`。改动前可用 `systemctl cat order-api.service` 查看主文件与 drop-in，避免只改了未生效的副本。

## 重启与停止边界

本例60秒窗口内最多允许5次启动尝试；计数不只针对自动重启。达到限额后，不会因为写了 Restart 就永远重试。先修复原因，再用 `sudo systemctl reset-failed order-api.service` 清理失败与限流计数并重新启动，不靠加大 Burst 掩盖故障。

systemctl stop 不会因 on-failure 自动把服务拉起；其他激活源或管理器仍可能再启动它。默认停止流程会向服务进程发送终止信号并等待，超时后可强杀；具体以 KillMode、KillSignal、SendSIGKILL 等配置为准。应用需在30秒预算内停止接单并处理在途请求。

## 按症状排查

| 症状 | 证据与处理 |
| --- | --- |
| CHDIR / USER / EXEC 错误 | 核对工作目录、账号、可执行路径及权限 |
| active但请求失败 | 区分进程执行、端口监听、应用初始化和下游 |
| start-limit-hit | 保留首个失败日志，修原因后重置计数 |
| 手工运行成功而服务失败 | 比较身份、目录、PATH、环境及资源限制 |
| 重载后行为没变化 | 确认改的是unit还是应用配置、是否支持reload |
| enable后未启动 | 检查目标、安装链接、条件与启动日志 |

完成修复后核对服务只保留预期进程、重启计数稳定、日志无重复失败，且真实请求通过。进程状态和信号详见 [进程概览](./index.md) 与 [用户进程](./user-processes.md)。
