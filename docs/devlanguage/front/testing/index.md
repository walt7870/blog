# 前端测试策略

订单金额计算错、保存按钮重复发送、部署后刷新详情404，分别属于业务规则、页面协作和真实运行环境。测试应该围绕失败后果安排层次，而不是机械套用70/20/10的比例。越靠近用户与基础设施，成本越高，也越能发现模块拼接后的问题。

![围绕订单提交分配单元、集成和浏览器验证](/front/engineering/testing-contract.svg)

## 测什么

| 层次 | 订单例子 | 断言与边界 |
| --- | --- | --- |
| 单元 | 数量与金额计算 | 正常、空值、负数、小数、上限；不依赖DOM |
| 组件/集成 | 校验、发请求、失败保留草稿 | 从用户操作观察结果，控制接口响应 |
| 端到端 | 登录、编辑、保存、刷新 | 真实浏览器与隔离测试环境，检查持久结果 |
| 视觉与可访问性 | 窄屏表单、焦点、错误提示 | 布局截图加键盘操作，不能只断言CSS类名 |

模拟接口测试能验证前端面对200、401、409、500和超时时的行为，不能证明真实服务实现也符合合同。至少保留关键路径的真实集成验收；支付使用沙箱和隔离账号，不调用正式扣款。

## 可复制的规则测试

下面使用Node内置测试运行器，不需要额外框架。在支持ES模块的项目保存`quote.mjs`：

```js
export function quote(quantity, unitCents = 1990) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 5) {
    throw new RangeError('数量必须为1至5的整数');
  }
  if (!Number.isSafeInteger(unitCents) || unitCents < 0 ||
      !Number.isSafeInteger(quantity * unitCents)) {
    throw new RangeError('价格超出计算范围');
  }
  return quantity * unitCents;
}
```

保存`quote.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { quote } from './quote.mjs';

test('两件商品以整数分计算为3980', () => {
  assert.equal(quote(2), 3980);
});

test('拒绝无效数量，不将空值当作零', () => {
  for (const value of ['', null, 0, -1, 1.5, 6, NaN]) {
    assert.throws(() => quote(value), RangeError);
  }
});

test('拒绝负价与金额溢出', () => {
  assert.throws(() => quote(1, -1), RangeError);
  assert.throws(() => quote(5, Number.MAX_SAFE_INTEGER), RangeError);
});
```

```bash
node --test quote.test.mjs
```

把`quantity * unitCents`故意改为`quantity + unitCents`，测试应失败。这个反例检查断言确实能捕获业务错误；只断言“函数运行了”无法保护计算结果。

## 组件与接口协作

Vite项目可评估Vitest，已有Jest项目可保留；先核对JSX/SFC转换、ESM、DOM环境和测试初始化。React Testing Library当前的`renderHook`来自`@testing-library/react`，旧`@testing-library/react-hooks`示例不应作为新项目默认安装。Vue使用匹配版本的Vue Test Utils并等待响应式更新。

以可访问名称操作“数量”和“保存订单”，验证非法输入不发送请求、提交中不能重复触发、409库存冲突保留数量、重试成功才清空草稿。为慢响应和乱序设置明确受控条件，等待可观察结果，不用固定休眠“等页面加载”。

请求模拟放在网络或API边界，保留真实状态管理与渲染逻辑；若连待测规则都mock掉，测试只能证明假对象按预期工作。每例结束重置处理器、计时器、store和缓存，避免单独通过、全量失败。

## 浏览器端到端

Playwright或Cypress选择与现有项目一致的工具，安装匹配浏览器和依赖，先验证能启动隔离站点。端到端场景必须有稳定的测试账号、数据准备、清理与结果观察接口。

订单保存流程应先创建唯一草稿，记录测试标识，再进入页面修改、保存、刷新，最后读取持久结果并清理。跨域支付iframe不能靠普通DOM选择器穿透；使用支付厂商沙箱能力与对应工具支持的frame接口，不把模拟点击写成真实付款验收。

重试只用于确认偶发性，不能把第一次失败从报告删掉。保存失败时的截图、控制台和请求记录，并定位是否来自数据共享、竞态、服务未就绪或选择器依赖布局。选择器优先角色、label或稳定test id，避免第几个元素与CSS层级。

## CI与验收

流水线先按锁文件安装，执行格式/规则/类型与单元集成，再构建同一提交的产物并进行浏览器关键路径检查。浏览器分片需要隔离数据；CI生成截图和trace时检查是否含账号凭证或业务数据。

覆盖率用于发现未执行的分支，不能保证断言有效。优先补支付状态、权限、金额与异常恢复等高后果场景，再按变更扩大验证。无业务风险的排版调整不必新增镜像实现的单元测试，但需要实际窄屏与键盘验收。

达成标志是能够说明每个测试保护的失败方式、明确mock边界、通过故意错误证明会失败，并在失败后凭证据定位到具体层。类型和静态工具见[质量工具](../quality-tools/)，跨版本发布与刷新问题见[前端部署](../deployment/)。
