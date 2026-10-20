# Rust 项目实战

把[订单CLI](./hands-on.md)的核心计算接到HTTP入口，验证同一规则如何被不同协议使用。先完成参数、状态码、错误和关闭，再讨论数据库、鉴权与后台队列，避免只列框架名却没有可执行行为。

![核心规则与CLI、HTTP适配及部署验证的关系](/rust/project-adapters.svg)

## 保留核心库，增加服务入口

在 `order-cli` 项目的 `Cargo.toml` 增加以下依赖，在 `src/bin/api.rs` 放服务入口。CLI与API共享 `Quantity` 和 `total_cents`，核心库仍不依赖Axum。

```toml
[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "signal"] }
serde = { version = "1", features = ["derive"] }
```

```rust
use axum::{Json, Router, extract::Query, http::StatusCode, routing::get};
use order_cli::{Quantity, total_cents};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct QuoteInput { quantity: String, unit_cents: u64 }

#[derive(Serialize)]
struct QuoteOutput { total_cents: u64 }

async fn quote(Query(input): Query<QuoteInput>)
    -> Result<Json<QuoteOutput>, (StatusCode, &'static str)>
{
    let quantity = Quantity::parse(&input.quantity)
        .map_err(|_| (StatusCode::BAD_REQUEST, "数量必须在1到99之间"))?;
    let total = total_cents(input.unit_cents, quantity)
        .map_err(|_| (StatusCode::UNPROCESSABLE_ENTITY, "金额溢出"))?;
    Ok(Json(QuoteOutput { total_cents: total }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app = Router::new().route("/quote", get(quote));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            if let Err(error) = tokio::signal::ctrl_c().await {
                eprintln!("关闭信号监听失败：{error}");
            }
        })
        .await?;
    Ok(())
}
```

本例只监听本机，提供无副作用的报价。`Query` 在调用处理函数前解析字段，缺少字段或整数无法解析也会返回400，但默认错误正文不同于领域错误。若要统一外部JSON错误合同，还需把提取器拒绝转换为自己的响应。

## 验证HTTP行为

执行 `cargo run --bin api` 后在另一个终端请求：

```bash
curl -i 'http://127.0.0.1:3000/quote?quantity=2&unit_cents=1990'
curl -i 'http://127.0.0.1:3000/quote?quantity=0&unit_cents=1990'
curl -i 'http://127.0.0.1:3000/quote?quantity=2&unit_cents=18446744073709551615'
curl -i 'http://127.0.0.1:3000/quote?quantity=2'
```

依次应得到200和金额3980、400非法数量、422金额溢出、400缺失字段。还应验证错误路径没有成功JSON，未知路由返回404，按Ctrl+C后监听结束。这个小服务没有鉴权、持久化、支付或压测结果，不能直接用它接收真实订单。

## 从报价扩展为订单

报价是纯计算，创建订单则会产生副作用。加存储前先定义幂等键、唯一约束、事务和重试；超时可能只是结果未知，不能默认重新扣款。把处理请求的数据库池放进受控状态，限制等待与并发，不把数据库连接跨长耗时外部调用持有。

导出类任务可用有界队列，但HTTP接受任务不代表任务完成：返回任务标识，持久记录状态，并明确重启如何恢复。单机内存通道会随进程退出丢失，见[并发与关闭](./concurrency.md)。

## 质量与交付

复用CLI单元和进程测试，再补真实HTTP的正常、字段缺失、非法值、溢出与关闭测试。故意修改核心金额计算时，CLI与API应同时暴露错误；只检查返回200不足以发现结果3980变成1992。

默认 `cargo test` 会包括符合条件的库文档测试；README需另设校验。依赖扩展审计工具要单独安装，feature与平台按支持矩阵检查，见[工具链](./tooling.md)。生成release后，验收与部署应使用同一产物，并核对目标运行库、监听地址、反向代理、日志与恢复策略。
