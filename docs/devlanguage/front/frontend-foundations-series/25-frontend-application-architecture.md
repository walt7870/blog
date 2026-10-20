# 前端应用架构：路由、查询、草稿与保存

打开商品编辑页后，后台重新拉取了最新数据。如果把接口结果每次都直接复制进表单，用户尚未提交的名称就可能被覆盖。问题不在组件库，而在“服务器事实”和“本地草稿”没有分清。

![商品编辑从URL到版本校验与缓存更新](/front/frontend-foundations-series/ep25-flow.svg)

## URL保存可分享的页面状态

路径 `/products/p42/edit` 决定正在编辑哪件商品；搜索词、排序和分页适合放在查询参数中。弹窗是否展开通常是局部状态，令牌和其他凭据不应写入 URL。

查询字符串是不可信输入。下面只解析正整数页码，不接受 `2abc`、负数或精度溢出值；参数缺省回到第1页。

```js
export function readPage(url) {
  const value = new URL(url, "https://shop.example").searchParams.get("page");
  if (value === null || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}
```

路由切换时旧请求可能尚未返回，应取消旧读取或校验资源ID和请求版本，避免把 p41 的响应写进 p42 的页面。客户端权限路由只是体验控制，服务端必须对资源ID重新授权。History 路由还需要托管端支持深链接刷新。

## 查询缓存和表单草稿分别拥有数据

查询缓存保存服务端快照与获取时间；草稿保存当前编辑值、是否修改和基准版本。初次成功读取时建立草稿；后台重新验证时，未修改字段可以按策略更新，已有修改则应保留或提示冲突。

缓存 key 至少包含资源身份；若结果依赖租户、账号、语言或过滤条件，相应维度也必须进入 key 或缓存隔离边界。退出或切换账号时清理必要缓存，不能让下一个用户看到上一用户的私有数据。

不要把所有查询结果再复制到全局 store：它会制造第二份失效策略。全局状态适合跨页面共享的客户端事实，局部草稿适合一次编辑，服务端缓存适合读取和重新验证，它们可以由不同工具管理。

## 保存是带版本的写入

下列函数假设记录ID和服务端返回的 ETag 已验证，后端支持 `If-Match` 条件更新。它只表达提交合同，不是可直接调用的公开业务接口。fetcher 参数便于受控验证。

```js
export async function saveName(record, draft, fetcher = fetch) {
  const name = draft.name.trim();
  if (!name || name.length > 80) throw new Error("名称需为1至80个字符");
  const response = await fetcher(
    "/api/products/" + encodeURIComponent(record.id),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "If-Match": record.etag
      },
      body: JSON.stringify({ name })
    }
  );
  if (response.status === 412) return { status: "conflict" };
  if (!response.ok) throw new Error("保存失败：" + response.status);
  return { status: "saved" };
}
```

返回 saved 表示本次 HTTP 更新成功，不意味着本地缓存已刷新。随后重新读取详情与列表，或用经过字段校验的服务器确认结果更新缓存。若重新读取失败，应显示“已保存，刷新失败”，不能将它混同为保存失败而自动重复写入。

HTTP 412 时保留草稿，拉取新版本供比较，再由用户选择合并或重做。不要静默拿新 ETag 重试旧草稿，否则会绕开并发保护。没有条件更新接口时，也应说明覆盖策略和冲突风险。

## UI需要完整且可恢复的状态

读取阶段区分加载、空数据、无权限和网络失败；编辑阶段显示校验与未保存状态；提交阶段限制重复动作并保留输入。用户切换资源或离开页面时，要按产品规则处理未保存内容，不能突然丢弃。

乐观更新适合可回滚且冲突可控的动作。修改订单金额、支付和扣库存不能只靠前端回滚来保证安全。客户端取消等待也不能证明服务端写入未发生，重试需要幂等或确认入口。

## 按边界组织代码与验收

路由负责资源定位，查询层负责读取、缓存和失效，组件负责展示与用户事件，表单负责草稿和错误，写入服务负责提交合同。一个功能可以放在同一业务目录，但不要让每个按钮自行拼 URL、处理认证并修改多处缓存。

用两位编辑者验证：A读取旧版本，B保存新名称，A再提交应得到冲突并保留草稿。再测切换资源时旧响应迟到、后台刷新时草稿不丢、保存成功但刷新失败、退出后缓存隔离。测试可以先用受控服务复现，真实接口验收还需要后端实现和数据回读。请求基础见 [Fetch合同](./15-fetch-network-requests)，更多分类见 [状态管理](../state-management/)。
