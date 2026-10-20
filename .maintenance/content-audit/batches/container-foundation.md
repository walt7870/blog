# 容器总览与基础五页

本批完整阅读原五页及旧交付关系图，完成正文重写和四张图示。围绕订单交付与CSV保存，解释镜像、运行配置、实例、卷、内核和工具管理端点的关系。保留已有子路径和视频入口。

## 验证

- 构建首次因新稿TopicDirectory字段写成link失败，修为组件实际href合同及绝对路径后13.76秒完成。
- 从概念正文提取临时Alpine3.22命令执行，退出0；得到Linux、PID1、cgroup namespace路径及namespace链接，实例自动删除。
- 四张SVG均在浏览器1280视口按原1120宽观察全部text的getBoundingClientRect，逐图截图检查连线、节点和画布；交付链修为从仓库进入进程顶部，隔离图共用镜像沿节点上方分支。
- 五页均检查1280×800、390×844浅深色全页截图、图片加载和原尺寸/关闭；手机无整页横溢，表格342px，概念命令横滚可键盘操作。
- 总览目录到基础、概念、运行时、标准的键盘客户端跳转均核对URL和H1。

## 事实核对范围

官方Docker容器说明及Volumes生命周期/挂载遮蔽，K8s CRI v1要求、Volumes开头与PV生命周期，OCI Image overview，containerd README的CRI职责，CNI overview与ADD/DEL协议，CSI目标与控制/节点架构。抓取记录在/tmp/blog-container-*.json；超出截断部分不计已读。未进行真实K8s、网络或存储驱动替换测试。

下一批Docker五页已全部阅读全文：发现标签误称不可变、COPY来源表述过度、Gradle通配符多JAR、缺少PostgreSQL密码、健康检查工具/自定义_FILE未说明、健康失败与自动重启混淆、HTTP探测数据库协议、容器内systemctl、明文密码及shell入口信号等问题，尚未登记通过。
