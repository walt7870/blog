# Linux 压缩和解压

## 概述

Linux 提供了多种压缩和解压工具，用于文件压缩、归档、备份等。不同的工具适用于不同的场景，掌握这些工具可以有效地管理文件大小和传输效率。

## 常用压缩工具

### gzip - GNU 压缩工具

#### 基本语法
```bash
gzip [选项] 文件...
```

#### 常用选项
- `-d`：解压缩
- `-r`：递归处理目录
- `-v`：显示详细信息
- `-l`：列出压缩文件信息
- `-t`：测试压缩文件完整性

#### 基本用法
```bash
# 压缩文件
gzip file.txt

# 解压缩文件
gzip -d file.txt.gz

# 压缩并保留原文件
gzip -c file.txt > file.txt.gz

# 递归压缩目录
gzip -r directory/

# 显示压缩信息
gzip -l file.txt.gz

# 测试压缩文件
gzip -t file.txt.gz
```

### bzip2 - 高压缩比工具

#### 基本语法
```bash
bzip2 [选项] 文件...
```

#### 常用选项
- `-d`：解压缩
- `-k`：保留原文件
- `-v`：显示详细信息
- `-t`：测试压缩文件
- `-s`：显示压缩统计

#### 基本用法
```bash
# 压缩文件
bzip2 file.txt

# 解压缩文件
bzip2 -d file.txt.bz2

# 压缩并保留原文件
bzip2 -k file.txt

# 显示压缩信息
bzip2 -s file.txt.bz2

# 测试压缩文件
bzip2 -t file.txt.bz2
```

### xz - 高压缩比工具

#### 基本语法
```bash
xz [选项] 文件...
```

#### 常用选项
- `-d`：解压缩
- `-k`：保留原文件
- `-v`：显示详细信息
- `-t`：测试压缩文件
- `-l`：列出压缩文件信息

#### 基本用法
```bash
# 压缩文件
xz file.txt

# 解压缩文件
xz -d file.txt.xz

# 压缩并保留原文件
xz -k file.txt

# 显示压缩信息
xz -l file.txt.xz

# 测试压缩文件
xz -t file.txt.xz
```

### zip - 跨平台压缩工具

#### 基本语法
```bash
zip [选项] 压缩文件名 文件...
```

#### 常用选项
- `-r`：递归处理目录
- `-u`：更新压缩文件
- `-d`：从压缩文件中删除文件
- `-v`：显示详细信息
- `-e`：加密压缩文件

#### 基本用法
```bash
# 压缩文件
zip archive.zip file1.txt file2.txt

# 递归压缩目录
zip -r archive.zip directory/

# 更新压缩文件
zip -u archive.zip newfile.txt

# 从压缩文件中删除文件
zip -d archive.zip oldfile.txt

# 加密压缩文件
zip -e secure.zip file.txt

# 显示压缩文件内容
unzip -l archive.zip
```

### unzip - 解压 zip 文件

#### 基本语法
```bash
unzip [选项] 压缩文件
```

#### 常用选项
- `-l`：列出压缩文件内容
- `-d`：指定解压目录
- `-o`：覆盖现有文件
- `-q`：静默模式
- `-P`：指定密码

#### 基本用法
```bash
# 解压文件
unzip archive.zip

# 解压到指定目录
unzip archive.zip -d /target/directory

# 列出压缩文件内容
unzip -l archive.zip

# 覆盖解压
unzip -o archive.zip

# 解压加密文件
unzip -P password secure.zip
```

## 归档工具

### tar - 磁带归档工具

#### 基本语法
```bash
tar [选项] 归档文件名 文件...
```

#### 常用选项
- `-c`：创建归档
- `-x`：提取归档
- `-t`：列出归档内容
- `-f`：指定归档文件名
- `-v`：显示详细信息
- `-z`：使用 gzip 压缩
- `-j`：使用 bzip2 压缩
- `-J`：使用 xz 压缩

#### 基本用法

##### 创建归档
```bash
# 创建 tar 归档
tar -cf archive.tar file1.txt file2.txt

# 创建压缩归档
tar -czf archive.tar.gz file1.txt file2.txt
tar -cjf archive.tar.bz2 file1.txt file2.txt
tar -cJf archive.tar.xz file1.txt file2.txt

# 递归归档目录
tar -czf archive.tar.gz directory/

# 排除特定文件
tar -czf archive.tar.gz --exclude='*.tmp' directory/
```

##### 提取归档
```bash
# 提取 tar 归档
tar -xf archive.tar

# 提取压缩归档
tar -xzf archive.tar.gz
tar -xjf archive.tar.bz2
tar -xJf archive.tar.xz

# 提取到指定目录
tar -xzf archive.tar.gz -C /target/directory

# 只提取特定文件
tar -xzf archive.tar.gz file1.txt
```

