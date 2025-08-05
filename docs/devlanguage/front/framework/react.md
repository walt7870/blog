# React.js 全面指南

React是由Facebook开发的用于构建用户界面的JavaScript库。它采用组件化的开发方式，通过虚拟DOM实现高效的界面更新，是目前最流行的前端框架之一。

## React.js 简介

### 核心特性
- **组件化**：将UI拆分为独立、可复用的组件
- **虚拟DOM**：高效的DOM更新机制
- **单向数据流**：数据从父组件流向子组件
- **JSX语法**：在JavaScript中编写类似HTML的语法
- **生态丰富**：庞大的社区和第三方库
- **跨平台**：可用于Web、移动端、桌面应用

### React版本
- **React 16.x**：引入Hooks、Fiber架构
- **React 17.x**：过渡版本，改进事件系统
- **React 18.x**：最新版本，并发特性、自动批处理

## 快速开始

### 安装React

#### 1. 使用Create React App
```bash
# 创建新项目
npx create-react-app my-app

# 进入项目目录
cd my-app

# 启动开发服务器
npm start
```

#### 2. 使用Vite创建React项目
```bash
# 创建项目
npm create vite@latest my-react-app -- --template react

# 或者使用TypeScript模板
npm create vite@latest my-react-app -- --template react-ts

# 进入项目目录
cd my-react-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 3. CDN引入（学习用）
```html
<!DOCTYPE html>
<html>
<head>
    <title>React CDN示例</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        function App() {
            const [count, setCount] = React.useState(0);
            
            return (
                <div>
                    <h1>Hello React!</h1>
                    <p>点击次数: {count}</p>
                    <button onClick={() => setCount(count + 1)}>
                        点击我
                    </button>
                </div>
            );
        }
        
        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
```

### 第一个React组件

#### 函数组件（推荐）
```jsx
import React, { useState } from 'react';

function Welcome({ name }) {
    const [count, setCount] = useState(0);
    
    const handleClick = () => {
        setCount(count + 1);
    };
    
    return (
        <div>
            <h1>Hello, {name}!</h1>
            <p>点击次数: {count}</p>
            <button onClick={handleClick}>点击我</button>
        </div>
    );
}

export default Welcome;
```

#### 类组件
```jsx
import React, { Component } from 'react';

class Welcome extends Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0
        };
    }
    
    handleClick = () => {
        this.setState({ count: this.state.count + 1 });
    }
    
    render() {
        const { name } = this.props;
        const { count } = this.state;
        
        return (
            <div>
                <h1>Hello, {name}!</h1>
                <p>点击次数: {count}</p>
                <button onClick={this.handleClick}>点击我</button>
            </div>
        );
    }
}

export default Welcome;
```

## React核心概念

### 1. JSX语法

#### 基本语法
```jsx
// JSX表达式
const element = <h1>Hello, world!</h1>;

// 嵌入JavaScript表达式
const name = 'React';
const element = <h1>Hello, {name}!</h1>;

// 属性
const element = <img src={user.avatarUrl} alt={user.name} />;

// 子元素
const element = (
    <div>
        <h1>Hello!</h1>
        <h2>Good to see you here.</h2>
    </div>
);

// 条件渲染
const element = (
    <div>
        {isLoggedIn ? (
            <UserGreeting />
        ) : (
            <GuestGreeting />
        )}
    </div>
);

// 列表渲染
const numbers = [1, 2, 3, 4, 5];
const listItems = numbers.map((number) =>
    <li key={number.toString()}>{number}</li>
);
```

#### JSX注意事项
```jsx
// 1. 必须有一个根元素或使用Fragment
return (
    <React.Fragment>
        <h1>Title</h1>
        <p>Content</p>
    </React.Fragment>
);

// 简写
return (
    <>
        <h1>Title</h1>
        <p>Content</p>
    </>
);

// 2. className而不是class
const element = <div className="my-class">Content</div>;

// 3. 自闭合标签
const element = <img src="image.jpg" />;

// 4. 事件处理采用驼峰命名
const button = <button onClick={handleClick}>Click me</button>;
```

### 2. 组件与Props

#### Props传递
```jsx
// 父组件
function App() {
    const user = {
        name: 'Alice',
        age: 25,
        email: 'alice@example.com'
    };
    
    return (
        <div>
            <UserProfile 
                user={user}
                isAdmin={true}
                onEdit={() => console.log('Edit user')}
            />
        </div>
    );
}

