# Java 语言特性

订单导出需要表达“哪些对象可导出、哪些状态允许导出、如何选取和转换”，框架还可能根据方法上的注解增加处理。类、接口、泛型、Lambda、Stream、反射和注解分别负责这些不同的环节；把它们都写成 API 清单，很容易误以为注解会自动执行、泛型在运行时仍能检查所有元素，或 Stream 会像集合一样保存结果。

本页采用 JDK 17 正式特性，先用订单筛选说明对象与类型合同，再用方法调用说明元数据何时生效。变量、参数传递、基本运算见 [Java 基础](./index.md)，金额、集合视图与时间细节见 [基础工具类](./base-class.md)，版本差异见 [JDK](./jdk/index.md)。

## 用类型表达订单规则

以下完整的 `OrderFeatures.java` 把数据、能力与选择规则分开：`Order` 保存数据，`Exportable` 定义可被导出的能力，`Status` 表达有限状态，`Predicate` 表达筛选条件。泛型方法保留原对象的类型，因此传入 `List<Order>` 后得到的仍是 `List<Order>`，无需强制转换。

```java
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Predicate;

public class OrderFeatures {
    enum Status { PENDING, PAID, CANCELLED }

    interface Exportable {
        String code();
        long amountCent();
        Status status();
    }

    record Order(String code, long amountCent, Status status)
            implements Exportable {
        Order {
            Objects.requireNonNull(code, "订单号不能为空");
            Objects.requireNonNull(status, "状态不能为空");
            if (code.isBlank() || amountCent < 0) {
                throw new IllegalArgumentException("订单号或金额不合法");
            }
        }
    }

    static <T extends Exportable> List<T> selectPaid(
            List<T> source, Predicate<? super T> extra) {
        Objects.requireNonNull(source, "订单列表不能为空");
        Objects.requireNonNull(extra, "规则不能为空");
        source.forEach(item -> Objects.requireNonNull(item, "订单不能为空"));
        return source.stream()
                .filter(item -> item.status() == Status.PAID)
                .filter(extra)
                .toList();
    }

    public static void main(String[] args) {
        List<List<Order>> pages = List.of(
                List.of(new Order("101", 2000, Status.PENDING)),
                List.of(new Order("102", 5000, Status.PAID),
                        new Order("103", 3000, Status.PAID)));
        List<Order> orders = pages.stream().flatMap(List::stream).toList();
        Predicate<Exportable> positive = item -> item.amountCent() > 0;
        List<Order> paid = selectPaid(orders, positive);
        Function<Order, String> format = item ->
                item.code() + "=" + item.amountCent() + "分";
        long total = paid.stream().map(Order::amountCent)
                .reduce(0L, Math::addExact);
        System.out.println(paid.stream().map(format).toList());
        System.out.println("已支付总额=" + total + "分");
        System.out.println("首笔=" + paid.stream().findFirst()
                .map(Order::code).orElse("无"));
    }
}
```

```bash
javac --release 17 -encoding UTF-8 OrderFeatures.java
java OrderFeatures
```

输出两笔 `102=5000分`、`103=3000分`，合计 `8000分`，首笔为 `102`。这里处理的是已经装入内存的有限列表，不涉及数据库分页一致性、真实导出文件或支付处理。空列表得到空结果和零合计；空元素、非法金额应失败，累计超出 long 则由 `addExact` 拒绝。

### 类、接口与枚举的边界

普通类可封装可变状态，构造器维护不变量；record 适合表达一组明确的数据分量，自动生成分量访问器、相等、哈希及文本表示。`Order.code()` 不是 `getCode()`，框架是否识别需要按其版本验证。record 分量是 final，但若分量指向可变列表，列表内容不会自动深度不可变；本例的 String、枚举和 long 不包含这样的可变集合。

接口表达调用方需要的能力，不规定必须采用某种存储形式。上例的泛型方法只依赖 `Exportable`，以后可接收其他实现，而不需要继承订单类。接口的默认方法有实现，静态方法属于接口；私有接口方法用于内部复用。Lambda 所需的函数式接口只有一个抽象方法合同，默认和静态方法不计入该数量，`@FunctionalInterface` 让编译器检查这个约束。

继承适用于具有可替换语义的类型关系，普通实例方法的重写参与运行时分派；重载则先按编译期可见类型选择。静态方法隐藏、字段访问与实例方法重写不能混为一谈。访问控制也有边界：`protected` 跨包子类访问还受接收者类型等规则限制；模块未导出的包也不会因为类是 public 就可被所有模块访问。

枚举适合有限且代码内定义的状态，可用 `==` 比较常量身份。持久化和接口传输应使用稳定的业务代码，不用 `ordinal()`：在常量中间新增一项会改变后续序号。`valueOf` 按声明名称严格匹配，未知外部代码需要在输入边界明确报错或映射，不能随意落到“已支付”。

