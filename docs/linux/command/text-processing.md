# 文本处理命令

## 概述

文本处理是Linux系统中的核心功能之一。Linux提供了丰富的文本处理工具，可以进行文件查看、搜索、编辑、排序、统计等各种操作。这些命令在日志分析、数据处理、系统管理等场景中发挥着重要作用。

## 文件查看命令

### cat - 显示文件内容

**功能**：连接并显示文件内容，适合查看小文件。

**语法**：
```bash
cat [选项] [文件...]
```

**常用选项**：
- `-n`：显示行号
- `-b`：只对非空行显示行号
- `-s`：压缩连续的空行为一行
- `-T`：显示制表符为^I
- `-E`：在每行末尾显示$
- `-A`：等同于-vET，显示所有非打印字符

**示例**：
```bash
# 显示文件内容
cat file.txt

# 显示多个文件
cat file1.txt file2.txt

# 显示行号
cat -n file.txt
# 输出：
#      1  第一行内容
#      2  第二行内容
#      3  
#      4  第四行内容

# 只对非空行显示行号
cat -b file.txt
# 输出：
#      1  第一行内容
#      2  第二行内容
#
#      3  第四行内容

# 压缩空行
cat -s file.txt

# 创建文件（重定向）
cat > newfile.txt
# 输入内容，Ctrl+D结束

# 追加内容到文件
cat >> existingfile.txt

# 合并文件
cat file1.txt file2.txt > merged.txt
```

### less/more - 分页查看文件

**功能**：分页显示文件内容，适合查看大文件。

#### less命令（推荐）

**语法**：
```bash
less [选项] 文件
```

**常用选项**：
- `-N`：显示行号
- `-S`：不换行显示长行
- `-i`：搜索时忽略大小写
- `-F`：如果文件小于一屏则直接显示并退出

**交互操作**：
- `空格键`：向下翻页
- `b`：向上翻页
- `j`或`↓`：向下一行
- `k`或`↑`：向上一行
- `g`：跳到文件开头
- `G`：跳到文件末尾
- `/pattern`：向下搜索
- `?pattern`：向上搜索
- `n`：下一个搜索结果
- `N`：上一个搜索结果
- `q`：退出

**示例**：
```bash
# 查看文件
less file.txt

# 显示行号
less -N file.txt

# 不换行显示
less -S file.txt

# 查看命令输出
ps aux | less
ls -la | less
```

#### more命令

**功能**：类似less，但功能较少。

**基本操作**：
- `空格键`：向下翻页
- `Enter`：向下一行
- `q`：退出
- `/pattern`：搜索

### head - 显示文件开头

**功能**：显示文件的前几行，默认显示前10行。

**语法**：
```bash
head [选项] [文件...]
```

**常用选项**：
- `-n 数字`：显示前n行
- `-c 数字`：显示前n个字符
- `-q`：多文件时不显示文件名
- `-v`：总是显示文件名

**示例**：
```bash
# 显示前10行（默认）
head file.txt

# 显示前5行
head -n 5 file.txt
head -5 file.txt  # 简写形式

# 显示前100个字符
head -c 100 file.txt

# 查看多个文件
head file1.txt file2.txt

# 查看日志文件开头
head /var/log/syslog

# 结合管道使用
ls -la | head -5
```

### tail - 显示文件结尾

**功能**：显示文件的后几行，默认显示后10行。

**语法**：
```bash
tail [选项] [文件...]
```

**常用选项**：
- `-n 数字`：显示后n行
- `-c 数字`：显示后n个字符
- `-f`：实时跟踪文件变化（常用于日志监控）
- `-F`：类似-f，但文件被删除重建时会重新打开
- `-q`：多文件时不显示文件名
- `-v`：总是显示文件名
- `--pid=PID`：与-f配合，当指定进程结束时停止跟踪

