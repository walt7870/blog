# CSS与可访问性逐页验收

EP07至EP10共4页，全部原正文、代码及SVG标签完整阅读。删除泛化重复段落，按各页机制补商品与配送场景；图示从章节列表改为比较顺序、空间组合、查询作用范围和错误分支。

| 页面 | 处理结论 |
| --- | --- |
| EP07 | layer和内联等条件先于specificity，important反转层序；补scope、变量无效与computed/resolved/used区别 |
| EP08 | 300px盒宽334/300的具体计算；Flex最小尺寸、Grid可运行例子，fixed包含块与sticky滚动边界 |
| EP09 | CSS像素、布局视口与visual viewport区分；容器后代查询，输入能力不等于设备类型，实际宽度断言 |
| EP10 | 完整错误恢复表单、aria-describedby与invalid同步；键盘按模式验收，WCAG数字限定适用范围 |

验证：完整构建15.10秒通过；四SVG XML、实际中文边界和截图查看通过。4页桌面1280/iframe390明暗全文16图全部查看，无全页溢出；4次分页与8组图片Enter、原尺寸1120、Escape通过。证据为`evidence/frontend-layout/`下diagrams、page-checks、navigation和lightbox JSON，截图在`/tmp/blog-frontend-layout-ui/`。

`verify-frontend-layout.mjs`从正文提取代码生成6个夹具、1个JS语法通过。浏览器7项实际检查：app层胜出绿色、反层序灰色、层外红色；656与300容器分别双列与单列；390布局网格单列、长标题不挤出按钮；空邮箱错误关联并聚焦；修正后旧错误清除且只提示本地检查结果。见browser-examples.json。

没有执行物理手机、读屏软件或后端保存集成，不以DOM属性和iframe测试替代这些范围。侧边栏部分旧标题为源码中已截断文本，已发现，待前端导航统一阶段改成完整语义短标题并重新验收共享配置摘要。
