# 装饰器模式

装饰器（Decorator）让包装对象与被包装对象保持共同接口，在委托前后增加处理。它适合缓冲、压缩、格式化等按需组合的能力。一个对象可以被多层包装，但调用顺序、结果语义与资源关闭必须明确，接口相同并不意味着调用方完全感受不到差异。

![输出流装饰链与数据方向](/design-pattern/patterns/decorator.svg)

## 从写出导出文件理解包装

业务得到一段 UTF-8 字节，希望缓冲小批写入，再生成 GZIP 数据。如果为“普通输出、缓冲输出、压缩输出、缓冲加压缩输出”分别定义完整子类，组合会迅速增加。装饰器让每层只承担一个处理，并把剩余工作委托给下一层。

下面直接使用 JDK 的输出流实现。调用方看到 `OutputStream`，外层是缓冲，内部是 GZIP，最终写入内存。保存为 `DecoratorDemo.java`，可在 Java 17+ 编译运行：

```java
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

public class DecoratorDemo {
    public static void main(String[] args) throws IOException {
        byte[] original = "订单导出已完成，包含 120 行。".repeat(30)
                .getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream storage = new ByteArrayOutputStream();

        try (OutputStream output =
                     new BufferedOutputStream(new GZIPOutputStream(storage))) {
            for (byte value : original) {
                output.write(value & 0xff);
            }
        }

        byte[] compressed = storage.toByteArray();
        byte[] restored;
        try (GZIPInputStream input = new GZIPInputStream(
                new ByteArrayInputStream(compressed))) {
            restored = input.readAllBytes();
        }
        if (!Arrays.equals(original, restored)) {
            throw new AssertionError("解压后的字节必须与原文一致");
        }
        System.out.println("UTF-8 原文: " + original.length + " 字节");
        System.out.println("GZIP 数据: " + compressed.length + " 字节");
        System.out.println("往返校验通过");
    }
}
```

`BufferedOutputStream` 聚合写入，`GZIPOutputStream` 生成压缩格式，`ByteArrayOutputStream` 保存结果。后者关闭后仍允许获取内容，这是这个内存流的特性，不能据此假定所有流关闭后都可继续读写。

样例用大量重复内容说明压缩与往返验证，不代表任意文件都能变小。短文本、随机字节和已经压缩的图片可能因为格式头尾而变大；内存流与 `readAllBytes()` 也只适合容量受控的示例，真实大文件应分块处理。

## 顺序与关闭是合同的一部分

上例的对象嵌套关系是“缓冲持有 GZIP，GZIP 持有存储流”，字节从外向内流动。若改成 GZIP 外包缓冲，压缩仍可成立，但被缓冲的是压缩后的字节，调用次数与内存分配会不同。讨论顺序要说明数据经过哪一层，不能仅看构造表达式先写了哪个类。

`flush()` 通常只推动当前缓存，不代表生成了完整 GZIP 尾部。`GZIPOutputStream.finish()` 完成压缩数据而保留底层流打开；`close()` 则完成压缩并关闭底层流。示例通过关闭最外层完成整条链，再读取结果。若底层是调用方共享的响应流，需要先确定谁拥有关闭权，不能擅自关闭。

压缩与加密也不能靠字符串加标记模拟。Base64 是编码，删空格是有损文本改写，字符偏移也不是可用于保护数据的加密。实际加密应使用成熟的带认证方案及密钥管理；压缩敏感数据还要考虑长度泄露，不把“先压缩后加密”当作任何场景都安全的固定配方。

## 与代理、责任链和函数组合的关系

| 形式 | 核心判断 | 不能据此推导 |
| --- | --- | --- |
| 装饰器 | 同接口委托，并叠加对象职责 | 所有包装都可任意交换顺序 |
| 代理 | 控制对目标的访问 | 代理只能有一层 |
| 责任链 | 当前处理者决定继续还是终止 | 每个处理者都会执行 |
| 函数组合 | 前一步输出进入下一步 | 必然具有对象装饰器的完整结构 |

Spring AOP 以代理为主要实现机制。事务、缓存与日志可以体现横切增强的思想，但注解并不等于手工包装了一串独立装饰对象，是否生效还受代理调用边界影响。相关机制见[代理模式](./proxy.md)。

如果增加缓存，必须定义键、容量、失效与身份边界；清空整个 Map 不是 LRU。若把工作提交到线程池后马上阻塞 `get()`，同步调用并没有自动变快，还可能在同一受限线程池内形成等待。性能收益需要测量具体链路。

## 失败与验收

写入失败必须让调用方知道结果不完整，不能返回成功。生产导出可以写临时对象，校验和关闭成功后再发布可下载引用；清理失败也要能追踪。监控应分别统计成功、失败和所有调用耗时，不能用包含失败的总耗时除以成功次数。

验收先检查原始数据与解码结果逐字节一致，再覆盖空内容、大内容、底层写入失败、关闭失败和错误装配顺序。资源异常可使用 `try-with-resources` 保留主异常与被抑制的关闭异常。只有在每层责任和关闭权都能说清时，增加包装才有维护价值。