// 子组件
function UserProfile({ user, isAdmin, onEdit }) {
    return (
        <div className="user-profile">
            <h2>{user.name}</h2>
            <p>Age: {user.age}</p>
            <p>Email: {user.email}</p>
            {isAdmin && (
                <button onClick={onEdit}>Edit User</button>
            )}
        </div>
    );
}

// Props类型检查（需要安装prop-types）
import PropTypes from 'prop-types';

UserProfile.propTypes = {
    user: PropTypes.shape({
        name: PropTypes.string.isRequired,
        age: PropTypes.number.isRequired,
        email: PropTypes.string.isRequired
    }).isRequired,
    isAdmin: PropTypes.bool,
    onEdit: PropTypes.func
};

UserProfile.defaultProps = {
    isAdmin: false,
    onEdit: () => {}
};
```

#### 组件组合
```jsx
// 使用children prop
function Card({ children, title }) {
    return (
        <div className="card">
            <div className="card-header">
                <h3>{title}</h3>
            </div>
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}

// 使用
function App() {
    return (
        <Card title="用户信息">
            <p>这里是卡片内容</p>
            <button>操作按钮</button>
        </Card>
    );
}

// 具名插槽
function Layout({ header, sidebar, content }) {
    return (
        <div className="layout">
            <header>{header}</header>
            <div className="main">
                <aside>{sidebar}</aside>
                <main>{content}</main>
            </div>
        </div>
    );
}
```

### 3. State和生命周期

#### useState Hook
```jsx
import React, { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');
    const [user, setUser] = useState({ name: '', email: '' });
    
    // 更新基本类型
    const increment = () => {
        setCount(count + 1);
        // 或者使用函数式更新
        setCount(prevCount => prevCount + 1);
    };
    
    // 更新对象
    const updateUser = (field, value) => {
        setUser(prevUser => ({
            ...prevUser,
            [field]: value
        }));
    };
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={increment}>+1</button>
            
            <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
            />
            
            <input 
                value={user.name}
                onChange={(e) => updateUser('name', e.target.value)}
                placeholder="User name"
            />
        </div>
    );
}
```

#### useEffect Hook
```jsx
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 组件挂载时执行
    useEffect(() => {
        console.log('Component mounted');
        
        // 清理函数（组件卸载时执行）
        return () => {
            console.log('Component will unmount');
        };
    }, []); // 空依赖数组，只执行一次
    
    // 依赖userId变化时执行
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/users/${userId}`);
                const userData = await response.json();
                setUser(userData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        if (userId) {
            fetchUser();
        }
    }, [userId]); // 依赖userId
    
    // 监听窗口大小变化
    useEffect(() => {
        const handleResize = () => {
            console.log('Window resized');
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!user) return <div>No user found</div>;
    
    return (
        <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
        </div>
    );
}
```

### 4. 事件处理

#### 事件处理基础
```jsx
function EventExample() {
    const [inputValue, setInputValue] = useState('');
    const [items, setItems] = useState([]);
    
    // 处理表单提交
    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            setItems([...items, inputValue]);
            setInputValue('');
        }
    };
    
    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };
    
    // 处理点击事件（带参数）
    const handleItemClick = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };
    
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter item"
                />
                <button type="submit">Add</button>
            </form>
            
            <ul>
                {items.map((item, index) => (
                    <li 
                        key={index}
                        onClick={() => handleItemClick(index)}
                        style={{ cursor: 'pointer' }}
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

### 5. 条件渲染和列表渲染

#### 条件渲染
```jsx
function ConditionalRendering({ user, isLoading, error }) {
    // 1. 使用三元操作符
    return (
        <div>
            {isLoading ? (
                <div>Loading...</div>
            ) : error ? (
                <div>Error: {error}</div>
            ) : (
                <div>Welcome, {user?.name}!</div>
            )}
        </div>
    );
}

