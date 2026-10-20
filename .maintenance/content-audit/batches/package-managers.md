# 包管理器七页审查

逐篇完整阅读总览、Corepack、npm、pnpm、Yarn、Bun和registry正文。修复版本职责、锁文件确定性、先删旧锁的迁移流程、现代Yarn配置和安装脚本执行边界；补五张独立SVG。

`verify-package-managers.mjs`在临时目录执行32组检查：四安装器实际安装/冻结安装/模块导入/破锁拒绝；Yarn两种linker；pnpm与Bun自制无害postinstall的默认跳过及明确批准；Corepack隔离缓存的固定版本与错工具拒绝；npm与Yarn配置解析。企业域名仅占位，无网络请求、登录或发布；未改全局代理或博客依赖。首次临时`.bin/pnpm`被Corepack同名shim覆盖，发现后改用临时包真实入口，最终结果见`evidence/package-managers/code-cases.json`。

Node26.9.0、npm11.19.1、Corepack0.36.0、pnpm10.32.0、Yarn4.9.2、Bun1.3.0。官方关键章节与版本资料保存在同目录，不把截断资料称为全文。pnpm采用10系列批准字段，不套最新12文档。

构建14.24秒通过。七页28份桌面1280/390像素iframe窄屏明暗全文截图、14次原尺寸与退出、7次分页跳转通过；五图self_check与浏览器实际中文字体/节点边界通过。明暗联系表与五图联系表已逐张查看，截图在`/tmp/blog-package-managers-ui/`，结构化记录在`evidence/package-managers/`。

累计内容完成524/603，剩余79；旧517页的共享主题摘要已过期，保留内容审查结果，最终逐页复验后才能更新摘要。
