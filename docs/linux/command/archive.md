# Linux 压缩归档命令详解

## 概述

压缩和归档是Linux系统中常见的文件管理操作。压缩可以减少文件大小，节省存储空间和传输时间；归档可以将多个文件打包成一个文件，便于管理和传输。本文档详细介绍Linux中常用的压缩归档命令及其应用场景。

## 压缩归档基础概念

### 压缩与归档的区别

- **归档（Archive）**：将多个文件和目录打包成一个文件，不进行压缩
- **压缩（Compress）**：减少文件大小，可能会丢失一些信息（有损）或完全保留（无损）
- **压缩归档**：先归档再压缩，或同时进行归档和压缩

### 常见压缩格式

- **.tar**：归档格式，不压缩
- **.gz**：gzip压缩格式
- **.bz2**：bzip2压缩格式
- **.xz**：xz压缩格式
- **.zip**：zip压缩格式
- **.rar**：rar压缩格式
- **.7z**：7zip压缩格式

### 压缩比较

| 格式 | 压缩比 | 压缩速度 | 解压速度 | CPU使用 |
|------|--------|----------|----------|----------|
| gzip | 中等   | 快       | 快       | 低       |
| bzip2| 高     | 慢       | 慢       | 高       |
| xz   | 最高   | 最慢     | 中等     | 最高     |
| zip  | 中等   | 快       | 快       | 低       |

## tar - 归档工具

### 基本语法

```bash
tar [options] [archive-file] [file-or-directory-to-be-archived]
```

### 常用选项

- **-c**：创建归档文件
- **-x**：提取归档文件
- **-t**：列出归档内容
- **-f**：指定归档文件名
- **-v**：显示详细信息
- **-z**：使用gzip压缩
- **-j**：使用bzip2压缩
- **-J**：使用xz压缩
- **-C**：指定提取目录
- **-p**：保持文件权限
- **-h**：跟随符号链接

### 创建归档

```bash
# 创建tar归档
tar -cf archive.tar file1 file2 directory/
tar -cvf archive.tar file1 file2 directory/

# 创建gzip压缩归档
tar -czf archive.tar.gz file1 file2 directory/
tar -czvf archive.tar.gz file1 file2 directory/

# 创建bzip2压缩归档
tar -cjf archive.tar.bz2 file1 file2 directory/
tar -cjvf archive.tar.bz2 file1 file2 directory/

# 创建xz压缩归档
tar -cJf archive.tar.xz file1 file2 directory/
tar -cJvf archive.tar.xz file1 file2 directory/

# 排除特定文件
tar -czf archive.tar.gz --exclude='*.log' --exclude='temp/' directory/
tar -czf archive.tar.gz --exclude-from=exclude_list.txt directory/

# 使用绝对路径
tar -czf /backup/archive.tar.gz -C /home/user documents/

# 增量备份
tar -czf backup_full.tar.gz /home/user/
tar -czf backup_incremental.tar.gz --newer-mtime='2023-01-01' /home/user/
```

### 提取归档

```bash
# 提取tar归档
tar -xf archive.tar
tar -xvf archive.tar

# 提取gzip压缩归档
tar -xzf archive.tar.gz
tar -xzvf archive.tar.gz

# 提取bzip2压缩归档
tar -xjf archive.tar.bz2
tar -xjvf archive.tar.bz2

# 提取xz压缩归档
tar -xJf archive.tar.xz
tar -xJvf archive.tar.xz

# 提取到指定目录
tar -xzf archive.tar.gz -C /target/directory/

# 提取特定文件
tar -xzf archive.tar.gz file1 directory/file2

# 提取时保持权限
tar -xzpf archive.tar.gz

# 提取时覆盖确认
tar -xzf archive.tar.gz --overwrite
tar -xzf archive.tar.gz --keep-old-files
```

### 查看归档内容

```bash
# 列出归档内容
tar -tf archive.tar
tar -tvf archive.tar

# 列出压缩归档内容
tar -tzf archive.tar.gz
tar -tzvf archive.tar.gz

# 查找特定文件
tar -tzf archive.tar.gz | grep pattern

# 显示归档统计信息
tar -tzf archive.tar.gz | wc -l
```

