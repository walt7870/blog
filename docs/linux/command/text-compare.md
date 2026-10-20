# 文本比较与合并

发布前比较两份配置、对账时比较订单编号、导出时补齐用户名称，解决的是三种不同问题。`diff` 比行的变化，`comm` 比已排序记录，`join` 按键关联，`paste` 按行号拼接；工具选错，即使命令退出 0，也可能得到错误业务结论。

## 先定义“相同”

![保留原文件后按字节、行、集合或关联键选择比较方式，再解释状态与复验](/linux/text-comparison-contract.svg)

字节相同用 `cmp`；配置审阅用 `diff -u`；订单编号集合差用 `comm`；按订单编号补支付状态用 `join`。格式化、排序、忽略空格都在改变比较合同，应保留原件，写清忽略了哪些差异。YAML 缩进、Python 缩进与字符串内部空格可能有语义，不能默认 `diff -w`。

## diff 的差异不是执行错误

以下在 Bash 与 Linux/GNU 工具环境的新临时目录实验：

```bash
compare_lab_dir=$(mktemp -d)
printf 'port=8080\ndebug=false\n' > "$compare_lab_dir/before.conf"
printf 'port=8081\ndebug=false\n' > "$compare_lab_dir/after.conf"
if diff -u -- "$compare_lab_dir/before.conf" "$compare_lab_dir/after.conf" \
    > "$compare_lab_dir/change.patch"; then
  compare_status=0
else
  compare_status=$?
fi
printf 'diff_status=%s\n' "$compare_status"
cat -- "$compare_lab_dir/change.patch"
```

应得到 `diff_status=1` 和端口一行的变化。`---` 为旧文件，`+++` 为新文件；区块头 `@@ -旧起点,行数 +新起点,行数 @@` 给出范围。区块内空格开头为上下文，`-` 为旧内容，`+` 为新内容。`diff` 的 0 为相同，1 为有差异，2 为执行故障；发布脚本应单独处理 2，而不是把“发现了修改”当作工具失败。

| 命令 | 用途 | 边界 |
| --- | --- | --- |
| `diff -u old new` | 带上下文审阅与生成补丁 | 不解释配置业务语义 |
| `diff -rq old/ new/` | 递归报告目录差异 | 不完整验证权限、ACL、属主或部署状态 |
| `diff -urN old/ new/` | 生成含新增/删除文本的目录差异 | `-N` 把缺失文件当空文件，要检查删除范围 |
| `cmp a.bin b.bin` | 字节比较并报告首个差异 | 不显示有意义的文本区块 |
| `sdiff -w 120 old new` | 并排看行差异 | `-l` 只压缩相同行的显示，不是只显示左文件 |
| `vimdiff old new` | 交互审阅与合并 | 保存前核对当前窗口与目标文件 |

`cmp` 同样用 0/1 区分相同与不同，故障返回 2。`sdiff -o merged.txt` 会进入交互合并，不是单纯把显示内容重定向到文件。Vim 差异视图中 `]c` / `[c` 定位差异，`do` 获取对侧内容，`dp` 把当前内容推到对侧；操作可能修改文件。

## comm：先按同一规则排序

```bash
printf '2048\n2049\n2050\n' > "$compare_lab_dir/expected.txt"
printf '2050\n2048\n2051\n2050\n' > "$compare_lab_dir/actual.txt"
LC_ALL=C sort -u -- "$compare_lab_dir/expected.txt" > "$compare_lab_dir/expected.sorted"
LC_ALL=C sort -u -- "$compare_lab_dir/actual.txt" > "$compare_lab_dir/actual.sorted"
LC_ALL=C comm --check-order -23 "$compare_lab_dir/expected.sorted" "$compare_lab_dir/actual.sorted"
LC_ALL=C comm --check-order -13 "$compare_lab_dir/expected.sorted" "$compare_lab_dir/actual.sorted"
LC_ALL=C comm --check-order -12 "$compare_lab_dir/expected.sorted" "$compare_lab_dir/actual.sorted"
```

三次输出依次为预期独有 `2049`、实际独有 `2051`、双方共有 `2048` 与 `2050`。comm 的三列依次表示文件一独有、文件二独有、共有，`-1/-2/-3` 是抑制对应列。GNU comm 没有 `-i`；忽略大小写需要先定义一致的正规化方式，并保留原记录。

