# vfox：跨平台工具版本管理

vfox 通过插件安装和选择 Node.js、Python、Java 等工具。它管理的是命令路径和 SDK 安装目录，不会把某个 Python 环境的依赖包、Node 项目的依赖锁文件或 IDE 配置一并统一。版本一致之后，还要由项目自己的包管理器完成依赖安装。

本文按 vfox 1.0.11 的命令与项目文件组织，核对日期为 2026-10-20。旧版本的配置文件可能不同，迁移时先执行 `vfox --version` 和子命令 `--help`，不要混用不同代的配置。

![vfox 的选择优先级与项目共享边界](/tools/vfox-selection-scope.svg)

## 安装并连接 shell

macOS 或支持 Homebrew 的 Linux 可执行：

```bash
brew install vfox
vfox --version
```

Windows 可使用 Scoop 的 `scoop install vfox`。安装后还需要按 shell 激活；下面两行分别用于 Bash 和 Zsh，只选择当前 shell 对应的一行：

```bash
eval "$(vfox activate bash)"
```

```zsh
eval "$(vfox activate zsh)"
```

把所选行加入对应的 `~/.bashrc` 或 `~/.zshrc` 才会在以后启动时加载，不重复追加。PowerShell 的激活方式为 `Invoke-Expression "$(vfox activate pwsh)"`，需要持久化时放入自身的 PowerShell profile。不要用不存在的 `vfox setup` 代替激活，也不要用 `vfox env` 的输出当作任意 shell 的激活脚本。

## 安装与项目固定

以订单管理前端为例：团队需要一个确定的 Node.js 版本，临时验证新版本时又不能改掉同事的项目配置。

```bash
vfox available
vfox add nodejs
vfox search nodejs
vfox list nodejs
```

`available` 查看可用插件，`add` 安装插件，`search nodejs` 查远程版本，`list nodejs` 查已安装版本。插件会参与下载、解压与环境配置，选择前检查其来源及支持的平台。`latest` 是会变化的标识，生产项目使用确认过的精确版本。

以下为语法模板，`<精确版本>` 需要替换为查询到且项目验证过的版本：

```text
vfox install nodejs@<精确版本>
vfox use -p nodejs@<精确版本>
```

在项目根目录执行 `use -p` 后检查 `.vfox.toml`，其结构如下；这里的版本仅演示文件格式：

```toml
[tools]
nodejs = "22.14.0"
```

提交 `.vfox.toml`，忽略本机生成的 `.vfox/` 目录。1.x 的项目作用域会在 `.vfox/sdks/` 建立 SDK 链接；该目录含本机路径，不能当作团队共享工具包。`--unlink` 会放弃项目链接、降为会话使用，配置仍被记录，不能把它视为完全相同的项目行为。

新机器已安装并激活 vfox 后，在项目根目录安装声明的工具，再检查实际命令：

```bash
vfox install --all
vfox current
node --version
npm --version
```

还要执行项目自己的依赖安装与测试，例如有 `package-lock.json` 的 npm 项目运行 `npm ci` 和既有测试命令。Node 一致不等于依赖一致；不能只检查 `vfox current` 就宣称构建可复现。

## 明确作用范围

| 选择 | 显式命令选项 | 适用场景 |
| --- | --- | --- |
| 项目 | `vfox use -p` | 团队仓库声明版本，优先于会话和全局 |
| 当前会话 | `vfox use -s` | 一个终端临时验证，关闭后结束 |
| 用户全局 | `vfox use -g` | 没有更具体选择时的用户默认值 |
| 系统 PATH | 未被以上选择覆盖 | 系统或其他包管理器提供的工具 |

Unix-like 默认 `use` 是会话级，Windows 默认行为不同，应显式写 `-p`、`-s` 或 `-g`，避免脚本靠平台隐含行为。项目优先于会话，所以在已有项目配置的目录里用 `-s`，不代表一定覆盖了项目版本。临时验证可在独立工作目录进行，并同时确认路径和版本。

```bash
vfox current
command -v node
node --version
```

Windows 用 `Get-Command node` 检查命令来源。激活 shell、版本选择和 PATH 中最终命中的程序是三层证据；IDE、服务进程和 CI 也需要自己的初始化。CI 的每个新 shell 不自动继承上一步中 `eval` 改过的环境，应在运行项目命令的同一步完成激活和版本验证。

## 管理、更新与排错

`vfox update nodejs` 更新插件，`vfox upgrade` 更新 vfox 本身，SDK 升级则是安装并选择另一个精确版本。三者分别影响不同对象。`vfox uninstall nodejs@<版本>` 移除 SDK，`vfox remove nodejs` 移除插件；执行前检查项目文件和仍在使用该安装路径的进程。

`vfox config --list` 显示管理器配置，但输出可能含本地路径或代理信息，分享前检查内容。镜像和环境能力取决于具体插件，不能套用通用的 `registry.mirror`、`~/.vfox/hooks` 或插件 YAML 配置。先读 `vfox info nodejs` 和插件支持的配置，再修改。

版本未切换时先核对 shell 激活、项目优先级和实际路径；下载失败时保留具体 URL、状态码和插件版本，检查网络与可用发行包。不要用递归 `chmod 755` 修复整个工具目录，它可能把文件全部变成可执行并改变原有权限。若另一管理器在 shell 初始化的后半段重写 PATH，应明确同一语言的归属；JVM 为主的项目也可使用 [SDKMAN!](../sdkman/index.md)。