**示例**：
```bash
# 显示后10行（默认）
tail file.txt

# 显示后20行
tail -n 20 file.txt
tail -20 file.txt  # 简写形式

# 显示后100个字符
tail -c 100 file.txt

# 实时监控日志文件（最常用）
tail -f /var/log/syslog
tail -f /var/log/apache2/access.log

# 从第10行开始显示到文件末尾
tail -n +10 file.txt

# 监控多个文件
tail -f file1.log file2.log

# 结合其他命令
ps aux | tail -5
```

## 文本搜索命令

### grep - 文本搜索

**功能**：在文件中搜索匹配指定模式的行。

**语法**：
```bash
grep [选项] 模式 [文件...]
```

**常用选项**：
- `-i`：忽略大小写
- `-v`：反向匹配（显示不匹配的行）
- `-n`：显示行号
- `-c`：只显示匹配行的数量
- `-l`：只显示包含匹配的文件名
- `-r`或`-R`：递归搜索目录
- `-w`：匹配整个单词
- `-x`：匹配整行
- `-A n`：显示匹配行及其后n行
- `-B n`：显示匹配行及其前n行
- `-C n`：显示匹配行及其前后n行
- `--color`：高亮显示匹配内容

**示例**：
```bash
# 基本搜索
grep "error" log.txt

# 忽略大小写搜索
grep -i "ERROR" log.txt

# 显示行号
grep -n "error" log.txt
# 输出：15:Error: File not found

# 反向匹配
grep -v "debug" log.txt

# 统计匹配行数
grep -c "error" log.txt
# 输出：5

# 递归搜索目录
grep -r "TODO" /home/user/project/

# 匹配整个单词
grep -w "cat" file.txt  # 不会匹配"catch"中的"cat"

# 显示匹配行的上下文
grep -A 3 -B 2 "error" log.txt  # 显示匹配行前2行后3行
grep -C 3 "error" log.txt        # 显示匹配行前后各3行

# 搜索多个文件
grep "pattern" *.txt

# 使用正则表达式
grep "^Error" log.txt     # 以Error开头的行
grep "Error$" log.txt     # 以Error结尾的行
grep "[0-9]\+" file.txt   # 包含数字的行

# 结合管道使用
ps aux | grep "apache"
cat /etc/passwd | grep "user"
```

### find - 查找文件

**功能**：在目录树中查找文件和目录。

**语法**：
```bash
find [路径] [表达式]
```

**常用选项**：
- `-name`：按文件名查找
- `-iname`：按文件名查找（忽略大小写）
- `-type`：按文件类型查找（f=文件，d=目录，l=链接）
- `-size`：按文件大小查找
- `-mtime`：按修改时间查找
- `-user`：按所有者查找
- `-group`：按所属组查找
- `-perm`：按权限查找
- `-exec`：对找到的文件执行命令
- `-delete`：删除找到的文件

**示例**：
```bash
# 按名称查找
find /home -name "*.txt"
find . -name "config.conf"

# 忽略大小写查找
find /home -iname "*.TXT"

# 按类型查找
find /home -type f  # 查找文件
find /home -type d  # 查找目录
find /home -type l  # 查找符号链接

# 按大小查找
find /home -size +100M      # 大于100MB的文件
find /home -size -1k        # 小于1KB的文件
find /home -size 50c        # 正好50字节的文件

# 按时间查找
find /home -mtime -7        # 7天内修改的文件
find /home -mtime +30       # 30天前修改的文件
find /home -mtime 0         # 今天修改的文件

# 按权限查找
find /home -perm 755        # 权限为755的文件
find /home -perm -644       # 至少有644权限的文件

# 组合条件
find /home -name "*.log" -size +10M
find /home -type f -name "*.tmp" -mtime +7

# 执行操作
find /home -name "*.tmp" -delete
find /home -name "*.txt" -exec ls -l {} \;
find /home -name "*.log" -exec gzip {} \;

# 查找并复制
find /home -name "*.conf" -exec cp {} /backup/ \;

# 使用xargs提高效率
find /home -name "*.txt" | xargs ls -l
find /home -name "*.log" | xargs grep "error"
```

## 文本编辑和处理命令

### sed - 流编辑器

**功能**：对文本进行流式编辑，可以进行替换、删除、插入等操作。

