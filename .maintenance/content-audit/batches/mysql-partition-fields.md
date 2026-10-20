# MySQL 分区与字段设计逐页审查

范围：`partitioning.md`旧508行、`data-types-design.md`旧966行，均完整读取；分段工具输出曾有总预算截断，字段中后两段已单独重新完整读取，没有以标题扫描代替全文。

## 处理

分区页以日期日志的创建、裁剪、重组、删除串联。改掉非法DECIMAL/ENUM表达式、不支持的任意函数、MAXVALUE后ADD、旧EXPLAIN PARTITIONS和InnoDB REPAIR。重点补每个唯一键的分区列要求、复合主键不再保证id单列唯一、删首分区隐含边界扩大、迟到数据保留窗口与DDL不可回滚。新增横向独立SVG。

字段页以实际用户/订单DDL解释合同，保留数值/文本/时间/二进制/JSON/默认值/约束/演进主题，删掉空泛优势段与大量未经约束的模板。修NULL索引、条件唯一语法、DATETIME字节数、十进制字面量、TEXT默认值及行外存储绝对说法。补钱与币种、JavaScript大整数、生成列、外键、乐观版本、NULL和CHECK的UNKNOWN、JSON结构边界。列级SVG与正文DDL相符，标明省略三列。

## 证据

复用独立`blog-audit-mysql-20261019`，官方mysql:8.4实际8.4.11；`/tmp/blog-mysql-partition-field-check.mjs`执行两页8个SQL围栏及边界反例。脚本只重建本批测试库`partition_demo/field_demo`，未接触业务库。首次断言把MAXVALUE后ADD的预期错误码写成1481，实际1493；已修断言并完整重跑通过。数据库密码只在内存捕获，不写文档、仓库或输出。

Oracle官方8.4分区限制/唯一键规则、数值语法、默认值、存储需求、自动更新时间、CHECK和CHAR比较规则核对。补充资料机器输出保存在`/tmp/blog-mysql-field-sources.json`，四项成功且未截断；分区限制前段足够覆盖所用约束，未声称全文未截断。

`xmllint --noout`通过。独立浏览器查看两张SVG，实际中文字体文字均在1120画布内；布局与连线人工复核。生产构建21.33秒通过，既有ld/dts高亮与大chunk警告保留。生产预览5177逐页桌面1280×720、实际手机390×844亮深色通过，图放大/原尺寸/关闭可用，无破图/页面横向溢出/本站console错误。无全页截图；临时viewport已reset。

该批不证明生产性能、生产归档恢复、支付集成、API驱动往返或线上迁移通过。
