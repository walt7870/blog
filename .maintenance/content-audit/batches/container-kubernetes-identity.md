# Kubernetes 命名空间与身份逐页审查

Namespace、RBAC、ServiceAccount 三页完整阅读，修改后再次全读；新增两张1120×640独立SVG，累计253/589页。

Namespace 用两团队同名对象解释各类边界；RBAC 用日志值班解释主体、规则和绑定；ServiceAccount 区分默认API Token与外部对账Token，修复投影卷缺少容器挂载的问题。所有命令明确前提，不将身份模拟解释为完整认证或业务验收。

6段YAML共8对象经Ruby解析，5段Bash经bash/zsh语法检查。两个SVG通过技能自检与浏览器原尺寸字体矩形和完整截图检查。3页全部完成1280×900、390×844双主题完整截图，全部图片两端放大关闭，全部手机超宽代码横滚，连续客户端分页。整页无横溢，构建14.13秒通过，git diff --check通过。

官方证据保存在 `/tmp/blog-k8s-identity-official.json`、`/tmp/blog-k8s-identity-validation-official.json` 和前批Token证据中。Namespaces、PSA、can-i全文阅读，其余按机制相关段核对。未执行真实集群授权、Pod/Namespace删除、Token签发或轮换。
