# Linux 常用命令概览

## 概述

Linux命令行是Linux系统的核心组成部分，提供了强大而灵活的系统管理和操作能力。通过命令行，用户可以高效地完成文件管理、系统监控、网络配置、进程控制等各种任务。

本文档系列详细介绍了Linux系统中最常用的命令，按功能分类组织，便于学习和查阅。

## 命令分类导航

### 文件和目录操作
- **[文件基础操作](./file-basic.md)** - ls, cd, pwd, mkdir, rmdir, rm, cp, mv
- **[文件查看和编辑](./file-view-edit.md)** - cat, less, more, head, tail, vi/vim, nano
- **[文件权限和属性](./file-permissions.md)** - chmod, chown, chgrp, umask, stat
- **[文件查找和定位](./file-search.md)** - find, locate, which, whereis

### 文本处理
- **[文本查看和处理](./text-processing.md)** - grep, sed, awk, sort, uniq, cut, tr
- **[文本比较和合并](./text-compare.md)** - diff, comm, join, paste

### 系统信息和监控
- **[系统信息查看](./system-info.md)** - ps, top, htop, free, df, du, uname, uptime
- **[进程管理](./process-management.md)** - kill, killall, jobs, bg, fg, nohup
- **[系统监控](./system-monitoring.md)** - iostat, vmstat, sar, netstat, ss

### 网络操作
- **[网络基础命令](./network-basic.md)** - ping, wget, curl, ssh, scp, rsync
- **[网络配置和诊断](./network-config.md)** - ifconfig, ip, route, iptables, tcpdump

### 压缩和归档
- **[压缩和解压](./archive-compress.md)** - tar, gzip, gunzip, zip, unzip, 7z

### 软件包管理
- **[包管理系统](./package.md)** - apt, yum, dnf, pacman, zypper
- **[包格式处理](./package-format.md)** - dpkg, rpm

### 环境和配置
- **[环境变量和配置](./environment.md)** - export, env, set, alias, history, source
- **[用户和权限管理](./user-management.md)** - su, sudo, passwd, id, groups

## Linux命令基础知识

### 命令结构

Linux命令的基本结构如下：
```bash
命令名 [选项] [参数]
```

**示例：**
```bash
ls -la /home/user
│  │   │
│  │   └── 参数（目标目录）
│  └── 选项（长格式显示，包含隐藏文件）
└── 命令名
```

### 选项格式

#### 短选项
- 以单个连字符开头：`-l`, `-a`, `-h`
- 可以组合使用：`-la` 等同于 `-l -a`

#### 长选项
- 以双连字符开头：`--help`, `--version`, `--recursive`
- 更具描述性，易于理解

### 通用选项

几乎所有Linux命令都支持的选项：
- `--help` 或 `-h`：显示帮助信息
- `--version` 或 `-V`：显示版本信息
- `--verbose` 或 `-v`：详细输出模式
- `--quiet` 或 `-q`：静默模式

### 特殊字符和通配符

#### 通配符
- `*`：匹配任意长度的任意字符
- `?`：匹配单个字符
- `[abc]`：匹配方括号中的任意一个字符
- `[a-z]`：匹配指定范围内的字符
- `{a,b,c}`：匹配大括号中的任意一个字符串

#### 重定向和管道
- `>`：输出重定向（覆盖）
- `>>`：输出重定向（追加）
- `<`：输入重定向
- `|`：管道，将前一个命令的输出作为后一个命令的输入
- `&&`：逻辑与，前一个命令成功执行后才执行后一个命令
- `||`：逻辑或，前一个命令失败后才执行后一个命令

### 命令执行环境

#### 路径
- **绝对路径**：从根目录开始的完整路径，如 `/home/user/file.txt`
- **相对路径**：相对于当前目录的路径，如 `./file.txt` 或 `../parent/file.txt`
- **特殊目录符号**：
  - `.`：当前目录
  - `..`：父目录
  - `~`：用户主目录
  - `-`：上一个工作目录

#### 环境变量
- `$PATH`：可执行文件搜索路径
- `$HOME`：用户主目录
- `$USER`：当前用户名
- `$PWD`：当前工作目录
- `$SHELL`：当前使用的Shell

## 命令学习方法

