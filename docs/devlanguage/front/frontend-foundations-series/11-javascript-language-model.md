# JavaScript 语言基础：值、函数、对象与作用域

购物车数量变化后，为什么另一处对象也变了？为什么两个计数器互不影响？这些问题先由语言里的值、绑定、对象身份和词法环境解释，再讨论框架如何观察这些变化。

![绑定、共享对象与独立闭包环境](/front/frontend-foundations-series/ep11-flow.svg)

## 赋值与传参都传递值

原始值包括 string、number、boolean、undefined、null、symbol 和 bigint，它们不可变；对象具有身份，可通过引用值访问和修改。变量保存的是绑定关系，赋值和参数传递不会自动复制对象，也不能笼统说“对象按引用传参”。

```js
const cart = { quantity: 1, delivery: { city: '上海' } };
const alias = cart;
alias.quantity = 2;
const copy = { ...cart };
copy.delivery.city = '杭州';
console.log(cart.quantity, cart.delivery.city, copy === cart);
// 2 杭州 false
```

展开只创建了新的外层对象，delivery 仍指向同一个嵌套对象。const 阻止重绑 cart，不阻止修改属性。业务需要独立修改时，可按已知结构复制嵌套层；structuredClone适合其支持的可克隆数据，不是任意函数、DOM节点和类实例的通用复制器。

## 函数把规则与输入分开

函数可以保存、传递和返回，事件监听和数组map都使用这一能力。`onClick` 是函数值，`onClick()` 是立即调用后的结果，注册监听时写错这一步会让动作在加载时提前发生。

```js
function formatPrice(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new TypeError('金额必须是非负安全整数分');
  }
  return '¥' + (cents / 100).toFixed(2);
}
console.log(formatPrice(1299)); // ¥12.99
```

示例明确金额单位为分，避免把字符串、NaN或小数分默默格式化。toFixed输出字符串，不是可靠的任意精度货币计算引擎；多币种、超大金额和舍入合同需要单独设计。

## 闭包保存词法环境，不是冻结快照

```js
function createCounter() {
  let quantity = 0;
  return () => ++quantity;
}
const first = createCounter();
const second = createCounter();
console.log(first(), first(), second()); // 1 2 1
```

每次调用createCounter建立独立的外部绑定，返回函数继续访问各自quantity。同一个闭包多次调用读写同一个绑定，并非永远读取定义时的值。函数声明位置决定词法查找，调用位置不会替换这套外部环境。let/const还有块级作用域和暂时性死区，不能在初始化之前读取。

回调长期被监听器、计时器或缓存持有时，也可能使外部对象保持可达。不要把所有闭包都称为泄漏；只有不再需要的环境仍被保留并造成资源问题时才需排查。

## this 与原型另有规则

普通函数的this取决于调用方式；严格模式下独立调用通常为undefined，`obj.method()` 则把obj作为接收者。箭头函数没有自己的this，沿词法环境取值，不能靠call/bind重新指定。把方法直接作为回调传出时，需要判断是否丢失接收者。

对象属性查找先检查自身，再沿原型链继续。class方法通常定义在prototype上供实例共享；这与每个实例自身的字段不同。不要为业务方便修改内建对象原型，它会影响同一环境中的其他代码。

## 用可观察结果检查模型

分别运行三个代码块，确认共享嵌套对象、金额边界和独立闭包输出。把copy.delivery改为新对象再修改city，原cart应保持杭州；传入1299.5应抛错。先验证这些语言结果，再判断组件为何没有重渲染，组件更新机制见[组件化UI](./22-component-reactive-ui.md)。
