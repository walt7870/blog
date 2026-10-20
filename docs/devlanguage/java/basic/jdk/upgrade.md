---
title: JDK 升级实践
author: niu
date: 2024-12-19
---

# JDK 升级实践

订单服务从 JDK 17 升级到 25，最先遇到的问题未必是新语法。老版本字节码代理可能无法读取新 class，某个 JVM 参数可能已移除，默认编码、证书、时区或反射访问也可能改变。升级的目标是让同一业务合同在新环境继续成立，并留下可定位、可回退的产物。

本页以 **17 → 25** 为迁移场景，核对时间为 **2026-10-20**。具体依赖是否支持 25，要检查项目使用的实际版本；没有必要为了到达 25 而依次上线 18 至 24。历史版本和正式/预览能力边界见 [JDK 与 Java 版本](./index.md)。

## 从环境清单到受控切换

![JDK升级中的验证与回退边界](/java/jdk-migration-gates.svg)

先固定旧环境的应用产物、运行镜像、完整 JDK 补丁号、启动参数和可复现的请求数据。再建立新环境候选，逐项处理构建、依赖和运行行为。每次只引入能够解释的变化；同步升级框架、切换 GC、采用虚拟线程和修改数据库结构，会让失败来源难以区分。

| 阶段 | 操作与输出 | 进入下一阶段的条件 |
| --- | --- | --- |
| 环境盘点 | 记录发行商/补丁号/架构、CI 与容器、构建工具、代理和 JNI | 知道服务真正运行在哪个 `java` 上 |
| 旧产物试跑 | 在隔离的新 JDK 环境启动现有产物，记录启动与功能失败 | 找到运行参数、依赖和环境的不兼容项 |
| 重建候选 | 更新必要依赖，明确编译目标，生成独立候选产物 | 编译、单测与产物检查通过 |
| 业务回归 | 对比订单状态、金额、文件、数据库与外部交互 | 正常与失败路径满足原合同 |
| 灰度与回退演练 | 少量流量验证，保留旧实例与旧镜像 | 指标达标，回退流程和数据兼容已验证 |

“旧产物在新 JDK 能启动”只证明有限兼容性。仍要在候选构建工具链上重建、测试和归档，避免上线时偷偷混入旧构建机或不同的依赖解析结果。若旧产物包含预览特性，不能假定换新运行时即可启动，应先查清编译与运行版本限制。

## 查清实际工具链

在开发、CI 和运行容器分别执行；项目没有对应 wrapper 时跳过相应命令，不用临时换用全局工具来冒充项目构建环境。

```bash
java -version
javac -version
java -XshowSettings:properties -version
./mvnw -v
./gradlew -version
```

版本输出至少记录 `java.home`、发行商、补丁版本和架构。Maven 自身的运行 JDK、Gradle daemon 的运行 JDK、Java toolchain 与编译 `release` 都可能不同。构建配置详见 [Maven](../../manager/maven.md)、[Gradle](../../manager/gradle.md)，不要只改 IDE 的 SDK 后就判定完成。

如果迁移初期仍要求产物支持 Java 17，可使用以下编译合同；这是已配置兼容版本 `maven-compiler-plugin` 的 Maven 项目 `properties` 片段，插件版本应在项目或父 POM 中固定。该属性不决定 Maven 自身使用哪个 JDK，也不验证依赖的最低版本。

```xml
<properties>
  <maven.compiler.release>17</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

正式将编译目标改成 25 后，旧 JDK 17 无法运行这些新 class。回退必须使用保留的旧产物和旧镜像，不能仅把新容器中的 `java` 换回 17。编译目标、运行基线和回退产物的关系应写进发布记录。

## 先修依赖与运行边界

对普通 JAR 项目，可在候选 JDK 中执行下列检查；`application.jar`、`lib/driver.jar` 和 `lib/client.jar` 都要替换为项目实际产物与依赖路径，依赖不止两个时需完整列出。示例使用 Linux/macOS 的冒号分隔 classpath，Windows 改为分号。框架专用可执行 JAR 中的嵌套依赖，应按其打包格式展开或使用构建工具的依赖清单，不能假定 `jdeps` 会自动分析所有嵌套 JAR。

```bash
jdeps --jdk-internals --recursive --multi-release 25 \
  --class-path 'lib/driver.jar:lib/client.jar' application.jar
jdeprscan --for-removal \
  --class-path 'lib/driver.jar:lib/client.jar' application.jar
