# 权限管理命令

## 概述

Linux是一个多用户、多任务的操作系统，权限管理是其核心安全机制。通过权限管理命令，可以控制用户对文件、目录和系统资源的访问权限，确保系统安全和数据保护。本文档详细介绍Linux中的权限管理相关命令。

## Linux权限基础

### 权限类型

Linux中有三种基本权限：
- **读权限（r）**：可以查看文件内容或列出目录内容
- **写权限（w）**：可以修改文件内容或在目录中创建/删除文件
- **执行权限（x）**：可以执行文件或进入目录

### 权限对象

权限分为三个级别：
- **所有者（u）**：文件的创建者
- **所属组（g）**：文件所属的用户组
- **其他用户（o）**：系统中的其他用户

### 权限表示方法

#### 1. 符号表示法
```
-rwxrw-r--
│││││││││
│││││││└└── 其他用户权限（r--）：只读
│││││└└──── 所属组权限（rw-）：读写
│││└└────── 所有者权限（rwx）：读写执行
└────────── 文件类型（-：普通文件）
```

#### 2. 数字表示法
- **4**：读权限（r）
- **2**：写权限（w）
- **1**：执行权限（x）

常见权限组合：
- **7**（4+2+1）：rwx（读写执行）
- **6**（4+2）：rw-（读写）
- **5**（4+1）：r-x（读执行）
- **4**：r--（只读）
- **0**：---（无权限）

常见权限设置：
- **755**：rwxr-xr-x（所有者全权限，组和其他用户读执行）
- **644**：rw-r--r--（所有者读写，组和其他用户只读）
- **600**：rw-------（只有所有者可读写）
- **777**：rwxrwxrwx（所有人全权限，不安全）

## 权限查看命令

### ls -l - 查看文件权限

**功能**：以长格式显示文件详细信息，包括权限。

```bash
# 查看当前目录文件权限
ls -l
# 输出示例：
# -rw-r--r-- 1 user group 1024 Jan 15 10:30 file.txt
# drwxr-xr-x 2 user group 4096 Jan 15 10:25 directory
# -rwxr-xr-x 1 user group 2048 Jan 15 10:20 script.sh

# 查看特定文件权限
ls -l file.txt

# 查看目录本身的权限（不是内容）
ls -ld directory

# 查看隐藏文件权限
ls -la

# 以数字形式显示权限（需要stat命令）
stat -c "%a %n" file.txt
# 输出：644 file.txt
```

**输出格式解释**：
```
-rw-r--r-- 1 user group 1024 Jan 15 10:30 file.txt
│││││││││ │ │    │     │    │           │
│││││││││ │ │    │     │    │           └── 文件名
│││││││││ │ │    │     │    └── 修改时间
│││││││││ │ │    │     └── 文件大小
│││││││││ │ │    └── 所属组
│││││││││ │ └── 所有者
│││││││││ └── 硬链接数
└┴┴┴┴┴┴┴┴── 权限信息
```

文件类型标识：
- `-`：普通文件
- `d`：目录
- `l`：符号链接
- `c`：字符设备
- `b`：块设备
- `p`：命名管道
- `s`：套接字

### stat - 详细文件信息

**功能**：显示文件或目录的详细状态信息。

**语法**：
```bash
stat [选项] 文件
```

**常用选项**：
- `-c 格式`：自定义输出格式
- `-f`：显示文件系统状态
- `-L`：跟随符号链接
- `-t`：简洁格式输出

**示例**：
```bash
# 显示文件详细信息
stat file.txt
# 输出：
#   File: file.txt
#   Size: 1024        Blocks: 8          IO Block: 4096   regular file
# Device: 801h/2049d  Inode: 123456      Links: 1
# Access: (0644/-rw-r--r--)  Uid: (1000/   user)   Gid: (1000/  group)
# Access: 2024-01-15 10:30:00.000000000 +0800
# Modify: 2024-01-15 10:30:00.000000000 +0800
# Change: 2024-01-15 10:30:00.000000000 +0800

# 只显示权限（八进制）
stat -c "%a" file.txt
# 输出：644

# 只显示权限（符号）
stat -c "%A" file.txt
# 输出：-rw-r--r--

# 显示所有者和组
stat -c "%U %G" file.txt
# 输出：user group

# 自定义格式
stat -c "File: %n, Permissions: %a, Owner: %U:%G" file.txt
# 输出：File: file.txt, Permissions: 644, Owner: user:group
```

