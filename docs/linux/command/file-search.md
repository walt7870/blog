# 文件查找与定位

订单服务报“配置不存在”，可能是路径写错、当前目录不同、符号链接失效，也可能是服务看到了另一个挂载视图。先分清要查的是文件名、命令入口还是文件内容，再选工具；无结果并不自动证明文件从未存在。

以下find用法以GNU findutils为例。对线上目录先限定路径和文件系统范围，保留权限错误；不要把全盘搜索和删除连在一起。

## 查什么决定用什么

![文件名筛选、命令解析和内容搜索的不同对象](/linux/find-scope-expression.svg)

| 目标 | 工具 | 边界 |
| --- | --- | --- |
| 当前目录树中的名称、大小、时间 | find | 实时遍历可见对象，受权限、挂载和并发变化影响 |
| 根据索引快速找路径 | locate / plocate | 数据库可能过期；命中后还要确认当前对象 |
| 当前shell如何解析命令 | Bash `type -a`、`command -v` | 包含内建、函数或别名，不能一律当文件路径 |
| 程序及手册的大致位置 | whereis | 搜索预定义位置，不替代运行时解析 |
| 哪个文件含有请求编号 | grep / rg | 搜的是内容，不是文件名 |

which通常只搜索PATH中的外部程序，具体实现对别名的支持不同；不能用 `which -a` 的输出证明当前shell实际执行了哪个函数。也不要对 `command -v` 的任意输出直接readlink，因为它可能不是路径。

## 表达式有优先级

```bash
find /opt/order-api -type f \( -name '*.yaml' -o -name '*.yml' \) -print
find /var/log -xdev -type f -name '*.log' -size +100M -print
```

隐含的 `-a` 比 `-o` 优先，括号要交给find而不是shell，所以使用反斜杠。若写成 `-type f -name '*.yaml' -o -name '*.yml'`，右侧yml分支不受type限制。添加-print或-exec后还需重新检查组合，避免动作只作用于其中一支。

find默认不跟随遍历到的符号链接，`-type l` 可找链接本身；`-L` 会改变跟随和类型判定，还可能跨入另一棵树。若需要限制同一文件系统，可用-xdev；它也会跳过本来想检查的挂载点，须先确认范围。

## 时间和大小不是口语中的整数比较

| 条件 | GNU find含义 |
| --- | --- |
| `-mtime -7` | 向下取整后的24小时段数小于7 |
| `-mtime 7` | 取整为7，约为7至不足8天前 |
| `-mtime +7` | 取整后大于7，至少8天前 |
| `-mmin -60` | 按分钟桶比较，不等于业务日志时间字段 |
| `-size 1M` | 按MiB向上取整后为1，普通文件是大于0且不超过1MiB |
| `-size +100M` | 取整后大于100MiB；普通文件实际长度超过100MiB |
| `-size 1048576c` | 按字节精确匹配1MiB |

`-size`通常看逻辑长度，不是实际占用块数。稀疏文件的ls大小与du占用可能差很多。ctime是元数据变更时间，不是创建时间；mtime是内容修改时间，复制保留时间也会影响判断。

## 有限实验：检查范围与条件

以下在新临时目录创建四个对象，使用Bash与GNU工具：

```bash
search_lab_dir=$(mktemp -d)
mkdir -p -- "$search_lab_dir/cache" "$search_lab_dir/config"
printf 'request=req-2048\n' > "$search_lab_dir/config/order api.yaml"
printf 'cached\n' > "$search_lab_dir/cache/old.log"
mkdir -- "$search_lab_dir/config/also.yml"
touch -d '9 days ago' -- "$search_lab_dir/cache/old.log"
truncate -s 1048576 -- "$search_lab_dir/config/exact.bin"
find "$search_lab_dir" -type f \( -name '*.yaml' -o -name '*.yml' \) -print
find "$search_lab_dir" -type f -mtime +7 -print
find "$search_lab_dir" -type f -size 1048576c -print
```

三次查找分别得到order api.yaml、old.log和exact.bin；also.yml是目录，不能混进第一组普通文件。目录名与文件名都可能包含空格，必须保留参数边界。

排除子树应用prune，而不只是过滤最终输出：

```bash
find "$search_lab_dir" -type d -name cache -prune -o -type f -print
find "$search_lab_dir/config" -type f -name '*.yaml' -exec grep -nH -F -- 'req-2048' {} +
```

prune在匹配目录处阻止下降；`-not -path '*/cache/*'` 仅过滤结果时，仍可能进入cache遍历。第二条命令直接把文件作为grep参数，不通过空格拆分。若没有匹配文件，-exec不会调用grep；需要统计“无文件”和“文件无内容匹配”时应分别处理。

## 批量动作与删除

先用相同范围和表达式执行-print，检查预期集合；批量操作再用 `-exec ... {} +`。跨两次遍历仍有竞争窗口，文件可能被替换或移走。对于不受信任、多人可写的目录，不把一次预览当作永久保证。

`find ... -delete` 是真实删除，会隐含-depth，与-prune组合尤其容易误判；这里保留只读实验。任意文件名经过管道时用 `-print0` 配合接收端NUL支持，不能直接 `find ... | xargs rm`。

内容摘要相同只适合筛选重复候选，删除前还需考虑碰撞、文件在扫描期间变化、硬链接与业务用途；不能把MD5分组输出当成“重复文件可删”的证明。

## 查不到时保留证据

先核对路径是否在当前挂载与命名空间里，再看目录权限、符号链接、大小写、条件桶和locate索引。权限拒绝不是“该目录没有匹配”，`2>/dev/null` 会隐藏这一缺口。命令返回非零时先解释原因，再决定是否允许局部结果。

找到配置后确认服务实际加载的是哪一份；需要内容上下文看 [文件查看](./file-view-edit.md)，字段统计看 [文本处理](./text-processing.md)。
