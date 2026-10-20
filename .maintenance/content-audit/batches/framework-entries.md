# 框架入口与生态七页

旧React1517行、Angular1566行、Vue904行分段全文阅读，Angular740至850行补读重叠以排除工具输出截断；Svelte376行及生态三篇全文阅读。保留原地址，核心机制链接到已验收EP31至33，应用入口改为草稿/组件/表单合同。Svelte5新增编译/运行/清理图，生态三篇分别补渲染、组件和跨端责任图。

官方资料见`evidence/framework-entries/official-*.json`。CRA弃用、React19移除API、Vue2EOL、Svelte5迁移与React Routerv7迁移关键章节核对。长资料部分截断，未称全文阅读。Angular抓取失败后通过浏览器读取表单核心章节，保存`angular-forms-official.txt`。

`verify-framework-entries.mjs`从正文提取示例，临时依赖在`/tmp/blog-framework-checker`，产物在`/tmp/blog-framework-entry-fixtures`；React19.2、Vue3、Svelte5.55.1及Custom Element生产转换通过。Angular21.2转译后真实JIT浏览器执行，未声称CLI/AOT完整生产构建。五类行为见`browser-cases.json`，非法输入、上限、重置、旧预览清除、表单锁定与计时器销毁通过。

站点构建15.14秒通过，语言高亮dts/ld与大chunk为已有警告。重启预览后七页28份1280桌面/390iframe明暗全文，实际宽度、主题、图片加载、标题与无横向溢出通过；14组原尺寸/退出、7次分页通过。四新图self_check、中文边界和截图通过；EP31至33图复用。截图与已查看联系表在`/tmp/blog-framework-entries-ui/`，结构证据在`evidence/framework-entries/`。元框架未做Next/Nuxt部署，跨端未冒称真机权限/录音/商店实测。

内容累计517/603页，共享UI旧批次仍须最终逐页复验。
