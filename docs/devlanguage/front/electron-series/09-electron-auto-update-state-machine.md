# 自动更新的核心是一台可恢复状态机

自动更新不是“发现新版本后下载”这一条直线。客户端要先选择匹配版本，再经历检查、下载、校验、等待安装、重启和失败恢复。网络中断、架构不匹配、签名失败和用户延迟重启都必须有明确状态。

## 先筛选候选产物

客户端当前身份至少包含版本、平台、CPU 架构和 channel。DeskLab 的隔离实验以 `1.0.0 / darwin / arm64 / stable` 查询三份本地元数据：

| Feed 内容 | 选择结果 |
|---|---|
| darwin/arm64/stable 1.1.0 | 选中 arm64 ZIP |
| 只有 darwin/x64 1.2.0 | `no-candidate` |
| 只有 darwin/arm64/beta 1.3.0 | `no-candidate` |

选择器应该逐项匹配，并在版本比较时使用规范化的语义版本规则。

~~~js
function selectUpdate(feed, client) {
  return feed.artifacts.find(item =>
    item.platform === client.platform &&
    item.arch === client.arch &&
    item.channel === client.channel &&
    semver.gt(item.version, client.version)
  ) ?? null
}
~~~

架构或 channel 不匹配时返回“无候选”是正确结果，不能退回到任意较新的文件。

## 状态与事件分开记录

一套可审计的状态可以是：

~~~text
idle -> checking -> available -> downloading -> downloaded
                    \-> not-available
       \-> failed <-----------------------------/
downloaded -> installing -> restarting
~~~

状态描述客户端现在在哪里；事件记录是谁触发了变化，例如定时检查、用户点击、网络失败、校验失败或退出安装。每次转换应记录旧状态、新状态、版本、artifact ID 和请求编号。

## 下载完成不等于可以安装

客户端下载后需要核对文件长度与 SHA-256，再验证平台签名。元数据本身也必须通过 HTTPS、访问控制或额外签名获得可信来源。只校验下载文件摘要，无法阻止攻击者同时替换文件和未受保护的摘要。

安装前还要处理未保存工作、后台任务和多窗口。用户选择“稍后”时保持 `downloaded`，下一次退出或明确确认后再进入安装。更新重启应使用独立退出意图，避免普通 `close` 处理器把窗口隐藏，导致安装永远无法开始。

## 回滚依赖版本化数据

应用二进制可以回退，用户数据未必可以。数据库迁移和配置格式若只支持单向升级，旧版本启动时会继续失败。更新设计应明确哪些数据迁移可逆、何时备份、失败后由谁恢复，以及旧版本是否能读取新数据。

本地选择器实验只证明候选筛选边界。一次真实发布还要验证 Publisher 上传、feed 公网可达、签名、断点下载、安装重启和失败恢复，并在目标 OS/CPU 上分别执行。
