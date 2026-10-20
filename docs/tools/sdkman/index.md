# SDKMAN!：JVM 工具版本与项目环境

SDKMAN! 管理 Java、Maven、Gradle、Kotlin 等 JVM 生态工具，在 macOS、Linux 和 Windows 的 WSL 中使用。它把多个版本安装在用户目录，再为当前 shell 选择工具路径。它不会自动更换已经运行的 IDE、Gradle Daemon 或服务器 Java 进程。

例如订单服务仍以 JDK 17 构建，旁边的报表服务已迁移到 JDK 21。两者可以共用一台开发机，各自提交 `.sdkmanrc`，进入项目后切换并验证，而不用反复卸载系统 Java。

![SDKMAN 的版本选择与生效范围](/tools/sdkman-environment-scope.svg)

## 安装与初始化

安装脚本会写入用户目录并提示修改 shell 初始化。先检查现有安装，避免把多个版本管理器重复插入 `PATH`；以下是官方安装入口，会下载并执行安装脚本：

```bash
curl -sSf https://get.sdkman.io | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk version
```

默认根目录是 `$HOME/.sdkman`，初始化脚本位于 `bin/sdkman-init.sh`，已安装工具位于 `candidates/`。自定义过 `SDKMAN_DIR` 的机器以实际目录为准。`sdk` 是初始化后提供的 shell 命令；二进制文件已经下载，不代表每个新 shell 都完成了初始化。

## 选择精确版本

`java` 是 candidate，`17.0.12-tem` 这类带发行版的完整字符串是版本标识。不要把 `17.0.x-tem` 当作可安装版本；`x` 不是通配符。先列出候选版本，再使用项目确认的完整标识。

```bash
sdk list java
sdk list maven
sdk current java
```

下面的语法模板中，`<版本标识>` 需要替换为列表中存在的值，尖括号不能原样执行：

```text
sdk install java <版本标识>
sdk use java <版本标识>
sdk default java <版本标识>
sdk uninstall java <版本标识>
```

`use` 只切换当前 shell；`default` 设置后续 shell 的默认值。安装时也可能询问是否设为默认，不能把“安装完成”视为所有项目都已迁移。`sdk current java` 看管理器选择，`java -version` 看实际执行，两者必须一起核对。

## 用项目文件管理切换

在项目根目录、当前 Java 已选对之后执行：

```bash
sdk env init
```

它创建 `.sdkmanrc` 并写入当前版本。检查内容是否就是团队要求，再提交这个文件。下面只展示文件结构，其中示例版本需要按项目的安全更新基线选择：

```properties
java=17.0.12-tem
```

新同事检出仓库后的操作是：

```bash
sdk env install
sdk env
sdk current java
java -version
./gradlew --version
```

`env install` 安装缺少的版本，`env` 在当前 shell 激活文件中的选择。**默认不能假定进入目录就已切换。** 需要自动切换时，用 `sdk config` 编辑配置，将 `sdkman_auto_env=true` 写入 `~/.sdkman/etc/config`。开启后进入项目应用配置，离开后恢复默认；不开启时用 `sdk env clear` 显式恢复默认版本。

项目文件统一的是工具选择，构建可复现还依赖 Wrapper、依赖锁定、仓库内容与系统库。Gradle 项目优先运行 `./gradlew`，有 Maven Wrapper 时运行 `./mvnw`；无需为了匹配项目再全局安装另一个 Gradle。Java toolchain、Gradle Daemon criteria 或 IDE Gradle 设置也可能另选 JDK，具体关系见 [Android Studio 构建排错](../editor/andorid-studio/index.md)。

## 故障与维护

| 现象 | 检查与处理 | 验收 |
| --- | --- | --- |
| 找不到 `sdk` | 当前 shell 是否加载初始化脚本；不要只检查 `PATH` | 新终端能执行 `sdk version` |
| `current` 正确但 Java 不对 | `command -v java`、`JAVA_HOME`，检查其他管理器是否后改 PATH | `java -version` 与预期一致 |
| CLI 正确但 IDE 构建失败 | 检查 IDE Gradle JVM、Daemon criteria 与 toolchain | IDE 和 CLI 都通过同一任务 |
| 安装下载失败 | 记录 HTTP/TLS 错误、代理与磁盘空间；不关闭证书验证 | 下载完整且工具能启动 |
| 切换影响其他项目 | 区分 `use`、`default` 和 auto-env | 两个新 shell 分别验证项目 |

`sdk update` 更新候选元数据，`sdk selfupdate` 更新管理器，`sdk upgrade` 检查和升级已安装工具，三者作用不同。升级工具后要跑项目验证，再修改 `.sdkmanrc`，不能由新版本可下载推断项目兼容。SDKMAN! 相关缓存问题优先使用 `sdk flush`，不直接删除其内部工作目录。

卸载单个已不使用的 SDK 用 `sdk uninstall`，先确认没有项目或 IDE 依赖它。完整移除前备份配置、核实安装目录与 SDK 归属，再移除安装目录和 shell 初始化行；不能把无差别删除用户目录当作日常排错步骤。Windows 原生多语言管理可查看 [vfox](../vfox/index.md)，同一语言尽量指定一个管理器负责路径，避免彼此覆盖。