## 权限修改命令

### chmod - 修改文件权限

**功能**：修改文件或目录的访问权限。

**语法**：
```bash
chmod [选项] 权限 文件...
```

**常用选项**：
- `-R`：递归修改目录及其内容
- `-v`：显示修改过程
- `-c`：只显示实际修改的文件
- `--reference=参考文件`：使用参考文件的权限

#### 数字模式

**示例**：
```bash
# 设置文件权限为644（rw-r--r--）
chmod 644 file.txt

# 设置脚本为可执行（755）
chmod 755 script.sh

# 设置私有文件（600）
chmod 600 private.txt

# 递归修改目录权限
chmod -R 755 /path/to/directory

# 显示修改过程
chmod -v 644 file.txt
# 输出：mode of 'file.txt' changed from 0755 (rwxr-xr-x) to 0644 (rw-r--r--)

# 批量修改
chmod 644 *.txt
chmod 755 *.sh

# 使用参考文件的权限
chmod --reference=reference_file target_file
```

#### 符号模式

**语法**：`chmod [ugoa][+-=][rwx] 文件`

- **用户类别**：
  - `u`：所有者
  - `g`：所属组
  - `o`：其他用户
  - `a`：所有用户（默认）

- **操作符**：
  - `+`：添加权限
  - `-`：移除权限
  - `=`：设置权限（覆盖原权限）

**示例**：
```bash
# 给所有者添加执行权限
chmod u+x script.sh

# 给所属组添加写权限
chmod g+w file.txt

# 移除其他用户的所有权限
chmod o-rwx private.txt

# 给所有用户添加执行权限
chmod a+x script.sh
chmod +x script.sh  # 简写

# 设置所有者权限为读写，其他人无权限
chmod u=rw,go= file.txt

# 复杂权限设置
chmod u=rwx,g=rx,o=r file.txt  # 等同于 chmod 754

# 组合操作
chmod u+x,g-w,o+r file.txt

# 递归修改
chmod -R u+w,go-w /path/to/directory
```

#### 特殊权限

Linux还有三种特殊权限：

1. **SUID（Set User ID）**：4000
   - 文件执行时以文件所有者身份运行
   - 显示为：`-rwsr-xr-x`

2. **SGID（Set Group ID）**：2000
   - 文件执行时以文件所属组身份运行
   - 目录中新建文件继承目录的组
   - 显示为：`-rwxr-sr-x`

3. **Sticky Bit**：1000
   - 目录中的文件只能被所有者删除
   - 显示为：`drwxrwxrwt`

**示例**：
```bash
# 设置SUID
chmod 4755 /usr/bin/passwd
chmod u+s /usr/bin/passwd

# 设置SGID
chmod 2755 /shared/directory
chmod g+s /shared/directory

# 设置Sticky Bit
chmod 1777 /tmp
chmod +t /tmp

# 组合特殊权限
chmod 6755 file  # SUID + SGID
chmod 7777 file  # 所有特殊权限 + 全权限（极不安全）
```

### chown - 修改文件所有者

**功能**：修改文件或目录的所有者和所属组。

**语法**：
```bash
chown [选项] [所有者][:组] 文件...
```

**常用选项**：
- `-R`：递归修改
- `-v`：显示修改过程
- `-c`：只显示实际修改的文件
- `--reference=参考文件`：使用参考文件的所有者
- `--from=当前所有者`：只有当前所有者匹配时才修改

**示例**：
```bash
# 修改文件所有者
chown user file.txt

# 修改文件所有者和组
chown user:group file.txt
chown user.group file.txt  # 另一种写法

# 只修改组（保持所有者不变）
chown :group file.txt

# 递归修改目录
chown -R user:group /path/to/directory

# 显示修改过程
chown -v user:group file.txt
# 输出：changed ownership of 'file.txt' from olduser:oldgroup to user:group

# 批量修改
chown user:group *.txt

# 使用参考文件
chown --reference=reference_file target_file

# 条件修改（只有当前所有者是olduser时才修改）
chown --from=olduser user:group file.txt

# 修改符号链接本身（而不是目标文件）
chown -h user:group symlink

# 实用示例
# 修改Web目录所有者为www-data
sudo chown -R www-data:www-data /var/www/html

# 修改用户主目录所有者
sudo chown -R user:user /home/user
```

### chgrp - 修改文件所属组

**功能**：修改文件或目录的所属组。

**语法**：
```bash
chgrp [选项] 组 文件...
```

