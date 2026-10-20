# Java 基础工具类

导入一批订单时，字符串负责承接外部输入，数值类表达金额，集合暂存订单，日期类确定业务日，异常和进程 API 则决定失败能否被正确发现。工具类最容易出错的地方，往往是对象是否共享、数值是否精确、时间基准是什么，以及一次方法调用承诺了多大的安全范围。

本页以 JDK 17 为可运行基线，围绕这些合同说明常用 API。语法从[基础语法](./index.md)开始，版本迁移看 [JDK 与版本](./jdk/index.md)，对象内存与回收进入 [JVM](../jvm/index.md)。这里不把每个重载打印一遍，也不把短循环计时当成性能结论。

## 先判断要保护哪种边界

| 工具 | 订单场景中的入口 | 调用前需要明确 |
| --- | --- | --- |
| `Object`、`Objects` | 对象相等、空值检查、哈希键 | 身份相同还是业务值相同，键字段会不会变化 |
| `String`、`StringBuilder` | 参数清洗、日志与报表拼接 | 编码、允许字符、长度单位与线程归属 |
| `BigDecimal`、`Math`、`BigInteger` | 金额、数量、比例、超大整数 | 单位、舍入时机、数值范围与溢出 |
| `Arrays`、`Collections`、`List` | 排序、查询、快照与批量处理 | 原数组是否共享，容器与元素是否可变 |
| `java.time` | 创建时间、账期、业务日范围 | 瞬时时间还是本地日期，使用哪个时区 |
| `Throwable`、`AutoCloseable` | 读取文件、调用数据库、导入失败 | 谁负责恢复、关闭资源与保留失败原因 |
| `System`、`Runtime`、`ProcessBuilder` | 环境定位、耗时观察、外部程序 | 时钟基准、内存范围、输出消费和超时终止 |

## 相等、哈希与空值

`==` 对引用比较是否指向同一对象，`equals` 表达类型定义的值相等。两张订单对象可以不是同一个实例，却有同一个业务身份；相反，两张字段相近但订单号不同的订单不能因此自动合并。定义相等关系时先明确业务键，再同步实现 `equals` 和 `hashCode`：相等对象必须有相同哈希值，相同哈希值却不保证相等。

`HashMap` 和 `HashSet` 中的键若在放入后改变参与哈希或相等比较的字段，后续查找可能失败。包含不可变字符串的 `record OrderKey(String tenant, String orderId)` 适合作为明确的组合键，但 record 只让字段引用不可重新赋值，不会把其中的可变集合深复制。数组默认的 `equals` 仍比较数组身份，需要按内容比较时选择 `Arrays.equals`，嵌套数组再考虑 `Arrays.deepEquals`。

`Objects.equals(a, b)` 允许两边为空，但它不会替业务决定“缺失订单号”和空字符串是否等价。必填值用 `Objects.requireNonNull` 尽早拒绝，再检查空白、格式和业务范围；不能把缺失金额默认为零来掩盖坏输入。`Objects.toString(value, "")` 只适用于允许空展示的地方。`Optional` 主要表达返回值可能不存在，`orElse` 的参数会先求值，需要延迟创建备用结果时用 `orElseGet`。

`Object.clone()` 不是自动深复制。通常需要实现 `Cloneable` 才能调用父类复制，否则会抛 `CloneNotSupportedException`；即使复制成功，引用字段通常仍共享。订单快照更适合显式构造或转换，逐个决定哪些字段复制、哪些对象可以共享，而不是把 `clone` 当作隔离数据的通用方案。

## 字符串不是任意文本的完整解析器

`String` 不可变，`replace`、`strip`、`substring` 返回结果不会修改原值。循环构造一份较长报表时可以使用局部 `StringBuilder`，短小固定表达式的 `+` 通常更清楚。`StringBuffer` 对单个方法提供同步，但“检查长度后追加”这类组合操作仍要整体协调；不要把同一个构建器无约束地传给多个线程。

