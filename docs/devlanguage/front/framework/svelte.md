# Svelte - 编译时优化的框架

## 简介

Svelte 是一个新兴的前端框架，与 React、Vue 等传统框架不同，它在构建时将组件编译成高效的 JavaScript 代码，而不是在运行时进行虚拟 DOM 操作。这种编译时优化的方法使得 Svelte 应用在运行时具有更小的体积和更高的性能。

## 核心特性

### 1. 编译时优化
- 无虚拟 DOM，直接操作真实 DOM
- 在构建时进行优化，减少运行时开销
- 生成更小、更快的代码

### 2. 响应式编程
- 编译时自动追踪依赖
- 精确的 DOM 更新
- 无需手动优化

### 3. 简洁的语法
- 类似 HTML 的模板语法
- 内置过渡和动画支持
- 自动样式作用域

## 安装和设置

### 创建项目

```bash
# 使用官方模板
npx degit sveltejs/template my-svelte-app
cd my-svelte-app
npm install

# 启动开发服务器
npm run dev
```

### 手动安装

```bash
npm install svelte
```

## 基础语法

### 组件结构

```svelte
<script>
    let count = 0;
    
    function increment() {
        count += 1;
    }
</script>

<main>
    <h1>Hello Svelte!</h1>
    <p>Count: {count}</p>
    <button on:click={increment}>
        +1
    </button>
</main>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }
    
    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }
</style>
```

### 响应式声明

```svelte
<script>
    let a = 1;
    let b = 2;
    
    // 自动计算
    $: sum = a + b;
    
    // 响应式语句
    $: {
        console.log(`the sum is ${sum}`);
    }
</script>
```

### 条件渲染

```svelte
{#if user.loggedIn}
    <button on:click={toggle}>
        Log out
    </button>
{/if}

{#if !user.loggedIn}
    <button on:click={toggle}>
        Log in
    </button>
{/if}
```

### 列表渲染

```svelte
<script>
    let todos = [
        { id: 1, text: 'Learn Svelte', done: true },
        { id: 2, text: 'Build an app', done: false }
    ];
</script>

<ul>
    {#each todos as todo}
        <li class:done={todo.done}>
            {todo.text}
        </li>
    {/each}
</ul>
```

## 组件通信

### Props

```svelte
<!-- Child.svelte -->
<script>
    export let name;
    export let greeting = 'Hello';
</script>

<p>{greeting}, {name}!</p>

<!-- Parent.svelte -->
<Child name="world" greeting="Hi" />
```

### 事件传递

```svelte
<!-- Button.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    function handleClick() {
        dispatch('message', {
            text: 'Hello!'
        });
    }
</script>

<button on:click={handleClick}>
    Click me
</button>

<!-- App.svelte -->
<script>
    import Button from './Button.svelte';
    
    function handleMessage(event) {
        alert(event.detail.text);
    }
</script>

<Button on:message={handleMessage} />
```

## 状态管理

### 简单状态管理

```svelte
<!-- store.js -->
import { writable } from 'svelte/store';

export const count = writable(0);

export const increment = () => {
    count.update(n => n + 1);
};

<!-- Component.svelte -->
<script>
    import { count, increment } from './store.js';
</script>

<button on:click={increment}>
    Count: {$count}
</button>
```

### 复杂状态管理

```svelte
<!-- todoStore.js -->
import { writable } from 'svelte/store';

function createTodos() {
    const { subscribe, set, update } = writable([]);
    
    return {
        subscribe,
        add: text => update(todos => [...todos, { text, done: false, id: Date.now() }]),
        remove: id => update(todos => todos.filter(t => t.id !== id)),
        toggle: id => update(todos => 
            todos.map(t => (t.id === id ? { ...t, done: !t.done } : t))
        )
    };
}

export const todos = createTodos();
```

## 生命周期

### onMount

```svelte
<script>
    import { onMount } from 'svelte';
    
    let photos = [];
    
    onMount(async () => {
        const res = await fetch(`/photos.json`);
        photos = await res.json();
    });
</script>
```

### onDestroy

```svelte
<script>
    import { onDestroy } from 'svelte';
    
    let seconds = 0;
    const interval = setInterval(() => seconds += 1, 1000);
    
    onDestroy(() => {
        clearInterval(interval);
    });
</script>
```

## 动画和过渡

### 过渡效果

```svelte
<script>
    import { fade, fly } from 'svelte/transition';
    let visible = true;
</script>

<label>
    <input type="checkbox" bind:checked={visible}>
    visible
</label>

{#if visible}
    <p transition:fade>
        Fades in and out
    </p>
{/if}

{#if visible}
    <p transition:fly={{ y: 200, duration: 2000 }}>
        Flies in and out
    </p>
{/if}
```

### 自定义过渡

```svelte
<script>
    import { quintOut } from 'svelte/easing';
    
    function spin(node, { duration }) {
        return {
            duration,
            css: t => {
                const eased = quintOut(t);
                return `
                    transform: scale(${eased}) rotate(${eased * 360}deg);
                `;
            }
        };
    }
</script>

<div in:spin={{ duration: 800 }}>
    spins and scales
</div>
```

## 路由

### SvelteKit

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

### 简单路由

```svelte
<!-- App.svelte -->
<script>
    import Router from 'svelte-spa-router';
    import Home from './routes/Home.svelte';
    import About from './routes/About.svelte';
    import NotFound from './routes/NotFound.svelte';
    
    const routes = {
        '/': Home,
        '/about': About,
        '*': NotFound
    };
</script>

<Router {routes} />
```

## 构建和部署

### 构建生产版本

```bash
npm run build
```

### 部署到静态托管

```bash
# 构建
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 性能优势

### 包大小对比
- React TodoMVC: ~45KB
- Vue TodoMVC: ~34KB
- Svelte TodoMVC: ~8KB

### 运行时性能
- 无虚拟 DOM 开销
- 精确的 DOM 更新
- 更小的运行时库

## 总结

Svelte 通过编译时优化提供了卓越的性能和开发体验。虽然生态系统相对较新，但其简洁的语法、出色的性能和零运行时开销使其成为构建现代 Web 应用的优秀选择。特别适合对性能要求严格的应用和库开发。