# Linux 文本比较和合并

## 概述

文本比较和合并是 Linux 系统管理和开发中的重要技能。Linux 提供了多种强大的文本比较工具，可以用于文件差异分析、代码审查、配置对比等场景。掌握这些工具可以大大提高工作效率和准确性。

## 主要比较工具

### diff - 文件差异比较

#### 基本语法
```bash
diff [选项] 文件1 文件2
```

#### 常用选项
- `-u`：统一格式输出
- `-c`：上下文格式输出
- `-i`：忽略大小写
- `-w`：忽略空白字符
- `-r`：递归比较目录
- `-N`：处理不存在的文件
- `-B`：忽略空行差异

#### 基本用法示例

##### 比较两个文件
```bash
# 基本比较
diff file1.txt file2.txt

# 统一格式输出
diff -u file1.txt file2.txt

# 上下文格式输出
diff -c file1.txt file2.txt
```

##### 忽略差异类型
```bash
# 忽略大小写
diff -i file1.txt file2.txt

# 忽略空白字符
diff -w file1.txt file2.txt

# 忽略空行
diff -B file1.txt file2.txt

# 组合多个选项
diff -uiw file1.txt file2.txt
```

##### 比较目录
```bash
# 递归比较目录
diff -r dir1/ dir2/

# 递归比较并显示统一格式
diff -ur dir1/ dir2/

# 只显示差异文件名
diff -rq dir1/ dir2/
```

#### 输出格式说明

##### 标准格式
```
1a2
> 新行内容
4c5
< 删除的行内容
---
> 替换的行内容
```

##### 统一格式 (-u)
```
--- file1.txt   2023-01-01 10:00:00
+++ file2.txt   2023-01-01 10:00:00
@@ -1,3 +1,4 @@
 相同行
-删除的行
+添加的行
 相同行
```

### comm - 逐行比较文件

#### 基本语法
```bash
comm [选项] 文件1 文件2
```

#### 常用选项
- `-1`：不显示第一个文件独有的行
- `-2`：不显示第二个文件独有的行
- `-3`：不显示两个文件共有的行
- `-i`：忽略大小写

#### 基本用法
```bash
# 基本比较
comm file1.txt file2.txt

# 只显示第一个文件独有的行
comm -23 file1.txt file2.txt

# 只显示第二个文件独有的行
comm -13 file1.txt file2.txt

# 只显示两个文件共有的行
comm -12 file1.txt file2.txt
```

#### 输出格式说明
```
                第一个文件独有的行
                        第二个文件独有的行
                                两个文件共有的行
```

### join - 基于公共字段连接文件

#### 基本语法
```bash
join [选项] 文件1 文件2
```

#### 常用选项
- `-1`：指定第一个文件的连接字段
- `-2`：指定第二个文件的连接字段
- `-t`：指定字段分隔符
- `-i`：忽略大小写
- `-a`：显示未匹配的行

#### 基本用法
```bash
# 基于第一个字段连接
join file1.txt file2.txt

# 指定分隔符
join -t: file1.txt file2.txt

# 指定连接字段
join -1 2 -2 1 file1.txt file2.txt

# 显示未匹配的行
join -a1 -a2 file1.txt file2.txt
```

### paste - 合并文件行

#### 基本语法
```bash
paste [选项] 文件...
```

#### 常用选项
- `-d`：指定分隔符
- `-s`：串行合并
- `-`：从标准输入读取

#### 基本用法
```bash
# 并行合并文件
paste file1.txt file2.txt

# 指定分隔符
paste -d: file1.txt file2.txt

# 串行合并
paste -s file1.txt file2.txt

# 使用制表符分隔
paste -d$'\t' file1.txt file2.txt
```

## 高级比较技巧

### 使用补丁文件

#### 创建补丁文件
```bash
# 创建补丁文件
diff -u original.txt modified.txt > changes.patch

# 创建目录补丁
diff -ur original_dir/ modified_dir/ > changes.patch
```

#### 应用补丁文件
```bash
# 应用补丁
patch original.txt < changes.patch

# 应用目录补丁
patch -p1 < changes.patch

# 反向应用补丁
patch -R original.txt < changes.patch
```

### 使用 sdiff - 并排比较