**常用选项**：
- `-R`：递归修改
- `-v`：显示修改过程
- `-c`：只显示实际修改的文件
- `--reference=参考文件`：使用参考文件的组

**示例**：
```bash
# 修改文件所属组
chgrp group file.txt

# 递归修改目录
chgrp -R group /path/to/directory

# 显示修改过程
chgrp -v group file.txt
# 输出：changed group of 'file.txt' from oldgroup to group

# 批量修改
chgrp group *.txt

# 使用参考文件
chgrp --reference=reference_file target_file

# 实用示例
# 修改项目目录组为developers
sudo chgrp -R developers /opt/project
```

## 用户和组管理命令

### id - 显示用户和组ID

**功能**：显示用户的UID、GID和所属组信息。

**语法**：
```bash
id [选项] [用户名]
```

**常用选项**：
- `-u`：只显示UID
- `-g`：只显示主要GID
- `-G`：显示所有GID
- `-n`：显示名称而不是数字
- `-r`：显示实际ID而不是有效ID

**示例**：
```bash
# 显示当前用户信息
id
# 输出：uid=1000(user) gid=1000(user) groups=1000(user),4(adm),24(cdrom),27(sudo)

# 显示特定用户信息
id username

# 只显示UID
id -u
# 输出：1000

# 只显示用户名
id -un
# 输出：user

# 只显示主要组ID
id -g
# 输出：1000

# 只显示主要组名
id -gn
# 输出：user

# 显示所有组ID
id -G
# 输出：1000 4 24 27

# 显示所有组名
id -Gn
# 输出：user adm cdrom sudo

# 实用示例
# 检查用户是否在sudo组中
id -Gn | grep -q sudo && echo "User has sudo access" || echo "No sudo access"

# 获取用户的数字ID
USER_ID=$(id -u username)
echo "User ID: $USER_ID"
```

### groups - 显示用户所属组

**功能**：显示用户所属的所有组。

**语法**：
```bash
groups [用户名...]
```

**示例**：
```bash
# 显示当前用户所属组
groups
# 输出：user adm cdrom sudo

# 显示特定用户所属组
groups username
# 输出：username : username developers admin

# 显示多个用户所属组
groups user1 user2
```

### su - 切换用户

**功能**：切换到其他用户身份。

**语法**：
```bash
su [选项] [用户名]
```

**常用选项**：
- `-`或`-l`：完全切换用户环境
- `-c 命令`：以指定用户身份执行命令
- `-s shell`：指定shell
- `-m`：保持当前环境

**示例**：
```bash
# 切换到root用户
su
su root

# 完全切换到用户环境
su - username
su -l username

# 以其他用户身份执行命令
su -c "ls /root" root
su - username -c "whoami"

# 切换用户但保持当前目录
su -m username

# 指定shell
su -s /bin/bash username

# 实用示例
# 临时获取root权限执行命令
su -c "systemctl restart apache2" root

# 切换到服务用户
su - www-data
```

### sudo - 以其他用户身份执行命令

**功能**：以其他用户（通常是root）身份执行命令。

**语法**：
```bash
sudo [选项] 命令
```

**常用选项**：
- `-u 用户`：以指定用户身份执行
- `-g 组`：以指定组身份执行
- `-i`：模拟登录shell
- `-s`：运行shell
- `-l`：列出允许的命令
- `-v`：验证并更新时间戳
- `-k`：清除时间戳

**示例**：
```bash
# 以root身份执行命令
sudo ls /root
sudo systemctl restart apache2

# 以指定用户身份执行
sudo -u www-data ls /var/www
sudo -u postgres psql

# 以指定组身份执行
sudo -g admin ls /admin

# 获取root shell
sudo -i
sudo -s

# 列出允许的命令
sudo -l
# 输出：
# User user may run the following commands on hostname:
#     (ALL : ALL) ALL

# 验证sudo权限
sudo -v

# 清除sudo时间戳（下次需要重新输入密码）
sudo -k

# 编辑文件（安全方式）
sudo visudo  # 编辑sudoers文件
sudo -e /etc/hosts  # 使用EDITOR环境变量指定的编辑器

# 实用示例
# 安装软件包
sudo apt update && sudo apt install package

# 修改系统配置
sudo nano /etc/hosts

# 重启服务
sudo systemctl restart nginx

# 查看系统日志
sudo tail -f /var/log/syslog
```

## 高级权限管理