Java 字符串的 `length()` 返回 UTF-16 代码单元数，补充平面字符可能占两个 `char`。`codePointCount` 可数代码点，但用户看见的一个字形仍可能由多个代码点组成。协议按 UTF-8 字节限长、数据库按字符限长和界面按字形截断，是三种不同要求；直接 `substring(0, n)` 可能切断代理对，也不能保证不切开组合字形。

`trim` 与 `strip` 的空白定义不同，`strip` 基于 `Character.isWhitespace`，并不清除所有看起来像空格的 Unicode 字符。订单号宜限制明确字符集，再决定是否允许前后空白；签名原文、密码和有意义的空格不能擅自清洗。协议标识大小写转换要固定 `Locale.ROOT`，显示给用户的文字才按相应区域规则处理。

`String.split` 的分隔符是正则表达式，按字面量拆分可用 `Pattern.quote`；需要保留尾部空字段时指定负 limit，例如 `"102|paid|".split("\\|", -1)` 得到三个字段。它不能完整解析带引号、转义或跨行字段的 CSV，应使用真正的 CSV 解析器。`replaceAll` 的替换串里 `$` 和反斜杠有特殊含义，替换纯文本优先 `replace`，确实需要正则替换时使用合适的转义 API。

## 金额精度与整数范围

以“分”为单位的整数适合固定币种、固定小数位的金额，但必须检查范围及中间乘法。以 `BigDecimal` 表示十进制时优先从规范十进制字符串构造，`new BigDecimal(0.1)` 会把二进制浮点近似值带进去；`BigDecimal.valueOf(double)` 使用另一条转换路径，也无法补救上游已经发生的浮点运算误差。

`new BigDecimal("2.0").equals(new BigDecimal("2.00"))` 为假，因为 `equals` 同时考虑数值与 scale；`compareTo` 比较数值时两者相等。将金额作为哈希键前应统一单位与 scale；放进基于比较器的集合也要理解与 `equals` 不一致的影响。`divide` 遇到无限循环小数可能抛出异常，应明确结果 scale、精度与舍入规则，而不是遇错后随手改成 `double`。

例如三人分摊 100 分，不能只把 `1/3` 保留两位小数再乘回去。应按约定分成 34、33、33 分，并确定余数分配顺序；税费、折扣和汇率也要规定是逐项舍入还是总计舍入。`RoundingMode.HALF_UP` 不是所有财务业务的通用答案。

`int`、`long` 普通算术溢出通常不会抛异常，需要检测时使用 `Math.addExact`、`multiplyExact` 等方法；`Math.abs(Integer.MIN_VALUE)` 仍为负值。`Math.round` 对负数半值的行为也不能简化为所有场景下的“四舍五入”。阶乘、大整数和公倍数等算法的范围验证见[数学算法](../../../algorithm/mathematical-algorithms.md)，不要给任意输入套一个 `long` 循环。

随机抽样可按复现要求选 `Random` 或其他随机生成器，安全令牌则使用合适的 `SecureRandom` 方案，不能用 `Math.random` 生成可预测的验证码。并行排序和并行流是否更快，取决于数据规模、操作代价、线程竞争与共享副作用，不应从 1000 个元素的毫秒计时推断生产性能。

## 集合视图、快照与元素共享

![Java集合只读视图与浅快照](/java/collection-view-snapshot.svg)

`Collections.unmodifiableList(source)` 包装的是只读视图：通过它调用 `add`、`set` 等修改方法会失败，但原列表变化仍能被看到。`List.copyOf(source)` 表达当时的不可修改浅快照，拒绝空元素，之后原列表的增删不会影响快照。两种方式都不自动复制元素内部的数据，元素可变时仍然共享。

`Arrays.asList(array)` 是数组支持的固定大小列表：不能增删，但可以 `set`，替换会反映到数组。`Arrays.asList(new int[]{1, 2})` 则得到只有一个 `int[]` 元素的列表，不是两个 `Integer`。`subList` 也是视图，原列表结构性变化后，不能假设旧子视图继续可用。要独立修改列表容器，可显式 `new ArrayList<>(source)`，但这同样只是浅复制。

