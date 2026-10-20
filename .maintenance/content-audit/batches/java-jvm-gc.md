# JVM GC 逐页审查

完整阅读并改造GC总览、Serial、Parallel、ParNew、CMS、G1、ZGC、Shenandoah、Epsilon九页。新增六张机制SVG并重画选型图；重点纠正并行与并发分类、CMS历史定位、IHOP默认阈值误用、分代模式版本以及无回收实验预算。

正文实验机械提取至 `/tmp/blog-gc-audit/`，使用本机Temurin17真实执行五种回收器及Epsilon正常/耗尽对照；输出、退出码和日志证据逐页保存在review记录中。无JDK8和JDK24/25，不把官方核对写成真实运行验证。Shenandoah实际观察到pacing，未观察到退化。

构建输出 `/tmp/blog-audit-full-20261019/.vitepress/dist`，15.55秒成功。七图XML与技能自检通过，浏览器逐张截图检查实际字体及画布。九页在1280×800和390×844下逐页查看浅深色完整截图，图片加载、预览、原尺寸、关闭正常，超宽代码局部键盘滚动正常，无整页横向溢出。站内实验锚点、ParNew至JDK升级客户端跳转正常。`git diff --check`通过。

登记后全站182/589完成，407页待审；未提交、推送或部署。
