# 浏览器存储：Cookie、localStorage、IndexedDB 与 Cache

登录会话、页面主题、离线配送草稿和商品图片缓存属于四类数据。它们需要不同的发送方式、查询方式和生命周期，不能按“哪个API最简单”统一塞进localStorage。

![会话、偏好、草稿与响应缓存的不同归属](/front/frontend-foundations-series/ep16-flow.svg)

## 按数据职责选择

| 数据 | 常用机制 | 关键边界 |
| --- | --- | --- |
| 服务端会话标识 | Cookie | 匹配域、路径、SameSite、凭据与隐私条件时才发送 |
| 少量非敏感偏好 | localStorage | 同步、字符串、可能失败或被清理 |
| 标签页临时状态 | sessionStorage | 按源与顶层浏览上下文隔离，通常刷新保留 |
| 结构化离线草稿 | IndexedDB | 异步事务、索引、版本升级与同步冲突 |
| 请求响应离线副本 | Cache API | 显式匹配和更新策略，不是自动HTTP缓存 |

具体存储还可能按顶层站点分区，第三方上下文可用性受浏览器策略影响。不能承诺固定容量或永久保留，也不能把所有Cookie都当成严格同源存储：Cookie域和路径规则与Web Storage的源隔离不同。

## Cookie中的会话边界

```http
Set-Cookie: __Host-session=opaque-session-id; Path=/; Secure; HttpOnly; SameSite=Lax
```

这是服务端响应头示意，值应是不可猜测的会话标识，不是实际凭据。__Host-前缀要求Secure、Path=/且不设置Domain，限制Cookie范围；HttpOnly禁止脚本直接读取，但XSS仍可能借用户会话发起操作。Secure限制通过安全连接发送，SameSite限制部分跨站发送情形，并不等于完整CSRF防护。

删除会话时既要按匹配范围过期Cookie，也要在服务端使会话失效。会话Cookie可能受浏览器恢复会话功能影响，不能把“关闭窗口”当成所有账户都已安全退出的保证。

## 少量偏好要支持损坏与存储失败

```js
const preferenceKey = 'demo:product-view:v1';
function readView(storage = localStorage) {
  try {
    const data = JSON.parse(storage.getItem(preferenceKey) ?? 'null');
    return data?.version === 1 && ['grid', 'list'].includes(data.view)
      ? data.view : 'grid';
  } catch {
    return 'grid';
  }
}
function saveView(view, storage = localStorage) {
  if (!['grid', 'list'].includes(view)) throw new TypeError('未知列表视图');
  try {
    storage.setItem(preferenceKey, JSON.stringify({ version: 1, view }));
    return true;
  } catch {
    return false;
  }
}
```

示例只写自己的命名键，不用localStorage.clear清除整个站点。读取时验证结构，损坏或旧版本退回默认值；写入失败返回false，页面仍可使用当前内存状态。实际安全受限环境中，连访问window.localStorage属性都可能抛错，应把获取storage也放入应用初始化的异常处理。

localStorage与sessionStorage是同步API，序列化大对象也占主线程。sessionStorage通常保留刷新状态，同源新标签可能从opener复制初始状态，之后分别变化。localStorage的storage事件通知其他符合条件的文档，不会在同一写入窗口自动触发，跨标签同步还需处理顺序与版本。

## IndexedDB以事务完成为保存结果

草稿可以按账户与草稿ID存入object store，再用索引按更新时间查询。单个put请求成功不等于整个事务最终提交，应监听事务complete，并处理abort和error。事务可能在没有待处理请求的任务边界变为非活动，不能在事务内部随意await网络请求再假定可继续写入。

升级数据库时，旧标签可能阻塞新版本打开，需要versionchange处理与用户提示。离线草稿同步要有版本或修订号，避免另一设备的新内容被覆盖。异步API减少同步I/O阻塞，不代表序列化、大结果处理和索引成本全部免费。

## Cache API由应用负责新旧策略

Cache存储Request/Response，Window和Worker在适用安全上下文中都可使用，不要求必须注册Service Worker。只有明确实现请求拦截或读取策略后，它才参与页面离线行为。Cache API不会自动按HTTP缓存响应头过期更新，必须设计版本、淘汰和网络回退。

缓存私人接口时要按账户隔离并处理退出清理，避免下一账户看到前一账户数据。Cache与IndexedDB同样可能被清理；持久化请求和配额估计只能辅助判断，不替代服务端备份和用户导出。

## 验证生命周期与恢复

测试偏好默认值、正常保存、损坏JSON和拒绝写入。再分别刷新、开新标签、退出登录和清理自己的测试键，确认变化符合各机制范围。离线草稿需额外验证事务失败、版本升级阻塞、断网恢复和冲突处理；资源缓存需验证过期版本与网络失败，不把“有条目”当成离线可用。