排序会修改相应数组或列表，二分查找要求输入已经按同一排序规则排列；返回负数时含有插入点信息，不能直接拿它当索引。排序比较器优先 `Comparator.comparing`、`thenComparing`、`Integer.compare`，不用 `a - b` 比较可能溢出的整数。金额相同的订单若需要稳定分页，还应加订单号等确定性次序。

`Collections.synchronizedList` 保护单次方法调用，迭代和复合操作仍需遵守外部同步约定；并发容器则有各自的原子 API 与迭代合同。`ConcurrentModificationException` 是尽力检测部分错误的机制，并不保证每次错误修改都会抛出，也不是线程安全证明。单线程过滤可用迭代器的 `remove` 或 `removeIf`，不要在增强 for 中直接结构性修改原集合。

### 用一段程序验证这些差异

以下代码作为 `ToolContracts.java` 可在 JDK 17 运行。检查失败会直接抛 `AssertionError`，不依赖启动时启用 Java 的 `assert`。

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

public class ToolContracts {
    record OrderKey(String tenant, String orderId) {}

    static void check(boolean value) {
        if (!value) throw new AssertionError("合同不成立");
    }

    public static void main(String[] args) {
        var source = new ArrayList<>(List.of("102"));
        var view = Collections.unmodifiableList(source);
        var snapshot = List.copyOf(source);
        source.add("103");
        check(view.size() == 2 && snapshot.size() == 1);

        var mutable = new StringBuilder("paid");
        var shallow = List.copyOf(List.of(mutable));
        mutable.append("-v2");
        check(shallow.get(0).toString().equals("paid-v2"));

        var amounts = new HashMap<OrderKey, BigDecimal>();
        amounts.put(new OrderKey("t1", "102"), new BigDecimal("19.90"));
        var total = amounts.get(new OrderKey("t1", "102"))
                .add(new BigDecimal("0.10"));
        check(total.setScale(2, RoundingMode.UNNECESSARY)
                .equals(new BigDecimal("20.00")));
        check(new BigDecimal("2.0").compareTo(new BigDecimal("2.00")) == 0);
        check(!new BigDecimal("2.0").equals(new BigDecimal("2.00")));

        check("102|paid|".split("\\|", -1).length == 3);
        var date = LocalDate.parse("2026-03-08");
        var zone = ZoneId.of("America/New_York");
        var start = date.atStartOfDay(zone).toInstant();
        var end = date.plusDays(1).atStartOfDay(zone).toInstant();
        check(Duration.between(start, end).toHours() == 23);
        System.out.println("视图=2，快照=1，金额=20.00，当地日=23小时");
    }
}
```

```bash
javac -encoding UTF-8 ToolContracts.java
java ToolContracts
```

这段程序故意使用字符串作为业务键、`BigDecimal` 作为值，降低可变键风险。它没有把浅快照称为深复制，也没有靠 `sleep` 判断 GC 是否完成。实际导入还需要校验订单号、金额范围及重复版本，这些业务规则不能由容器工厂自动完成。

## 日期、时区与耗时

`Instant` 表示时间线上的时刻，适合记录请求和事件发生时间；`LocalDate` 表示无时区的日期，适合业务日；`LocalDateTime` 单独使用时还不能唯一确定一个时刻。将某个业务日映射到时间范围，应在业务时区分别取当天与次日的开始，采用左闭右开区间。上面纽约夏令时开始日只有 23 小时，说明“当地一天”不能总写成起点加 24 小时。

ISO 日期可以使用 `LocalDate.parse` 拒绝不存在的日期；自定义格式需要配合正确的解析严格度，不能把正则匹配 `2026-02-30` 当成日期有效。旧 `SimpleDateFormat` 默认宽松解析，且实例不是线程安全的；新代码优先用不可变的 `DateTimeFormatter`。月末、闰年、夏令时与未指定时区的输入应单独验证。

`System.currentTimeMillis` 用于墙上时间，可能受到时钟调整影响；同一 JVM 内测量经过时长通常用 `System.nanoTime` 的差值，它的绝对值不是 Unix 时间戳。测性能还需控制预热、死代码消除、负载和样本分布，微基准使用 JMH 等合适工具。`Runtime.totalMemory() - freeMemory()` 只近似描述当时 Java 堆使用，不是整个进程 RSS 或所有本地内存，详细范围见 [JVM 运行时区域](../jvm/runtime-area/index.md)。

## 异常与资源关闭

`Throwable` 下的 `RuntimeException` 和 `Error` 属于非检查异常，其他相应异常需要按语言规则捕获或声明。检查异常不等于可以重试，运行时异常也不等于可以忽略：无效日期应退回调用者，连接中断则要先判断外部操作是否已经完成。通常不把 `Error` 当作普通业务失败捕获后继续运行，也不用吞掉所有 `Exception` 来维持假成功。

文件、流、数据库语句等实现 `AutoCloseable` 的资源优先使用 try-with-resources，按创建的逆序关闭。主体和关闭都失败时，关闭异常通常作为 suppressed 保留，可通过 `getSuppressed` 查看；仅打印一段 `getMessage()` 会丢失堆栈、cause 和这些附加信息。包装异常应保留 cause，并在真正处理失败的边界记录上下文，避免每层都重复打印同一堆栈。

```java
try (var reader = java.nio.file.Files.newBufferedReader(
        path, java.nio.charset.StandardCharsets.UTF_8)) {
    return reader.readLine();
} catch (java.io.IOException e) {
    throw new java.io.UncheckedIOException("读取订单导入文件失败", e);
}
```

这段是方法体片段：`path` 是已校验的 `Path`，返回值仍可能为 `null`，表示空文件；业务必须决定空文件是否有效。文件缺失时自动创建空文件，会把上游故障变成“导入零单”，不应作为通用恢复策略。重试要区分可恢复错误、总时间预算、幂等身份与取消信号。捕获 `InterruptedException` 后若不能继续向上传递，应恢复中断标记并结束当前工作，不要将它混成普通 I/O 失败后无限重试。

## 子进程：输出、超时与退出码

`Runtime.exec(String)` 不会自动提供完整 Shell 语法；需要固定程序和参数时使用 `ProcessBuilder` 的参数列表。把用户输入拼成 `sh -c` 或 `cmd /c` 会增加命令解释风险，参数列表也不能替代可执行文件、选项和路径的白名单校验。下面仅启动当前 JDK 的 `java -version`，使用父进程输出，避免无人消费的 stdout/stderr 管道填满后相互等待。

```java
import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