### umask - 默认权限掩码

**功能**：设置新建文件和目录的默认权限。

**语法**：
```bash
umask [权限掩码]
```

**工作原理**：
- 文件默认权限：666（rw-rw-rw-）
- 目录默认权限：777（rwxrwxrwx）
- 实际权限 = 默认权限 - umask值

**示例**：
```bash
# 查看当前umask
umask
# 输出：0022

# 以符号形式显示
umask -S
# 输出：u=rwx,g=rx,o=rx

# 设置umask
umask 022  # 新文件权限644，新目录权限755
umask 077  # 新文件权限600，新目录权限700
umask 002  # 新文件权限664，新目录权限775

# 测试umask效果
umask 022
touch test_file
mkdir test_dir
ls -l test_file test_dir
# 输出：
# -rw-r--r-- 1 user group 0 Jan 15 10:30 test_file
# drwxr-xr-x 2 user group 4096 Jan 15 10:30 test_dir

# 临时修改umask
(
    umask 077
    touch private_file
    ls -l private_file
    # 输出：-rw------- 1 user group 0 Jan 15 10:30 private_file
)

# 在脚本中设置umask
#!/bin/bash
umask 022
# 脚本内容...
```

**常用umask值**：
- **022**：文件644，目录755（常用默认值）
- **002**：文件664，目录775（组可写）
- **077**：文件600，目录700（只有所有者可访问）
- **000**：文件666，目录777（所有人可写，不安全）

### getfacl/setfacl - 访问控制列表

**功能**：管理文件的访问控制列表（ACL），提供比传统权限更细粒度的控制。

#### getfacl - 查看ACL

**语法**：
```bash
getfacl [选项] 文件...
```

**示例**：
```bash
# 查看文件ACL
getfacl file.txt
# 输出：
# # file: file.txt
# # owner: user
# # group: group
# user::rw-
# group::r--
# other::r--

# 查看目录ACL
getfacl directory/

# 递归查看
getfacl -R directory/

# 只显示ACL条目（不显示注释）
getfacl --omit-header file.txt
```

#### setfacl - 设置ACL

**语法**：
```bash
setfacl [选项] ACL规则 文件...
```

**常用选项**：
- `-m`：修改ACL
- `-x`：删除ACL条目
- `-b`：删除所有扩展ACL
- `-k`：删除默认ACL
- `-R`：递归操作
- `-d`：设置默认ACL

**示例**：
```bash
# 给特定用户添加权限
setfacl -m u:username:rwx file.txt

# 给特定组添加权限
setfacl -m g:groupname:rw file.txt

# 设置其他用户权限
setfacl -m o::r file.txt

# 设置掩码
setfacl -m m::rw file.txt

# 删除特定用户的ACL
setfacl -x u:username file.txt

# 删除所有扩展ACL
setfacl -b file.txt

# 设置默认ACL（对目录）
setfacl -d -m u:username:rwx directory/
setfacl -d -m g:groupname:rw directory/

# 递归设置ACL
setfacl -R -m u:username:rwx directory/

# 复制ACL
getfacl file1.txt | setfacl --set-file=- file2.txt

# 实用示例
# 允许特定用户访问私有目录
setfacl -m u:collaborator:rx /home/user/private

# 设置共享目录，新文件继承权限
setfacl -d -m u:user1:rwx /shared/project
setfacl -d -m u:user2:rw /shared/project
setfacl -d -m g:developers:rwx /shared/project
```

## 实用技巧和最佳实践

### 1. 权限诊断脚本

```bash
#!/bin/bash
# 权限诊断脚本

check_permissions() {
    local file="$1"
    
    echo "=== 权限诊断：$file ==="
    
    if [ ! -e "$file" ]; then
        echo "错误：文件不存在"
        return 1
    fi
    
    echo "基本信息："
    ls -l "$file"
    echo
    
    echo "详细权限："
    stat -c "权限：%a (%A)" "$file"
    stat -c "所有者：%U (UID: %u)" "$file"
    stat -c "所属组：%G (GID: %g)" "$file"
    echo
    
    echo "当前用户权限检查："
    if [ -r "$file" ]; then
        echo "✓ 可读"
    else
        echo "✗ 不可读"
    fi
    
    if [ -w "$file" ]; then
        echo "✓ 可写"
    else
        echo "✗ 不可写"
    fi
    
    if [ -x "$file" ]; then
        echo "✓ 可执行"
    else
        echo "✗ 不可执行"
    fi
    
    echo
    
    # 检查ACL（如果支持）
    if command -v getfacl >/dev/null 2>&1; then
        echo "ACL信息："
        getfacl "$file" 2>/dev/null || echo "无扩展ACL"
    fi
}

# 使用示例
check_permissions "$1"
```

