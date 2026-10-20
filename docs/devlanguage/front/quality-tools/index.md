# 前端代码质量工具

订单金额写成字符串拼接、遗漏请求失败分支、格式不统一，是三种不同问题。格式化、静态规则、类型和测试各自负责一部分；再多工具也不能证明价格与权限业务正确。先建立能稳定执行的最小检查链，再补框架规则和团队约束。

![格式、静态规则、类型与行为验证的职责](/front/engineering/quality-gates.svg)

## 工具职责

| 检查层 | 适合发现 | 不能证明 |
| --- | --- | --- |
| Prettier | 缩进、引号、换行等格式差异 | 业务逻辑正确 |
| ESLint | 未声明变量、危险语法、部分框架约束 | 所有异步时序和接口合同正确 |
| TypeScript | 类型不匹配、缺字段、不可达分支线索 | 远端JSON一定符合声明 |
| Stylelint | CSS语法与项目样式规则 | 每种屏幕都没有遮挡 |
| 测试与浏览器验收 | 可执行行为、关键流程和布局 | 未覆盖条件全部安全 |

统一检查入口放在`package.json`，CI按锁文件安装。编辑器提供即时反馈，本地hook减少等待，CI承担可重复门禁；hook可被跳过，不能作为唯一验收。

## 可运行的JavaScript基线

以下示例固定ESLint10、Prettier3和Stylelint16系列，使用flat config。ESLint10要求Node `^20.19.0 || ^22.13.0 || >=24`；新环境优先选仍受维护且满足要求的Node。已有旧项目先核对实际主版本，不直接混用`.eslintrc`、`.eslintignore`与新配置规则。

```bash
npm install -D eslint@10 @eslint/js@10 prettier@3 \
  stylelint@16 stylelint-config-standard@38
```

在项目根目录创建`eslint.config.mjs`：

```js
import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['src/**/*.js'],
    ...js.configs.recommended,
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

这个最小配置面向纯ES模块，不自动声明`window`、`process`等环境变量，也不解析TS或Vue。浏览器/Node环境、React Hooks、Vue SFC和TypeScript应按各插件的flat config接入；语法能解析与启用类型感知规则也是两件事。

`.prettierrc.json`只放格式选项，`.prettierignore`排除`dist/`、`coverage/`等生成目录。不要让多个工具同时争抢缩进和引号；若引入了包含格式规则的ESLint预设，检查与Prettier的冲突。

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all"
}
```

`.stylelintrc.json`：

```json
{
  "extends": ["stylelint-config-standard"],
  "ignoreFiles": ["dist/**", "coverage/**"]
}
```

SCSS、Less或Vue内嵌样式另配对应语法与规则包，不复制已经删除的旧格式规则。先用一份正确CSS和一份错误CSS证明配置生效，再扩大扫描范围。

## 统一命令与失败验证

```json
{
  "scripts": {
    "lint": "eslint src --max-warnings 0",
    "format": "prettier --write src",
    "format:check": "prettier --check src",
    "lint:css": "stylelint \"src/**/*.css\"",
    "check": "npm run lint && npm run format:check && npm run lint:css"
  }
}
```

在`src/quote.js`写入未声明变量，`npm run lint`应失败；故意改坏缩进，`format:check`应失败但不修改文件。修正后再运行`check`。如果始终成功，优先检查文件匹配、忽略规则和实际工作目录，不能只看工具是否安装。

TypeScript项目另外执行`tsc --noEmit`，Vue组件使用匹配版本的`vue-tsc`。在构建工具只移除类型而不检查类型的项目中，打包成功不能替代这一步。

## 提交与CI

使用Husky9时，初始化入口是`npx husky init`，再把`.husky/pre-commit`内容设为`npx lint-staged`；旧的`husky install/add`流程不应直接复制到新项目。只有在团队确认需要时才接入hook，命令本身仍可独立运行。

`lint-staged`面向暂存文件做快速检查，CI对提交快照做完整检查、测试与构建。避免在CI自动修复后继续发布未审查的文件；格式化和自动修复应在提交前完成并审查差异。

## 依赖风险与排错

`npm audit`报告已知漏洞线索，需检查依赖路径、构建机执行权限及实际调用。`npm audit fix`可能修改依赖图，不能把自动升级当成无风险操作；开发依赖也可能在安装、测试和构建阶段执行代码。

| 现象 | 排查方向 |
| --- | --- |
| 编辑器报错、CI通过 | 编辑器工作目录、插件版本、是否读取同一配置 |
| TS文件全部被忽略 | flat config的files、parser与插件是否覆盖扩展名 |
| 两工具反复改同一行 | 格式规则冲突，明确格式化归属 |
| 本机通过、CI找不到包 | 锁文件、开发依赖、Node和安装器版本 |
| 覆盖率高但线上仍错 | 是否断言真实结果、异常路径和多用户边界 |

复杂度、重复率和覆盖率是定位线索，没有适合所有项目的固定达标数字。订单确认、支付结果和权限检查应按失败后果补行为测试，见[测试策略](../testing/)；工具版本与依赖信任见[包管理器](../package-managers/)。
