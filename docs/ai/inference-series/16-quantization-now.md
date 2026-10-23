---
search: false
---

# 低位量化学习入口

量化说明已整理到[05. FP8、FP4 与整数量化](../precision/05-quantization.md)：先用一组数字解释 scale、舍入和分组，再比较 INT4、FP8、FP4 与 W4A16。

<span id="先读懂-wakv-记法"></span>
<span id="量化有三条常见路线"></span>
<span id="离线和在线量化不要混用"></span>
<span id="当前工具链的事实边界"></span>
<span id="一个可回退的部署对照"></span>
<span id="验收清单"></span>

实际选型与实验方法见[06. 怎样选择与验证精度](../precision/06-choosing-precision.md)。从零学习可从[专题导读](../precision/)开始；显存、缓存与并发的关系见[GPU 与显存预算](./03-memory.md)。
