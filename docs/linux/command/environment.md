# 环境变量与启动配置

订单脚本在终端能运行，换成定时任务或 systemd 就找不到 Java，常见原因是启动上下文不同。环境变量是进程启动时收到的一组字符串；它随进程创建传递，不是所有程序实时共享的全局配置。

## 变量沿父子进程传递

![shell局部变量、导出环境与子进程修改之间的传递边界](/linux/environment-inheritance.svg)

在 Bash 中，普通赋值创建 shell 变量，`export` 标记它进入之后启动的子进程环境。子进程可以修改自己的副本，但不能通过 export 改回父 shell、已经运行的服务或其他终端。程序也可能主动清理、覆盖或忽略环境变量。

下面的实验使用专用变量，不修改 PATH、HOME 或真实服务：

```bash
(
  unset BLOG_ORDER_MODE
  BLOG_ORDER_MODE=local
  bash --noprofile --norc -c 'printf "before=%s\n" "${BLOG_ORDER_MODE-unset}"'
  export BLOG_ORDER_MODE
  bash --noprofile --norc -c 'printf "inherited=%s\n" "$BLOG_ORDER_MODE"; export BLOG_ORDER_MODE=child'
  printf 'parent=%s\n' "$BLOG_ORDER_MODE"
  BLOG_ORDER_MODE=once bash --noprofile --norc -c 'printf "once=%s\n" "$BLOG_ORDER_MODE"'
  printf 'after=%s\n' "$BLOG_ORDER_MODE"
)
```

预期依次为 `before=unset`、`inherited=local`、`parent=local`、`once=once`、`after=local`。最外层括号把变更限制在子 shell；单次命令前赋值只影响该命令。`unset NAME` 删除当前 shell 变量，已运行子进程不会因此失去原来的副本。

## 从命令入口定位差异

| 信息 | 能说明什么 | 不能据此推断什么 |
| --- | --- | --- |
| `type -a java` | 当前 Bash 如何解析名称 | systemd 必然执行同一路径 |
| `printenv PATH` | 当前进程继承的搜索路径 | 所有服务的环境相同 |
| `printf '%s\n' "$SHELL"` | 通常是账号登记或继承的登录 shell 路径 | 当前实际执行的 shell 就是它 |
| `id`、`pwd -P` | 当前身份与物理工作目录 | 守护进程的用户、目录、namespace 相同 |
| `locale`、`locale -a` | 当前 locale 选择与已安装项 | 设置 LANG 会转换既有文件编码 |

PATH 按顺序搜索可执行程序；空组件或 `.` 可能使当前目录参与搜索，写入不受信任目录会改变执行对象。自动任务应优先明确程序绝对路径、工作目录和必要环境。Bash 可能缓存命令路径，安装替换后可用 `hash -r` 清缓存，再用 `type -a` 核对。

`HOME`、`USER`、`PWD` 是环境线索，不是授权依据；有效身份应查询内核凭据。`EDITOR` 是否使用由应用决定。locale 通常按 `LC_ALL`、对应 `LC_*`、`LANG` 的优先级选择；目标 locale 未安装时，仅赋值不能补齐它。

## Bash 启动文件按模式选择

| 模式 | Bash 常见读取规则 | 排查点 |
| --- | --- | --- |
| 交互登录或显式 `--login` | `/etc/profile`，然后从 `~/.bash_profile`、`~/.bash_login`、`~/.profile` 选择首个存在且可读的文件 | 三个用户文件不是依次全部读取 |
| 交互非登录 | `~/.bashrc` | 系统级 bashrc 是否加载取决于发行版及文件内容 |
| 普通非交互脚本 | 检查 `BASH_ENV` 指定文件 | 不自动套用交互 bashrc；脚本显式 source 是另一回事 |
| 以 `sh` 名称启动、POSIX 模式、远程守护进程等 | 有各自特殊规则 | 必须核对实际入口和调用参数 |

登录配置只有显式 source `~/.bashrc` 时才接着读取它。`/etc/environment` 常由 PAM 等登录机制读取，不是 Bash 脚本，不应写 `export`、命令替换或假设 `$PATH` 会展开；也不是每个进程都会读取它。Zsh 使用 `.zshenv`、登录时 `.zprofile`、交互时 `.zshrc`、登录时 `.zlogin` 等规则，不能把 Bash 文件名平移过去。

`source file`（或 `. file`）在当前 shell 执行文件中的命令，可改变变量、目录、选项和函数；它不是专门的“刷新配置”接口。只 source 已核对的文件，不为排查一个变量反复执行所有启动文件，以免重复追加 PATH 或运行额外命令。

## 服务环境在服务入口配置

由 systemd 管理的订单服务，在 unit 或 drop-in 的 `[Service]` 中明确必要配置。例如：

```ini
[Service]
WorkingDirectory=/opt/order-api
Environment=APP_MODE=production
EnvironmentFile=/etc/order-api/runtime.env
```

`runtime.env` 可以写 `APP_REGION=cn` 等赋值，但不是 shell 脚本，不应依赖 `$OTHER` 的 shell 式展开。unit 修改后需 `daemon-reload` 再按发布流程重启服务；仅更改环境文件通常也需要重新启动进程才被读取，`daemon-reload` 本身不会替换运行中进程的环境。配置语法、完整服务示例及业务就绪检查见 [systemd](../process/systemd.md)。

环境变量可能进入子进程、调试输出和崩溃报告。不要在正文日志、截图或命令历史中输出整份 `env`；只读取所需的非敏感键，凭据优先用服务支持的受控文件或秘密管理机制。alias 是 shell 命令解析功能，不是环境变量，非交互 Bash 默认也不展开别名，不能用终端里的 alias 证明服务启动命令正确。

## 验证回到实际启动方式

先记录失败进程的用户、工作目录、shell/解释器与程序路径，再对照对应启动文件、unit、容器或定时任务配置。修复后重新用同一种启动方式执行，验证程序版本、必要配置和同一个订单请求。当前终端 `echo` 出了正确值，只证明当前终端的变量正确。