```

`jdeps` 适合发现静态依赖和内部 API 使用，`jdeprscan` 这里使用候选 JDK 的平台 API 集合，`--for-removal` 只报告标记为待移除的已废弃 Java SE API，不检查第三方库自己的废弃标记。它们都不能完整发现反射拼接的类名、动态代理、JNI 和运行时配置。缺失依赖应补齐再判断，不应加忽略参数后把空报告当成全面通过。

| 现象 | 常见根因 | 处理顺序 |
| --- | --- | --- |
| `UnsupportedClassVersionError` | 主类或某个依赖由更高版本编译 | 查错误中的具体类、class 版本、运行 `java` 路径 |
| `NoSuchMethodError` / `NoClassDefFoundError` | API 基线或运行依赖与编译时不同 | 核对依赖树、冲突与实际加载来源，不只看源码 |
| `InaccessibleObjectException` | 反射访问受模块强封装限制 | 优先更新相关库，确认确实需要访问的模块与包 |
| 代理启动报不支持 class 版本 | APM、覆盖率或字节码库过旧 | 更新并验证具体代理，检查启动顺序和参数 |
| JVM 报不识别某参数 | 参数已移除、改名或不适用于当前实现 | 对照候选 JDK 的工具帮助及实际启动输出 |
| 本地库无法加载 | JNI/动态库的架构、系统 ABI 或依赖不匹配 | 查库路径、CPU 架构与依赖库，不能靠改 class 目标解决 |

`--add-opens=模块/包=目标模块` 与 `--add-exports` 解决的访问边界不同：前者涉及深反射，后者涉及包的导出。为 classpath 代码使用 `ALL-UNNAMED` 也会扩大访问范围，应只给已定位的具体包，并记录移除条件。不要把一串全局开放参数当成升级后的永久标准配置。

从 8 迁移还要检查被移出的 Java EE/CORBA 模块、旧扩展目录机制及反射依赖；从较新版本迁移则可能遇到已移除的脚本引擎、GC 选项或安全机制。JDK 24 已永久禁用 Security Manager；依赖其做不可信代码沙箱的应用需要重新设计隔离边界，不能用一个启动参数恢复原合同。

## 用业务样例暴露隐性变化

订单导出文件应检查实际字节、字符集、时区与金额。只比较控制台打印“导出成功”，可能漏掉中文文件变乱码或账期错一天。下面是完整的 `MigrationProbe.java`，只验证一组明确的标准库合同，不代表整个服务已经迁移通过。

```java
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;

public class MigrationProbe {
    public static void main(String[] args) throws Exception {
        Path file = Files.createTempFile("order-export-", ".csv");
        try {
            String content = "订单号,金额\n102,80.00\n";
            Files.writeString(file, content, StandardCharsets.UTF_8);
            require(Files.readString(file, StandardCharsets.UTF_8)
                    .equals(content), "UTF-8往返");
            BigDecimal total = new BigDecimal("50.00")
                    .add(new BigDecimal("30.00"));
            require(total.toPlainString().equals("80.00"), "金额");
            String start = LocalDate.of(2026, 10, 20)
                    .atStartOfDay(ZoneId.of("Asia/Shanghai"))
                    .toInstant().toString();
            require(start.equals("2026-10-19T16:00:00Z"), "账期起点");
            require("paid".toUpperCase(Locale.ROOT)
                    .equals("PAID"), "状态编码");
            System.out.println("导出、金额、账期、状态合同通过");
        } finally {
            Files.deleteIfExists(file);
        }
    }

    static void require(boolean passed, String label) {
        if (!passed) throw new AssertionError(label);
    }
}
```

```bash
javac --release 17 -encoding UTF-8 MigrationProbe.java
java MigrationProbe
```

在旧、候选运行时分别执行相同产物，并保留各自版本输出。代码显式给出编码、账期时区与状态大小写规则，避免把平台默认值变动混入业务语义。需要读取历史 GBK 文件时，应该按文件合同显式声明 GBK，而不是把整个新运行时改回旧默认编码。

真实服务还需覆盖数据库驱动、TLS/证书、序列化、定时任务、代理、JNI、超时取消和异常路径。例如支付回调相同业务号重复到达，应验证不会重复入账；这属于应用幂等合同，换 JDK 不会自动保证。涉及外部系统的测试应在独立测试环境使用明确测试数据，不能通过重放真实支付来验证。

## 灰度、性能与回退

保持相同 CPU 和内存配额、连接池、数据规模及请求分布，先对比启动与预热，再观察稳态吞吐、P95/P99 延迟、错误率、GC 暂停和进程总内存。版本升级不要求同时更换 GC；保留原方案测量差异，再单独评估调优，详见 [GC 专题](../../jvm/gc/index.md)。

虚拟线程也不应作为迁移的附赠开关。大量等待型任务可能受益，但数据库连接和外部服务容量没有随线程数量增长；引入它仍需限流、超时、上下文传播和代理兼容测试。不要提交百万个等待任务后，仅凭程序没退出就宣称性能提升。

灰度前确定回退触发条件，例如错误率越线、关键订单校验不一致或进程内存超限，并实际演练旧镜像恢复。数据库结构、消息格式和持久化文件需要同时兼容灰度期间的旧、新实例；有不可逆的数据迁移时，不能承诺单靠镜像回退恢复业务。验收记录应能对应到候选提交、依赖锁定结果、镜像摘要、JDK 完整版本、业务回归和性能数据。

升级完成的标志是候选环境满足已定义的业务与运行合同、回退边界清楚，且旧的临时开放参数和无效配置得到处理。新语法重构、GC 切换和框架大版本升级可以随后分别评估。
