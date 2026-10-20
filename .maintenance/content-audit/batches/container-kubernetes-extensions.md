# Kubernetes 进阶扩展逐页审查

进阶8页和CustomResource阅读入口全文审查，累计267/589页。补模板与Operator选择路径、CRD存储迁移、Gateway/Ambient路径、GitOps准入证据4张独立SVG，修正Operator、扩展点、平台分层3张图。详细改动与逐页证据见同名reviews记录。

官方核对材料为`/tmp/blog-k8s-extension-official.json`及`/tmp/blog-k8s-traffic-official.json`：Gateway设计和Ambient数据面全文阅读；CRD、版本迁移、VAP及Cilium文档按相关段核对，没有宣称通读全部大型官方文档。

6段YAML及5段Bash语法解析通过，7张SVG自检和独立浏览器实际字体/截图检查通过。平台图最后修正反馈线并重新验证最新1280×660版本。最新完整构建13.72秒、git diff --check通过。

9页均完成1280×900及390×844双主题全页检查、两端所有图片原尺寸加载及关闭、手机全部超宽代码键盘横滚、两端客户端分页；CustomResource三条正文入口实际跳转通过。页面未撑宽，表格维持局部横滚。截图只在工具中展示，没有声称保存到文件。

Operator、扩展点、平台图在手机被共享CSS固定760宽，只见局部；三项保持开放，待全站UI阶段修复并真实复验。没有集群、外部云资源、准入策略、网格集成或Go编译实验，示例边界已在正文说明。
