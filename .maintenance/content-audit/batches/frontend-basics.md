# 前端基础首批逐页验收

范围：系列导读与EP01至EP06，共7页。逐篇完整阅读原正文、全部代码与六图标签，重复出现的视频回顾、泛化排查段落、占位链接和制作旁白均已移除；按各页实际机制重写，未据模板批量判定完成。

## 逐页结论

| 页面 | 处理结果 |
| --- | --- |
| 导读 | 保留33篇完整索引，补商品页问题入口与开发/运行边界 |
| EP01 | 重绘开发机到产物再到浏览器的环境关系，说明SSR、类型检查与后端业务事实 |
| EP02 | HTML/CSS分别输入渲染，补资源交错、缓存与连接复用、脚本时机、就绪指标 |
| EP03 | 三语言职责配商品计数示例，禁脚本结论限定为已有HTML内容，区分语言与宿主API |
| EP04 | 按故障选面板，纠正fetch非2xx不自动拒绝与Console不必报错，补响应合同和版本映射 |
| EP05 | 区分DOM、原生行为和可访问性树，补landmark上下文、名称与键盘验收 |
| EP06 | 完整配送表单，提交字段、submitter、约束校验、requestSubmit/submit、服务端验证分别说明 |

## 实际验证

- `npm run docs:build -- --outDir /tmp/blog-audit-preview-root` 17.59秒通过，仅既有ld/dts高亮与chunk提示。
- `node .maintenance/content-audit/verify-frontend-basics.mjs`：7页、4个JS块语法通过，夹具从正文HTML和JS直接提取。
- 六张SVG实际中文字体边界检查通过，全部截图联系表已查看；图示为机制与分支而非章节顺序，参见`evidence/frontend-basics/diagrams.json`。
- 7页桌面1280及iframe390明暗全文截图共28份全部查看；严格断言宽度、主题、无横向溢出与图片完成。窄屏不是物理手机，见`page-checks-*.json`。
- 7次分页实际键盘跳转、14组桌面/固定390×844图片Enter打开、1120原尺寸和Escape关闭通过，见`navigation.json`和`lightbox-*.json`。
- 正文示例浏览器验证：原生按钮Enter/Space计数到2；空邮箱、非法邮箱阻止submit并聚焦；合法输入保留字段与提交按钮；通知未勾选不提交、勾选提交yes。见`browser-examples.json`。
- 原始截图在`/tmp/blog-frontend-basics-ui/`。表单fixture仅用于本地UI验证，没有实现或调用配送后端，不声称业务集成通过。
