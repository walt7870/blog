# Linux 文件权限和属性管理

## 概述

Linux 文件权限系统是 Linux 安全机制的核心组成部分，通过权限控制可以精确地管理用户对文件和目录的访问权限。理解文件权限对于系统安全和日常管理至关重要。

## 文件权限基础

### 权限类型

Linux 文件权限分为三种基本类型：

- **读取权限 (r)**：允许查看文件内容或列出目录内容
- **写入权限 (w)**：允许修改文件内容或在目录中创建/删除文件
- **执行权限 (x)**：允许执行文件或进入目录

### 权限对象

权限应用于三个对象：

- **所有者 (Owner)**：文件或目录的创建者
- **用户组 (Group)**：文件所属的用户组
- **其他用户 (Others)**：既不是所有者也不属于用户组的用户

### 权限表示法

#### 符号表示法
```
rwxrwxrwx
│││││││││
││││││││└── 其他用户权限
│││││││└── 用户组权限  
││││││└── 所有者权限
```

#### 数字表示法
- **r (读取)** = 4
- **w (写入)** = 2  
- **x (执行)** = 1
- **无权限** = 0

**示例：**
- `rwxr-xr-x` = 755 (所有者完全权限，组和其他用户读执行)
- `rw-r--r--` = 644 (所有者读写，组和其他用户只读)

## 常用权限管理命令

### chmod - 修改文件权限

#### 语法
```bash
chmod [选项] 权限 文件...
```

#### 符号模式
```bash
# 为所有者添加执行权限
chmod u+x file.txt

# 为所有用户添加写权限
chmod a+w file.txt

# 为组用户移除写权限
chmod g-w file.txt

# 设置特定权限
chmod u=rwx,g=rx,o=r file.txt
```

#### 数字模式
```bash
# 设置 755 权限
chmod 755 file.txt

# 设置 644 权限
chmod 644 file.txt

# 设置 600 权限（只有所有者可读写）
chmod 600 file.txt
```

#### 递归修改
```bash
# 递归修改目录及其子文件权限
chmod -R 755 directory/
```

### chown - 修改文件所有者

#### 语法
```bash
chown [选项] 用户[:组] 文件...
```

#### 基本用法
```bash
# 修改文件所有者
chown user1 file.txt

# 修改文件所有者和组
chown user1:group1 file.txt

# 只修改组（使用冒号）
chown :group1 file.txt

# 递归修改
chown -R user1:group1 directory/
```

### chgrp - 修改文件组

#### 语法
```bash
chgrp [选项] 组 文件...
```

#### 基本用法
```bash
# 修改文件组
chgrp developers file.txt

# 递归修改
chgrp -R developers directory/
```

### umask - 设置默认权限掩码

#### 语法
```bash
umask [选项] [掩码]
```

#### 基本用法
```bash
# 查看当前 umask
umask

# 设置 umask
umask 022

# 设置更严格的 umask
umask 077
```

#### umask 计算
- **文件默认权限**：666 - umask
- **目录默认权限**：777 - umask

**示例：**
- umask 022：文件权限 644，目录权限 755
- umask 077：文件权限 600，目录权限 700

### stat - 查看文件详细信息

#### 语法
```bash
stat [选项] 文件...
```

#### 基本用法
```bash
# 查看文件详细信息
stat file.txt

# 只显示权限信息
stat -c %a file.txt

# 显示所有者信息
stat -c %U:%G file.txt
```

## 特殊权限

### SUID (Set User ID)
- 设置后，执行文件时以文件所有者身份运行
- 符号：`s` 在所有者执行位
- 数字：4000

```bash
# 设置 SUID
chmod u+s file
chmod 4755 file
```

### SGID (Set Group ID)
- 设置后，执行文件时以文件组身份运行
- 目录设置后，新创建的文件继承目录组
- 符号：`s` 在组执行位
- 数字：2000

```bash
# 设置 SGID
chmod g+s file
chmod 2755 file
```

### Sticky Bit
- 主要用于目录，防止非所有者删除文件
- 符号：`t` 在其他用户执行位
- 数字：1000

```bash
# 设置 Sticky Bit
chmod +t directory
chmod 1755 directory
```

## 权限管理最佳实践

### 安全原则
1. **最小权限原则**：只给予必要的最小权限
2. **定期审查**：定期检查文件权限设置
3. **备份重要文件**：重要文件设置适当的权限保护

### 常见权限设置

#### 普通文件
```bash
# 个人文件
chmod 600 file.txt

# 共享文件
chmod 644 file.txt

# 可执行脚本
chmod 755 script.sh
```

#### 目录
```bash
# 个人目录
chmod 700 directory/

# 共享目录
chmod 755 directory/

# 组共享目录
chmod 775 directory/
```

### 批量权限管理

#### 使用 find 批量修改
```bash
# 批量修改文件权限
find /path -type f -exec chmod 644 {} \;

# 批量修改目录权限
find /path -type d -exec chmod 755 {} \;

# 批量修改所有者
find /path -exec chown user:group {} \;
```

## 故障排除

### 常见问题

#### 权限被拒绝
```bash
# 检查文件权限
ls -la file.txt

# 检查用户身份
whoami
groups

# 检查文件所有者
stat file.txt
```

#### 无法删除文件
```bash
# 检查目录权限
ls -ld directory/

# 检查文件权限
ls -la file.txt

# 检查 Sticky Bit
ls -ld /tmp
```

### 权限恢复

#### 重置文件权限
```bash
# 重置为默认权限
chmod 644 file.txt

# 重置目录权限
chmod 755 directory/
```

#### 重置所有者
```bash
# 重置为当前用户
chown $(whoami) file.txt

# 重置组
chgrp $(id -gn) file.txt
```

## 高级技巧

### ACL (Access Control Lists)
```bash
# 安装 ACL 工具
sudo apt-get install acl

# 设置 ACL
setfacl -m u:user1:rw file.txt

# 查看 ACL
getfacl file.txt

# 删除 ACL
setfacl -x u:user1 file.txt
```

### 文件属性 (Extended Attributes)
```bash
# 设置不可变属性
chattr +i file.txt

# 设置追加属性
chattr +a file.txt

# 查看属性
lsattr file.txt

# 移除属性
chattr -i file.txt
```

## 总结

文件权限管理是 Linux 系统管理的基础技能，掌握这些命令和概念对于维护系统安全和有效管理文件系统至关重要。通过合理设置权限，可以确保系统安全性和用户访问的便利性。 