### 更新和追加

```bash
# 追加文件到归档
tar -rf archive.tar newfile

# 更新归档中的文件
tar -uf archive.tar file1

# 删除归档中的文件（GNU tar）
tar --delete -f archive.tar file1
```

## gzip/gunzip - gzip压缩

### 基本使用

```bash
# 压缩文件
gzip file.txt
gzip -v file.txt  # 显示压缩比
gzip -9 file.txt  # 最大压缩比
gzip -1 file.txt  # 最快压缩

# 保留原文件
gzip -c file.txt > file.txt.gz
gzip -k file.txt  # GNU gzip

# 压缩多个文件
gzip file1.txt file2.txt file3.txt
gzip *.txt

# 递归压缩目录
gzip -r directory/

# 解压文件
gunzip file.txt.gz
gzip -d file.txt.gz

# 查看压缩文件内容
zcat file.txt.gz
zless file.txt.gz
zmore file.txt.gz
zgrep pattern file.txt.gz

# 测试压缩文件完整性
gzip -t file.txt.gz

# 显示压缩信息
gzip -l file.txt.gz
```

### 压缩选项

```bash
# 压缩级别（1-9）
gzip -1 file.txt  # 最快，压缩比最低
gzip -6 file.txt  # 默认级别
gzip -9 file.txt  # 最慢，压缩比最高

# 强制压缩
gzip -f file.txt

# 递归处理
gzip -r directory/

# 保持时间戳
gzip -N file.txt
```

## bzip2/bunzip2 - bzip2压缩

### 基本使用

```bash
# 压缩文件
bzip2 file.txt
bzip2 -v file.txt  # 显示详细信息
bzip2 -9 file.txt  # 最大压缩比

# 保留原文件
bzip2 -c file.txt > file.txt.bz2
bzip2 -k file.txt

# 压缩多个文件
bzip2 file1.txt file2.txt

# 解压文件
bunzip2 file.txt.bz2
bzip2 -d file.txt.bz2

# 查看压缩文件内容
bzcat file.txt.bz2
bzless file.txt.bz2
bzmore file.txt.bz2
bzgrep pattern file.txt.bz2

# 测试压缩文件完整性
bzip2 -t file.txt.bz2

# 并行压缩（使用pbzip2）
pbzip2 file.txt
pbzip2 -p4 file.txt  # 使用4个线程
```

## xz/unxz - xz压缩

### 基本使用

```bash
# 压缩文件
xz file.txt
xz -v file.txt     # 显示详细信息
xz -9 file.txt     # 最大压缩比
xz -e file.txt     # 极限压缩模式

# 保留原文件
xz -c file.txt > file.txt.xz
xz -k file.txt

# 压缩多个文件
xz file1.txt file2.txt

# 解压文件
unxz file.txt.xz
xz -d file.txt.xz

# 查看压缩文件内容
xzcat file.txt.xz
xzless file.txt.xz
xzmore file.txt.xz
xzgrep pattern file.txt.xz

# 测试压缩文件完整性
xz -t file.txt.xz

# 显示压缩信息
xz -l file.txt.xz

# 并行压缩（使用pixz）
pixz file.txt
pixz -p 4 file.txt  # 使用4个线程
```

### 压缩预设

```bash
# 预设级别（0-9）
xz -0 file.txt  # 最快
xz -6 file.txt  # 默认
xz -9 file.txt  # 最佳压缩

# 极限模式
xz -e file.txt
xz -9e file.txt
```

## zip/unzip - zip压缩

### 创建zip文件

```bash
# 创建zip文件
zip archive.zip file1 file2 file3
zip -r archive.zip directory/

# 添加文件到现有zip
zip archive.zip newfile
zip -u archive.zip file1  # 只添加新的或更新的文件

# 压缩级别
zip -0 archive.zip file1  # 不压缩
zip -9 archive.zip file1  # 最大压缩

# 排除文件
zip -r archive.zip directory/ -x "*.log" "temp/*"

# 加密zip文件
zip -e archive.zip file1
zip -P password archive.zip file1

# 分卷压缩
zip -s 100m archive.zip large_directory/

# 显示详细信息
zip -v archive.zip file1

# 测试模式
zip -T archive.zip
```