**语法**：
```bash
sed [选项] '命令' [文件...]
```

**常用选项**：
- `-i`：直接修改文件
- `-e`：指定多个编辑命令
- `-n`：静默模式，只输出处理的行
- `-r`：使用扩展正则表达式

**常用命令**：
- `s/old/new/`：替换
- `d`：删除行
- `p`：打印行
- `a`：在行后添加
- `i`：在行前插入
- `c`：替换整行

**示例**：
```bash
# 基本替换
sed 's/old/new/' file.txt          # 替换每行第一个匹配
sed 's/old/new/g' file.txt         # 替换所有匹配
sed 's/old/new/2' file.txt         # 替换每行第二个匹配

# 直接修改文件
sed -i 's/old/new/g' file.txt

# 删除行
sed '3d' file.txt                  # 删除第3行
sed '2,5d' file.txt                # 删除第2-5行
sed '/pattern/d' file.txt          # 删除包含pattern的行
sed '/^$/d' file.txt               # 删除空行

# 打印特定行
sed -n '3p' file.txt               # 只打印第3行
sed -n '2,5p' file.txt             # 只打印第2-5行
sed -n '/pattern/p' file.txt       # 只打印匹配的行

# 添加和插入
sed '3a\新增行' file.txt           # 在第3行后添加
sed '3i\插入行' file.txt           # 在第3行前插入
sed '/pattern/a\新增行' file.txt   # 在匹配行后添加

# 替换整行
sed '3c\新的第3行' file.txt        # 替换第3行
sed '/pattern/c\新行' file.txt     # 替换匹配的行

# 多个命令
sed -e 's/old1/new1/g' -e 's/old2/new2/g' file.txt
sed 's/old1/new1/g; s/old2/new2/g' file.txt

# 使用正则表达式
sed 's/[0-9]\+/NUMBER/g' file.txt  # 替换数字为NUMBER
sed 's/^[ \t]*//' file.txt         # 删除行首空白
sed 's/[ \t]*$//' file.txt         # 删除行尾空白

# 实用示例
# 注释配置文件中的某行
sed -i '/^DEBUG/s/^/#/' config.conf

# 取消注释
sed -i 's/^#\(.*DEBUG.*\)/\1/' config.conf

# 替换配置值
sed -i 's/^port=.*/port=8080/' config.conf
```

### awk - 文本处理工具

**功能**：强大的文本处理和数据提取工具，特别适合处理结构化文本。

**语法**：
```bash
awk [选项] 'program' [文件...]
awk [选项] -f script.awk [文件...]
```

**基本结构**：
```bash
awk 'BEGIN{初始化} {处理每行} END{结束处理}' file
```

**内置变量**：
- `$0`：整行内容
- `$1, $2, ...`：第1列、第2列等
- `NF`：当前行的字段数
- `NR`：当前行号
- `FS`：字段分隔符（默认空格）
- `OFS`：输出字段分隔符
- `RS`：记录分隔符（默认换行）
- `ORS`：输出记录分隔符

**示例**：
```bash
# 打印特定列
awk '{print $1}' file.txt          # 打印第1列
awk '{print $1, $3}' file.txt      # 打印第1和第3列
awk '{print $NF}' file.txt         # 打印最后一列

# 指定分隔符
awk -F: '{print $1}' /etc/passwd    # 以冒号为分隔符
awk -F',' '{print $2}' data.csv     # 处理CSV文件

# 条件处理
awk '$3 > 100' file.txt             # 打印第3列大于100的行
awk '$1 == "root"' /etc/passwd      # 打印第1列等于root的行
awk '/pattern/ {print $2}' file.txt # 匹配pattern的行，打印第2列

# 计算和统计
awk '{sum += $3} END {print sum}' file.txt     # 计算第3列总和
awk '{count++} END {print count}' file.txt     # 统计行数
awk '{sum += $3; count++} END {print sum/count}' file.txt  # 计算平均值

# 格式化输出
awk '{printf "%-10s %5d\n", $1, $2}' file.txt
awk '{print "Name: " $1 ", Age: " $2}' file.txt

# 使用BEGIN和END
awk 'BEGIN {print "开始处理"} {print NR, $0} END {print "处理完成"}' file.txt

# 多条件
awk '$3 > 100 && $4 < 50' file.txt
awk '$1 ~ /^[Aa]/ {print $0}' file.txt  # 第1列以A或a开头

# 实用示例
# 分析日志文件
awk '{print $1}' access.log | sort | uniq -c | sort -nr  # 统计IP访问次数

# 处理系统信息
ps aux | awk '{sum += $6} END {print "Total Memory: " sum/1024 " MB"}'

# 处理CSV文件
awk -F',' '{if(NR>1) print $2, $3}' data.csv  # 跳过标题行

# 计算文件大小
ls -l | awk '{sum += $5} END {print "Total: " sum " bytes"}'
```

