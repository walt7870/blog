# 里氏替换原则

里氏替换原则强调：子类型对象必须能够替换父类型对象，并且程序行为仍然正确。它关注的是继承关系是否符合行为契约，而不是类名之间是否看起来有“是一个”的关系。

![里氏替换原则示意图](/design-pattern/principles/lsp.svg)

## 历史脉络

里氏替换原则来自 Barbara Liskov 对数据抽象和类型层次的研究。后来它被纳入 SOLID 原则体系，用来约束面向对象继承中的行为一致性。

## 准确理解

继承不是为了复用几行代码，而是为了表达稳定的替换关系。如果父类承诺某个方法可用，子类不能在这个方法里抛“不支持”异常，也不能改变调用方依赖的前置条件和后置结果。

经典例子是“鸟”和“会飞的鸟”。企鹅是鸟，但企鹅不是会飞的鸟。如果父类 `Bird` 定义了 `fly()`，企鹅继承后只能抛异常，这就破坏了替换关系。

## 代码坏味道

- 子类重写父类方法后直接抛 `UnsupportedOperationException`。
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

把调用方变量类型从子类改成父类或接口后，行为是否仍然正确。如果必须判断具体子类才能安全调用，继承关系就需要重新审视。