### 2. 批量权限设置

```bash
#!/bin/bash
# 批量设置Web目录权限

set_web_permissions() {
    local web_root="$1"
    
    echo "设置Web目录权限：$web_root"
    
    # 设置目录权限为755
    find "$web_root" -type d -exec chmod 755 {} \;
    
    # 设置文件权限为644
    find "$web_root" -type f -exec chmod 644 {} \;
    
    # 设置脚本文件为可执行
    find "$web_root" -name "*.sh" -exec chmod 755 {} \;
    find "$web_root" -name "*.cgi" -exec chmod 755 {} \;
    
    # 设置特殊目录权限
    if [ -d "$web_root/uploads" ]; then
        chmod 777 "$web_root/uploads"
        echo "设置uploads目录为777"
    fi
    
    if [ -d "$web_root/cache" ]; then
        chmod 755 "$web_root/cache"
        chown -R www-data:www-data "$web_root/cache"
        echo "设置cache目录权限和所有者"
    fi
    
    echo "权限设置完成"
}

# 使用示例
set_web_permissions "/var/www/html"
```

### 3. 安全权限检查

```bash
#!/bin/bash
# 安全权限检查脚本

security_check() {
    echo "=== 系统安全权限检查 ==="
    
    echo "1. 检查世界可写文件："
    find / -type f -perm -002 2>/dev/null | head -10
    echo
    
    echo "2. 检查SUID文件："
    find / -type f -perm -4000 2>/dev/null | head -10
    echo
    
    echo "3. 检查SGID文件："
    find / -type f -perm -2000 2>/dev/null | head -10
    echo
    
    echo "4. 检查无所有者文件："
    find / -nouser -o -nogroup 2>/dev/null | head -10
    echo
    
    echo "5. 检查重要文件权限："
    important_files=(
        "/etc/passwd"
        "/etc/shadow"
        "/etc/sudoers"
        "/etc/ssh/sshd_config"
    )
    
    for file in "${important_files[@]}"; do
        if [ -e "$file" ]; then
            ls -l "$file"
        fi
    done
}

security_check
```

### 4. 权限备份和恢复

```bash
#!/bin/bash
# 权限备份和恢复

# 备份权限
backup_permissions() {
    local directory="$1"
    local backup_file="$2"
    
    echo "备份 $directory 的权限到 $backup_file"
    
    find "$directory" -printf "%m %u %g %p\n" > "$backup_file"
    
    # 如果支持ACL，也备份ACL
    if command -v getfacl >/dev/null 2>&1; then
        getfacl -R "$directory" > "${backup_file}.acl"
    fi
    
    echo "权限备份完成"
}

# 恢复权限
restore_permissions() {
    local backup_file="$1"
    
    echo "从 $backup_file 恢复权限"
    
    while IFS=' ' read -r mode user group path; do
        if [ -e "$path" ]; then
            chmod "$mode" "$path"
            chown "$user:$group" "$path"
        fi
    done < "$backup_file"
    
    # 恢复ACL
    if [ -f "${backup_file}.acl" ]; then
        setfacl --restore="${backup_file}.acl"
    fi
    
    echo "权限恢复完成"
}

# 使用示例
# backup_permissions "/home/user/project" "permissions_backup.txt"
# restore_permissions "permissions_backup.txt"
```

### 5. 权限模板应用

```bash
#!/bin/bash
# 权限模板

# Web应用权限模板
web_app_template() {
    local app_dir="$1"
    
    # 基本权限
    find "$app_dir" -type d -exec chmod 755 {} \;
    find "$app_dir" -type f -exec chmod 644 {} \;
    
    # 可执行文件
    find "$app_dir" -name "*.sh" -exec chmod 755 {} \;
    
    # 配置文件（只有所有者可读写）
    find "$app_dir" -name "*.conf" -exec chmod 600 {} \;
    find "$app_dir" -name "config.php" -exec chmod 600 {} \;
    
    # 日志目录
    if [ -d "$app_dir/logs" ]; then
        chmod 755 "$app_dir/logs"
        chmod 644 "$app_dir/logs"/*.log 2>/dev/null || true
    fi
    
    # 上传目录
    if [ -d "$app_dir/uploads" ]; then
        chmod 755 "$app_dir/uploads"
    fi
}

# 开发环境权限模板
dev_template() {
    local project_dir="$1"
    
    # 开发者组可读写
    chgrp -R developers "$project_dir"
    chmod -R g+w "$project_dir"
    
    # 设置默认ACL
    setfacl -d -m g:developers:rwx "$project_dir"
    setfacl -R -m g:developers:rwx "$project_dir"
}

# 安全模板（限制性权限）
secure_template() {
    local secure_dir="$1"
    
    # 只有所有者可访问
    chmod -R 700 "$secure_dir"
    
    # 移除组和其他用户权限
    chmod -R go-rwx "$secure_dir"
}
```

