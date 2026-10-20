# 前端质量工具链：格式、规则、类型与行为

商品单价从元改为分，忘记修改展示函数后，页面可能显示“¥1290.00”。这段代码完全可以格式正确、类型正确、构建成功。质量检查的价值在于各自覆盖不同错误，而不是把一个绿色结果当成所有行为都正确。

![四类检查独立汇入发布门禁](/front/frontend-foundations-series/ep21-flow.svg)

## 同一个错误由哪层发现

| 变化或错误 | 合适的检查 | 仍覆盖不到 |
| --- | --- | --- |
| 缩进、换行不一致 | Formatter | 金额单位是否正确 |
| 使用未定义变量、违反Hook规则 | 已启用相应规则的Lint | 所有用户流程 |
| number参数传入string | 类型检查 | 远端JSON真实结构 |
| 1290分应显示¥12.90 | 行为测试 | 未编写的需求与环境 |
| 入口引用或构建插件失败 | 生产构建 | 用户点击后的完整结果 |

Lint 只能执行已配置的规则；可访问性插件也不等于真实键盘和读屏验收。类型化 Lint 可以利用类型信息，仍不替代完整类型检查。不要让 Formatter 和 Lint 在同一格式规则上反复互相修改。

## 先给业务规则一个可验证入口

`price.js` 只接收非负安全整数分，拒绝模糊单位。这里采用明确的人民币前缀和两位小数展示规则。

```js
// price.js
export function formatPrice(priceCents) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new TypeError("金额必须是非负安全整数分");
  }
  return "¥" + (priceCents / 100).toFixed(2);
}
```

配套 Node 内置测试不依赖浏览器。在 package.json 已设置 `type: module` 的目录中保存为 `price.test.js`，执行 `node --test price.test.js`。

```js
import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "./price.js";

test("按分显示金额并保留两位小数", () => {
  assert.equal(formatPrice(1290), "¥12.90");
  assert.equal(formatPrice(0), "¥0.00");
});
test("拒绝不符合单位合同的输入", () => {
  for (const value of [-1, 12.5, "1290", NaN]) {
    assert.throws(() => formatPrice(value), TypeError);
  }
});
```

若接口的字符串金额在进入函数前被错误转换，测试也可能漏掉。因此还应在接口适配层覆盖字段合同，在组件层覆盖展示结果。高覆盖率只说明被执行的代码比例，不证明断言正确或需求完备。

## 用显式脚本连接检查

下面是已安装并配置 Prettier、ESLint、TypeScript 的普通 JS/TS 项目脚本片段，测试仍使用上面的 Node 文件。Vue SFC 等项目要替换相应类型检查入口。

```json
{
  "scripts": {
    "format:check": "prettier --check src",
    "format": "prettier --write src",
    "lint": "eslint src --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test:unit": "node --test price.test.js",
    "build": "vite build",
    "check": "npm run format:check && npm run lint && npm run typecheck && npm run test:unit && npm run build"
  }
}
```

这段串行入口使失败立即停止；CI 也可以把互不依赖的检查并行运行，发布任务等待全部通过。检查范围、忽略文件和退出码必须明确。`--max-warnings 0` 是此例选择的门禁策略，不是 ESLint 默认行为。

本地用自动修复提升效率，CI 用只检查模式暴露未提交变更，避免流水线悄悄修改源码却发布另一份内容。测试命令在 CI 中应运行一次后退出，不能用默认 watch 模式让任务一直等待。

## 失败后修哪一层

格式失败先确认使用的是项目配置与版本，再运行对应格式命令。Lint 失败先看规则含义和触发代码，不能批量禁用。类型失败看真实输入与边界合同，避免用 any 或断言掩盖。行为失败则固定输入，检查实际输出、异常和异步完成条件。

`--fix` 只能应用工具能够自动推导的修改，仍需查看 diff。依赖安全扫描是另一类证据：发现漏洞后需要结合使用路径和影响范围处理，既不能忽略，也不能用“扫描无告警”证明完全安全。

## 在本地与 CI 保持同一合同

CI 从已提交锁文件安装固定工具，在干净工作区运行相同入口，保存失败日志和必要的截图。开发者本地 hook 可以跳过或未安装，所以最终门禁应由受控 CI 执行。

一次有效的验收可以故意把金额除数从100改成1：行为测试应失败；再加入类型不匹配和格式变更，确认对应检查分别失败。恢复后全部通过，才能证明检查确实运行且能发现这类回归。组件、集成与端到端测试见 [测试分层](./26-frontend-testing-layers)。
