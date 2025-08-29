# Linux 环境变量和配置

## 概述

环境变量是 Linux 系统中用于配置用户环境和系统行为的重要机制。通过环境变量可以影响 shell、应用程序和系统服务的运行方式。常见的环境变量有 PATH、HOME、LANG 等。

## 常用环境变量

- `PATH`：可执行文件搜索路径
- `HOME`：当前用户主目录
- `SHELL`：当前 shell 类型
- `USER`：当前用户名
- `LANG`：系统语言和编码
- `PWD`：当前工作目录
- `EDITOR`：默认文本编辑器

## 环境变量管理命令

### env - 查看环境变量
```bash
env
# 查看特定变量
echo $PATH
echo $HOME
```

### export - 设置环境变量
```bash
# 设置临时变量（仅当前 shell 有效）
export VAR=value

# 设置并追加到 PATH
export PATH=$PATH:/opt/bin

# 永久生效（写入配置文件）
echo 'export PATH=$PATH:/opt/bin' >> ~/.bashrc
```

### set - 查看和设置 shell 变量
```bash
# 查看所有 shell 变量
set

# 设置 shell 局部变量
VAR=value

# 导出为环境变量
export VAR
```

### unset - 删除变量
```bash
unset VAR
```

### printenv - 打印环境变量
```bash
printenv
printenv PATH
```

## 配置文件

### 全局配置
- `/etc/profile`：所有用户的全局环境变量
- `/etc/environment`：系统环境变量
- `/etc/bash.bashrc`：全局 bash shell 配置

### 用户级配置
- `~/.bashrc`：交互式 shell 启动时读取
- `~/.bash_profile`：登录 shell 启动时读取
- `~/.profile`：登录 shell 启动时读取
- `~/.zshrc`：zsh shell 配置

### 修改配置示例
```bash
# 编辑 .bashrc
nano ~/.bashrc

# 添加自定义变量
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
export PATH=$PATH:$JAVA_HOME/bin

# 使配置生效
source ~/.bashrc
```

## alias - 命令别名
```bash
# 创建别名
alias ll='ls -alF'
alias gs='git status'

# 临时生效，关闭 shell 失效
# 永久生效需写入 ~/.bashrc 或 ~/.zshrc

echo "alias ll='ls -alF'" >> ~/.bashrc
source ~/.bashrc
```

## history - 命令历史
```bash
# 查看历史命令
history

# 执行历史命令
!100  # 执行第 100 条命令

# 清空历史
history -c

# 设置历史条数
export HISTSIZE=1000
```

## source - 使配置生效
```bash
# 立即生效配置文件
source ~/.bashrc
source /etc/profile
```

## shell 启动流程
1. 登录 shell 读取 `/etc/profile` → `~/.bash_profile` → `~/.bashrc`
2. 非登录 shell 读取 `~/.bashrc`
3. zsh 读取 `~/.zshrc`

## 常见问题
- 修改变量未生效：需执行 `source ~/.bashrc` 或重新登录
- PATH 配置错误：命令找不到，需检查拼写和顺序
- 变量作用域：局部变量仅当前 shell 有效，export 后全局有效

## 最佳实践
1. 只在需要时修改全局配置，优先用用户级配置
2. 重要变量如 PATH、JAVA_HOME 建议写入配置文件
3. 使用 alias 提高命令效率
4. 定期备份配置文件
