# 合成复用原则

合成复用原则强调：优先使用组合、聚合和委托来复用能力，而不是优先使用继承。

![合成复用原则示意图](/design-pattern/principles/crp.svg)

## 历史脉络

合成复用原则来自面向对象长期实践中的经验总结。GoF 设计模式中也反复强调“优先对象组合，而不是类继承”。装饰器、策略、桥接、组合等模式都体现了这一思想。

## 准确理解

继承表达“是一个”，组合表达“拥有某种能力”。如果只是为了复用代码而继承，很容易把不稳定变化写进类型层次，后续扩展会越来越困难。

例如日志系统既可能输出到文件、控制台、网络，又可能增加加密、压缩、异步能力。如果用继承组合这些维度，很快会出现大量类。

## 代码坏味道

- 子类数量随功能组合成倍增加。
- 子类名越来越长，例如 `CompressedEncryptedRemoteLogger`。
- 父类修改会影响大量子类。
- 子类只想复用一个方法，却被迫继承父类全部行为。
- 多个变化维度混在同一继承树里。

## 重构示例

继承堆叠：

```java
public class FileLogger {}

public class EncryptedFileLogger extends FileLogger {}

public class CompressedEncryptedFileLogger extends EncryptedFileLogger {}
```

组合能力：

```java
public interface Logger {
    void log(String message);
}

public class FileLogger implements Logger {
    public void log(String message) {
        // 写文件
    }
}

public class EncryptLogger implements Logger {
    private final Logger delegate;

    public void log(String message) {
        delegate.log(encrypt(message));
    }
}

public class CompressLogger implements Logger {
    private final Logger delegate;

    public void log(String message) {
        delegate.log(compress(message));
    }
}
```

通过组合可以按需叠加能力：

```java
Logger logger = new CompressLogger(new EncryptLogger(new FileLogger()));
```

## 落地步骤

1. 找出继承树中多个变化维度。
2. 把每个变化维度拆成独立接口或组件。
3. 让对象持有能力对象，通过委托完成复用。
4. 保留真正稳定的继承关系。
5. 用装配代码或依赖注入组合不同能力。

## 常见误区

- 认为继承一律不能用。稳定的类型层次仍然可以继承。
- 组合后对象链过深，调试困难，需要清晰命名和测试。
- 组合对象没有统一接口，导致调用方仍然知道具体结构。
- 把所有差异都做成可配置，牺牲可读性。

## 判断标准

新增一种能力组合时，是否只需要新增一个组件并重新装配，而不是新增一批子类。如果可以，组合复用就发挥了作用。
