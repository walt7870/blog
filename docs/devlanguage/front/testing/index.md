# 前端测试指南

## 测试的重要性

测试是保证代码质量、减少bug、提升开发效率的重要手段。一个完善的前端测试体系能够：
- 提前发现bug，减少线上故障
- 提升代码可维护性和重构信心
- 作为代码文档，帮助理解业务逻辑
- 支持持续集成和持续部署

## 测试金字塔

前端测试应该遵循测试金字塔原则：
- **单元测试 (Unit Tests)**：70% - 测试单个函数或组件
- **集成测试 (Integration Tests)**：20% - 测试组件间交互
- **端到端测试 (E2E Tests)**：10% - 测试完整用户流程

## 单元测试

### Jest (JavaScript测试框架)

#### 安装配置
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

#### 基础示例
```javascript
// math.test.js
import { add, multiply } from './math';

describe('Math functions', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });

  test('multiplies 3 * 4 to equal 12', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  test('handles edge cases', () => {
    expect(add(-1, 1)).toBe(0);
    expect(multiply(0, 5)).toBe(0);
  });
});
```

### React组件测试

#### 使用React Testing Library
```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies correct styling', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByText('Primary Button');
    expect(button).toHaveClass('btn-primary');
  });
});
```

#### 测试Hooks
```javascript
// useCounter.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  test('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  test('increments counter', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(6);
  });

  test('decrements counter', () => {
    const { result } = renderHook(() => useCounter(10));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(9);
  });
});
```

### Vue组件测试

#### 使用Vue Test Utils
```javascript
// HelloWorld.test.js
import { mount } from '@vue/test-utils';
import HelloWorld from '@/components/HelloWorld.vue';

describe('HelloWorld.vue', () => {
  test('renders props.msg when passed', () => {
    const msg = 'new message';
    const wrapper = mount(HelloWorld, {
      props: { msg }
    });
    expect(wrapper.text()).toMatch(msg);
  });

  test('emits event when button is clicked', async () => {
    const wrapper = mount(HelloWorld);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('increment')).toBeTruthy();
  });
});
```

## 集成测试

### API集成测试
```javascript
// api.test.js
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchUser, createUser } from './api';

describe('API Integration', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  test('fetches user successfully', async () => {
    const userData = { id: 1, name: 'John Doe' };
    mock.onGet('/users/1').reply(200, userData);

    const user = await fetchUser(1);
    expect(user).toEqual(userData);
  });

  test('creates new user', async () => {
    const newUser = { name: 'Jane Smith', email: 'jane@example.com' };
    mock.onPost('/users').reply(201, { id: 2, ...newUser });

    const createdUser = await createUser(newUser);
    expect(createdUser.id).toBe(2);
    expect(createdUser.name).toBe(newUser.name);
  });
});
```

### 组件集成测试
```javascript
// UserList.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserList from './UserList';

describe('UserList Integration', () => {
  test('loads and displays users', async () => {
    render(<UserList />);
    
    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // 测试搜索功能
    const searchInput = screen.getByPlaceholderText('Search users...');
    await userEvent.type(searchInput, 'John');
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });
});
```

## 端到端测试 (E2E)

### Cypress测试框架

#### 安装配置
```bash
npm install --save-dev cypress
```

#### 基础测试
```javascript
// cypress/integration/login.spec.js
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('successfully logs in with valid credentials', () => {
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome back').should('be.visible');
  });

  it('shows error with invalid credentials', () => {
    cy.get('[data-testid="email"]').type('invalid@example.com');
    cy.get('[data-testid="password"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.contains('Invalid credentials').should('be.visible');
  });

  it('validates required fields', () => {
    cy.get('[data-testid="login-button"]').click();
    
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });
});
```