### sort - 排序

**功能**：对文本行进行排序。

**语法**：
```bash
sort [选项] [文件...]
```

**常用选项**：
- `-r`：逆序排序
- `-n`：按数值排序
- `-k`：指定排序字段
- `-t`：指定字段分隔符
- `-u`：去除重复行
- `-f`：忽略大小写
- `-o`：输出到文件
- `-c`：检查是否已排序
- `-m`：合并已排序的文件

**示例**：
```bash
# 基本排序
sort file.txt

# 逆序排序
sort -r file.txt

# 数值排序
sort -n numbers.txt

# 按指定列排序
sort -k 2 file.txt              # 按第2列排序
sort -k 2,2 file.txt            # 只按第2列排序
sort -k 2n file.txt             # 按第2列数值排序
sort -k 2r file.txt             # 按第2列逆序排序

# 指定分隔符
sort -t: -k 3n /etc/passwd      # 按UID排序
sort -t',' -k 2 data.csv        # CSV文件按第2列排序

# 去重排序
sort -u file.txt

# 多字段排序
sort -k 1,1 -k 2n file.txt      # 先按第1列字母序，再按第2列数值序

# 输出到文件
sort file.txt -o sorted.txt

# 检查排序
sort -c file.txt

# 实用示例
# 按文件大小排序
ls -l | sort -k 5n

# 按内存使用排序
ps aux | sort -k 6n

# 统计并排序
cut -d: -f7 /etc/passwd | sort | uniq -c | sort -nr
```

### uniq - 去重

**功能**：报告或删除重复行（需要先排序）。

**语法**：
```bash
uniq [选项] [输入文件] [输出文件]
```

**常用选项**：
- `-c`：显示每行出现的次数
- `-d`：只显示重复的行
- `-u`：只显示不重复的行
- `-i`：忽略大小写
- `-f n`：忽略前n个字段
- `-s n`：忽略前n个字符

**示例**：
```bash
# 基本去重（需要先排序）
sort file.txt | uniq

# 统计重复次数
sort file.txt | uniq -c
# 输出：
#   3 apple
#   1 banana
#   2 orange

# 只显示重复的行
sort file.txt | uniq -d

# 只显示不重复的行
sort file.txt | uniq -u

# 忽略大小写
sort file.txt | uniq -i

# 实用示例
# 统计最常用的命令
history | awk '{print $2}' | sort | uniq -c | sort -nr | head -10

# 统计日志中的IP
awk '{print $1}' access.log | sort | uniq -c | sort -nr

# 查找重复文件（按大小）
find /home -type f -exec ls -l {} \; | awk '{print $5, $9}' | sort | uniq -d
```

### wc - 统计

**功能**：统计文件的行数、单词数、字符数。

**语法**：
```bash
wc [选项] [文件...]
```

**常用选项**：
- `-l`：只显示行数
- `-w`：只显示单词数
- `-c`：只显示字节数
- `-m`：只显示字符数
- `-L`：显示最长行的长度