### 提取zip文件

```bash
# 解压zip文件
unzip archive.zip

# 解压到指定目录
unzip archive.zip -d /target/directory/

# 列出zip内容
unzip -l archive.zip
unzip -v archive.zip  # 详细信息

# 测试zip文件
unzip -t archive.zip

# 解压特定文件
unzip archive.zip file1 "*.txt"

# 排除文件
unzip archive.zip -x "*.log"

# 覆盖选项
unzip -o archive.zip  # 覆盖不询问
unzip -n archive.zip  # 不覆盖
unzip -u archive.zip  # 只更新较新的文件

# 解压加密文件
unzip -P password archive.zip

# 安静模式
unzip -q archive.zip
```

## rar - rar压缩

### 安装rar

```bash
# Ubuntu/Debian
sudo apt install rar unrar

# CentOS/RHEL
sudo yum install rar unrar
```

### 使用rar

```bash
# 创建rar文件
rar a archive.rar file1 file2
rar a -r archive.rar directory/

# 压缩级别
rar a -m0 archive.rar file1  # 不压缩
rar a -m5 archive.rar file1  # 最大压缩

# 分卷压缩
rar a -v100m archive.rar large_directory/

# 加密
rar a -p archive.rar file1

# 提取rar文件
unrar x archive.rar
unrar x archive.rar /target/directory/

# 列出rar内容
unrar l archive.rar
unrar v archive.rar

# 测试rar文件
unrar t archive.rar
```

## 7zip - 7z压缩

### 安装7zip

```bash
# Ubuntu/Debian
sudo apt install p7zip-full

# CentOS/RHEL
sudo yum install p7zip p7zip-plugins
```

### 使用7zip

```bash
# 创建7z文件
7z a archive.7z file1 file2
7z a -r archive.7z directory/

# 压缩级别
7z a -mx0 archive.7z file1  # 不压缩
7z a -mx9 archive.7z file1  # 最大压缩

# 压缩方法
7z a -m0=lzma2 archive.7z file1
7z a -m0=bzip2 archive.7z file1

# 分卷压缩
7z a -v100m archive.7z large_directory/

# 加密
7z a -p archive.7z file1

# 提取7z文件
7z x archive.7z
7z x archive.7z -o/target/directory/

# 列出7z内容
7z l archive.7z

# 测试7z文件
7z t archive.7z

# 更新文件
7z u archive.7z file1

# 删除文件
7z d archive.7z file1
```

## 实用脚本和技巧

### 自动备份脚本

```bash
#!/bin/bash
# 自动备份脚本

backup_directory() {
    local source_dir=$1
    local backup_dir=$2
    local backup_name=${3:-"backup"}
    local compression=${4:-"gz"}
    
    # 检查源目录
    if [ ! -d "$source_dir" ]; then
        echo "错误: 源目录 $source_dir 不存在"
        return 1
    fi
    
    # 创建备份目录
    mkdir -p "$backup_dir"
    
    # 生成备份文件名
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${backup_dir}/${backup_name}_${timestamp}"
    
    echo "开始备份: $source_dir"
    echo "备份位置: $backup_file"
    
    # 根据压缩类型创建备份
    case $compression in
        "gz")
            tar -czf "${backup_file}.tar.gz" -C "$(dirname "$source_dir")" "$(basename "$source_dir")"
            ;;
        "bz2")
            tar -cjf "${backup_file}.tar.bz2" -C "$(dirname "$source_dir")" "$(basename "$source_dir")"
            ;;
        "xz")
            tar -cJf "${backup_file}.tar.xz" -C "$(dirname "$source_dir")" "$(basename "$source_dir")"
            ;;
        "zip")
            cd "$(dirname "$source_dir")"
            zip -r "${backup_file}.zip" "$(basename "$source_dir")"
            cd - > /dev/null
            ;;
        *)
            echo "不支持的压缩格式: $compression"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "备份完成: ${backup_file}"
        
        # 显示备份文件信息
        ls -lh "${backup_file}"*
        
        # 清理旧备份（保留最近5个）
        ls -t "${backup_dir}/${backup_name}_"* 2>/dev/null | tail -n +6 | xargs rm -f
        
        return 0
    else
        echo "备份失败"
        return 1
    fi
}

# 使用示例
backup_directory "/home/user/documents" "/backup" "documents" "gz"
backup_directory "/var/www" "/backup" "website" "xz"
```

