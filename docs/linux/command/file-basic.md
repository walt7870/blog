# 文件基础操作命令

## 概述

文件和目录操作是Linux系统中最基础也是最常用的操作。本文档详细介绍了用于文件和目录管理的核心命令，包括查看、创建、复制、移动和删除等操作。

## 目录导航命令

### pwd - 显示当前工作目录

**功能**：显示当前所在的工作目录的完整路径。

**语法**：
```bash
pwd [选项]
```

**常用选项**：
- `-L`：显示逻辑路径（默认，包含符号链接）
- `-P`：显示物理路径（解析符号链接）

**示例**：
```bash
# 显示当前目录
pwd
# 输出：/home/user/documents

# 显示物理路径
pwd -P
# 如果当前目录是符号链接，显示实际路径
```

### cd - 切换目录

**功能**：改变当前工作目录。

**语法**：
```bash
cd [目录路径]
```

**特殊用法**：
- `cd`：切换到用户主目录
- `cd ~`：切换到用户主目录
- `cd -`：切换到上一个工作目录
- `cd ..`：切换到父目录
- `cd ../..`：切换到上两级目录
- `cd ./子目录`：切换到当前目录下的子目录

**示例**：
```bash
# 切换到指定目录
cd /home/user/documents

# 切换到主目录
cd
cd ~

# 切换到上一个目录
cd -

# 切换到父目录
cd ..

# 使用相对路径
cd ../../etc

# 使用Tab键自动补全
cd /ho<Tab>  # 自动补全为 /home/
```

## 文件和目录查看命令

### ls - 列出目录内容

**功能**：列出指定目录中的文件和子目录。

**语法**：
```bash
ls [选项] [文件或目录...]
```

**常用选项**：
- `-l`：长格式显示详细信息
- `-a`：显示所有文件（包括隐藏文件）
- `-h`：人性化显示文件大小
- `-t`：按修改时间排序
- `-r`：逆序排列
- `-R`：递归显示子目录
- `-d`：只显示目录本身，不显示内容
- `--color`：彩色显示

**示例**：
```bash
# 基本列出
ls

# 详细信息显示
ls -l
# 输出示例：
# drwxr-xr-x 2 user group 4096 Jan 15 10:30 documents
# -rw-r--r-- 1 user group 1024 Jan 15 09:15 file.txt

# 显示所有文件（包括隐藏文件）
ls -la

# 人性化显示文件大小
ls -lh
# 输出示例：
# -rw-r--r-- 1 user group 1.5K Jan 15 09:15 file.txt
# -rw-r--r-- 1 user group 2.3M Jan 15 10:00 image.jpg

# 按时间排序
ls -lt

# 递归显示
ls -R

# 只显示目录
ls -ld */

# 组合选项
ls -lah  # 等同于 ls -l -a -h
```

**输出格式解释**（ls -l）：
```
drwxr-xr-x 2 user group 4096 Jan 15 10:30 documents
│││││││││ │ │    │     │    │           │
│││││││││ │ │    │     │    │           └── 文件名
│││││││││ │ │    │     │    └── 修改时间
│││││││││ │ │    │     └── 文件大小（字节）
│││││││││ │ │    └── 所属组
│││││││││ │ └── 所有者
│││││││││ └── 硬链接数
└┴┴┴┴┴┴┴┴── 权限（第一位：文件类型，后九位：权限）
```

## 目录创建和删除命令

### mkdir - 创建目录

**功能**：创建一个或多个目录。

**语法**：
```bash
mkdir [选项] 目录名...
```

**常用选项**：
- `-p`：递归创建目录（创建父目录）
- `-m`：设置目录权限
- `-v`：显示创建过程

**示例**：
```bash
# 创建单个目录
mkdir newdir

# 创建多个目录
mkdir dir1 dir2 dir3

# 递归创建目录
mkdir -p parent/child/grandchild

# 设置权限创建目录
mkdir -m 755 newdir

# 显示创建过程
mkdir -pv project/{src,docs,tests}
# 输出：
# mkdir: created directory 'project'
# mkdir: created directory 'project/src'
# mkdir: created directory 'project/docs'
# mkdir: created directory 'project/tests'
```

