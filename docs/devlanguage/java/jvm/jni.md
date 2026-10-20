# JNI：Java 与 Native 能力的边界

音频解码、推理引擎或压缩库已有 C/C++ 实现时，JNI（Java Native Interface）可以把它接入 Java 进程。调用仍发生在同一个进程中：native 越界、释放后访问或错误线程操作可能破坏 JVM，Java 的 `try/catch` 不能把段错误变成可靠的业务异常。

## 数据跨边界时，所有权也要明确

![JNI 校验和实验的数据边界](/jvm/jni-data-boundary.svg)

Java 数组由 GC 管理，C 代码不能把 `jbyteArray` 当成长期有效的裸内存地址。本页实验用 `GetByteArrayRegion` 将少量数据复制进 C 栈缓冲，计算后只返回一个数值，不保留指针。对于音频持续流，应根据吞吐与延迟设计分块边界；每个采样点都做一次 JNI 调用，可能让边界成本超过计算收益。

使用 `GetByteArrayElements` 时，无论实现返回复制区还是直接访问，都需要按合同调用对应的 Release；`GetPrimitiveArrayCritical` 还有更严格的停留和调用限制，不适合拿着指针等待网络或执行长时间推理。若通过 `NewDirectByteBuffer` 暴露 native 内存，buffer 对象可达也不代表背后的内存仍有效，释放时机必须与所有使用者协调。

## 一个可运行的校验和实验

使用 JDK 17 和 C 编译器，在一个空目录保存以下两个文件。示例累计字节的无符号值，只用于验证 JNI 接线，不是密码学哈希或安全校验算法。

```java
// NativeBytes.java
public class NativeBytes {
    static { System.loadLibrary("nativebytes"); }

    public static native long checksum(byte[] data);

    public static void main(String[] args) {
        System.out.println(checksum(new byte[] {99, 100}));
        System.out.println(checksum(new byte[0]));
        try {
            checksum(null);
            throw new AssertionError("null must fail");
        } catch (NullPointerException expected) {
            System.out.println("null rejected");
        }
    }
}
```

先运行 `javac -h . NativeBytes.java` 生成 `NativeBytes.h`，再编译 C 文件。使用生成的头文件可以避免手写方法签名与静态/实例方法第二参数不一致。

```c
// nativebytes.c
#include "NativeBytes.h"

JNIEXPORT jlong JNICALL Java_NativeBytes_checksum(
        JNIEnv *env, jclass type, jbyteArray data) {
    (void)type;
    if (data == NULL) {
        jclass error = (*env)->FindClass(env, "java/lang/NullPointerException");
        if (error != NULL) {
            (*env)->ThrowNew(env, error, "data");
            (*env)->DeleteLocalRef(env, error);
        }
        return 0;
    }
    jsize length = (*env)->GetArrayLength(env, data);
    jlong sum = 0;
    for (jsize offset = 0; offset < length; ) {
        jbyte block[256];
        jsize count = length - offset;
        if (count > 256) count = 256;
        (*env)->GetByteArrayRegion(env, data, offset, count, block);
        if ((*env)->ExceptionCheck(env)) return 0;
        for (jsize i = 0; i < count; i++) sum += (unsigned char)block[i];
        offset += count;
    }
    return sum;
}
```

`JDK_DIR` 指向安装的 JDK 根目录，包含 `include/jni.h`，路径中的空格要保留引号。Linux 命令如下：

```bash
cc -shared -fPIC -Wall -Wextra \
  -I"$JDK_DIR/include" -I"$JDK_DIR/include/linux" \
  nativebytes.c -o libnativebytes.so
java -Xcheck:jni -Djava.library.path=. NativeBytes
```

macOS 将头文件平台目录与动态库格式改为：

```bash
cc -dynamiclib -Wall -Wextra \
  -I"$JDK_DIR/include" -I"$JDK_DIR/include/darwin" \
  nativebytes.c -o libnativebytes.dylib
java -Xcheck:jni -Djava.library.path=. NativeBytes
```

预期依次输出 `199`、`0`、`null rejected`。pending exception 出现后，C 函数返回的零不会作为正常业务结果交给 Java，调用方会观察到异常。调试选项 `-Xcheck:jni` 能发现部分 JNI 误用，不能证明没有 native 越界或并发错误。Windows 需要对应的编译工具链与 DLL，不能直接运行上面的 Unix 编译命令。

## 动态库为什么加载失败

`System.loadLibrary("nativebytes")` 使用库名与运行环境的搜索机制；`System.load` 则接收绝对路径。`UnsatisfiedLinkError` 可能来自主库找不到、依赖库缺失、CPU 架构不匹配、导出符号错误，或库与类加载器的关联冲突。先核对实际加载文件、架构和依赖，再查 `javac -h` 生成的 JNI 函数，不要只反复修改 `java.library.path`。

JDK 24 起，JNI 的相关加载与链接操作默认产生 native access 提示。class path 实验可在 `java` 启动选项中加 `--enable-native-access=ALL-UNNAMED`；模块化应用应为实际调用模块指定权限。该选项表达应用确实需要 native 访问，不会补齐缺失动态库，也不保证 native 实现安全。具体默认限制需按运行版本核对，不能将告警直接写成“JNI 已废弃”。

## 引用、线程与会话的关闭

本地引用通常在一次从 Java 进入 native 的调用返回时释放，但长循环仍需及时删除临时引用或使用本地引用帧。Global Reference 要显式 `DeleteGlobalRef`；只要强全局引用仍在，关联 Java 对象就可能继续存活。

`JNIEnv*` 属于当前线程，不能缓存后交给任意工作线程使用。native 创建的线程需要先取得 `JavaVM*`，检查是否已附加，按需 attach，并在自己附加的线程退出前 detach。回调 Java 之后也要检查异常；不能带着 pending exception 继续执行一串无关 JNI 调用。

例如识别会话在 `create` 中分配模型上下文，`close` 释放；取消、输入失败、初始化中途失败也要关闭已获得的资源。Java 包装器可通过 `AutoCloseable` 和 `try-with-resources` 表达正常所有权，native 端仍需防重复关闭、并发调用和关闭后访问。Cleaner 只能作为补充，不能承担实时音频会话的确定性退出。

## 堆外增长与崩溃要分开取证

Java 堆稳定而 RSS 增长时，先记录活动会话与 native 资源数量，再结合系统映射和 native 分配分析。NMT 需要启动时开启，且不跟踪所有第三方 native 分配；JFR 的 Java 分配事件也不能完整覆盖任意 `malloc`。`-Xmx` 和 `MaxDirectMemorySize` 都不是全部 JNI 内存的上限。

崩溃时保留 `hs_err_pid*.log`、对应动态库、符号信息、版本与输入条件。`problematic frame` 是调查入口，不必然是最早写坏内存的位置。需要时在测试环境使用 ASan、core dump 与 native 调试器继续定位；core 和错误日志也可能包含业务数据，需控制访问。修复后用相同输入反复创建、处理、取消和关闭，验证结果、资源计数与容器内存均有边界。更多证据入口见 [诊断案例](./diagnostic-cases.md)。
