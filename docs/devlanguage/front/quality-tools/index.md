# 前端代码质量工具指南

## 代码质量概览

代码质量是前端项目成功的关键因素之一。通过使用合适的代码质量工具，可以确保代码的一致性、可维护性和可靠性，减少bug和技术债务，提高团队协作效率。

## 代码格式化工具

### Prettier

Prettier是一个固执己见的代码格式化工具，支持多种语言，能够确保代码风格的一致性。

#### 安装配置
```bash
npm install --save-dev prettier
```

#### 配置文件
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### 忽略文件
```
# .prettierignore
node_modules
dist
build
coverage
*.min.js
*.min.css
```

#### 集成到开发流程
```json
// package.json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx,json,css,md}": ["prettier --write"]
  }
}
```

### ESLint

ESLint是最流行的JavaScript代码检查工具，可以识别和报告代码中的模式问题。

#### 安装和初始化
```bash
npm install --save-dev eslint
npx eslint --init
```

#### React项目配置
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

#### Vue项目配置
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    'vue/multi-word-component-names': 'off',
  },
};
```

#### 忽略文件
```
# .eslintignore
node_modules
dist
build
*.min.js
*.min.css
public
```

### TypeScript集成

#### 安装TypeScript ESLint
```bash
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

#### TypeScript配置
```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

## 代码风格检查

### Stylelint

Stylelint是强大的现代CSS检查工具，支持CSS、SCSS、Less等预处理器。

#### 安装配置
```bash
npm install --save-dev stylelint stylelint-config-standard
```

#### 配置文件
```json
// .stylelintrc.json
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-recommended-scss",
    "stylelint-config-recommended-vue"
  ],
  "plugins": [
    "stylelint-order",
    "stylelint-scss"
  ],
  "rules": {
    "order/properties-alphabetical-order": true,
    "color-hex-case": "lower",
    "color-hex-length": "short",
    "declaration-colon-space-after": "always",
    "declaration-colon-space-before": "never",
    "block-opening-brace-space-before": "always",
    "block-closing-brace-newline-after": "always"
  },
  "ignoreFiles": [
    "dist/**/*",
    "node_modules/**/*",
    "*.min.css"
  ]
}
```

#### SCSS支持
```bash
npm install --save-dev stylelint-config-standard-scss stylelint-config-recommended-vue
```

### 代码复杂度检查

#### ESLint复杂度规则
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines': ['error', 300],
    'max-lines-per-function': ['error', 50],
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 4],
    'max-statements': ['error', 25],
  },
};
```

## 代码质量分析

### SonarQube

SonarQube是一个开源的代码质量管理平台，支持多种编程语言。

#### 配置示例
```properties
# sonar-project.properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.projectVersion=1.0

sonar.sources=src
sonar.tests=__tests__
sonar.exclusions=node_modules/**,dist/**

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.js,**/*.spec.js
```

#### GitHub Actions集成
```yaml
# .github/workflows/sonar.yml
name: SonarQube Analysis
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  sonarcloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Install dependencies
        run: npm ci
      - name: Test and coverage
        run: npm run test:coverage
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### 代码重复检测

#### jscpd
```bash
npm install --save-dev jscpd
```

#### 配置
```json
// .jscpd.json
{
  "threshold": 0.1,
  "reporters": ["html", "console"],
  "ignore": [
    "**/*.test.js",
    "**/*.spec.js",
    "**/node_modules/**",
    "**/dist/**"
  ],
  "absolute": true
}
```

## 安全扫描

### npm audit
```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix

# 检查特定包
npm audit --package package-name
```

### Snyk
```bash
# 安装
npm install -g snyk

# 认证
snyk auth

# 扫描项目
snyk test

# 监控项目
snyk monitor
```

### OWASP依赖检查
```bash
# 安装
npm install -g owasp-dependency-check

# 运行检查
dependency-check --project MyApp --scan . --format ALL
```

## 自动化工作流

### Husky

Husky可以让你在Git hooks中运行脚本，确保代码质量。

#### 安装配置
```bash
npm install --save-dev husky
npx husky install
```

#### 添加Git hooks
```bash
# 添加pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# 添加pre-push hook
npx husky add .husky/pre-push "npm run test"
```

### lint-staged
```bash
npm install --save-dev lint-staged
```

#### 配置
```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,less}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Commitizen
```bash
npm install --save-dev commitizen @commitlint/config-conventional
```

#### 配置
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
      ],
    ],
  },
};
```

## IDE集成

### VS Code配置

#### 扩展推荐
```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "stylelint.vscode-stylelint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

#### 设置
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "stylelint.validate": [
    "css",
    "scss",
    "vue"
  ]
}
```

## 性能优化

### 构建优化
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
```

### 包大小分析
```bash
# 分析包大小
npm install --save-dev webpack-bundle-analyzer

# 添加到构建脚本
"analyze": "npm run build -- --analyze"
```

## 最佳实践总结

### 1. 分层配置
- **基础规则**: ESLint推荐规则
- **框架规则**: React/Vue/Angular特定规则
- **团队规则**: 自定义团队规范

### 2. 渐进式采用
```javascript
// .eslintrc.js - 渐进式配置
module.exports = {
  extends: [
    'eslint:recommended',
  ],
  rules: {
    // 从警告开始
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    
    // 逐步提升为错误
    'no-console': 'error',
    'no-unused-vars': 'error',
  },
};
```

### 3. 文档化规范
```markdown
# 代码规范文档

## JavaScript规范
- 使用ESLint + Prettier
- 遵循Airbnb规范
- 强制分号和单引号

## CSS规范
- 使用Stylelint
- BEM命名规范
- 属性排序

## Git规范
- 使用Commitizen
- 遵循Conventional Commits
- 强制代码审查
```

### 4. 持续集成
```yaml
# .github/workflows/quality.yml
name: Code Quality
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test
```

## 监控和报告

### 质量指标
- **代码覆盖率**: 80%以上
- **复杂度**: 函数复杂度<10
- **重复代码**: <5%
- **技术债务**: 定期清理

### 报告工具
```bash
# 生成质量报告
npm install --save-dev eslint-formatter-html
eslint --format html --output-file eslint-report.html src/
```

通过合理使用这些代码质量工具，可以显著提高代码质量，减少bug，提升团队协作效率。关键是选择适合项目需求的工具组合，并建立可持续的质量保障流程。