# 解释器模式

解释器（Interpreter）把一套小语言的规则表示成表达式对象，再用一份上下文求值。电商活动中的“会员且满 100 元，或者任意用户满 500 元”可以表示成一棵规则树；同一棵树能判断多个订单，金额和会员身份随订单变化。

![订单优惠规则的表达式树和执行边界](/design-pattern/patterns/interpreter.svg)

## 文法、解析和求值各负责什么

文法规定合法句子，例如“条件可以是会员、金额门槛、两个条件的且/或组合”。解析器把文本或结构化配置转成表达式树；解释器按节点语义求值。GoF 解释器关注的是规则对象及其解释过程，并不要求从零实现词法分析和解析器。

以这条活动规则为例，根节点是“或”；左边是“且”，包含会员判断和 10,000 分门槛；右边是 50,000 分门槛。订单金额用人民币分表示，避免把 `100.00` 的浮点误差带进比较。会员订单 100 元通过左支，普通订单 200 元两支都失败，普通订单 500 元通过右支。

| 对象 | 本例职责 | 不应承担的职责 |
| --- | --- | --- |
| `Order` | 提供一次判断所需的不可变事实 | 在判断中实时读取并修改订单 |
| `Vip`、`AtLeast` | 解释一个基础条件 | 发送优惠券或扣款 |
| `And`、`Or` | 组合子表达式并短路求值 | 偷偷改变下一条规则的输入 |
| 规则装配入口 | 检查结构并创建表达式树 | 直接执行任意脚本或反射调用 |

不要把“规则通过”解释成“券已经发放”。资格判断返回布尔结果；发券仍应走独立的业务命令，并处理额度、重复请求和事务边界。把副作用混入短路表达式，会使未执行的分支和执行顺序影响业务结果。

## 可运行示例：一棵树判断三个订单

以下代码保存为 `InterpreterDemo.java`，使用 Java 17 及以上版本。示例直接用 Java 对象装配规则，**没有实现文本解析器，也不接收用户脚本**。新增比较运算需要同时明确类型、单位和非法值处理，不能对任意 `Object` 做未经检查的 `Comparable` 强转。

```java
import java.util.List;
import java.util.Objects;

public class InterpreterDemo {
    record Order(boolean vip, long amountFen) {
        Order {
            if (amountFen < 0) throw new IllegalArgumentException("金额不能为负");
        }
    }

    sealed interface Expr permits Vip, AtLeast, And, Or {
        boolean test(Order order);
    }

    record Vip() implements Expr {
        public boolean test(Order order) {
            return Objects.requireNonNull(order).vip();
        }
    }

    record AtLeast(long fen) implements Expr {
        AtLeast {
            if (fen < 0) throw new IllegalArgumentException("门槛不能为负");
        }
        public boolean test(Order order) {
            return Objects.requireNonNull(order).amountFen() >= fen;
        }
    }

    static List<Expr> children(List<Expr> expressions) {
        var copy = List.copyOf(expressions);
        if (copy.size() < 2) throw new IllegalArgumentException("至少两个条件");
        return copy;
    }

    record And(List<Expr> terms) implements Expr {
        And { terms = children(terms); }
        public boolean test(Order order) {
            Objects.requireNonNull(order);
            for (Expr term : terms) {
                if (!term.test(order)) return false;
            }
            return true;
        }
    }

    record Or(List<Expr> terms) implements Expr {
        Or { terms = children(terms); }
        public boolean test(Order order) {
            Objects.requireNonNull(order);
            for (Expr term : terms) {
                if (term.test(order)) return true;
            }
            return false;
        }
    }

    public static void main(String[] args) {
        Expr rule = new Or(List.of(
            new And(List.of(new Vip(), new AtLeast(10_000))),
            new AtLeast(50_000)
        ));
        System.out.println(rule.test(new Order(true, 10_000)));
        System.out.println(rule.test(new Order(false, 20_000)));
        System.out.println(rule.test(new Order(false, 50_000)));
    }
}
```

```sh
javac --release 17 InterpreterDemo.java
java InterpreterDemo
```

输出依次为 `true`、`false`、`true`。`List.copyOf` 固定子节点列表并拒绝空元素；这些节点和订单只有不可变字段，因此多个请求可以共享规则树，各自传入订单。这个结论不自动适用于带可变集合、共享计数器或外部查询的节点。

本例不支持任意动态节点。若只有固定活动中的两三个判断，直接写一个清晰的方法更省事；当规则需要持久化、组合、展示和多次复用时，表达式对象的价值才明显。

## 从配置到线上规则

后台规则编辑器通常应提交结构化数据，例如操作符 `AND`、子条件列表和金额门槛。接收层先校验字段白名单、类型、数值范围、最大深度及节点总数，再把已验证结构映射成节点对象。未知字段或运算符应拒绝发布，不能忽略后把规则放宽。

需要可输入的表达式语言时，优先选用成熟的解析器或受限表达式引擎，并确认它实际开放的能力。支持反射、方法调用、文件和网络访问的表达式不能仅凭“只读规则”命名就视为沙箱。把字符串按空格拆分不等于解析 SQL；把整句转成大写还会改变字符串常量。数据库查询应继续使用数据库解析器和参数化查询。

规则发布与订单判断应分开：保存草稿，验证案例，生成不可变版本，再切换当前版本。一个订单的判断应固定规则版本和事实快照；不能在判断过程中一边读取变动的会员信息，一边采用另一个版本的金额规则。

## 缓存什么，怎样定位错误

通常先缓存“规则版本 → 已验证表达式树”，并设置容量和淘汰策略。缓存树不会混淆不同订单的结果。缓存求值结果则还要把所有相关事实和版本加入键；用同一个可变 `Context` 对象当键，改了金额后仍命中旧结果，是常见的错误。

解析错误、数据缺失和正常条件不匹配应分开。语法错误返回位置和允许的操作；缺少必要金额应拒绝本次判断；普通订单没有达到门槛则正常返回 `false`。不要用“捕获所有异常并默认通过”隐藏配置错误。日志记录规则版本、节点位置和错误类别，避免把完整用户上下文写进去。

验证时至少覆盖：

- 金额在 9,999、10,000、49,999、50,000 分及会员身份两种取值下的结果。
- 空订单、负金额、空子节点、过深或过大配置是否在对应入口明确拒绝。
- 同一规则在多个订单间交错求值是否串用事实；切换版本后在途请求是否仍使用原版本。
- 短路后的分支是否没有执行；错误和不匹配是否能在返回值或日志中区分。

## 与其他模式的边界

[组合模式](../structural/composite.md)提供树形结构，解释器再赋予节点明确的语言语义。[策略模式](./strategy.md)适合整体替换一套算法，通常不需要把算法内部表示为可编辑语法树。[访问者模式](./visitor.md)可以给稳定的语法树增加类型检查、格式化或求值操作，代价是新增节点时要同步修改访问者接口。

语法发展出函数、作用域、类型推导和复杂错误恢复后，手写节点类和递归调用会迅速膨胀。此时应重新评估语言工具链，而不是继续把每种语法都塞进一个“万能解释器”。