##### 查看归档内容
```bash
# 列出归档内容
tar -tf archive.tar

# 列出压缩归档内容
tar -tzf archive.tar.gz
tar -tjf archive.tar.bz2
tar -tJf archive.tar.xz

# 显示详细信息
tar -tvf archive.tar
```

### 7z - 高压缩比归档工具

#### 基本语法
```bash
7z [命令] [选项] 归档文件名 [文件...]
```

#### 常用命令
- `a`：添加文件到归档
- `x`：提取文件
- `l`：列出归档内容
- `t`：测试归档完整性
- `d`：删除文件

#### 基本用法
```bash
# 创建 7z 归档
7z a archive.7z file1.txt file2.txt

# 递归归档目录
7z a archive.7z directory/

# 提取归档
7z x archive.7z

# 提取到指定目录
7z x archive.7z -o/target/directory

# 列出归档内容
7z l archive.7z

# 测试归档完整性
7z t archive.7z
```

## 高级压缩技巧

### 压缩比比较

```bash
# 测试不同工具的压缩比
echo "测试数据" > test.txt
gzip -c test.txt | wc -c
bzip2 -c test.txt | wc -c
xz -c test.txt | wc -c
zip test.zip test.txt && wc -c test.zip
```

### 并行压缩

```bash
# 使用 pigz (并行 gzip)
pigz -p 4 file.txt

# 使用 pbzip2 (并行 bzip2)
pbzip2 -p 4 file.txt

# 使用 pixz (并行 xz)
pixz file.txt
```

### 压缩脚本

#### 批量压缩脚本
```bash
#!/bin/bash
# 批量压缩文件
for file in *.txt; do
    if [ -f "$file" ]; then
        echo "压缩 $file"
        gzip "$file"
    fi
done
```

#### 压缩备份脚本
```bash
#!/bin/bash
# 创建压缩备份
backup_dir="/backup"
date=$(date +%Y%m%d_%H%M%S)
tar -czf "$backup_dir/backup_$date.tar.gz" /home/user/
```

## 压缩文件管理

### 查看压缩文件信息

```bash
# 查看 gzip 文件信息
gzip -l file.gz

# 查看 bzip2 文件信息
bzip2 -s file.bz2

# 查看 xz 文件信息
xz -l file.xz

# 查看 zip 文件信息
unzip -l file.zip

# 查看 tar 归档信息
tar -tvf archive.tar
```

### 压缩文件完整性检查

```bash
# 测试 gzip 文件
gzip -t file.gz

# 测试 bzip2 文件
bzip2 -t file.bz2

# 测试 xz 文件
xz -t file.xz

# 测试 tar 归档
tar -tf archive.tar > /dev/null
```

## 性能优化

### 压缩速度 vs 压缩比

```bash
# 快速压缩 (gzip)
gzip -1 file.txt

# 标准压缩 (gzip)
gzip -6 file.txt

# 最高压缩比 (gzip)
gzip -9 file.txt

# 快速压缩 (bzip2)
bzip2 -1 file.txt

# 最高压缩比 (bzip2)
bzip2 -9 file.txt
```

### 内存使用优化

```bash
# 限制内存使用 (xz)
xz --memlimit=50% file.txt

# 使用较少内存 (bzip2)
bzip2 -s file.txt
```

## 故障排除

### 常见问题

#### 压缩文件损坏
```bash
# 测试压缩文件完整性
gzip -t file.gz
bzip2 -t file.bz2
xz -t file.xz

# 尝试修复
gzip -t file.gz || echo "文件损坏"
```

#### 空间不足
```bash
# 检查磁盘空间
df -h

# 使用流式压缩
gzip -c large_file.txt | split -b 1G - large_file.txt.gz.part
```

#### 权限问题
```bash
# 检查文件权限
ls -la file.txt

# 使用 sudo 压缩
sudo gzip file.txt
```

## 最佳实践

### 压缩策略
1. **选择合适的工具**：根据文件类型和大小选择压缩工具
2. **考虑压缩比和速度**：平衡压缩比和压缩速度
3. **使用并行压缩**：对于大文件使用并行压缩工具
4. **定期测试**：定期测试压缩文件的完整性

### 归档策略
1. **使用 tar 归档**：对于多个文件使用 tar 归档
2. **添加压缩**：归档时添加压缩以节省空间
3. **排除临时文件**：归档时排除临时文件和缓存
4. **添加时间戳**：备份文件添加时间戳便于管理

### 性能考虑
1. **选择合适的压缩级别**：根据需求选择压缩级别
2. **使用并行工具**：对于大文件使用并行压缩
3. **监控资源使用**：压缩时监控 CPU 和内存使用
4. **分批处理**：大文件分批压缩避免内存不足