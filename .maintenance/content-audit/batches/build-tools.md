# 构建工具五页

逐篇完整阅读旧文：Vite1103行、Webpack1423行分段读取，Rollup164行、Parcel257行、生态入口39行。以子路径商品页、延迟报表、金额库和活动页替换孤立API堆叠，保留工具各自机制与边界。

正文代码验证脚本为`verify-build-tools.mjs`，独立临时依赖与产物不改变博客依赖；结果见`evidence/build-tools/code-cases.json`与`browser-cases.json`。实际验证Vite8.3.4、Webpack5.112.0、CLI6.0.1、devserver5.2.7、Rollup4.64.12、Parcel2.16.4。Rollup真实打包安装后分别ESM/CJS消费；Webpack缺chunk恢复；Vite/Parcel生产子路径点击和刷新通过。未声称完整真实业务API、线上发布或所有浏览器兼容验收。

官方核对记录在`official-sources.json`；Webpack侧效应CSS章节通过浏览器阅读，保存在`webpack-tree-shaking-official.txt`。资料截断部分未声称全文阅读。

完整站点构建16.02秒通过。重启预览后五页各四种模式全文截图，共20份，1280桌面及390像素iframe实际宽度、主题、图片加载和页面标题断言通过；10组原尺寸及关闭、5次分页通过。五SVG独立自检与浏览器中文边界通过，截图查看无裁切或连线穿越。截图在`/tmp/blog-build-tools-ui/`，结构结果保存在`evidence/build-tools/`。全文联系表用于整体排版，图示另看较大截图与实际几何。

内容审查累计510/603页。共享UI旧批次须最终逐页复验后更新摘要，不能视为发布门禁通过。