### 1. 查看帮助文档
```bash
# 查看命令简要帮助
command --help

# 查看详细手册页
man command

# 查看命令信息
info command

# 查看命令类型和位置
type command
which command
```

### 2. 实践练习
- 在安全的测试环境中练习
- 从简单命令开始，逐步学习复杂用法
- 结合实际工作场景练习

### 3. 命令组合
- 学会使用管道组合多个命令
- 掌握重定向的使用
- 了解命令替换和变量使用

### 4. 安全注意事项
- 谨慎使用具有破坏性的命令（如 `rm`, `dd`）
- 在生产环境中操作前先在测试环境验证
- 重要操作前做好备份
- 理解命令的作用范围和影响

## 常用命令速查

### 文件操作
```bash
# 列出文件
ls -la                    # 详细列出所有文件
ls -lh                    # 人性化显示文件大小

# 目录操作
cd /path/to/directory     # 切换目录
pwd                       # 显示当前目录
mkdir -p dir1/dir2        # 递归创建目录

# 文件复制移动
cp file1 file2            # 复制文件
cp -r dir1 dir2           # 递归复制目录
mv file1 file2            # 移动/重命名文件

# 文件删除
rm file                   # 删除文件
rm -rf directory          # 强制递归删除目录
```

### 文本处理
```bash
# 文件查看
cat file                  # 显示文件内容
less file                 # 分页查看文件
head -n 10 file           # 显示前10行
tail -f file              # 实时查看文件末尾

# 文本搜索
grep "pattern" file       # 搜索文本模式
grep -r "pattern" dir     # 递归搜索目录
find /path -name "*.txt"  # 按名称查找文件
```

### 系统监控
```bash
# 进程管理
ps aux                    # 显示所有进程
top                       # 实时显示进程
kill PID                  # 终止进程

# 系统信息
df -h                     # 显示磁盘使用情况
free -h                   # 显示内存使用情况
uname -a                  # 显示系统信息
```

### 网络操作
```bash
# 网络连接
ping host                 # 测试网络连通性
wget URL                  # 下载文件
curl URL                  # 发送HTTP请求
ssh user@host             # SSH远程连接
```

## 进阶技巧

### 命令历史
```bash
history                   # 查看命令历史
!n                        # 执行历史中第n条命令
!!                        # 执行上一条命令
!string                   # 执行最近以string开头的命令
Ctrl+R                    # 反向搜索命令历史
```

### 快捷键
- `Ctrl+C`：中断当前命令
- `Ctrl+Z`：暂停当前命令
- `Ctrl+D`：退出当前Shell或发送EOF
- `Ctrl+L`：清屏
- `Tab`：自动补全
- `Ctrl+A`：光标移到行首
- `Ctrl+E`：光标移到行尾
- `Ctrl+U`：删除光标前的内容
- `Ctrl+K`：删除光标后的内容

### 别名和函数
```bash
# 创建别名
alias ll='ls -la'
alias grep='grep --color=auto'

# 查看所有别名
alias

# 创建函数
function mkcd() {
    mkdir -p "$1" && cd "$1"
}
```

## 学习资源

### 在线资源
- Linux命令手册：`man command`
- 在线Linux命令查询：[explainshell.com](https://explainshell.com/)
- Linux命令大全：各种Linux发行版官方文档

### 实践环境
- 本地虚拟机（VirtualBox、VMware）
- 云服务器（AWS、阿里云、腾讯云）
- 容器环境（Docker）
- 在线Linux环境

### 学习建议
1. **循序渐进**：从基础命令开始，逐步学习高级用法
2. **多加练习**：理论结合实践，在实际环境中练习
3. **查阅文档**：遇到问题时主动查阅man手册和帮助文档
4. **总结归纳**：定期总结常用命令和技巧
5. **关注安全**：了解命令的潜在风险，谨慎操作

## 总结

Linux命令行是一个强大的工具集，掌握这些命令可以大大提高工作效率。本文档系列按功能分类详细介绍了各种常用命令，每个分类都有独立的文档进行深入讲解。

建议读者：
1. 先通读本概览文档，了解整体结构
2. 根据需要选择相应的分类文档深入学习
3. 在实际环境中练习和应用
4. 定期回顾和总结，形成自己的命令使用习惯

记住，熟练掌握Linux命令需要时间和实践，不要急于求成，循序渐进地学习和应用是最好的方法。