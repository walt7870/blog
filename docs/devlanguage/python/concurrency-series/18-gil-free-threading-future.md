# GIL、free-threading 与未来选型：运行时会变，工程判断顺序不会变

> 对应视频：EP18《GIL、free-threading 与未来选型》  
> 视频入口：[B站 EP18](https://www.bilibili.com/video/BV1QGu768Ed4)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![GIL 与 free-threading 选型顺序图](/python/concurrency/ep18-runtime-selection-future.svg)

这张图把 GIL 和 free-threading 放回工程选型顺序里：运行时会变化，但瓶颈诊断、兼容验证和渐进迁移不会消失。

## 这篇解决什么问题

GIL 和 free-threading 容易被口号化。文章把它放回工程选型：先看任务瓶颈，再看库生态和运行时边界。

## 选型顺序

I/O 等待优先考虑 asyncio 或线程池；纯Python CPU任务比较进程池与可选free-threaded构建；GPU 推理考虑 batch queue。

## 迁移验证

建立 baseline，小范围 canary，检查扩展兼容、线程安全、speedup、P95 和错误率。

## Python3.14的实际边界

截至2026-10-20，free-threaded构建在Python3.13引入，Python3.14进入正式支持阶段，仍是可选构建，默认解释器仍启用GIL。先检查构建是否支持，再在导入实际依赖之后检查GIL是否启用：不兼容的C扩展可能让GIL重新开启。

下方检查器同时显示构建配置与当前运行状态，并给出单阶段选型建议，不执行性能测试。复合流水线应逐阶段选择，不能用第一个True字段代表整条链路。容器内存和CPU配额、原生库线程池、共享状态竞态都仍需验证；内置容器的内部锁不保证“先查后写”等业务组合动作原子化。

## 实战检查清单

- 是否分别确认Python版本、构建支持与当前GIL状态。
- 导入实际C扩展后是否再次检查GIL及其兼容声明。
- 是否在相同输入与资源配额下比较吞吐、内存和尾延迟。
- 共享业务动作是否仍有同步保护，并保留运行时回退。

## 运行示例

示例保存为`examples/ep18/runtime_decision_table.py`；目录和文件名由本地自行创建。

```python
import sys
import sysconfig

def runtime_info():
    supported = sysconfig.get_config_var("Py_GIL_DISABLED") == 1
    checker = getattr(sys, "_is_gil_enabled", None)
    return {"version": sys.version, "free_threaded_build": supported,
            "gil_enabled": checker() if checker else "当前版本无查询接口"}

def choose_model(task):
    if task.get("gpu_inference"):
        return "有界模型队列、组批和显存预算"
    if task.get("native_library"):
        return "先测原生库是否释放GIL及其内部线程池"
    if task.get("cpu_python_heavy"):
        return "比较进程池与可选free-threaded构建"
    if task.get("waits_on_network"):
        return "异步客户端或受限线程池，并单独限制请求速率"
    if task.get("waits_on_files_or_commands"):
        return "受限线程池或外部命令池"
    return "先定位该阶段瓶颈"

if __name__ == "__main__":
    print(runtime_info())
    for case in [{"waits_on_network": True}, {"cpu_python_heavy": True},
                 {"gpu_inference": True}]:
        print(case, choose_model(case))
```