public class ProcessCheck {
    public static void main(String[] args) throws Exception {
        var windows = System.getProperty("os.name").startsWith("Windows");
        var java = Path.of(System.getProperty("java.home"), "bin",
                windows ? "java.exe" : "java").toString();
        var process = new ProcessBuilder(java, "-version").inheritIO().start();
        try {
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                if (!process.waitFor(2, TimeUnit.SECONDS)) {
                    throw new IOException("终止请求后进程仍未退出");
                }
                throw new IOException("子进程执行超时");
            }
            if (process.exitValue() != 0) {
                throw new IOException("子进程退出码=" + process.exitValue());
            }
        } catch (InterruptedException e) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw e;
        }
    }
}
```

如果需要收集输出，应同时持续消费两条流或采用合并/文件重定向，并限制输出容量。先阻塞 `readLine` 到 EOF，再开始 `waitFor(timeout)`，不能限制此前等待；先 `waitFor` 而无人消费管道也可能卡住。超时是独立故障，不应伪装成线程被中断。`destroyForcibly` 是终止请求，仍需确认退出；上面只管理直接子进程，不负责其后代、外部集群作业或已经提交的业务写入。

`System.gc()` 只是 GC 请求，不能用于证明对象已经释放；等待 100 毫秒也不能改变这一点。关闭文件和网络连接依靠明确的生命周期，不依赖 `finalize`。`System.exit` 会终止整个 JVM，适合受控命令行入口处理最终退出，不适合业务工具方法随意调用。关闭钩子也不能覆盖强杀、断电等所有退出方式，重要业务状态必须在正常处理链路中可靠持久化。
