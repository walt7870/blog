# Linux 用户和权限管理

## 概述

用户和权限管理是 Linux 系统安全的基础。通过用户、用户组和权限的合理配置，可以实现多用户协作和系统资源的安全隔离。

## 用户管理命令

### useradd - 添加用户
```bash
# 添加新用户
sudo useradd username

# 添加用户并指定家目录
sudo useradd -m -d /home/username username

# 添加用户并指定 shell
sudo useradd -s /bin/zsh username
```

### userdel - 删除用户
```bash
# 删除用户
sudo userdel username

# 删除用户及其家目录
sudo userdel -r username
```

### usermod - 修改用户
```bash
# 修改用户名
sudo usermod -l newname oldname

# 修改用户家目录
sudo usermod -d /new/home username

# 修改用户 shell
sudo usermod -s /bin/bash username

# 添加用户到组
sudo usermod -aG groupname username
```

### passwd - 修改密码
```bash
# 修改当前用户密码
passwd

# 修改指定用户密码
sudo passwd username
```

## 用户组管理

### groupadd - 添加用户组
```bash
sudo groupadd groupname
```

### groupdel - 删除用户组
```bash
sudo groupdel groupname
```

### groupmod - 修改用户组
```bash
sudo groupmod -n newgroup oldgroup
```

### gpasswd - 管理组成员
```bash
# 添加用户到组
sudo gpasswd -a username groupname

# 从组中移除用户
sudo gpasswd -d username groupname
```

## 权限与身份切换

### su - 切换用户
```bash
# 切换到 root 用户
su -

# 切换到指定用户
su - username
```

### sudo - 管理员权限执行
```bash
# 以管理员权限执行命令
sudo command

# 以其他用户身份执行
sudo -u username command
```

### id - 查看用户和组信息
```bash
id
id username
```

### groups - 查看用户所属组
```bash
groups
# 查看指定用户所属组
groups username
```

## 权限管理

### chown - 修改文件所有者
```bash
sudo chown user:group file
```

### chmod - 修改文件权限
```bash
sudo chmod 755 file
```

### chgrp - 修改文件组
```bash
sudo chgrp group file
```

## 用户信息管理

### 查看用户信息
```bash
# 查看所有用户
cat /etc/passwd

# 查看所有组
cat /etc/group

# 查看当前用户
whoami

# 查看当前登录用户
w
who
```

## 登录与会话管理

### who/w - 查看登录用户
```bash
who
w
```

### last - 查看登录历史
```bash
last
```

### logout/exit - 退出登录
```bash
logout
exit
```

## 安全与最佳实践
1. 禁止 root 远程登录，使用普通用户+sudo
2. 密码设置复杂度，定期更换密码
3. 只为需要的用户分配 sudo 权限
4. 定期清理无用用户和组
5. 重要文件权限最小化
6. 备份 /etc/passwd、/etc/shadow、/etc/group 等关键文件