**示例**：
```bash
# 完整统计
wc file.txt
# 输出：  100  500 3000 file.txt
#       行数 单词数 字节数 文件名

# 只统计行数
wc -l file.txt
wc -l *.txt                     # 统计多个文件

# 只统计单词数
wc -w file.txt

# 只统计字符数
wc -c file.txt

# 最长行长度
wc -L file.txt

# 实用示例
# 统计代码行数
find . -name "*.py" | xargs wc -l

# 统计日志大小
wc -c /var/log/*.log

# 统计用户数
wc -l /etc/passwd

# 结合管道使用
ps aux | wc -l                  # 统计进程数
ls | wc -l                      # 统计文件数
grep "error" log.txt | wc -l    # 统计错误行数
```

## 实用技巧和最佳实践

### 1. 管道组合使用

```bash
# 复杂的文本处理流水线
cat access.log | grep "404" | awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# 分析系统进程
ps aux | grep -v grep | awk '{print $11}' | sort | uniq -c | sort -nr

# 处理CSV数据
cat data.csv | sed '1d' | awk -F',' '{sum+=$3} END {print "Average:", sum/NR}'
```

### 2. 正则表达式技巧

```bash
# 匹配IP地址
grep -E "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" file.txt

# 匹配邮箱地址
grep -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" file.txt

# 匹配日期格式
grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" file.txt
```

### 3. 性能优化

```bash
# 大文件处理时使用适当的工具
# 查看大文件开头
head -1000 largefile.txt

# 搜索大文件时使用grep而不是cat+grep
grep "pattern" largefile.txt  # 好
cat largefile.txt | grep "pattern"  # 不推荐

# 使用LC_ALL=C加速排序
LC_ALL=C sort largefile.txt
```

### 4. 数据处理模式

```bash
# ETL模式：提取-转换-加载
# 提取
grep "ERROR" /var/log/app.log > errors.txt

# 转换
sed 's/.*\[\(.*\)\].*/\1/' errors.txt | \
awk '{print $1, $2}' > processed.txt

# 加载/分析
sort processed.txt | uniq -c | sort -nr > error_summary.txt
```

### 5. 调试和测试

```bash
# 逐步构建复杂命令
cat file.txt                    # 第1步：查看原始数据
cat file.txt | grep "pattern"   # 第2步：过滤
cat file.txt | grep "pattern" | awk '{print $2}'  # 第3步：提取

# 使用head限制输出进行测试
cat largefile.txt | head -100 | grep "pattern" | awk '{print $2}'
```

## 常见问题和解决方案

### 1. 编码问题

**问题**：中文显示乱码

**解决方案**：
```bash
# 检查文件编码
file -i file.txt

# 转换编码
iconv -f gbk -t utf-8 file.txt > file_utf8.txt

# 设置环境变量
export LANG=zh_CN.UTF-8
```

### 2. 大文件处理

**问题**：文件太大，处理缓慢

**解决方案**：
```bash
# 分块处理
split -l 10000 largefile.txt chunk_

# 使用更高效的工具
# 用grep代替cat+grep
grep "pattern" largefile.txt

# 用awk代替多个管道
awk '/pattern/ {print $2}' file.txt
```

### 3. 内存不足

**问题**：sort命令内存不足

**解决方案**：
```bash
# 使用临时目录
sort -T /tmp largefile.txt

# 限制内存使用
sort -S 1G largefile.txt

# 外部排序
sort --parallel=4 largefile.txt
```

## 总结

文本处理命令是Linux系统的核心工具，掌握这些命令对于系统管理、数据分析、日志处理等工作至关重要：

1. **查看命令**：`cat`、`less`、`head`、`tail` - 查看文件内容
2. **搜索命令**：`grep`、`find` - 查找文本和文件
3. **编辑命令**：`sed`、`awk` - 文本编辑和处理
4. **排序命令**：`sort`、`uniq` - 数据排序和去重
5. **统计命令**：`wc` - 文本统计

**学习建议**：
- 从简单的单命令开始，逐步学习组合使用
- 多练习正则表达式，提高搜索和替换效率
- 学会使用管道组合多个命令
- 针对大文件学习性能优化技巧
- 在实际工作中多应用，如日志分析、数据处理等

这些文本处理工具的熟练掌握将大大提高在Linux环境下的工作效率。