## 常见问题和解决方案

### 1. 权限被拒绝

**问题**：`Permission denied`错误

**诊断步骤**：
```bash
# 1. 检查文件权限
ls -l file

# 2. 检查当前用户
whoami
id

# 3. 检查文件所有者
stat -c "%U %G" file

# 4. 检查目录权限
ls -ld $(dirname file)

# 5. 检查完整路径权限
namei -l /path/to/file
```

**解决方案**：
```bash
# 修改文件权限
chmod 644 file  # 或适当的权限

# 修改所有者
sudo chown user:group file

# 修改目录权限
chmod 755 directory

# 使用sudo执行
sudo command
```

### 2. 无法修改权限

**问题**：`Operation not permitted`

**可能原因和解决方案**：
```bash
# 1. 检查是否为文件所有者或root
ls -l file
whoami

# 2. 检查文件系统是否只读
mount | grep $(df file | tail -1 | awk '{print $1}')

# 3. 检查文件属性（如不可变属性）
lsattr file
# 如果有i属性，移除它
sudo chattr -i file

# 4. 检查SELinux状态
getenforce
# 如果是Enforcing，可能需要调整SELinux策略

# 5. 使用sudo
sudo chmod 644 file
sudo chown user:group file
```

### 3. 脚本无法执行

**问题**：脚本文件无法执行

**解决方案**：
```bash
# 1. 添加执行权限
chmod +x script.sh

# 2. 检查shebang行
head -1 script.sh
# 应该是 #!/bin/bash 或类似

# 3. 检查脚本路径
which bash
# 确保shebang中的路径正确

# 4. 直接用解释器执行
bash script.sh

# 5. 检查目录执行权限
ls -ld $(dirname script.sh)
```

### 4. 目录无法访问

**问题**：无法进入目录

**解决方案**：
```bash
# 1. 检查目录权限
ls -ld directory

# 2. 目录需要执行权限才能进入
chmod +x directory

# 3. 检查父目录权限
namei -l /path/to/directory

# 4. 递归修复权限
find /path/to -type d -exec chmod 755 {} \;
```

### 5. 权限设置后仍无法访问

**问题**：设置了权限但仍然无法访问

**检查清单**：
```bash
# 1. 检查ACL
getfacl file

# 2. 检查SELinux上下文
ls -Z file

# 3. 检查文件系统挂载选项
mount | grep $(df file | tail -1 | awk '{print $1}')

# 4. 检查父目录权限链
namei -l /full/path/to/file

# 5. 检查用户组成员身份
groups
id -Gn

# 6. 重新登录以刷新组成员身份
# 或使用 newgrp 命令
newgrp groupname
```

## 总结

权限管理是Linux系统安全的基础，掌握这些命令对于系统管理和安全维护至关重要：

1. **权限查看**：`ls -l`、`stat` - 了解文件权限状态
2. **权限修改**：`chmod`、`chown`、`chgrp` - 修改文件权限和所有者
3. **用户管理**：`id`、`groups`、`su`、`sudo` - 用户身份和权限管理
4. **高级权限**：`umask`、`setfacl`、`getfacl` - 默认权限和访问控制列表

**安全最佳实践**：
- 遵循最小权限原则
- 定期检查系统权限
- 避免使用777权限
- 合理使用sudo而不是直接使用root
- 备份重要文件的权限设置
- 使用ACL进行细粒度权限控制

**学习建议**：
- 从基本的权限概念开始理解
- 多练习数字和符号权限表示法
- 在测试环境中练习权限修改
- 学会诊断权限问题的方法
- 了解特殊权限和ACL的使用场景

权限管理的熟练掌握将大大提高Linux系统的安全性和管理效率。