### 压缩比较脚本

```bash
#!/bin/bash
# 压缩比较脚本

compare_compression() {
    local source_file=$1
    
    if [ ! -f "$source_file" ]; then
        echo "错误: 文件 $source_file 不存在"
        return 1
    fi
    
    local original_size=$(stat -c%s "$source_file")
    echo "原始文件: $source_file"
    echo "原始大小: $(numfmt --to=iec $original_size)"
    echo
    
    # 测试不同压缩方法
    declare -A compression_methods=(
        ["gzip"]="gzip -c"
        ["bzip2"]="bzip2 -c"
        ["xz"]="xz -c"
        ["gzip-9"]="gzip -9c"
        ["bzip2-9"]="bzip2 -9c"
        ["xz-9"]="xz -9c"
    )
    
    echo "压缩方法比较:"
    printf "%-12s %-12s %-12s %-12s %s\n" "方法" "压缩后大小" "压缩比" "压缩时间" "压缩率"
    echo "--------------------------------------------------------"
    
    for method in "${!compression_methods[@]}"; do
        local cmd="${compression_methods[$method]}"
        local temp_file="/tmp/test_${method}_$$"
        
        # 测量压缩时间
        local start_time=$(date +%s.%N)
        eval "$cmd '$source_file'" > "$temp_file" 2>/dev/null
        local end_time=$(date +%s.%N)
        
        if [ -f "$temp_file" ]; then
            local compressed_size=$(stat -c%s "$temp_file")
            local compression_ratio=$(echo "scale=2; $compressed_size * 100 / $original_size" | bc)
            local compression_time=$(echo "scale=3; $end_time - $start_time" | bc)
            local space_saved=$(echo "scale=1; 100 - $compression_ratio" | bc)
            
            printf "%-12s %-12s %-12s %-12s %s%%\n" \
                "$method" \
                "$(numfmt --to=iec $compressed_size)" \
                "${compression_ratio}%" \
                "${compression_time}s" \
                "$space_saved"
            
            rm -f "$temp_file"
        else
            printf "%-12s %-12s\n" "$method" "失败"
        fi
    done
}

# 使用示例
compare_compression "/path/to/large/file"
```

### 批量压缩脚本

```bash
#!/bin/bash
# 批量压缩脚本

batch_compress() {
    local source_dir=$1
    local compression_type=${2:-"gz"}
    local pattern=${3:-"*"}
    
    if [ ! -d "$source_dir" ]; then
        echo "错误: 目录 $source_dir 不存在"
        return 1
    fi
    
    echo "批量压缩目录: $source_dir"
    echo "压缩类型: $compression_type"
    echo "文件模式: $pattern"
    echo
    
    local count=0
    local total_original=0
    local total_compressed=0
    
    # 查找匹配的文件
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            local original_size=$(stat -c%s "$file")
            local compressed_file=""
            
            echo "压缩: $file"
            
            case $compression_type in
                "gz")
                    gzip -c "$file" > "${file}.gz"
                    compressed_file="${file}.gz"
                    ;;
                "bz2")
                    bzip2 -c "$file" > "${file}.bz2"
                    compressed_file="${file}.bz2"
                    ;;
                "xz")
                    xz -c "$file" > "${file}.xz"
                    compressed_file="${file}.xz"
                    ;;
                "zip")
                    zip -q "${file}.zip" "$file"
                    compressed_file="${file}.zip"
                    ;;
                *)
                    echo "不支持的压缩类型: $compression_type"
                    continue
                    ;;
            esac
            
            if [ -f "$compressed_file" ]; then
                local compressed_size=$(stat -c%s "$compressed_file")
                local ratio=$(echo "scale=1; $compressed_size * 100 / $original_size" | bc)
                
                echo "  原始大小: $(numfmt --to=iec $original_size)"
                echo "  压缩大小: $(numfmt --to=iec $compressed_size)"
                echo "  压缩比: ${ratio}%"
                echo
                
                ((count++))
                total_original=$((total_original + original_size))
                total_compressed=$((total_compressed + compressed_size))
            else
                echo "  压缩失败"
                echo
            fi
        fi
    done < <(find "$source_dir" -name "$pattern" -type f -print0)
    
    if [ $count -gt 0 ]; then
        local overall_ratio=$(echo "scale=1; $total_compressed * 100 / $total_original" | bc)
        echo "批量压缩完成:"
        echo "  处理文件数: $count"
        echo "  原始总大小: $(numfmt --to=iec $total_original)"
        echo "  压缩总大小: $(numfmt --to=iec $total_compressed)"
        echo "  总体压缩比: ${overall_ratio}%"
    else
        echo "没有找到匹配的文件"
    fi
}

# 使用示例
batch_compress "/home/user/logs" "gz" "*.log"
batch_compress "/var/backups" "xz" "*.sql"
```

