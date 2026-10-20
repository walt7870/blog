# TypeScript 静态类型：推断、收窄与运行时边界

商品接口约定返回整数分金额 `priceCents`。编辑器可以阻止把字符串传给金额计算函数，却不能阻止远端服务实际返回字符串。可靠的边界需要两段：外部数据进入时校验，内部代码协作时做静态检查。

![静态检查与运行时数据校验两条链路](/front/frontend-foundations-series/ep18-flow.svg)

## 类型描述允许怎样使用一个值

```ts
function formatPrice(priceCents: number): string {
  return "¥" + (priceCents / 100).toFixed(2);
}
const cents = 1290;
const label = formatPrice(cents); // 推断为string
// formatPrice("1290"); // 静态错误：string不能传给number参数
```

局部变量通常可以推断，参数和对外返回值适合明确标注。这里的 `number` 仍然包含小数、NaN 和 Infinity，金额是否为非负安全整数还需要运行时规则。静态类型能表达部分合同，不能自动表达全部业务约束。

`interface` 与 `type` 都能描述对象；联合类型用 `type` 更直接。对象类型通常按结构兼容，两个不同名称的类型拥有相同成员时可能互相赋值。对新鲜对象字面量的额外属性检查，也不代表所有运行时对象都只能有声明字段。

## 把接口数据先接成 unknown

网络、存储、URL 和用户输入都来自当前静态检查之外。下列解析函数只接受符合当前展示合同的商品；不依赖类型断言把未知数据强行变成商品。

```ts
type Product = {
  id: string;
  name: string;
  priceCents: number;
};

function parseProduct(value: unknown): Product {
  if (typeof value !== "object" || value === null) {
    throw new Error("商品必须是对象");
  }
  if (!("id" in value) || typeof value.id !== "string" ||
      !("name" in value) || typeof value.name !== "string" ||
      !("priceCents" in value) || typeof value.priceCents !== "number" ||
      !Number.isSafeInteger(value.priceCents) || value.priceCents < 0) {
    throw new Error("商品字段不符合合同");
  }
  return {
    id: value.id,
    name: value.name,
    priceCents: value.priceCents
  };
}
```

运行时判断让 TypeScript 在分支中收窄 `unknown`。这个函数允许额外字段，但只返回三个已验证字段；它没有验证 ID 格式、空名称、价格上限或商品权限，这些规则应按业务增加。

`as Product` 不执行任何上述检查；`fetchJson<Product>()` 若只是把 JSON 断言为 T，也不比断言更安全。`any` 会让检查沿调用链失效，`unknown` 要求使用前给出证据。自定义 `value is Product` 守卫的实现同样可能写错，编译器会信任它的返回承诺。

## 用联合状态减少不可能组合

把 `loading`、`error`、`data` 分成三个独立字段，容易出现“加载中但仍显示成功数据”等模糊组合。区分状态后，分支能携带它真正需要的数据。

```ts
type ProductState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; product: Product };

function describe(state: ProductState): string {
  switch (state.status) {
    case "loading": return "加载中";
    case "error": return state.message;
    case "ready": return state.product.name;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
```

若增加 `empty` 状态却没有增加分支，`never` 赋值会暴露遗漏。这个模型仍不自动解决异步竞态：旧请求覆盖新状态，要另用版本或取消机制处理。

泛型则保留输入输出关系。例如 `function first<T>(values: readonly T[]): T | undefined { return values[0]; }` 会让商品数组返回商品或 undefined，而不是丢成 unknown。数组可能为空，不能为了调用方便去掉 undefined。

## 检查命令与构建命令各司其职

已有安装 TypeScript 的项目可以执行：

```bash
npx tsc --noEmit
```

一个面向现代浏览器、由构建器解析模块的基础 `tsconfig.json` 片段如下；Vue SFC 等框架项目需要相应类型检查入口，例如 `vue-tsc`。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src"]
}
```

`strict` 不包含所有额外安全选项，所以单独启用数组索引检查。配置中的 target、lib 与语法转换不等于浏览器具备相应 API；需要按支持矩阵检查并决定 polyfill。

接口、类型别名和类型标注通常被擦除，但 TypeScript 的 enum、参数属性等语法可能生成运行时代码，不能把“所有 TS 特性都只会删除”当成通则。Vite 的 TS 转换也不等于执行完整类型检查。

## 验证合同是否真正生效

把 `parseProduct` 分别传入正常商品、null、字符串金额、负数和小数金额：只有第一项应返回商品。再把 `formatPrice("1290")` 取消注释，确认类型检查失败；单独运行构建成功不能替代这个结果。最后新增联合状态，确认未处理分支被发现。

若编辑器正常但 CI 失败，应先核对 TypeScript 版本、实际使用的 tsconfig、include 范围与框架检查器。不要直接增加 `as` 或关闭 strict 来掩盖来源不清的外部数据。完整的工具分工见 [质量工具链](./21-frontend-quality-toolchain)。
