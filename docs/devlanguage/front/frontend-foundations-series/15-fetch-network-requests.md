# Fetch 与网络请求：Request、Response、CORS 与错误处理

商品接口返回200，页面仍可能解析失败；返回404，fetch却不一定抛错。请求、HTTP结果、响应体解析与业务合同是不同阶段，分别处理后，页面才能提供准确错误并避免旧响应覆盖新筛选结果。

![从请求到业务结果的错误分层](/front/frontend-foundations-series/ep15-flow.svg)

## Response就绪不等于响应体已经读完

fetch返回Promise，通常在响应头可用后得到Response，此时响应体仍可能继续下载。网络、CORS或取消可使请求拒绝；HTTP404/500本身通常仍返回Response。response.ok只表示状态码在200到299，204也在其中，但空响应体不能直接按JSON解析。

```js
async function getProducts(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('响应类型不符合商品接口合同');
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.items) || data.items.some(item =>
    !item || typeof item.id !== 'string' || typeof item.name !== 'string')) {
    throw new Error('商品列表结构无效');
  }
  return data.items;
}
```

这里合同明确要求application/json与items数组，因此204、登录HTML和错字段都不能当成空列表。其他接口若使用application/problem+json或其他媒体类型，应按其合同扩展，而非强行套用这个例子。

## 请求体与重复读取

发送JSON时序列化对象并设置匹配的Content-Type；发送FormData时让浏览器生成multipart边界，不手写一个缺boundary的类型头。credentials默认是same-origin，跨源携带凭据需要显式配置并与服务端和Cookie策略配合。

响应体是流，消费后不能直接再次消费。需要原文和解析结果时，可先读取text再JSON.parse，或在未读取前clone；clone分支读取速度不一致可能积压数据，不适合对大型下载无限复制。Request中的流式body也有可重用性限制，重试前要确认能重建请求体。

## 取消旧请求，并限制过期结果

```js
let pendingController;
let requestVersion = 0;
async function refreshProducts(url, render, showError) {
  pendingController?.abort();
  const controller = new AbortController();
  pendingController = controller;
  const version = ++requestVersion;
  try {
    const items = await getProducts(url, controller.signal);
    if (version === requestVersion) render(items);
  } catch (error) {
    if (version === requestVersion && !controller.signal.aborted) showError(error);
  } finally {
    if (version === requestVersion) pendingController = undefined;
  }
}
```

取消可以停止等待与相关响应消费，但不保证服务端尚未执行写操作。版本检查保证只有最新筛选结果进入界面；在页面销毁时还要取消并使版本失效。创建订单、付款等写请求不能因为客户端超时就盲目重试，应由服务端幂等键和查询结果确认最终状态。

## CORS限制读取，不承担业务认证

源通常由协议、主机和端口组成。浏览器根据请求方法、头和其他条件决定是否预检；预检不通过时实际请求可能根本不发送。符合免预检条件的请求也可能已经到达服务器，只是响应不允许脚本读取。因此“CORS报错”不能单独证明业务未执行。

凭据请求需要服务器返回精确允许源及相应凭据许可，不能用通配星号代替。Cookie还受SameSite、Secure和浏览器隐私策略限制。`mode:'no-cors'` 不是修复JSON接口的方法，opaque响应不能正常读取状态和内容。CORS不替代鉴权、CSRF防护或服务端输入验证。

## 逐层验证成功与失败

至少覆盖合法JSON、HTTP404、错误Content-Type、无效JSON、错字段、取消和先慢后快两次请求。先确认旧结果不覆盖新结果，再检查错误提示和加载状态是否恢复。Node中fetch可验证HTTP与解析逻辑，但不执行浏览器CORS策略，跨源边界必须在浏览器实测。

Network用于区分请求未发、预检失败、实际响应和内容合同；状态收尾继续看[前端应用架构](./25-frontend-application-architecture.md)。
