# JVM 执行、对象与诊断逐页审查

三页旧正文、代码和无图文本流程已完整阅读，已逐一处理并验收，记录见 `reviews/java-jvm-engine.json`。

| 页面 | 主要问题 | 处理结果 |
| --- | --- | --- |
| execution-engine-jit | 固定解释/C1/C2流程、逃逸分析等同栈分配、诊断命令缺前提 | 编译关系SVG、有限JitLab、OSR与代码失效边界、现代Safepoint与NMT说明 |
| object-lifecycle | 初始化次序不准确、对象头混入实例数据、分代模型泛化 | JDK17初始化实验、布局版本范围、ThreadLocal引用与作用域SVG、分回收器解释 |
| diagnostic-cases | 全是标题列表，OOM直接高成本连采，平台和资源限制混淆 | 工程场景因果段落、证据分支SVG、采集成本、容器/native/线程边界与复测条件 |

## 实际验证

- Temurin 17.0.20.1：JitLab正常和-Xint均输出400398000000，编译日志含C1/C2、OSR和代码替换。Compiler.codecache、Compiler.queue、help GC.heap_dump实际调用成功。OrderInit输出base、field、block=19900、constructor=19900。所有实验进程均退出。
- JEP519官方页面实际读取，限定JDK24/25紧凑对象头，不推定所有未来版本的默认行为。
- `npm run docs:build -- --outDir /tmp/blog-audit-full-20261019/.vitepress/dist`：15.02秒成功，仅既有ld/dts与大chunk提示。
- 三页逐一检查1280×800与390×844浅深色完整截图；四个引用图逐一放大、原尺寸、关闭，手机表格和全部超宽代码局部滚动通过。独立SVG中文字体与文字画布边界、xmllint通过。
- 首次用End键未产生横向滚动，改用ArrowRight后实际scrollLeft>0，未把无效尝试计为通过。
- 典型工程场景用于解释机制，未伪造生产验证；Linux cgroup/top命令在当前macOS上未执行，正文已明确平台范围。

全站仍有未审页面，不发布、不把构建成功等同于全站内容通过。
