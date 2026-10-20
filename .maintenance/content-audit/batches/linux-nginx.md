# Linux Nginx三页

完整阅读旧概述202行、location203行、证书250行及原三张SVG。改为订单请求链、路径合同、证书运行生效三种职责；重画1120×630浅底蓝绿图，保留旧路径与sidebar入口。

从实际Markdown提取配置的`nginx-validation.mjs`在Debian12临时容器、Nginx1.22.1运行：五条标签请求、缺失资源404、SPA入口、JS资源、代理保留与去除/api、隔离ECC自签名TLS验证和reload全部通过。容器已停止并自动删除。未对真实订单、DNS API、ACME签发、systemd或CDN作验收声明。

`/tmp/blog-nginx-official.json`保存core/proxy/control官方材料。仅阅读全文control，core/proxy核对location、try_files、proxy_pass、read timeout相关段，不声称两篇全文通读。当前官方页面包含新扩展，正文与决策图明确限定Nginx1.22传统同层规则，嵌套和扩展需另测。`/tmp/blog-nginx-cert-official.json`核对README install-cert、ECC、cron段、LE staging与HTTP/2语法；README抓取截断。Wiki页面读取失败后官方raw Options-and-Params可读，但cert-home范围说明落后于实际脚本，因此检查完整下载的官方`/tmp/blog-acme-upstream.sh`对应3.1.7参数和hook路径，未执行脚本或签发操作。

三SVG技能自检通过。浏览器独立核对text实际中文尺寸与连线；请求图贴边句缩短，重建后页面图已显示新文本。三页1280×800、390×844浅深色全页均检查，手机无整页横溢，location表342px可读。超宽pre逐项键盘滚动、图片预览/原尺寸/关闭通过，概述→location→证书客户端跳转符合URL与H1。最终构建13.65秒成功；现有ld/dts高亮与chunk提示仍在，本地引用零错误。

累计215/589页，374页待审；尚未提交、推送或部署。
