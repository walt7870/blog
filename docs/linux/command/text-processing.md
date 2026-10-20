# 文本处理命令

日志中有三条 HTTP 500，却不一定有三个失败订单：同一请求可能重试，异常堆栈也可能占多行。文本工具只能按输入格式筛选、提取和统计，业务结论还要核对请求编号、时间窗口和最终状态。

这里以 Linux/GNU 工具与 Bash 为例。查看大文件和跟踪轮转日志见 [文件查看与编辑](./file-view-edit.md)，定位路径见 [文件查找](./file-search.md)；本页集中解释内容处理，避免把同一套命令在多篇文章重复展开。

## 先确定记录和字段

![从日志记录筛选状态、提取路径、分组计数并核对原始请求](/linux/text-record-pipeline.svg)

假设服务已经输出约定的四列记录：请求编号、HTTP 状态、接口路径、耗时毫秒；字段以空格分隔，字段内部没有空格。下面在新临时目录构造固定输入：

```bash
text_lab_dir=$(mktemp -d)
printf '%s\n' \
  'req-2048 500 /orders/export 1200' \
  'req-2049 200 /orders/2049 35' \
  'req-2048 500 /orders/export 900' \
  'req-2050 503 /payments 2000' \
  > "$text_lab_dir/requests.log"
```

这个输入有四条记录、三条 5xx、两个不同的 5xx 请求编号。`req-2048` 出现两次，直接把日志行数当失败订单数就会多算；是否最终失败，还需要完整请求状态。真实 Nginx combined 日志包含带空格的时间和请求行，不能直接套用这里的列号。

## grep 负责匹配，awk 负责字段

```bash
grep -n -F -C 1 -- 'req-2048' "$text_lab_dir/requests.log"
awk '$2 ~ /^5[0-9][0-9]$/ {print $3}' "$text_lab_dir/requests.log" \
  > "$text_lab_dir/failed-paths.txt"
awk '$2 ~ /^5[0-9][0-9]$/ {print $1}' "$text_lab_dir/requests.log" \
  > "$text_lab_dir/failed-requests.txt"
```

`grep -F` 把请求编号按固定字符串处理；`-n` 保留行号，`-C` 保留上下文。固定字符串也可能命中更长字段，例如 `req-20480`；要求精确字段时用 `awk '$1 == "req-2048"'`。`grep -E` 用扩展正则，`-x` 匹配整行，`-v` 反选，`-c` 统计匹配行，均不理解订单对象。

awk 默认按连续空白拆字段，`$0` 为整条记录，`$1` 到 `$NF` 是字段，`NR` 为已读记录数，`FNR` 为当前文件记录数。`BEGIN` 在读取前执行，`END` 在读取结束后执行；用单引号包住程序，让 `$2` 留给 awk 解释。外部变量用 `-v key="$value"` 传递，不直接拼进程序文本。

CSV 可包含带逗号或换行的引号字段，`awk -F,` 与 `cut -d,` 只适合明确没有这些情况的简单分隔文件。JSON 用 `jq`，CSV 用 CSV 解析器；不要用正则替换嵌套结构。

## 排序、相邻去重与计数

```bash
LC_ALL=C sort -- "$text_lab_dir/failed-paths.txt" \
  > "$text_lab_dir/paths.sorted"
uniq -c -- "$text_lab_dir/paths.sorted"
LC_ALL=C sort -u -- "$text_lab_dir/failed-requests.txt" \
  > "$text_lab_dir/request-ids.txt"
wc -l -- "$text_lab_dir/request-ids.txt"
awk '$2 ~ /^5[0-9][0-9]$/ {sum += $4; count++}
     END {if (count) printf "count=%d average_ms=%.2f\n", count, sum/count;
          else print "count=0 average_ms=NA"}' "$text_lab_dir/requests.log"
```

路径频次应为 `/orders/export` 两次、`/payments` 一次；不同请求编号数为 2；耗时统计为 `count=3 average_ms=1366.67`。平均值的分母是命中记录数，不是全文件 `NR`；没有命中时不能除以零。