// 2. 使用逻辑与操作符
function Notification({ message, type }) {
    return (
        <div>
            {message && (
                <div className={`notification ${type}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

// 3. 使用函数
function UserStatus({ user }) {
    const renderUserStatus = () => {
        if (!user) {
            return <div>Please log in</div>;
        }
        
        if (user.isAdmin) {
            return <div>Admin Panel</div>;
        }
        
        return <div>User Dashboard</div>;
    };
    
    return (
        <div>
            {renderUserStatus()}
        </div>
    );
}
```

#### 列表渲染
```jsx
function TodoList() {
    const [todos, setTodos] = useState([
        { id: 1, text: 'Learn React', completed: false },
        { id: 2, text: 'Build an app', completed: false },
        { id: 3, text: 'Deploy to production', completed: true }
    ]);
    
    const toggleTodo = (id) => {
        setTodos(todos.map(todo => 
            todo.id === id 
                ? { ...todo, completed: !todo.completed }
                : todo
        ));
    };
    
    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };
    
    return (
        <div>
            <h2>Todo List</h2>
            <ul>
                {todos.map(todo => (
                    <li 
                        key={todo.id}
                        style={{
                            textDecoration: todo.completed ? 'line-through' : 'none'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                        />
                        <span>{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
            
            {todos.length === 0 && (
                <p>No todos yet. Add one above!</p>
            )}
        </div>
    );
}
```

## React Hooks详解

### 1. 常用Hooks

#### useContext
```jsx
import React, { createContext, useContext, useState } from 'react';

// 创建Context
const ThemeContext = createContext();
const UserContext = createContext();

// Provider组件
function App() {
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState({ name: 'Alice', role: 'admin' });
    
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <UserContext.Provider value={{ user, setUser }}>
                <Header />
                <Main />
            </UserContext.Provider>
        </ThemeContext.Provider>
    );
}

// 使用Context
function Header() {
    const { theme, setTheme } = useContext(ThemeContext);
    const { user } = useContext(UserContext);
    
    return (
        <header className={`header ${theme}`}>
            <h1>Welcome, {user.name}!</h1>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                Toggle Theme
            </button>
        </header>
    );
}
```

#### useReducer
```jsx
import React, { useReducer } from 'react';

// 定义reducer
const todoReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_TODO':
            return {
                ...state,
                todos: [...state.todos, {
                    id: Date.now(),
                    text: action.payload,
                    completed: false
                }]
            };
        case 'TOGGLE_TODO':
            return {
                ...state,
                todos: state.todos.map(todo =>
                    todo.id === action.payload
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            };
        case 'DELETE_TODO':
            return {
                ...state,
                todos: state.todos.filter(todo => todo.id !== action.payload)
            };
        case 'SET_FILTER':
            return {
                ...state,
                filter: action.payload
            };
        default:
            return state;
    }
};

// 初始状态
const initialState = {
    todos: [],
    filter: 'all'
};

function TodoApp() {
    const [state, dispatch] = useReducer(todoReducer, initialState);
    const [inputValue, setInputValue] = useState('');
    
    const addTodo = () => {
        if (inputValue.trim()) {
            dispatch({ type: 'ADD_TODO', payload: inputValue });
            setInputValue('');
        }
    };
    
    const filteredTodos = state.todos.filter(todo => {
        if (state.filter === 'completed') return todo.completed;
        if (state.filter === 'active') return !todo.completed;
        return true;
    });
    
    return (
        <div>
            <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            />
            <button onClick={addTodo}>Add Todo</button>
            
            <div>
                {['all', 'active', 'completed'].map(filter => (
                    <button
                        key={filter}
                        onClick={() => dispatch({ type: 'SET_FILTER', payload: filter })}
                        style={{
                            fontWeight: state.filter === filter ? 'bold' : 'normal'
                        }}
                    >
                        {filter}
                    </button>
                ))}
            </div>
            
            <ul>
                {filteredTodos.map(todo => (
                    <li key={todo.id}>
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
                        />
                        <span style={{
                            textDecoration: todo.completed ? 'line-through' : 'none'
                        }}>
                            {todo.text}
                        </span>
                        <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

#### useMemo和useCallback
```jsx
import React, { useState, useMemo, useCallback } from 'react';

function ExpensiveComponent({ items, filter, onItemClick }) {
    // useMemo缓存计算结果
    const filteredItems = useMemo(() => {
        console.log('Filtering items...');
        return items.filter(item => 
            item.name.toLowerCase().includes(filter.toLowerCase())
        );
    }, [items, filter]);
    
    const expensiveValue = useMemo(() => {
        console.log('Calculating expensive value...');
        return filteredItems.reduce((sum, item) => sum + item.value, 0);
    }, [filteredItems]);
    
    return (
        <div>
            <p>Total Value: {expensiveValue}</p>
            <ul>
                {filteredItems.map(item => (
                    <li key={item.id} onClick={() => onItemClick(item.id)}>
                        {item.name} - {item.value}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function App() {
    const [items, setItems] = useState([
        { id: 1, name: 'Apple', value: 10 },
        { id: 2, name: 'Banana', value: 5 },
        { id: 3, name: 'Orange', value: 8 }
    ]);
    const [filter, setFilter] = useState('');
    const [count, setCount] = useState(0);
    
    // useCallback缓存函数
    const handleItemClick = useCallback((id) => {
        console.log('Item clicked:', id);
        setItems(prevItems => 
            prevItems.map(item => 
                item.id === id 
                    ? { ...item, value: item.value + 1 }
                    : item
            )
        );
    }, []); // 空依赖数组，函数不会重新创建
    
    return (
        <div>
            <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter items..."
            />
            
            <button onClick={() => setCount(count + 1)}>
                Count: {count}
            </button>
            
            <ExpensiveComponent
                items={items}
                filter={filter}
                onItemClick={handleItemClick}
            />
        </div>
    );
}
```

### 2. 自定义Hooks

```jsx
// 自定义Hook：useLocalStorage
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error('Error reading localStorage:', error);
            return initialValue;
        }
    });
    
    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error('Error setting localStorage:', error);
        }
    };
    
    return [storedValue, setValue];
}

// 自定义Hook：useFetch
function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [url]);
    
    return { data, loading, error };
}

// 自定义Hook：useToggle
function useToggle(initialValue = false) {
    const [value, setValue] = useState(initialValue);
    
    const toggle = useCallback(() => {
        setValue(prev => !prev);
    }, []);
    
    return [value, toggle];
}

// 使用自定义Hooks
function MyComponent() {
    const [name, setName] = useLocalStorage('name', '');
    const { data: users, loading, error } = useFetch('/api/users');
    const [isVisible, toggleVisible] = useToggle(false);
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    
    return (
        <div>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
            />
            
            <button onClick={toggleVisible}>
                {isVisible ? 'Hide' : 'Show'} Users
            </button>
            
            {isVisible && (
                <ul>
                    {users?.map(user => (
                        <li key={user.id}>{user.name}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

## React Router

React Router是React的官方路由库。

### 安装和基本使用
```bash
npm install react-router-dom
```

```jsx
import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    Navigate,
    useParams,
    useNavigate,
    useLocation
} from 'react-router-dom';

// 页面组件
function Home() {
    return <h2>Home Page</h2>;
}

function About() {
    return <h2>About Page</h2>;
}

function Contact() {
    return <h2>Contact Page</h2>;
}

function User() {
    const { id } = useParams();
    return <h2>User ID: {id}</h2>;
}

function NotFound() {
    return <h2>404 - Page Not Found</h2>;
}

// 导航组件
function Navigation() {
    const navigate = useNavigate();
    const location = useLocation();
    
    return (
        <nav>
            <ul>
                <li>
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                        Home
                    </Link>
                </li>
                <li>
                    <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>
                        About
                    </Link>
                </li>
                <li>
                    <Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''}>
                        Contact
                    </Link>
                </li>
            </ul>
            
            <button onClick={() => navigate('/user/123')}>
                Go to User 123
            </button>
            
            <button onClick={() => navigate(-1)}>
                Go Back
            </button>
        </nav>
    );
}

// 主应用
function App() {
    return (
        <Router>
            <div>
                <Navigation />
                
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/user/:id" element={<User />} />
                    <Route path="/old-home" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </Router>
    );
}
```

### 嵌套路由和保护路由
```jsx
import React, { createContext, useContext, useState } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

// 认证上下文
const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    
    const login = (userData) => {
        setUser(userData);
    };
    
    const logout = () => {
        setUser(null);
    };
    
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// 保护路由组件
function ProtectedRoute({ children }) {
    const { user } = useContext(AuthContext);
    
    return user ? children : <Navigate to="/login" />;
}

// 布局组件
function Layout() {
    return (
        <div>
            <header>My App Header</header>
            <main>
                <Outlet /> {/* 子路由渲染位置 */}
            </main>
            <footer>My App Footer</footer>
        </div>
    );
}

// 仪表板布局
function DashboardLayout() {
    return (
        <div style={{ display: 'flex' }}>
            <aside>
                <nav>
                    <Link to="/dashboard">Overview</Link>
                    <Link to="/dashboard/profile">Profile</Link>
                    <Link to="/dashboard/settings">Settings</Link>
                </nav>
            </aside>
            <main>
                <Outlet />
            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="about" element={<About />} />
                        <Route path="login" element={<Login />} />
                        
                        {/* 保护的嵌套路由 */}
                        <Route path="dashboard" element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardOverview />} />
                            <Route path="profile" element={<Profile />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}
```

## 状态管理

### 1. Context + useReducer
```jsx
import React, { createContext, useContext, useReducer } from 'react';

// 定义actions
const ACTIONS = {
    ADD_ITEM: 'ADD_ITEM',
    REMOVE_ITEM: 'REMOVE_ITEM',
    UPDATE_ITEM: 'UPDATE_ITEM',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR'
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
        case ACTIONS.ADD_ITEM:
            return {
                ...state,
                items: [...state.items, action.payload]
            };
        case ACTIONS.REMOVE_ITEM:
            return {
                ...state,
                items: state.items.filter(item => item.id !== action.payload)
            };
        case ACTIONS.UPDATE_ITEM:
            return {
                ...state,
                items: state.items.map(item =>
                    item.id === action.payload.id
                        ? { ...item, ...action.payload.updates }
                        : item
                )
            };
        case ACTIONS.SET_LOADING:
            return {
                ...state,
                loading: action.payload
            };
        case ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload
            };
        default:
            return state;
    }
}

// 初始状态
const initialState = {
    items: [],
    loading: false,
    error: null
};

// Context
const AppContext = createContext();

// Provider
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    
    // Action creators
    const actions = {
        addItem: (item) => {
            dispatch({ type: ACTIONS.ADD_ITEM, payload: item });
        },
        removeItem: (id) => {
            dispatch({ type: ACTIONS.REMOVE_ITEM, payload: id });
        },
        updateItem: (id, updates) => {
            dispatch({ type: ACTIONS.UPDATE_ITEM, payload: { id, updates } });
        },
        setLoading: (loading) => {
            dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
        },
        setError: (error) => {
            dispatch({ type: ACTIONS.SET_ERROR, payload: error });
        }
    };
    
    return (
        <AppContext.Provider value={{ state, actions }}>
            {children}
        </AppContext.Provider>
    );
}

// Hook
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
```

### 2. Redux Toolkit（推荐）
```bash
npm install @reduxjs/toolkit react-redux
```

```jsx
// store/counterSlice.js
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
    name: 'counter',
    initialState: {
        value: 0
    },
    reducers: {
        increment: (state) => {
            state.value += 1;
        },
        decrement: (state) => {
            state.value -= 1;
        },
        incrementByAmount: (state, action) => {
            state.value += action.payload;
        }
    }
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;

// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
    reducer: {
        counter: counterReducer
    }
});

// App.js
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Counter from './Counter';

function App() {
    return (
        <Provider store={store}>
            <Counter />
        </Provider>
    );
}

// Counter.js
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount } from './store/counterSlice';

function Counter() {
    const count = useSelector(state => state.counter.value);
    const dispatch = useDispatch();
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => dispatch(increment())}>+</button>
            <button onClick={() => dispatch(decrement())}>-</button>
            <button onClick={() => dispatch(incrementByAmount(5))}>+5</button>
        </div>
    );
}
```

## React最佳实践

### 1. 组件设计原则
```jsx
// 好的组件设计
function Button({ 
    children, 
    variant = 'primary', 
    size = 'medium', 
    disabled = false, 
    onClick,
    ...props 
}) {
    const baseClasses = 'btn';
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger'
    };
    const sizeClasses = {
        small: 'btn-sm',
        medium: 'btn-md',
        large: 'btn-lg'
    };
    
    const className = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'btn-disabled'
    ].filter(Boolean).join(' ');
    
    return (
        <button
            className={className}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
}

// 使用组合而不是继承
function Card({ children, header, footer, className = '' }) {
    return (
        <div className={`card ${className}`}>
            {header && <div className="card-header">{header}</div>}
            <div className="card-body">{children}</div>
            {footer && <div className="card-footer">{footer}</div>}
        </div>
    );
}
```

### 2. 性能优化
```jsx
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';

// 1. 使用React.memo优化组件
const ExpensiveComponent = memo(function ExpensiveComponent({ data, onItemClick }) {
    const processedData = useMemo(() => {
        return data.map(item => ({
            ...item,
            processed: true
        }));
    }, [data]);
    
    return (
        <div>
            {processedData.map(item => (
                <div key={item.id} onClick={() => onItemClick(item.id)}>
                    {item.name}
                </div>
            ))}
        </div>
    );
});

// 2. 懒加载组件
const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
    const [data, setData] = useState([]);
    
    // 3. 使用useCallback优化事件处理
    const handleItemClick = useCallback((id) => {
        console.log('Clicked item:', id);
    }, []);
    
    return (
        <div>
            <ExpensiveComponent data={data} onItemClick={handleItemClick} />
            
            <Suspense fallback={<div>Loading...</div>}>
                <LazyComponent />
            </Suspense>
        </div>
    );
}

// 4. 虚拟化长列表
import { FixedSizeList as List } from 'react-window';

function VirtualizedList({ items }) {
    const Row = ({ index, style }) => (
        <div style={style}>
            {items[index].name}
        </div>
    );
    
    return (
        <List
            height={600}
            itemCount={items.length}
            itemSize={35}
        >
            {Row}
        </List>
    );
}
```

### 3. 错误边界
```jsx
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    
    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        
        // 可以将错误日志上报给服务
        console.error('Error caught by boundary:', error, errorInfo);
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>Something went wrong.</h2>
                    {this.props.showDetails && (
                        <details style={{ whiteSpace: 'pre-wrap' }}>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo.componentStack}
                        </details>
                    )}
                    <button onClick={() => this.setState({ hasError: false })}>
                        Try again
                    </button>
                </div>
            );
        }
        
        return this.props.children;
    }
}

// 使用错误边界
function App() {
    return (
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Header />
            <Main />
            <Footer />
        </ErrorBoundary>
    );
}
```

## React生态系统

### UI组件库
- **Ant Design**：企业级UI设计语言
- **Material-UI (MUI)**：Google Material Design
- **Chakra UI**：简单、模块化、易用
- **React Bootstrap**：Bootstrap组件
- **Semantic UI React**：语义化UI

### 状态管理
- **Redux Toolkit**：官方推荐的Redux工具
- **Zustand**：轻量级状态管理
- **Recoil**：Facebook实验性状态管理
- **Jotai**：原子化状态管理

### 开发工具
- **React DevTools**：浏览器调试扩展
- **Storybook**：组件开发环境
- **React Testing Library**：测试工具
- **ESLint + Prettier**：代码质量工具

### 构建工具
- **Create React App**：官方脚手架
- **Vite**：快速构建工具
- **Next.js**：全栈React框架
- **Gatsby**：静态站点生成器

## 总结

React是一个强大且灵活的前端库，具有以下特点：

### 优势
- **组件化开发**：提高代码复用性
- **虚拟DOM**：高效的性能
- **丰富的生态**：大量第三方库
- **活跃的社区**：持续更新和支持
- **灵活性**：可以渐进式采用

### 学习路径
1. **掌握JavaScript基础**：ES6+语法
2. **理解React核心概念**：组件、Props、State
3. **学习Hooks**：useState、useEffect等
4. **掌握路由**：React Router
5. **学习状态管理**：Context API、Redux
6. **实践项目**：构建完整应用
7. **性能优化**：memo、useMemo、useCallback
8. **测试**：Jest、React Testing Library

React是现代前端开发的重要技能，掌握React将为你的前端开发之路打下坚实的基础。