### rmdir - 删除空目录

**功能**：删除空目录。

**语法**：
```bash
rmdir [选项] 目录名...
```

**常用选项**：
- `-p`：递归删除空的父目录
- `-v`：显示删除过程
- `--ignore-fail-on-non-empty`：忽略非空目录的错误

**示例**：
```bash
# 删除空目录
rmdir emptydir

# 递归删除空目录
rmdir -p parent/child/grandchild

# 显示删除过程
rmdir -v emptydir
# 输出：rmdir: removing directory, 'emptydir'

# 删除多个空目录
rmdir dir1 dir2 dir3
```

**注意**：rmdir只能删除空目录，如果目录包含文件或子目录，需要使用`rm -r`。

## 文件操作命令

### cp - 复制文件和目录

**功能**：复制文件或目录到指定位置。

**语法**：
```bash
cp [选项] 源文件 目标文件
cp [选项] 源文件... 目标目录
```

**常用选项**：
- `-r` 或 `-R`：递归复制目录
- `-i`：交互模式，覆盖前询问
- `-f`：强制复制，不询问
- `-p`：保持文件属性（权限、时间戳等）
- `-a`：归档模式，等同于 -dpR
- `-u`：只复制较新的文件
- `-v`：显示复制过程
- `-l`：创建硬链接而不是复制
- `-s`：创建符号链接而不是复制

**示例**：
```bash
# 复制文件
cp file1.txt file2.txt

# 复制文件到目录
cp file1.txt /home/user/backup/

# 复制多个文件到目录
cp file1.txt file2.txt file3.txt /home/user/backup/

# 递归复制目录
cp -r sourcedir targetdir

# 交互式复制（覆盖前询问）
cp -i file1.txt file2.txt

# 保持文件属性复制
cp -p file1.txt file2.txt

# 归档模式复制（常用于备份）
cp -a /home/user/documents /backup/

# 只复制较新的文件
cp -u *.txt /backup/

# 显示复制过程
cp -v file1.txt /backup/
# 输出：'file1.txt' -> '/backup/file1.txt'

# 创建硬链接
cp -l file1.txt file1_link.txt

# 创建符号链接
cp -s /path/to/file1.txt file1_symlink.txt
```

### mv - 移动/重命名文件和目录

**功能**：移动文件或目录到新位置，或重命名文件/目录。

**语法**：
```bash
mv [选项] 源文件 目标文件
mv [选项] 源文件... 目标目录
```

**常用选项**：
- `-i`：交互模式，覆盖前询问
- `-f`：强制移动，不询问
- `-u`：只移动较新的文件
- `-v`：显示移动过程
- `-n`：不覆盖已存在的文件
- `-b`：覆盖前创建备份

**示例**：
```bash
# 重命名文件
mv oldname.txt newname.txt

# 移动文件到目录
mv file1.txt /home/user/documents/

# 移动多个文件到目录
mv file1.txt file2.txt file3.txt /home/user/documents/

# 移动目录
mv olddir newdir

# 交互式移动
mv -i file1.txt /backup/

# 显示移动过程
mv -v *.txt /backup/
# 输出：'file1.txt' -> '/backup/file1.txt'

# 不覆盖已存在的文件
mv -n file1.txt /backup/

# 创建备份后移动
mv -b file1.txt /backup/
```

### ln - 创建链接

**功能**：创建文件或目录的链接，包括硬链接和符号链接。

**语法**：
```bash
ln [选项] 源文件 目标文件
ln [选项] 源文件... 目标目录
```

**常用选项**：
- `-s`：创建符号链接（软链接）
- `-f`：强制创建，覆盖已存在的链接
- `-i`：交互模式，覆盖前询问
- `-v`：显示创建过程
- `-n`：如果目标是符号链接，则覆盖符号链接本身
- `-T`：总是将目标视为普通文件
- `-t`：指定目标目录