`uniq` 只合并相邻相同记录，不要求输入天然有序；若要全局去重，先按相同规则排序。`uniq -d` 输出重复组代表行，`-u` 输出只出现一次的组，`-c` 输出频次。`sort -u` 可合并这两步，但排序键、忽略大小写等选项会改变“相同”的定义。使用 `uniq -i` 时，前序排序也要用兼容的大小写规则。

`sort -n` 进行数值比较；`-k 2,2n` 只按第二字段数值排序，`-k 2` 的键会延伸到行尾。`LC_ALL=C` 固定字节排序规则，适合可复现的机器标识比较，会改变自然语言的排序与字符分类，不能当成所有文本处理的默认提速开关。

## 行、字节与字符不是同一个量

| 入口 | 实际含义 | 常见误用 |
| --- | --- | --- |
| `wc -l` | 换行符数量 | 末尾没有换行时，视觉最后一行不增加计数 |
| `wc -c` | 字节数量 | UTF-8 中文通常占多个字节 |
| `wc -m` | 当前 locale 下的字符数量 | 不是用户感知的字形簇数量 |
| `head -c 100` / `tail -c 100` | 前/后 100 字节 | 可能切断 UTF-8 字符 |
| `cut -d: -f1` | 单字符分隔符的字段提取 | 不解析带引号的 CSV，也不合并连续分隔符 |
| `tr -d '\r'` | 删除所有 CR 字节 | 不只是修正 CRLF 行尾 |

例如没有末尾换行的 `printf 'abc'`，字节数是 3，`wc -l` 是 0。编码转换应确认源编码，写入新文件并检查退出码；`file -i` 只能提供识别线索，修改 `LANG` 不会把已有 GBK 字节自动转换成 UTF-8。

## sed 转换先输出新文件

```bash
printf 'port=8080\ndebug=false\n' > "$text_lab_dir/app.conf"
sed 's/^port=8080$/port=8081/' "$text_lab_dir/app.conf" \
  > "$text_lab_dir/app.candidate.conf"
diff -u -- "$text_lab_dir/app.conf" "$text_lab_dir/app.candidate.conf"
```

预期只出现端口一行的差异，`diff` 返回 1 表示有差异。`s/old/new/` 替换每行首个命中，尾部 `g` 替换该行全部命中；`sed -n '120,150p'` 只打印指定范围，`/pattern/d` 删除命中行。`-E` 选择扩展正则；正则与替换文本中的 `&`、反斜杠和分隔符都有语义，不能把任意输入直接拼接进去。

重定向由 shell 先执行，`sed ... file > file` 会先截断输入；`sed -i` 在 GNU 与 BSD/macOS 的参数和链接处理上也有差异。配置修改应先保留原文件，检查新文件、文件属性及服务自身语法，再安排替换、加载和业务复验。文本替换成功不证明配置已经生效。

## 把流水线的失败保留下来

Bash 默认只返回管道最后一个命令的状态，前面的文件打不开，后面的排序仍可能成功。自动化需要明确 `pipefail`，并区分 grep 的 0（匹配）、1（无匹配）与错误；`set -e` 不是完整错误处理。处理固定文件时可像上面的实验一样保留中间产物与每步退出码，便于定位哪一步把记录丢掉。

使用 `head` 提前关闭管道会使上游收到 SIGPIPE；这是截取输出时的常见结果，不能在 `pipefail` 下不加解释地把所有非零归为同一故障。大文件排序可用 `sort -T` 指定有足够空间的临时目录、`-S` 调整主内存缓冲；该值不是进程总内存硬上限，并行线程也可能增加内存。先核对全量输入，再决定采样或分块，跨块的排序与去重必须做全局合并。

最终应能回答：输入覆盖哪个时间段，记录格式是否一致，坏行如何处理，重复与重试怎样计数，处理失败有没有被保留。需要比较结果集合或配置差异时，继续看 [文本比较](./text-compare.md)。
