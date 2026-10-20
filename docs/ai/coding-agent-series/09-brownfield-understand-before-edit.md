<script setup>
import { withBase } from 'vitepress'
</script>

# Brownfield 实战一：建立基线与修改范围

旧代码库已经有接口、测试和使用者，新增功能首先要回答“现有行为是什么、规则归谁、哪些地方不能变”。本篇用一个可运行的 Spring Boot 订单服务演示这一步：基线只支持创建订单，目标是增加取消接口，同时保留创建行为，不引入数据库、支付入口或认证系统。

<a :href="withBase('/ai/examples/coding-order-lab.zip')" download>下载订单实战源码</a>。压缩包包含 `baseline/`、`final/` 两份源码快照、原有测试 `tests/` 和待加入的取消契约 `contract/`。它们由同一个 `pom.xml` 构建，通过 `lab.stage` 选择快照；不是需要另外查找的 Git 标签。运行环境为 Java 17 及以上、Maven 3.9 及以上，Spring Boot 固定为 3.5.15。

## 先运行原来的创建功能

解压后进入 `coding-order-lab`，先检查构建文件和文件清单，再运行基线：

```bash
java -version
mvn -version
rg --files
mvn clean test
```

预期结果是 8 个测试通过。测试包含创建服务的保存和金额检查，以及 MockMvc 下的 `201`、`Location`、无效金额、缺失字段和错误 JSON。这个结果说明当前工具链与这些已有行为可用，不代表整个订单系统正确。

真实项目还要运行 `git status --short`，记录起点提交和已有改动。工作树有变化时，应确认变化属于谁、是否与任务重叠；不能为了获得“干净基线”删除他人尚未提交的工作。依赖下载失败属于环境问题，不能写成业务测试失败。

## 从请求追踪到规则所有者

![订单请求中的协议适配、用例编排、状态规则和存储关系](/ai/coding-agent-series/order-request-map.svg)

先沿创建接口读取六个类型：`OrderController` 接收金额并返回 HTTP；`OrderService` 检查正值、创建订单并保存；不可变 `Order` 保存 ID、金额和状态；`OrderRepository` 定义存储接口；`InMemoryOrderRepository` 用 Map 实现；`OrderApplication` 启动 Spring。类型都在 `example.orders` 包内，职责由实际调用关系体现，没有用六个目录模拟大型架构。

```bash
rg -n '@PostMapping|ResponseEntity' baseline
rg -n 'create|save|record Order|enum Status' baseline
sed -n '1,180p' baseline/example/orders/OrderRepository.java
sed -n '1,220p' tests/example/orders/CreateOrderTest.java
```

可以确认：基线 Repository 只有 `save`；状态只有 `CREATED`；没有取消方法、查询方法和集中异常映射。取消功能因此需要扩展存储查询、领域状态、用例、路由和错误适配。不要因为 Spring 项目常用 JPA 就引入数据库，也不要把最终快照中的类误写为基线已经具备的能力。

创建接口的 Web 校验要求金额至少为 `0.01`，Service 检查正值，两者不是完整统一的货币领域模型。本次保留原行为；若以后增加币种、精度和金额上限，应单独制定合同并补测试。

## 把“取消订单”分成四种结果

![订单取消的状态转换、重复请求与不存在订单的区别](/ai/coding-agent-series/order-cancel-state.svg)

| 起点 | 请求后的业务结果 | HTTP 与副作用 |
| --- | --- | --- |
| `CREATED` | 返回新的 `CANCELLED` 订单 | `200`，保存一次 |
| `CANCELLED` | 返回原取消结果 | `200`，不再次保存 |
| `PAID` | 保持已支付状态 | `409/ORDER_CANNOT_BE_CANCELLED`，不保存 |
| 未知 UUID | 没有订单可转换 | `404/ORDER_NOT_FOUND` |

“订单不存在”是查询结果，不是领域状态。重复取消的幂等结果也要具体说明：本例额外要求不再次保存，用来观察副作用；生产系统只要重复保存不改变可观察结果，也可能满足另一种幂等合同。

可以把任务交给 Agent，要求它先返回与源码对应的实施计划：

```text
目标：增加 POST /api/orders/{id}/cancel，遵守上表四类结果。
保留：创建接口、原8项测试、内存存储和现有依赖。
不做：支付入口、数据库、认证系统、远程发布。
先读：baseline/、tests/、pom.xml；引用实际类与方法。
先回答：查询契约、状态规则、404/409分别落在哪个类型？
验证：新增契约在基线失败，修改后原测试与新测试一起通过。
```

这份合同约束的是任务范围，不能代替实际工具权限。任务已授权编辑时，Agent 在范围内继续；缺少业务决策或外部动作授权时，再停在对应边界。

## 文件计划要解释变化原因

| 文件 | 要解决的问题 |
| --- | --- |
| `Order.java` | 增加状态与 `cancel()`，集中约束可取消条件 |
| `OrderRepository.java`、内存实现 | 提供 `findById(UUID)`，表达查询不到的情况 |
| `OrderService.java` | 查询、调用领域规则、按是否变化决定保存 |
| `OrderController.java` | 解析 UUID 并暴露取消路由 |
| 两个异常类及 `OrderExceptionHandler.java` | 将不存在、状态冲突分别映射为 404、409 |
| `CancelOrderTest.java` | 从领域、保存次数和 HTTP 三层固定合同 |

探索到这一步就足够开始小步实现，不需要读完仓库所有无关模块。大型项目还应搜索 Repository 的全部实现和调用者，否则接口新增方法可能使测试替身或其他模块编译失败。下一篇把合同复制到测试目录，观察编译红灯，再检查最终实现。

## 这个示例没有解决什么

内存 Map 没有持久化；进程结束后数据消失。`ConcurrentHashMap` 只保证单次操作的线程安全，读取、判断、保存三步不是原子事务。两个并发请求仍可能读到同一个 `CREATED`，不能据单线程测试宣称并发安全。生产系统需要根据存储方案选择条件更新、版本号或事务，并验证重试、支付竞争与消息副作用。

`PAID` 由测试夹具直接构造，因为教程没有支付入口。外部 HTTP 可以验证创建、取消、重复取消与不存在；已支付的 HTTP 409 通过 MockMvc 注入夹具验证。这个区分会一直保留到最终交付说明。