## 泛型约束与运行时信息

| 形式 | 允许表达的合同 | 需要避免的误解 |
| --- | --- | --- |
| `List<Order>` | 静态检查其中应为 Order | 不因为 Order 实现接口，就成为 `List<Exportable>` 的子类型 |
| `List<? extends Exportable>` | 可把元素读作 Exportable | 不能任意加入一个 Exportable；也不等于不可修改容器 |
| `List<? super Order>` | 可以加入 Order | 读出的类型通常只能保证为 Object |
| `<T extends Exportable>` | 在输入、输出之间保留同一类型关系 | T 不是运行时自动生成的具体类 |
| `Predicate<? super T>` | 可用针对 T 或其父类型的规则处理 T | 通配符不是关闭类型检查的开关 |

如果方法只消费订单，就使用能表达写入方向的下界；只从一组导出对象读取信息，可使用上界。方法需要保留输入与输出的同一类型时，再引入类型参数。不要为了“更通用”把所有参数都改成 `Object`，然后在内部集中强转。

Java 泛型主要通过类型擦除实现。运行中的普通 `ArrayList<String>` 与 `ArrayList<Integer>` 不会各自生成一个不同的 ArrayList 类，不能用 `instanceof List<String>` 检查元素类型。声明中的部分泛型签名仍可被反射读取，这不代表能从任意一个列表实例恢复或验证它的实际全部元素。

使用原始类型、未经验证的反射或未检查转换，可能绕开编译期约束，引入堆污染，直到读取时才出现 `ClassCastException`。`@SuppressWarnings` 只压制警告，不证明转换安全。通常使用 `List<List<String>>` 替代需要未检查转换的泛型数组，避免把示例中的警告压制直接复制进业务。

## Lambda、方法引用与内部类

上例 `Predicate<Exportable>` 接收对象返回 boolean，`Function<Order, String>` 接收订单返回文本。`Consumer<T>` 只消费值，`Supplier<T>` 在调用 `get()` 时提供值；它们没有自动调度到另一个线程。`Order::amountCent` 是方法引用，仍需由目标函数式接口确定参数与返回合同。

`predicateA.and(predicateB)` 先执行 A，只有 A 为真才执行 B；`or` 同样短路。`first.andThen(second)` 先运行 first，而 `first.compose(second)` 先运行 second。规则最好无副作用，不在判断函数里修改订单状态或发送消息，否则调用次数和顺序会影响业务结果。

Lambda 与局部/匿名类捕获的局部变量必须为 final 或 effectively final。捕获 `List` 引用后仍可修改列表内容，这不会自动变成线程安全代码。Lambda 中的 `this` 继承外层语义，匿名类里的 `this` 是匿名对象自身；二者不应按文本直接替换。

成员内部类与一个外部实例关联，能访问它的实例状态；静态嵌套类不自动拥有外部实例，需要显式传入才能访问其实例字段。长生命周期回调若持有内部类实例，可能间接延长外部对象的生命周期。内部类调用外部方法时还要检查是否又创建内部类并回调自身，避免形成没有终止条件的递归。对象生命周期详见 [JVM](../jvm/object-lifecycle.md)。

## Stream 是一次性处理管线

![Java订单筛选的Stream管线与终端操作](/java/stream-order-pipeline.svg)

创建 Stream 和连接中间操作只是描述计算。一般到终端操作时才执行所需的数据遍历；实现也允许在不改变结果时省略某些阶段，所以不要用 `peek` 或 `map` 承载必须发生的审计、扣款或通知。需要完整检查每个输入时，可以像示例那样在入口显式遍历校验，再构建纯计算管线。

| 操作 | 在订单中的作用 | 边界 |
| --- | --- | --- |
| `filter` | 留下已支付且金额为正的订单 | 不修改源列表，也不自动完成输入验证 |
| `map` | 把订单转成金额或展示文本 | 一项映射为一项；异常使本次处理失败 |
| `flatMap` | 把多个已加载分页列表展开为订单流 | 不会自动请求下一页或保证数据库快照一致 |
| `sorted/distinct` | 排序、按相等语义去重 | 可能需要额外存储；订单去重应先明确业务键 |
| `toList` | 产生结果列表 | JDK 17 的结果列表不可修改，但不深复制元素 |
| `reduce` | 合并金额等值 | 并行归约要求结合规则正确，不能随意用减法或共享可变累加器 |
| `findFirst` | 获取有顺序来源中的第一项 | 返回 Optional；“没有订单”不等于接口查询失败 |

Stream 终结后不可再次使用，应从集合重新创建。由 `Files.lines` 等资源产生的流还需要关闭，使用 try-with-resources；普通内存列表流不需要为了形式统一随处套资源关闭。对无限流使用收集或排序前，需要明确有界条件，否则可能无法结束或耗尽内存。