**链接类型**：

1. **硬链接**（默认）：
   - 与源文件共享相同的 inode
   - 删除源文件不影响硬链接
   - 不能跨文件系统
   - 不能链接目录

2. **符号链接**（软链接，使用 -s 选项）：
   - 指向源文件的路径
   - 删除源文件后链接失效
   - 可以跨文件系统
   - 可以链接目录

**示例**：
```bash
# 创建硬链接
ln file1.txt file1_hardlink.txt

# 创建符号链接
ln -s file1.txt file1_symlink.txt

# 创建指向目录的符号链接
ln -s /path/to/directory link_to_directory

# 强制创建链接（覆盖已存在的）
ln -f file1.txt existing_link.txt

# 交互式创建链接
ln -i file1.txt existing_link.txt

# 显示创建过程
ln -v file1.txt file1_link.txt
# 输出：'file1.txt' -> 'file1_link.txt'

# 创建链接到指定目录
ln -s file1.txt /home/user/links/

# 创建绝对路径的符号链接
ln -s /absolute/path/to/file.txt link.txt

# 创建相对路径的符号链接
ln -s ../path/to/file.txt link.txt
```

**链接管理**：
```bash
# 查看链接信息
ls -la link_name

# 查看链接指向
readlink link_name

# 查看链接的真实路径
realpath link_name

# 删除链接（不影响原文件）
rm link_name

# 修改链接指向
ln -sf new_target existing_link
```

**注意事项**：
- 硬链接不能跨文件系统创建
- 硬链接不能链接目录
- 符号链接可以指向不存在的文件
- 删除原文件后，硬链接仍然有效，符号链接失效
- 使用相对路径创建符号链接时，路径是相对于链接文件的位置

### rm - 删除文件和目录

**功能**：删除文件和目录。

**语法**：
```bash
rm [选项] 文件或目录...
```

**常用选项**：
- `-r` 或 `-R`：递归删除目录及其内容
- `-i`：交互模式，删除前询问
- `-f`：强制删除，不询问
- `-v`：显示删除过程
- `-d`：删除空目录
- `--preserve-root`：保护根目录不被删除

**示例**：
```bash
# 删除文件
rm file1.txt

# 删除多个文件
rm file1.txt file2.txt file3.txt

# 使用通配符删除
rm *.txt
rm file?.txt

# 交互式删除
rm -i file1.txt
# 输出：rm: remove regular file 'file1.txt'? y

# 递归删除目录
rm -r directory

# 强制递归删除（危险操作）
rm -rf directory

# 显示删除过程
rm -v file1.txt
# 输出：removed 'file1.txt'

# 删除空目录
rm -d emptydir
```

**安全提示**：
- 使用`rm -rf`时要格外小心，特别是在根目录附近
- 重要文件删除前建议先备份
- 可以使用`rm -i`进行交互式删除
- 避免使用`rm -rf /`等危险命令

## 实用技巧和最佳实践

### 1. 使用通配符

```bash
# 星号（*）匹配任意字符
ls *.txt          # 列出所有.txt文件
cp *.jpg /backup/ # 复制所有.jpg文件

# 问号（?）匹配单个字符
ls file?.txt      # 匹配file1.txt, fileA.txt等

# 方括号匹配指定字符
ls file[123].txt  # 匹配file1.txt, file2.txt, file3.txt
ls file[a-z].txt  # 匹配filea.txt到filez.txt

# 大括号扩展
mkdir {2023,2024}/{01,02,03}  # 创建多个目录
cp file.txt{,.bak}            # 复制file.txt为file.txt.bak
```

### 2. 路径技巧

