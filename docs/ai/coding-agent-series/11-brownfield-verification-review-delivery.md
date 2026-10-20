<script setup>
import { withBase } from 'vitepress'
</script>

# Brownfield 实战三：验证、审查与交付

16 个测试通过之后，还要回答两件事：这些测试能否拒绝错误实现，打包后的应用是否真的按合同响应。本篇继续使用同一份<a :href="withBase('/ai/examples/coding-order-lab.zip')" download>订单实战源码</a>，把测试、真实 HTTP 和交付范围连接起来。

## 先尝试推翻绿色结果

测试质量可以用错误实现反查。在临时副本中每次只改一处，运行 `mvn clean test -Dlab.stage=final`，检查预期失败后恢复，再做下一项：

| 临时改动 | 应发现问题的测试 | 证明的范围 |
| --- | --- | --- |
| 删除 `Order.cancel()` 中非 CREATED 的拒绝条件 | `domainPaidIsRejected`、`servicePaidDoesNotSave` | PAID 不能取消且不能写入 |
| Service 每次都 `repository.save(cancelled)` | `serviceRepeatDoesNotSaveAgain` | 重复请求不再次保存 |
| Advice 把404改为500 | `webCreateCancelRepeatAndMissing` | 不存在的HTTP与JSON合同 |
| Advice 把409改为500 | `webPaidMapsToConflict` | 已支付冲突的HTTP映射 |

这些变异均应编译成功、测试失败。它比“新方法不存在，所以测试编译失败”多验证了行为约束。本示例在 2026-10-20 的本地核验中，四种变异均被对应测试抓住，恢复后 16 项全部通过。它仍不是穷举证明：并发支付竞争、进程重启、认证越权等没有进入这套测试。

不要在用户的脏工作树中用整文件回退清理实验。采用独立副本或 worktree，保留原修改；测试失败后先看实现，不能为了绿色把 PAID 的期望改成成功。

## 再启动打包后的进程

![基线、编译红灯、行为测试与真实HTTP的证据边界](/ai/coding-agent-series/order-verification-stages.svg)

先按[上一篇](./10-brownfield-test-driven-agent-change.md)把取消合同复制到 `tests/`，再打包启动：

```bash
mvn clean package -Dlab.stage=final
java -jar target/coding-order-lab-1.0.0.jar \
  --server.address=127.0.0.1 --server.port=18082
```

使用本机回环地址，避免把没有认证的教学服务暴露到局域网。端口占用时换一个空闲端口，并同步下面命令。另开终端创建订单：

```bash
curl -i -X POST http://127.0.0.1:18082/api/orders \
  -H 'Content-Type: application/json' -d '{"amount":12.30}'
```

应返回 `201`、`Location: /api/orders/{uuid}` 和 `CREATED`。把返回的 ID 填入变量，再连续请求两次：

```bash
order_id='替换为返回的UUID'
curl -i -X POST "http://127.0.0.1:18082/api/orders/$order_id/cancel"
curl -i -X POST "http://127.0.0.1:18082/api/orders/$order_id/cancel"
curl -i -X POST http://127.0.0.1:18082/api/orders/00000000-0000-0000-0000-000000000001/cancel
curl -i -X POST http://127.0.0.1:18082/api/orders/not-a-uuid/cancel
```

两个有效取消均应为 `200/CANCELLED`；未知 UUID 为 `404/ORDER_NOT_FOUND`；非法 UUID 为 `400`。创建金额为 0 也应返回 `400`。核验完成后在启动终端按 Ctrl+C 停止进程。

本地实际进程核验覆盖了上述六类请求。外部请求没有覆盖 PAID，因为服务没有支付入口；409 已由 MockMvc 的 PAID 夹具验证。真实 HTTP 比 MockMvc 多检查了打包、端口监听和网络请求组合，仍没有覆盖 TLS、网关、生产数据库或负载。

## Review 从行为和范围开始

![Controller、Service、Order、Repository及异常适配的职责](/ai/coding-agent-series/order-request-map.svg)

先对照合同读状态分支，再检查所有存储实现、错误处理和原创建行为；最后处理命名与格式。可以直接比较两个快照：

```bash
diff -ru baseline/example/orders final/example/orders
```

`diff` 返回 1 通常表示发现差异，不是测试失败。真实 Git 项目则使用实际起点提交检查 `git diff --stat`、生产代码与测试，并核对 `git status --short`。不应复制教程外的提交号，也不能用工作树是否为空推断业务是否正确。

审查者应追问：ID 与金额是否保留？PAID 失败前有没有保存？重复请求是否产生额外副作用？所有错误是否有可观察合同？Map 的单次线程安全是否被误写成业务原子性？这些问题比“代码看起来遵循分层”更能发现风险。

独立上下文可以帮助重新构造问题，但另一个 Agent 的赞同不是证明。Reviewer 必须给出文件、触发条件和反例；Owner 根据业务、证据与现有授权判断下一步。

## 交付说明只声明证据支持的结果

可使用如下本地交付记录：

```text
变化：新增取消路由、订单状态规则、UUID查询及404/409映射。
兼容：原8项创建测试保留并通过；新增8项取消测试通过。
反证：PAID放行、重复保存、错误404和409四种变异均触发失败。
进程：打包启动后创建201、两次取消200、未知404、非法UUID和金额400。
边界：409为MockMvc夹具验证；无支付入口、持久化、认证和并发条件更新。
发布状态：本教程验证本地源码，不代表已创建远程PR或已部署业务服务。
```

如果团队任务还包含 PR、CI 或部署，应在既有授权内完成，并记录真实远程地址、提交、运行结果和目标环境验证。缺少授权时停在对应边界，不能把本地成功写成“线上可用”，也不必对已经批准的步骤重复请求确认。

回滚同样按环境区分：教学练习可以重新解压基线；真实项目应撤回本次变更并保留用户已有工作，数据库和外部副作用要使用自己的恢复方案。删除本地代码不会撤回已经发出的付款或消息。

## 根据风险增加验证

UI 改动需要真实视口、交互与图片加载；数据库迁移需要旧新版本兼容和回退验证；性能改动需要固定环境、输入和对照。CI、Agent Review 与人工审查各有覆盖范围，不能用任一种结果代替其他必要证据。

这次订单练习完成的是单机教学闭环。它提供了可运行源码、能拒绝具体错误的测试和真实 HTTP 结果，让读者能够复核；生产可用性仍需围绕身份、持久化、支付竞争、审计与恢复另行设计和验证。