### 解压缩自动识别脚本

```bash
#!/bin/bash
# 自动识别格式并解压

auto_extract() {
    local archive_file=$1
    local target_dir=${2:-"."}
    
    if [ ! -f "$archive_file" ]; then
        echo "错误: 文件 $archive_file 不存在"
        return 1
    fi
    
    # 创建目标目录
    mkdir -p "$target_dir"
    
    echo "解压文件: $archive_file"
    echo "目标目录: $target_dir"
    
    # 根据文件扩展名选择解压方法
    case "$archive_file" in
        *.tar.gz|*.tgz)
            tar -xzf "$archive_file" -C "$target_dir"
            ;;
        *.tar.bz2|*.tbz2)
            tar -xjf "$archive_file" -C "$target_dir"
            ;;
        *.tar.xz|*.txz)
            tar -xJf "$archive_file" -C "$target_dir"
            ;;
        *.tar)
            tar -xf "$archive_file" -C "$target_dir"
            ;;
        *.gz)
            gunzip -c "$archive_file" > "$target_dir/$(basename "$archive_file" .gz)"
            ;;
        *.bz2)
            bunzip2 -c "$archive_file" > "$target_dir/$(basename "$archive_file" .bz2)"
            ;;
        *.xz)
            unxz -c "$archive_file" > "$target_dir/$(basename "$archive_file" .xz)"
            ;;
        *.zip)
            unzip -q "$archive_file" -d "$target_dir"
            ;;
        *.rar)
            unrar x "$archive_file" "$target_dir/"
            ;;
        *.7z)
            7z x "$archive_file" -o"$target_dir"
            ;;
        *)
            echo "不支持的文件格式: $archive_file"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "解压完成"
        return 0
    else
        echo "解压失败"
        return 1
    fi
}

# 批量解压
batch_extract() {
    local source_dir=$1
    local target_dir=${2:-"./extracted"}
    
    mkdir -p "$target_dir"
    
    echo "批量解压目录: $source_dir"
    echo "目标目录: $target_dir"
    echo
    
    local count=0
    
    # 查找压缩文件
    find "$source_dir" -type f \( \
        -name "*.tar.gz" -o -name "*.tgz" -o \
        -name "*.tar.bz2" -o -name "*.tbz2" -o \
        -name "*.tar.xz" -o -name "*.txz" -o \
        -name "*.tar" -o -name "*.gz" -o \
        -name "*.bz2" -o -name "*.xz" -o \
        -name "*.zip" -o -name "*.rar" -o \
        -name "*.7z" \) | while read archive; do
        
        local basename=$(basename "$archive")
        local extract_dir="$target_dir/${basename%.*}"
        
        echo "处理: $archive"
        
        if auto_extract "$archive" "$extract_dir"; then
            ((count++))
            echo "成功解压到: $extract_dir"
        else
            echo "解压失败: $archive"
        fi
        echo
    done
    
    echo "批量解压完成，处理了 $count 个文件"
}

# 使用示例
auto_extract "archive.tar.gz" "/tmp/extracted"
batch_extract "/downloads" "/tmp/all_extracted"
```

