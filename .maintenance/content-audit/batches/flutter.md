# Flutter逐页审查

7篇原文共1635行全文阅读；总览压缩重复介绍，各详情按运行模型、动手、缓存同步、交付和排错分工。每页决定见reviews/flutter.json。

关键缺陷：旧动手示例在build创建Future，违反同页规则。现保存Future并在配置变化或用户重试时更新，以受控Repository验证调用次数和完成顺序。mounted、Future超时、Web compute、Key、const与商店恢复均补适用边界。

正文代码由verify-flutter.mjs实际提取，Flutter3.47.1/Dart3.13.1：8组命令通过。3项Widget测试验证加载与普通重建不重复、失败重试到空、旧结果隔离和销毁后无更新；故意把请求放回build会失败。格式、强制锁文件、analyze和Web release通过，不冒称目标真机、Android/iOS签名、插件、权限或真实网络验证。

官方核对：FutureBuilder网页提取失败，改核本机官方SDK async.dart第466—489行；compute的Web限制核对isolates.dart及官方isolates页面对应章节，长页其他截断部分未作为核对依据。混淆官方正文读取完整，见official-sources.json。

7张独立SVG的self_check与实际中文字体边界通过。构建13.82秒；7页28份桌面1280/窄屏390与浅深色全文截图，14组各页首图加2组架构第二图原尺寸/退出、7次分页通过。截图/tmp/blog-flutter-ui，四份联系表已查看。窄屏为真实390像素iframe布局与390×844交互，不声称物理手机。

共享UI旧摘要仍待最终全站逐页复验。尚未提交、推送、部署。