并行流要求函数无干扰且能安全合并结果。不要在 `parallelStream().forEach` 中向共享 `ArrayList` 追加；使用适合的收集或归约也不代表整个业务过程成为事务。并行 `forEach` 不保证原有顺序，阻塞数据库调用还可能占用共享执行资源；需要隔离、超时和并发上限时，应选择明确管理的执行模型。性能判断使用真实负载与适当基准，不能用一次毫秒计时得出普遍排名。

## Optional 表达缺失，不掩盖失败

`findFirst()` 返回空值表示没有符合条件的订单。`Optional.of(null)` 会失败，`ofNullable` 才把 null 转为空；Optional 变量自身也不应为 null。查询超时、数据库不可达或金额格式错误应保留失败语义，不能统一吞异常返回空值，让调用者误以为“查无此单”。

`map` 转换已有值，映射函数返回 Optional 时可用 `flatMap` 避免再包一层。`orElse(fallback())` 会先计算参数，即使已有值也调用 fallback；`orElseGet(() -> fallback())` 才按需调用。昂贵的查询或有副作用的默认操作尤其要区分二者。需要值却不存在时用 `orElseThrow` 表达业务失败，不先 `get()` 再等空值异常。

Optional 主要用于返回值表达可能缺失，不必把每个字段、参数和持久化属性都包装一遍。外部输入仍应明确校验；`assert` 可能未启用，也不承担生产参数验证。

## 注解必须由读取者执行约定

注解保存元数据，执行逻辑来自编译器、注解处理器、框架或显式代码。对下面的方法注解，`@Retention(SOURCE)` 不进入 class，`CLASS` 进入 class 但不能通过运行时反射读取，`RUNTIME` 才支持运行时读取；局部变量声明等其他位置还受对应的保留规则限制。`@Target` 限制标注位置；`@Inherited` 也不是所有方法、字段与接口注解自动继承的开关。

以下完整的 `AnnotationCall.java` 只通过一个已知公开方法演示过程。直接调用 `export` 不会因存在注解自动打印审计标识；显式包装器读取后，才执行包装器中的打印和反射调用。它不包含依赖注入、代理拦截或扫描整个 classpath 的框架实现。

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Objects;

public class AnnotationCall {
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.METHOD)
    @interface AuditName { String value(); }

    @Retention(RetentionPolicy.CLASS)
    @Target(ElementType.METHOD)
    @interface ClassOnly {}

    public static class Exporter {
        @AuditName("order-export")
        @ClassOnly
        public String export(String code) {
            Objects.requireNonNull(code, "订单号不能为空");
            if (code.isBlank()) throw new IllegalArgumentException("空订单号");
            return "导出订单=" + code;
        }
    }

    static Object invoke(Exporter target, String code)
            throws ReflectiveOperationException {
        Method method = Exporter.class.getMethod("export", String.class);
        AuditName metadata = method.getAnnotation(AuditName.class);
        if (metadata == null) throw new IllegalStateException("缺少审计标识");
        System.out.println("审计标识=" + metadata.value());
        System.out.println("CLASS注解可反射读取=" +
                (method.getAnnotation(ClassOnly.class) != null));
        try {
            return method.invoke(target, code);
        } catch (InvocationTargetException failure) {
            Throwable cause = failure.getCause();
            if (cause instanceof RuntimeException runtime) throw runtime;
            if (cause instanceof Error error) throw error;
            throw failure;
        }
    }

    public static void main(String[] args) throws ReflectiveOperationException {
        Exporter exporter = new Exporter();
        System.out.println(exporter.export("101"));
        System.out.println(invoke(exporter, "102"));
    }
}
```

```bash
javac --release 17 -encoding UTF-8 AnnotationCall.java
java AnnotationCall
```

第一行只有直接调用的结果，随后包装器输出审计标识、`CLASS注解可反射读取=false` 和第二次导出结果。把传入包装器的订单号改为空串，目标方法应失败；反射会以 `InvocationTargetException` 包装目标异常，示例保留并重新抛出运行异常或 Error，其他受检失败保留包装异常和原因，不伪装成成功。

`Class` 可以通过类字面量、对象的 `getClass()` 或类加载 API 获得。`Class.forName(String)` 默认还会触发类初始化，不能把所有获取类型信息的方式都当成无副作用。`getMethods()` 包含继承的 public 方法，`getDeclaredMethods()` 查询当前类声明的方法，不保证结果按源码顺序排列；重载方法需要给出准确参数类型。

`getDeclaredField` 找到私有字段，不代表已经获得访问权限，`setAccessible(true)` 也可能受模块边界阻止。不要用通用“复制所有字段”工具随意写入 static/final 字段、跳过构造不变量或读出敏感状态；优先显式构造、受支持的映射合同和公开 API。框架配置错误应定位到具体类、成员和根因，版本相关访问问题见 [JDK 升级实践](./jdk/upgrade.md)。