```bash
# 使用相对路径
cd ../..          # 上两级目录
cp ./file ../     # 复制到父目录

# 使用绝对路径
cp /home/user/file.txt /tmp/

# 使用特殊符号
cd ~              # 主目录
cd -              # 上一个目录
cp file.txt ~/backup/  # 复制到主目录下的backup
```

### 3. 批量操作

```bash
# 批量创建目录
mkdir -p project/{src,docs,tests,config}

# 批量复制
cp *.{txt,doc,pdf} /backup/

# 批量重命名（使用循环）
for file in *.txt; do
    mv "$file" "${file%.txt}.bak"
done
```

### 4. 安全操作

```bash
# 使用交互模式
cp -i source.txt target.txt
mv -i oldname.txt newname.txt
rm -i unwanted.txt

# 创建备份
cp file.txt file.txt.bak
mv -b file.txt /new/location/

# 测试命令（使用echo）
echo rm *.txt     # 先查看会删除哪些文件
```

### 5. 性能优化

```bash
# 大文件复制时显示进度
cp -v largefile.iso /backup/

# 使用rsync进行高效复制
rsync -av source/ destination/

# 并行操作（使用xargs）当前目录及其子目录下所有 *.txt 文件”用 并行方式 复制到 /backup/ 目录 -P 4 表示使用 4 个进程
#-I {}：把 {} 当作占位符，后面出现 {} 的地方会被实际文件名替换。
find . -name "*.txt" | xargs -P 4 -I {} cp {} /backup/

#这样每个 cp 可能一次复制若干文件，减少 cp 进程数量。
find . -type f -name "*.txt" -print0 | xargs -0 -P 4 cp -t /backup/


#{} + 让 find 一次性把尽可能多的文件追加到命令行末尾。
find src/ -type f -name "*.c" -exec cp -t dest/ {} +


# 把 src/ 下所有 .c 文件复制到 dest/
#-print0 + -0 解决空格/特殊字符。
#cp -t dest/ 把目录位置固定，后面可以接任意数量文件。
find src/ -type f -name "*.c" -print0 \
  | xargs -0 cp -t dest/
```

## 常见错误和解决方案

### 1. 权限错误

**错误**：`Permission denied`

**解决方案**：
```bash
# 检查权限
ls -l file.txt

# 修改权限
chmod 644 file.txt

# 使用sudo（如果有权限）
sudo cp file.txt /etc/
```

### 2. 文件不存在

**错误**：`No such file or directory`

**解决方案**：
```bash
# 检查文件是否存在
ls -la filename

# 检查当前目录
pwd
ls

# 使用find查找文件
find / -name "filename" 2>/dev/null
```

### 3. 目录不为空

**错误**：`Directory not empty`（使用rmdir时）

**解决方案**：
```bash
# 查看目录内容
ls -la directory/

# 使用rm -r删除
rm -r directory/

# 或先清空目录
rm -rf directory/*
rmdir directory
```

### 4. 磁盘空间不足

**错误**：`No space left on device`

**解决方案**：
```bash
# 检查磁盘使用情况
df -h

# 查找大文件
du -h --max-depth=1 | sort -hr

# 清理临时文件
rm -rf /tmp/*
```

## 总结

文件基础操作命令是Linux系统使用的基础，掌握这些命令对于日常工作至关重要：

1. **导航命令**：`pwd`、`cd` - 了解和改变当前位置
2. **查看命令**：`ls` - 查看文件和目录信息
3. **创建命令**：`mkdir` - 创建目录结构
4. **复制命令**：`cp` - 备份和复制文件
5. **移动命令**：`mv` - 移动和重命名文件
6. **链接命令**：`ln` - 创建文件链接
7. **删除命令**：`rm`、`rmdir` - 清理不需要的文件和目录

**学习建议**：
- 从简单的单文件操作开始练习
- 逐步学习使用选项和通配符
- 在测试环境中练习危险操作（如rm -rf）
- 养成备份重要文件的习惯
- 熟练掌握Tab键自动补全功能

这些基础命令的熟练使用将为学习更高级的Linux操作打下坚实的基础。