## 性能优化技巧

### 并行压缩

```bash
# 使用并行工具
pigz file.txt          # 并行gzip
pbzip2 file.txt        # 并行bzip2
pixz file.txt          # 并行xz

# 指定线程数
pigz -p 4 file.txt
pbzip2 -p4 file.txt
pixz -p 4 file.txt

# 与tar结合使用
tar -cf - directory/ | pigz > archive.tar.gz
tar -cf - directory/ | pbzip2 > archive.tar.bz2
tar -cf - directory/ | pixz > archive.tar.xz
```

### 内存优化

```bash
# 限制内存使用
xz --memory=512MiB file.txt
bzip2 --small file.txt

# 流式处理大文件
cat large_file | gzip > large_file.gz
tar -cf - large_directory/ | gzip > large_directory.tar.gz
```

### 网络传输优化

```bash
# 压缩后传输
tar -czf - directory/ | ssh user@remote 'cat > backup.tar.gz'

# 实时压缩传输
tar -cf - directory/ | gzip | ssh user@remote 'gunzip | tar -xf -'

# 使用rsync压缩传输
rsync -avz directory/ user@remote:/backup/
```

## 故障排除

### 压缩文件损坏

```bash
# 测试文件完整性
gzip -t file.gz
bzip2 -t file.bz2
xz -t file.xz
zip -T file.zip
unrar t file.rar
7z t file.7z

# 尝试修复
gzip -f file.gz      # 强制解压
bzip2 -f file.bz2
zip -F file.zip      # 修复zip文件
zip -FF file.zip     # 更彻底的修复
```

### 空间不足问题

```bash
# 检查磁盘空间
df -h

# 流式处理避免临时文件
tar -cf - source/ | gzip | ssh remote 'cat > backup.tar.gz'

# 分卷压缩
tar -cf - large_directory/ | split -b 1G - backup.tar.
zip -s 1g archive.zip large_directory/
rar a -v1000m archive.rar large_directory/
```

### 权限问题

```bash
# 保持权限
tar -cpzf archive.tar.gz directory/

# 以root权限解压
sudo tar -xzpf archive.tar.gz

# 修改解压后的权限
chown -R user:group extracted_directory/
```

## 总结

压缩归档是Linux系统管理中的重要技能，掌握这些命令对于文件管理、备份和传输至关重要：

### 核心命令分类

1. **归档工具**：`tar` - 最常用的归档工具，支持多种压缩格式
2. **压缩工具**：`gzip`、`bzip2`、`xz` - 不同压缩比和速度的选择
3. **通用格式**：`zip`、`rar`、`7z` - 跨平台兼容性好
4. **并行工具**：`pigz`、`pbzip2`、`pixz` - 提高压缩速度

### 选择建议

1. **日常使用**：`tar.gz` - 兼容性好，压缩比适中
2. **高压缩比**：`tar.xz` - 文件较小，但压缩时间长
3. **快速压缩**：`tar.gz` 配合 `pigz` - 速度快
4. **跨平台**：`zip` - Windows兼容性最好
5. **大文件**：分卷压缩或流式处理

### 最佳实践

1. **选择合适的压缩格式**：根据需求平衡压缩比、速度和兼容性
2. **使用并行工具**：充分利用多核CPU提高效率
3. **定期备份**：自动化备份脚本，定期清理旧备份
4. **验证完整性**：压缩后测试文件完整性
5. **文档记录**：记录压缩参数和恢复方法

### 学习建议

1. **理解原理**：了解不同压缩算法的特点和适用场景
2. **实践操作**：在测试环境中练习各种压缩操作
3. **性能测试**：比较不同方法的压缩比和速度
4. **脚本自动化**：编写脚本自动化常见的压缩任务
5. **故障处理**：学会处理压缩文件损坏等问题

掌握压缩归档命令将大大提高文件管理效率，是Linux系统管理员和开发者必备的技能。