#### 高级E2E测试
```javascript
// cypress/integration/checkout.spec.js
describe('Checkout Process', () => {
  it('completes full purchase flow', () => {
    // 添加商品到购物车
    cy.visit('/products');
    cy.get('[data-testid="add-to-cart"]').first().click();
    cy.get('[data-testid="cart-count"]').should('contain', '1');
    
    // 进入结账流程
    cy.visit('/checkout');
    cy.get('[data-testid="shipping-form"]').within(() => {
      cy.get('input[name="firstName"]').type('John');
      cy.get('input[name="lastName"]').type('Doe');
      cy.get('input[name="address"]').type('123 Main St');
      cy.get('input[name="city"]').type('Anytown');
      cy.get('input[name="zipCode"]').type('12345');
    });
    
    // 选择支付方式
    cy.get('[data-testid="payment-method-card"]').click();
    cy.get('iframe[name="stripe-frame"]').within(() => {
      cy.get('[data-testid="card-number-input"]').type('4242424242424242');
      cy.get('[data-testid="expiry-input"]').type('12/25');
      cy.get('[data-testid="cvc-input"]').type('123');
    });
    
    // 完成订单
    cy.get('[data-testid="place-order-button"]').click();
    cy.url().should('include', '/order-confirmation');
    cy.contains('Order confirmed').should('be.visible');
  });
});
```

### Playwright测试框架

#### 安装配置
```bash
npm install --save-dev @playwright/test
```

#### 基础测试
```javascript
// tests/example.spec.js
const { test, expect } = require('@playwright/test');

test('homepage has title and links', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
  
  // create a locator
  const getStarted = page.locator('text=Get Started');
  
  // Expect an attribute "to be strictly equal" to the value.
  await expect(getStarted).toHaveAttribute('href', '/docs');
  
  // Click the get started link.
  await getStarted.click();
  
  // Expects the URL to contain intro.
  await expect(page).toHaveURL(/.*intro/);
});
```

## 测试最佳实践

### 测试组织
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.jsx
│   │   ├── Button.test.jsx
│   │   └── Button.stories.jsx
├── utils/
│   ├── api.js
│   └── api.test.js
├── __tests__/
│   ├── integration/
│   └── e2e/
```

### 测试命名规范
```javascript
// 好的命名
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', () => {
      // ...
    });
    
    it('should throw an error with invalid email', () => {
      // ...
    });
  });
});

// 不好的命名
describe('test1', () => {
  it('test', () => {
    // ...
  });
});
```

### 测试数据管理
```javascript
// test-utils/test-data.js
export const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

export const createMockUser = (overrides = {}) => ({
  id: Date.now(),
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});
```

### 模拟和存根
```javascript
// 使用Jest Mock
jest.mock('../api');

import { fetchUser } from '../api';

test('displays user data', async () => {
  fetchUser.mockResolvedValue({ id: 1, name: 'John' });
  
  render(<UserProfile userId={1} />);
  
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

## 持续集成

### GitHub Actions配置
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18]
    
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

## 测试工具推荐

### 单元测试
- **Jest**: Facebook的测试框架
- **Vitest**: Vite原生测试框架
- **Mocha**: 灵活的测试框架
- **Ava**: 并发测试运行器

### 组件测试
- **React Testing Library**: React组件测试
- **Vue Test Utils**: Vue组件测试
- **Testing Library**: 跨框架测试工具

### E2E测试
- **Cypress**: 现代E2E测试框架
- **Playwright**: 微软的E2E测试框架
- **Puppeteer**: Chrome自动化工具

### 覆盖率工具
- **Istanbul**: 代码覆盖率
- **Codecov**: 覆盖率报告服务
- **Coveralls**: 覆盖率可视化

## 测试策略总结

1. **优先单元测试**: 覆盖核心业务逻辑
2. **关键路径E2E**: 测试用户关键流程
3. **持续集成**: 自动化测试流程
4. **监控覆盖率**: 保持高代码覆盖率
5. **定期维护**: 更新测试用例和依赖

通过建立完善的测试体系，可以确保前端应用的稳定性和可靠性。