#### 基本语法
```bash
sdiff [选项] 文件1 文件2
```

#### 常用选项
- `-w`：指定输出宽度
- `-l`：只显示左文件
- `-s`：不显示相同行
- `-o`：输出到文件

#### 基本用法
```bash
# 并排比较
sdiff file1.txt file2.txt

# 指定输出宽度
sdiff -w 80 file1.txt file2.txt

# 只显示左文件
sdiff -l file1.txt file2.txt

# 输出到文件
sdiff -o merged.txt file1.txt file2.txt
```

### 使用 vimdiff

#### 基本语法
```bash
vimdiff 文件1 文件2 [文件3...]
```

#### 基本用法
```bash
# 比较两个文件
vimdiff file1.txt file2.txt

# 比较多个文件
vimdiff file1.txt file2.txt file3.txt

# 在 vim 中打开差异视图
vim -d file1.txt file2.txt
```

#### vimdiff 常用命令
- `]c`：跳转到下一个差异
- `[c`：跳转到上一个差异
- `do`：获取当前差异
- `dp`：推送当前差异
- `zo`：打开折叠
- `zc`：关闭折叠

## 实用比较脚本

### 比较配置文件
```bash
#!/bin/bash
# 比较两个配置文件
diff -u /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
```

### 查找重复行
```bash
#!/bin/bash
# 查找两个文件中的重复行
comm -12 <(sort file1.txt) <(sort file2.txt)
```

### 比较目录结构
```bash
#!/bin/bash
# 比较两个目录的文件列表
diff <(find dir1 -type f | sort) <(find dir2 -type f | sort)
```

### 合并多个文件
```bash
#!/bin/bash
# 合并多个文件的内容
paste -d$'\n' file1.txt file2.txt file3.txt > merged.txt
```

## 特殊比较场景

### 比较二进制文件
```bash
# 使用 cmp 比较二进制文件
cmp file1.bin file2.bin

# 使用 hexdump 查看十六进制差异
diff <(hexdump -C file1.bin) <(hexdump -C file2.bin)
```

### 比较压缩文件
```bash
# 比较压缩文件内容
diff <(zcat file1.gz) <(zcat file2.gz)

# 比较 tar 归档文件
diff <(tar -tf archive1.tar) <(tar -tf archive2.tar)
```

### 比较 JSON 文件
```bash
# 格式化 JSON 后比较
diff <(jq -S . file1.json) <(jq -S . file2.json)
```

### 比较 CSV 文件
```bash
# 排序后比较 CSV 文件
diff <(sort file1.csv) <(sort file2.csv)
```

## 性能优化

### 大文件比较
```bash
# 使用 split 分割大文件
split -l 1000 large_file.txt large_file_part_

# 逐部分比较
for i in large_file_part_*; do
    diff "$i" "other_${i#large_file_part_}"
done
```

### 并行比较
```bash
# 使用 parallel 并行比较多个文件
parallel diff {} {.}.bak ::: *.txt
```

## 故障排除

### 常见问题

#### 编码问题
```bash
# 转换编码后比较
diff <(iconv -f UTF-8 -t ASCII file1.txt) <(iconv -f UTF-8 -t ASCII file2.txt)
```

#### 行结束符问题
```bash
# 统一行结束符后比较
diff <(dos2unix file1.txt) <(dos2unix file2.txt)
```

#### 权限问题
```bash
# 使用 sudo 比较系统文件
sudo diff /etc/passwd /etc/passwd.backup
```

## 最佳实践

### 比较策略
1. **选择合适的工具**：简单比较用 diff，结构化数据用 join
2. **预处理文件**：排序、去重、格式化
3. **使用版本控制**：结合 git diff 等工具
4. **保存比较结果**：使用补丁文件保存差异

### 性能考虑
1. **限制比较范围**：只比较必要的文件或目录
2. **使用索引**：对大型数据集建立索引
3. **并行处理**：利用多核处理器加速比较
4. **增量比较**：只比较变化的部分

## 总结

Linux 文本比较工具提供了强大的文件差异分析能力，从简单的行比较到复杂的结构化数据合并，每种工具都有其适用场景。掌握这些工具的使用方法和最佳实践，可以大大提高文件管理和数据分析的效率。 