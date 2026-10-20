# MySQL 索引与存储引擎：2 页

完整阅读旧566/621行。索引用订单联合键与稳定分页解释覆盖/回表，修多NULL、通用部分索引、最左前缀/范围/函数/OR绝对化、索引顺序与维护等。存储引擎修旧版字段/文件、快照/锁、redo与binlog、MEMORY与内部TempTable、混合事务及备份边界，以正常重启和回滚反例落地。

官方资料使用Oracle手册：聚簇/二级、多列索引与CREATE INDEX通过web-read；部分请求超时后用浏览器读取MEMORY、MVCC、Range Optimization和Internal Temporary Tables。只将实际读取内容作为依据。官方网页analytics出现oracle is not defined，与本站无关。

/tmp/blog-mysql-index-engine-check.mjs用Markdown解析器执行全部6个SQL围栏并检查结果。实际8.4.11：列表5/3、下一页3/1、同时间6/5，JSON计划使用idx_buyer_status_time覆盖索引；唯一列2个NULL通过，重复非空/大小写变体拒绝，WHERE部分索引语法拒绝。混合回滚10/9。只重启blog-audit-mysql-20261019，MEMORY2→0，InnoDB10/MyISAM9及此前库存5保留；这不是断电或HA验收。

两SVG独立中文布局、画布文字边界及xmllint通过。构建36.76秒；桌面亮深色与实际390×844手机亮深色、手机原尺寸/关闭通过，无破图/横向溢出/本站console错误，未做全页截图。视口能力只调整选中标签；初次手机尝试仍1280×720，不计验收，已换到实际390×844标签完整复验。后续检查必须同时记录innerWidth/innerHeight。

同步修audit-site.mjs把.vitepress/.temp与.cache排除出共享源码摘要，避免构建清理临时JS时ENOENT和无意义失效；新增缓存生成/删除不改变审查结论的测试，5/5通过。真实主题改动仍使结论失效。累计110/589页。
