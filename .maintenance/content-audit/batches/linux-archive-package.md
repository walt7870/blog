# Linux归档与软件包逐页审查

本批完整阅读归档926行、速查446行、软件包1042行旧正文，按页面职责重组，三页逐项结论保存在`reviews/linux-archive-package.json`。

归档页把格式测试、可信摘要与业务恢复分成不同证据；实验含中文空格文件名、相对顶层和符号链接。速查页保留任务入口，gzip/bzip2/xz不再按固定压缩率排序。软件包页解释仓库、计划、事务、磁盘与运行进程，修apt-key全局信任、强行依赖和部分升级建议。

全部Bash正文在Debian12临时容器通过，容器已清理。归档输出`restore_verified`，速查输出`gzip_roundtrip_verified`；软件包只读查询与模拟退出0，未升级宿主或真实业务。恢复实验只验证正文明确列出的文件与链接，不外推完整元数据保真；ZIP/7z/RAR、增量链及其他发行版事务未运行。

官方核对记录：`/tmp/blog-linux-archive-official.json`中的tar完整性与增量全文；gzip手册为截断抓取，核对force/c/test相关段。`/tmp/blog-linux-package-official.json`核对APT交互接口、签名链与Arch部分升级；`/tmp/blog-linux-package-keyrings.json`核对apt-key弃用、APT2.4自管keyring位置及sources.list Signed-By读取权限与密钥范围，sources.list抓取截断，不声称全文读取。

两图技能自检通过，独立1120×600 SVG在浏览器核对每个中文text实际边界与节点，连线无遮挡。三页1280×800及390×844浅深色全页、长代码键盘横滚、图片放大原尺寸关闭、归档→速查→软件包客户端链接通过，无整页横向溢出。最新构建13.46秒成功，原有高亮与chunk提示不影响构建。
