# Docker 五页

完整阅读原五页（69、489、106、129、201行）后重写。用订单API说明构建输入、镜像身份、实例运行、网络数据和停止恢复，不再把命令罗列当排查过程。新增四张独立SVG，总览复用已验证交付图。

## 实验与修复

`.maintenance/content-audit/docker-validation.mjs`从正文提取命令、Compose YAML和Java运行Dockerfile，以带PID的独立对象运行并在finally精准清理。Docker29.7.2、Compose5.4.0、buildx0.36.1、JDK21.0.8；PostgreSQL16 Alpine和Temurin21 JRE。

- Alpine观察、exec局部环境、stop/start保留文件与删除重建不保留通过。
- Compose config通过。首轮Unix socket就绪后SQL撞上临时服务关闭，核对官方入口后将正文与实验改为TCP探针；仅启动db并以secret密码真实TCP SQL写入，down/up后记录保留。
- Java固定JAR和正文运行Dockerfile构建通过；UID10001、512MiB限制、JAVA_TOOL_OPTIONS、HTTP200与关闭钩子通过。最大堆初版断言精确256MiB不正确，实际259522560字节受GC布局影响；修测试范围后Java单独复跑通过。
- 未测试真实订单API、Spring在途请求优雅退出、Maven项目多阶段构建、Registry晋级与签名校验。官方基础镜像作为本地缓存保留，实验自建资源清理。

## 视觉与构建

四图1120原尺寸逐个读取所有text的getBoundingClientRect并观察截图；五页1280×800、390×844浅深色全页逐一检查。无整页横溢、图片均加载；所有图片可预览、原尺寸、关闭，全部超宽代码ArrowRight可滚动。Docker总览→命令→构建→存储→Java客户端链接URL/H1正确，最后一步使用实际相邻页入口。

构建初次dockerignore fence高亮告警改为text；最终13.81秒成功，仅已有ld/dts高亮与chunk提示。本地引用零错误。

## 官方核对范围

Docker exec、restart policies、system prune、Compose startup-order与Build secrets；Dockerfile reference只采用实际读取的intro、指令表及COPY/COPY --from/ADD段；PostgreSQL入口只核file_env、minimum env、临时服务listen_addresses等相关段。长来源抓取的截断外内容不计已读。证据在/tmp/blog-docker-*.json。