这里显式使用 `sort -u`，所以比较的是集合，实际 `2050` 出现两次的信息已经丢失。金额对账、重复订单检测不能这样去重；应另做次数与金额聚合。comm 正常输出差异仍可退出 0，自动验收必须检查输出是否符合要求，不能只检查退出码。

## join 按键，paste 按位置

```bash
printf '2048 paid\n2050 pending\n' > "$compare_lab_dir/payments.txt"
printf '2050 900\n2048 5970\n2049 1200\n' > "$compare_lab_dir/orders.txt"
LC_ALL=C sort -k1,1 -- "$compare_lab_dir/orders.txt" > "$compare_lab_dir/orders.sorted"
LC_ALL=C sort -k1,1 -- "$compare_lab_dir/payments.txt" > "$compare_lab_dir/payments.sorted"
LC_ALL=C join --check-order -a 1 -e UNKNOWN -o '0,1.2,2.2' \
  "$compare_lab_dir/orders.sorted" "$compare_lab_dir/payments.sorted"
```

结果为 `2048 5970 paid`、`2049 1200 UNKNOWN`、`2050 900 pending`。默认第一字段为键，默认只输出匹配行；`-a 1` 保留左侧未匹配订单，`-e` 配合输出字段列表补空值。指定其他键用 `-1` 与 `-2`，排序时必须使用同一个键与相同 locale。重复键会产生匹配组合，不能把一次连接当作一对一关系验证。

`paste -d: names.txt values.txt` 仅把第一行拼第一行，不看订单编号；任一文件漏行后，后面仍会继续错配。只有两份输入本来按位置严格对齐时才使用 paste。带引号 CSV、嵌套 JSON 和复杂字段类型应交给对应解析器或数据库处理。

## 结构化数据与压缩内容

JSON 可先分别运行 `jq -S . old.json > old.normalized.json` 与新文件对应命令，检查两次解析状态，再 diff。`-S` 排对象键，不排序数组；格式化结果不是签名所需的通用规范化，也不证明业务等价，重复键等输入还需专门校验。

gzip 文件先分别解压到临时目录并检查解压状态，再比较内容；两个压缩包字节不同可能只因压缩元信息不同。`tar -tf` 只列成员，成员名一致不代表内容、权限或链接目标一致。`diff <(gzip -cd a.gz) <(gzip -cd b.gz)` 的进程替换状态不会自动成为 diff 的状态，解压失败时可能误比空输出。

CRLF 转换同样先生成新文件，例如 `dos2unix -n old.txt normalized.txt`（工具支持该选项时），核对编码、退出码和原文件。默认 dos2unix 通常原地修改文件，不能把 `diff <(dos2unix a) <(dos2unix b)` 当成无修改比较。不要为了消除乱码把中文转成 ASCII，也不要用忽略全部空白掩盖真实变化。

## 补丁先预演，再验证结果

在已安装 GNU patch、当前实验目录仍保留上述 before/after 文件时：

```bash
cp -- "$compare_lab_dir/before.conf" "$compare_lab_dir/candidate.conf"
patch --dry-run "$compare_lab_dir/candidate.conf" < "$compare_lab_dir/change.patch"
patch "$compare_lab_dir/candidate.conf" < "$compare_lab_dir/change.patch"
cmp -- "$compare_lab_dir/candidate.conf" "$compare_lab_dir/after.conf"
```

最终 cmp 应退出 0。目录补丁的 `-p1` 删除路径开头的一级组件，不是通用必加选项；应对照补丁头与目标目录决定。只对已审阅补丁在受控目录操作，检查新增删除路径、拒绝文件和可能的模糊匹配。`patch -R` 反向应用也会修改文件，不能代替内容备份。

两个各自正确的修改同时改到同一行时，需要理解语义并手工合并；文本合并成功仍要跑语法检查和业务验证。目录比较也要同时核对文件集合和属性，不能把两棵绝对路径前缀不同的 `find` 输出直接比较，更不能把按固定行数拆块后的独立 diff 当作全文件正确对齐。
