# 里氏替换原则

里氏替换原则强调：子类型对象必须能够替换父类型对象，并且程序行为仍然正确。它关注的是继承关系是否符合行为契约，而不是类名之间是否看起来有“是一个”的关系。

![里氏替换原则示意图](/design-pattern/principles/lsp.svg)

## 历史脉络

里氏替换原则来自 Barbara Liskov 对数据抽象和类型层次的研究。后来它被纳入 SOLID 原则体系，用来约束面向对象继承中的行为一致性。

## 准确理解

继承应表达稳定的替换关系。如果父类型承诺某项操作必定受支持，子类型不能改成“不支持”；不能加强调用条件、削弱结果承诺或破坏不变量。异常也要放在契约中判断：Java 集合允许某些操作是可选的，因此只读集合抛出约定的 `UnsupportedOperationException` 并不自动构成违规。

经典例子是“鸟”和“会飞的鸟”。企鹅是鸟，但企鹅不是会飞的鸟。如果父类 `Bird` 定义了 `fly()`，企鹅继承后只能抛异常，这就破坏了替换关系。

## 代码坏味道

- 子类对父类型承诺支持的操作抛 `UnsupportedOperationException`。
- 调用方需要判断 `instanceof` 后区别处理子类。
- 子类强化了父类方法的前置条件，例如父类允许空值，子类不允许。
- 子类弱化了父类方法的后置承诺，例如父类保证返回非空，子类可能返回空。
- 继承只是为了复用代码，而不是为了表达可替换关系。

## 重构示例

问题设计：

```java
public class Bird {
    public void fly() {
        // 飞行
    }
}

public class Penguin extends Bird {
    public void fly() {
        throw new UnsupportedOperationException("企鹅不会飞");
    }
}
```

更合理的抽象：

```java
public interface Bird {
    void eat();
    void move();
}

public interface Flyable {
    void fly();
}

public class Sparrow implements Bird, Flyable {
    public void eat() {}
    public void move() {}
    public void fly() {}
}

public class Penguin implements Bird {
    public void eat() {}
    public void move() {}
}
```

把“鸟”和“会飞”拆成不同能力后，企鹅不再被迫实现不具备的行为。

## 落地步骤

1. 检查父类公开方法是否所有子类都能履行。
2. 把并非所有子类共有的能力拆成独立接口。
3. 优先用组合复用代码，不要为了复用强行继承。
4. 给父类契约写测试，所有子类都应通过同一组行为测试。
5. 删除调用方对具体子类的特殊判断。

## 常见误区

- 只按现实世界分类建继承树，忽略软件行为契约。
- 认为子类“功能更多”就一定能替换父类。
- 用继承复用工具方法，导致类型关系失真。
- 父类过早暴露太多方法，迫使子类不合理实现。

## 判断标准

对每个实现运行同一组契约测试，而不只是更改变量声明。例如文件存储端口承诺“成功上传后能按返回的键读取相同字节”，本地存储和远程存储都要满足；异常、覆盖行为和可见时点也需事先约定。只测正常返回，或只证明代码能编译，无法证明替换可靠。
