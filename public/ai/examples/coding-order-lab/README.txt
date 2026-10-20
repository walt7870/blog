订单取消教学实验，Java 17+、Maven 3.9+，Spring Boot 3.5.15。
在解压后的独立实验目录执行，不覆盖实际业务仓库。

1. mvn clean test
   baseline 源码，只运行原有 8 个创建订单测试。
2. cp contract/example/orders/CancelOrderTest.java tests/example/orders/
   mvn clean test
   预期 testCompile 失败：baseline 尚无 cancel、查询和新状态契约。
3. mvn clean test -Dlab.stage=final
   在同一套测试上选择 final 源码，16 个测试应通过。
4. mvn package -Dlab.stage=final
   java -jar target/coding-order-lab-1.0.0.jar --server.address=127.0.0.1 --server.port=18082

POST /api/orders 请求体 {"amount":12.30}，返回 201 与 Location。
对 Location + /cancel 连续 POST，均为 200/CANCELLED。
未知 UUID 返回 404。已支付状态仅由测试夹具注入，没有支付 HTTP 入口。
MockMvc 检查已支付映射 409，外部 HTTP Smoke 不覆盖该状态。

baseline 与 final 是独立源码快照，不是博客仓库的 Git 标签。
切换源码必须 clean，避免增量编译保留另一快照的 class 文件。
内存数据重启即丢；无认证、授权、支付或数据库。
ConcurrentHashMap 单次读写安全，但查询、判断、保存不是原子操作。
仅用于本地教学，不能据此声称生产并发正确或可上线。
