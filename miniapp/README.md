---
search: false
---

# 小程序内容构建说明

`miniapp/` 是基于 uni-app、Vue 3 和 TypeScript 的独立客户端工程，构建时把博客 Markdown 转成 HTML，放入小程序分包。它不是 VitePress 网页的运行容器：Vue 交互组件、Mermaid、自定义容器与站点图片路径，都需要针对小程序另行适配。

![Markdown经过解析和分类生成小程序分包，设备下载分包后使用mp-html阅读](/reading/miniapp-content-boundary.svg)

当前实现只生成文字和 HTML 内容，没有把根目录 `public/` 的资源自动复制进小程序。因此下载分包后可以阅读已打包的兼容内容，但不能据此宣称整个博客完全离线可用。平台主体资格、类目、域名和审核条件以目标账号的实际规则为准，离线打包不代表自动获得发布资格。

## 代码入口与数据去向

`scripts/build-miniapp.mjs` 从项目根 `docs/` 扫描 Markdown，调用 `scripts/parse-md.mjs` 推断分类、提取标题、渲染 HTML 和注入内联样式。`SUBPACKAGES` 当前列出 18 个分类，只有匹配这些分类的文件才会进入输出；未定义分类会被日志标为跳过。这不是覆盖全部博客的导出器，文章数随源文件和分类规则变化，不在说明中固定成旧统计值。

主包 `src/static/catalog.json` 只保存分类名称和文章数。每个 `src/subpackages/<分类>/pages/category.vue` 内嵌文章标题与 ID，`article.vue` 内嵌该包的完整文章内容，避免把完整 JSON import 提升到主包。同目录的 `content.json` 仅保留元信息用于调试。路由在 `src/pages.json` 的 `subPackages` 中声明，必须与生成分类一致。

例如 `docs/ai/agent.md` 进入 `ai` 分包，而 `docs/devlanguage/java/jvm/` 进入 `devlanguage-java-jvm`。新增专题时，先核对 `inferCategory()` 返回值、`SUBPACKAGES`、显示名称与路由四处配置；只添加 Markdown 文件，可能在构建中被跳过或归到不合适的旧分类。

## 本地操作

在项目根进入小程序目录，再安装其独立依赖。存在可用锁文件时使用 `npm ci`，调整依赖时使用 `npm install` 并审查锁文件变化。

```bash
cd miniapp
npm install
npm run build:content
npm run dev:mp-weixin
```

开发编译输出位于 `dist/dev/mp-weixin`，使用微信开发者工具导入。生产编译使用 `npm run build:mp-weixin`，输出位于 `dist/build/mp-weixin`。两个 uni-app 命令都先运行内容构建。AppID 在 `src/manifest.json` 和 `project.config.json` 中配置，需要使用有权限的账号。

这些命令属于小程序工程，不能代替根项目的 `npm run docs:build`。内容脚本成功只证明生成过程完成；它会记录解析失败并继续运行，因此还要检查日志中的失败和跳过项目，不能只看退出码。

## 图文与交互的转换边界

生成的文章页已经通过 `mp-html` 渲染 HTML，组件映射配置在 `src/pages.json` 的 `easycom.custom`。不需要再次按“尚未集成 mp-html”的旧说明添加组件。

Markdown 普通段落、列表和代码高亮可以转换成 HTML；VitePress 的 `<script setup>`、自定义 Vue 实验和主题组件不会在 `mp-html` 中执行。例如 AI 推理页的显存计算器需要改成小程序原生组件，或提供静态图与数值例子。不能保留一块空白交互区却仍称文章可读。

图片要先确定交付方式：随包资源适合真正离线但增加包体；远程图片需要合法地址、网络和缓存策略。根路径 `/ai/…svg` 在网页中由 `/blog/` 资源服务解释，在小程序里不会自动指向博客。SVG 支持也要按目标渲染器验证，必要时生成保留文字可读性的本地位图。不要在已经生成的 HTML 上使用 Markdown 图片正则替换，这会错过实际的 `<img>` 节点。

## 发布前怎样验收

先核对构建日志、分类数量和每篇目标归属，再检查编译后的主包、每个分包和总包大小，以开发者工具与实际上传检查为准。源 Markdown 大小不能直接预测最终包体，分包个数也不能保证每包都满足限制。

随后在开发者工具和真机分别检查首次下载、再次进入、断网、图片、长表格、代码块和站内链接。首次打开尚未下载的分包需要网络；已经缓存的包也不等于远程图片已经缓存。内容更新需要重新生成、编译、审核和发布，用户端还涉及版本更新。

如果首页有分类但文章为空，检查分类推断与路由；如果正文有文字但没有图，检查资源是否被复制或改成实际远程地址；如果主包过大，检查完整内容是否被公共模块引入。每类故障都应回到生成数据和编译产物核对，不能仅凭预览首页判断全部文章可用。
