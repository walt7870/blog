# 压缩归档速查

多个文件交付先考虑归档容器，单个文本流缩小体积再选压缩算法。机制、恢复实验和备份边界见[归档、压缩与恢复验证](./archive.md)；本页保留常用入口与判断点，示例中的输入文件需要先准备。

![归档产物从源数据到恢复验收的步骤](/linux/archive-restore-contract.svg)

## 按任务选择入口

| 任务 | 入口与边界 |
| --- | --- |
| 多文件按相对路径打包 | tar；先固定输入视图和顶层目录 |
| 单个日志或CSV压缩 | gzip、bzip2、xz；通常默认替换输入，保留原件时明确选项 |
| 跨平台接收 | ZIP；核对中文文件名、权限和接收端工具 |
| 7z或RAR交付 | 核对对应工具、格式和许可支持，不按扩展名推断能力 |
| 备份 | 还要保证一致性、副本、保留策略和恢复演练 |

不把xz、bzip2、gzip按固定压缩率排序；用代表性输入比较压缩大小、耗时、峰值内存和解压预算。视频、APK等已经压缩的内容可能没有明显收益。

## 创建与解包

下面是GNU tar模板，输出放在输入目录之外，目标目录需先创建。`orders`是归档里的顶层名称，`-C`后的相对路径按对应目录解释：

```text
tar -czf /backup/orders.tar.gz -C /snapshot orders
tar -cJf /backup/orders.tar.xz -C /snapshot orders
tar -tf /backup/orders.tar.gz
tar -xzf /backup/orders.tar.gz -C /restore-empty
```

GNU tar通常能在从文件读取时识别压缩格式；显式`-z/-j/-J`分别选择gzip、bzip2和xz，跨工具或从管道读取时核对实际支持。tar默认保存符号链接，`-h`跟随链接会扩大输入范围。`-p`不代表自动保存全部ACL、扩展属性与安全标签。

ZIP常用`zip -r archive.zip orders/`创建，`unzip -l archive.zip`列成员，`unzip -t archive.zip`测试，`unzip archive.zip -d /restore-empty`恢复。7-Zip用`7z l`、`7z t`、`7z x`，输出目录选项写作`-o目录`；工具也可能名为`7zz`，先核对版本。

不在命令参数中写明文密码，避免进入历史和进程参数；交互提示也不自动意味着加密方案足够强。传统ZIP加密保护有限，需要保密时按接收端合同选择现代加密及密钥交付方式。摘要与签名用于完整性/来源校验，不能代替加密。

## 单文件保留原件的实验

以下Bash片段只在临时目录内运行，依赖gzip、bzip2、xz与coreutils。三个工具都从同一输入生成副本，不连续压缩已经不存在的原文件：

```bash
set -euo pipefail
blog_compress_dir=$(mktemp -d)
trap 'rm -rf -- "$blog_compress_dir"' EXIT
printf 'order_id,status\n1001,paid\n' > "$blog_compress_dir/orders.csv"
gzip -c "$blog_compress_dir/orders.csv" > "$blog_compress_dir/orders.csv.gz"
bzip2 -c "$blog_compress_dir/orders.csv" > "$blog_compress_dir/orders.csv.bz2"
xz -c "$blog_compress_dir/orders.csv" > "$blog_compress_dir/orders.csv.xz"
gzip -t "$blog_compress_dir/orders.csv.gz"
bzip2 -t "$blog_compress_dir/orders.csv.bz2"
xz -t "$blog_compress_dir/orders.csv.xz"
gzip -dc "$blog_compress_dir/orders.csv.gz" > "$blog_compress_dir/restored.csv"
cmp "$blog_compress_dir/orders.csv" "$blog_compress_dir/restored.csv"
printf 'gzip_roundtrip_verified\n'
```

`-c`输出到标准输出，重定向文件由shell创建；失败时可能留下空文件或半成品，生产流程还要先写临时产物、检查成功再改名。上面的bzip2、xz只完成格式测试，完整恢复比较示例见[详细页](./archive.md)。bzip2的`-s`表示减少内存使用，不是“显示压缩统计”；gzip的`-l`也不是所有大文件或多成员流的通用精确原始大小统计。

## 测试通过之后仍要恢复验收

gzip、bzip2、xz的`-t`检查压缩数据，tar的`-t`读成员结构，ZIP/7z测试各自格式；这些都不证明归档业务数据一致、来源可信或恢复后应用可用。接收时先校验可信摘要/签名、查看路径和空间，再在空目录以普通用户解包，按内容、元数据和业务合同验收。

`unzip -o`和tar的`--overwrite`会覆盖，不能用作损坏修复。未知包还要防范路径、链接、特殊文件与展开资源占用；列表过滤不能替代隔离环境。失败时保留原包、错误状态和校验信息，不默认用sudo重试。
