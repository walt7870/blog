# 前端应用、质量与交付逐页验收

EP23至EP30八页全文、代码及旧SVG全部标签阅读后重写。去除重复模板、未发布视频占位及制作旁白，保持既有URL。

| 页面 | 结论 |
| --- | --- |
| EP23 | 用同一商品编辑业务比较四框架；React提交、Vue依赖、Angular作用域、Svelte5运行时边界 |
| EP24 | HTML生成位置与时机、Islands激活范围是正交维度；hydration、请求状态和缓存隔离 |
| EP25 | 严格URL页码、查询快照与草稿、ETag并发保护、保存和刷新失败分别反馈 |
| EP26 | 测试范围、真实回读、独立断言、变异、异步条件与视觉基线 |
| EP27 | LCP/INP/CLS及第75百分位；发现/下载/显示、输入/处理/绘制、布局稳定分别定位 |
| EP28 | 文本用途、XSS/CSRF、SameSite/同源/CORS、CSP实际响应头和构建权限 |
| EP29 | 新旧页面资源保留、缓存分层、Source Map匹配与访问边界、完整产物回滚 |
| EP30 | 商品筛选任务合同、协作方式组合、上下文、独立反例及学习达成标志 |

## 验证证据

整站构建14.84秒通过，保留既有高亮和chunk提示。八图独立SVG自检、实际中文文本边界、图示截图全部通过并查看。32份四模式全文截图全部查看，实际1280/iframe390、主题、图片完成及无全页溢出断言通过；8次分页和16组原尺寸1120/键盘Escape通过。证据evidence/frontend-architecture，截图/tmp/blog-frontend-architecture-ui。

verify-frontend-architecture.mjs提取正文：8项页码合同与2项Node测试通过，换成parseInt的错误实现被测试发现。4项保存分支含真实本地HTTP成功、旧ETag412、不合法名称不发请求和HTTP500；成功后名称为新名称、版本2，旧草稿没有覆盖，实际两次HTTP请求。检查文档no-cache和指纹资源长缓存响应头。

浏览器验证textContent显示字面em且无元素；CSP响应头允许同源外部脚本、阻止无许可内联脚本；发布B后旧A文档首次加载A资源成功，刷新后的B文档加载B资源成功。测试服务器已停止。没有操作真实会话、真实商品或生产发布。

公共资料核对：React render-and-commit、Vue reactivity、Svelte runes、Angular signals、MDN CSP；web.dev提取服务不可用后转完整浏览器读取vitals与inp并存证。确认LCP2.5秒、INP200毫秒、CLS0.1，第75百分位和INP点击/触摸/键盘及下一帧范围。未声称本批做过真实用户性能量测。框架比较为机制审查，未声称四框架完整性能跑分或集成测试。
