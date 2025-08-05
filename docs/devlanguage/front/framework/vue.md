# Vue.js 全面指南

Vue.js是一个渐进式JavaScript框架，用于构建用户界面。它被设计为可以自底向上逐层应用，核心库只关注视图层，易于上手，便于与第三方库或既有项目整合。

## Vue.js 简介

### 核心特性
- **渐进式框架**：可以逐步采用，不需要重写整个应用
- **响应式数据绑定**：数据变化自动更新视图
- **组件化开发**：可复用的组件系统
- **虚拟DOM**：高效的DOM更新机制
- **指令系统**：声明式的模板语法
- **生态丰富**：完整的工具链和生态系统

### Vue.js 版本
- **Vue 2.x**：稳定版本，广泛使用
- **Vue 3.x**：最新版本，性能更好，TypeScript支持更佳

## 快速开始

### 安装Vue.js

#### 1. CDN引入
```html
<!-- Vue 3 -->
<script src="https://unpkg.com/vue@next"></script>

<!-- Vue 2 -->
<script src="https://cdn.jsdelivr.net/npm/vue@2"></script>
```

#### 2. npm安装
```bash
# Vue 3
npm install vue@next

# Vue 2
npm install vue
```

#### 3. 使用Vue CLI创建项目
```bash
# 安装Vue CLI
npm install -g @vue/cli

# 创建项目
vue create my-project

# 启动项目
cd my-project
npm run serve
```

#### 4. 使用Vite创建项目（推荐）
```bash
# 创建Vue 3项目
npm create vue@latest my-project

# 或者使用yarn
yarn create vue my-project

# 进入项目目录
cd my-project

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 第一个Vue应用

#### Vue 3 示例
```html
<!DOCTYPE html>
<html>
<head>
    <title>Vue 3 示例</title>
    <script src="https://unpkg.com/vue@next"></script>
</head>
<body>
    <div id="app">
        <h1>{{ message }}</h1>
        <button @click="count++">点击次数: {{ count }}</button>
    </div>

    <script>
        const { createApp } = Vue;
        
        createApp({
            data() {
                return {
                    message: 'Hello Vue 3!',
                    count: 0
                }
            }
        }).mount('#app');
    </script>
</body>
</html>
```

#### Vue 2 示例
```html
<!DOCTYPE html>
<html>
<head>
    <title>Vue 2 示例</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@2"></script>
</head>
<body>
    <div id="app">
        <h1>{{ message }}</h1>
        <button @click="count++">点击次数: {{ count }}</button>
    </div>

    <script>
        new Vue({
            el: '#app',
            data: {
                message: 'Hello Vue 2!',
                count: 0
            }
        });
    </script>
</body>
</html>
```

## Vue.js 核心概念

### 1. 模板语法

#### 插值表达式
```html
<template>
    <!-- 文本插值 -->
    <p>{{ message }}</p>
    
    <!-- HTML插值 -->
    <div v-html="rawHtml"></div>
    
    <!-- 属性绑定 -->
    <div v-bind:id="dynamicId"></div>
    <!-- 简写 -->
    <div :id="dynamicId"></div>
    
    <!-- JavaScript表达式 -->
    <p>{{ number + 1 }}</p>
    <p>{{ ok ? 'YES' : 'NO' }}</p>
    <p>{{ message.split('').reverse().join('') }}</p>
</template>
```

#### 指令
```html
<template>
    <!-- 条件渲染 -->
    <p v-if="seen">现在你看到我了</p>
    <p v-else>现在你看不到我了</p>
    
    <!-- 列表渲染 -->
    <ul>
        <li v-for="item in items" :key="item.id">
            {{ item.text }}
        </li>
    </ul>
    
    <!-- 事件监听 -->
    <button v-on:click="doSomething">点击我</button>
    <!-- 简写 -->
    <button @click="doSomething">点击我</button>
    
    <!-- 双向数据绑定 -->
    <input v-model="message" placeholder="编辑我">
    <p>消息是: {{ message }}</p>
</template>
```

### 2. 响应式数据

#### Vue 3 Composition API
```javascript
import { ref, reactive, computed, watch } from 'vue';

export default {
    setup() {
        // 响应式引用
        const count = ref(0);
        const message = ref('Hello');
        
        // 响应式对象
        const state = reactive({
            name: 'Vue',
            version: '3.0'
        });
        
        // 计算属性
        const doubleCount = computed(() => count.value * 2);
        
        // 侦听器
        watch(count, (newValue, oldValue) => {
            console.log(`count changed from ${oldValue} to ${newValue}`);
        });
        
        // 方法
        const increment = () => {
            count.value++;
        };
        
        return {
            count,
            message,
            state,
            doubleCount,
            increment
        };
    }
};
```

#### Vue 2 Options API
```javascript
export default {
    data() {
        return {
            count: 0,
            message: 'Hello',
            state: {
                name: 'Vue',
                version: '2.0'
            }
        };
    },
    computed: {
        doubleCount() {
            return this.count * 2;
        }
    },
    watch: {
        count(newValue, oldValue) {
            console.log(`count changed from ${oldValue} to ${newValue}`);
        }
    },
    methods: {
        increment() {
            this.count++;
        }
    }
};
```

### 3. 组件系统

#### 单文件组件（SFC）
```vue
<template>
    <div class="hello">
        <h1>{{ msg }}</h1>
        <button @click="count++">点击次数: {{ count }}</button>
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'HelloWorld',
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            count: 0
        };
    },
    emits: ['update'],
    methods: {
        handleClick() {
            this.$emit('update', this.count);
        }
    }
};
</script>

<style scoped>
.hello {
    color: #42b983;
}

h1 {
    font-weight: normal;
}
</style>
```

#### 组件通信

**父子组件通信**
```vue
<!-- 父组件 -->
<template>
    <div>
        <child-component 
            :message="parentMessage" 
            @child-event="handleChildEvent"
        />
    </div>
</template>

<script>
import ChildComponent from './ChildComponent.vue';

export default {
    components: {
        ChildComponent
    },
    data() {
        return {
            parentMessage: 'Hello from parent'
        };
    },
    methods: {
        handleChildEvent(data) {
            console.log('Received from child:', data);
        }
    }
};
</script>
```

```vue
<!-- 子组件 -->
<template>
    <div>
        <p>{{ message }}</p>
        <button @click="sendToParent">发送给父组件</button>
    </div>
</template>

<script>
export default {
    props: ['message'],
    emits: ['child-event'],
    methods: {
        sendToParent() {
            this.$emit('child-event', 'Hello from child');
        }
    }
};
</script>
```

**兄弟组件通信（事件总线）**
```javascript
// Vue 2
// event-bus.js
import Vue from 'vue';
export const EventBus = new Vue();

// 组件A
EventBus.$emit('custom-event', data);

// 组件B
EventBus.$on('custom-event', (data) => {
    console.log(data);
});

// Vue 3
// event-bus.js
import { createApp } from 'vue';
const app = createApp({});
export const EventBus = app.config.globalProperties;
```

### 4. 生命周期

#### Vue 3 生命周期
```javascript
import { onMounted, onUpdated, onUnmounted } from 'vue';

export default {
    setup() {
        onMounted(() => {
            console.log('组件已挂载');
        });
        
        onUpdated(() => {
            console.log('组件已更新');
        });
        
        onUnmounted(() => {
            console.log('组件即将卸载');
        });
    }
};
```

#### Vue 2 生命周期
```javascript
export default {
    beforeCreate() {
        console.log('beforeCreate');
    },
    created() {
        console.log('created');
    },
    beforeMount() {
        console.log('beforeMount');
    },
    mounted() {
        console.log('mounted');
    },
    beforeUpdate() {
        console.log('beforeUpdate');
    },
    updated() {
        console.log('updated');
    },
    beforeDestroy() {
        console.log('beforeDestroy');
    },
    destroyed() {
        console.log('destroyed');
    }
};
```

## Vue Router

Vue Router是Vue.js的官方路由管理器。

### 安装和配置
```bash
# Vue 3
npm install vue-router@4

# Vue 2
npm install vue-router@3
```

### 基本使用
```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import About from '../views/About.vue';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/about',
        name: 'About',
        component: About
    },
    {
        path: '/user/:id',
        name: 'User',
        component: () => import('../views/User.vue'),
        props: true
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
```

### 路由组件
```vue
<template>
    <div>
        <nav>
            <router-link to="/">首页</router-link>
            <router-link to="/about">关于</router-link>
        </nav>
        <router-view></router-view>
    </div>
</template>
```

### 编程式导航
```javascript
// 字符串
this.$router.push('/home');

// 对象
this.$router.push({ path: '/home' });

// 命名的路由
this.$router.push({ name: 'user', params: { userId: '123' }});

// 带查询参数
this.$router.push({ path: '/register', query: { plan: 'private' }});

// 替换当前路由
this.$router.replace('/home');

// 前进/后退
this.$router.go(1);
this.$router.go(-1);
```

## Vuex/Pinia 状态管理

### Vuex (Vue 2/3)
```javascript
// store/index.js
import { createStore } from 'vuex';

export default createStore({
    state: {
        count: 0,
        todos: []
    },
    getters: {
        doneTodos: state => {
            return state.todos.filter(todo => todo.done);
        }
    },
    mutations: {
        increment(state) {
            state.count++;
        },
        addTodo(state, todo) {
            state.todos.push(todo);
        }
    },
    actions: {
        incrementAsync({ commit }) {
            setTimeout(() => {
                commit('increment');
            }, 1000);
        },
        async fetchTodos({ commit }) {
            const response = await fetch('/api/todos');
            const todos = await response.json();
            commit('setTodos', todos);
        }
    },
    modules: {
        // 模块化
    }
});
```

### Pinia (Vue 3推荐)
```javascript
// stores/counter.js
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
    state: () => ({
        count: 0,
        name: 'Eduardo'
    }),
    getters: {
        doubleCount: (state) => state.count * 2
    },
    actions: {
        increment() {
            this.count++;
        },
        async fetchUserData() {
            const response = await fetch('/api/user');
            this.name = await response.text();
        }
    }
});

// 在组件中使用
import { useCounterStore } from '@/stores/counter';

export default {
    setup() {
        const store = useCounterStore();
        
        return {
            store
        };
    }
};
```

## Vue.js 最佳实践

### 1. 组件设计原则
```vue
<!-- 好的组件设计 -->
<template>
    <div class="user-card">
        <img :src="user.avatar" :alt="user.name" class="avatar">
        <div class="user-info">
            <h3>{{ user.name }}</h3>
            <p>{{ user.email }}</p>
            <slot name="actions"></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: 'UserCard',
    props: {
        user: {
            type: Object,
            required: true,
            validator(value) {
                return value && value.name && value.email;
            }
        }
    }
};
</script>
```

### 2. 性能优化
```vue
<template>
    <div>
        <!-- 使用v-show而不是v-if进行频繁切换 -->
        <div v-show="isVisible">频繁切换的内容</div>
        
        <!-- 使用key优化列表渲染 -->
        <div v-for="item in items" :key="item.id">
            {{ item.name }}
        </div>
        
        <!-- 异步组件 -->
        <async-component v-if="shouldLoadComponent" />
    </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';

export default {
    components: {
        AsyncComponent: defineAsyncComponent(() => 
            import('./AsyncComponent.vue')
        )
    },
    data() {
        return {
            items: [],
            isVisible: true,
            shouldLoadComponent: false
        };
    },
    computed: {
        // 使用计算属性缓存复杂计算
        expensiveValue() {
            return this.items.reduce((sum, item) => sum + item.value, 0);
        }
    }
};
</script>
```

### 3. 代码组织
```javascript
// composables/useCounter.js
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
    const count = ref(initialValue);
    
    const doubleCount = computed(() => count.value * 2);
    
    const increment = () => {
        count.value++;
    };
    
    const decrement = () => {
        count.value--;
    };
    
    const reset = () => {
        count.value = initialValue;
    };
    
    return {
        count,
        doubleCount,
        increment,
        decrement,
        reset
    };
}

// 在组件中使用
import { useCounter } from '@/composables/useCounter';

export default {
    setup() {
        const { count, doubleCount, increment, decrement, reset } = useCounter(10);
        
        return {
            count,
            doubleCount,
            increment,
            decrement,
            reset
        };
    }
};
```

## Vue.js 生态系统

### 开发工具
- **Vue DevTools**：浏览器调试扩展
- **Vetur/Volar**：VS Code扩展
- **Vue CLI**：项目脚手架
- **Vite**：快速构建工具

### UI组件库
- **Element Plus**：桌面端组件库
- **Ant Design Vue**：企业级UI组件库
- **Vuetify**：Material Design组件库
- **Quasar**：跨平台组件库
- **Vant**：移动端组件库

### 实用库
- **VueUse**：组合式API工具集
- **Vue Apollo**：GraphQL客户端
- **Vue I18n**：国际化
- **Vue Test Utils**：测试工具

## 项目实战示例

### 待办事项应用
```vue
<template>
    <div class="todo-app">
        <h1>待办事项</h1>
        
        <form @submit.prevent="addTodo">
            <input 
                v-model="newTodo" 
                placeholder="添加新任务"
                required
            >
            <button type="submit">添加</button>
        </form>
        
        <div class="filters">
            <button 
                v-for="filter in filters" 
                :key="filter"
                :class="{ active: currentFilter === filter }"
                @click="currentFilter = filter"
            >
                {{ filter }}
            </button>
        </div>
        
        <ul class="todo-list">
            <li 
                v-for="todo in filteredTodos" 
                :key="todo.id"
                :class="{ completed: todo.completed }"
            >
                <input 
                    type="checkbox" 
                    v-model="todo.completed"
                >
                <span>{{ todo.text }}</span>
                <button @click="removeTodo(todo.id)">删除</button>
            </li>
        </ul>
        
        <p>剩余任务: {{ remainingCount }}</p>
    </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
    name: 'TodoApp',
    setup() {
        const newTodo = ref('');
        const todos = ref([]);
        const currentFilter = ref('全部');
        const filters = ['全部', '未完成', '已完成'];
        
        const addTodo = () => {
            if (newTodo.value.trim()) {
                todos.value.push({
                    id: Date.now(),
                    text: newTodo.value,
                    completed: false
                });
                newTodo.value = '';
            }
        };
        
        const removeTodo = (id) => {
            todos.value = todos.value.filter(todo => todo.id !== id);
        };
        
        const filteredTodos = computed(() => {
            switch (currentFilter.value) {
                case '未完成':
                    return todos.value.filter(todo => !todo.completed);
                case '已完成':
                    return todos.value.filter(todo => todo.completed);
                default:
                    return todos.value;
            }
        });
        
        const remainingCount = computed(() => {
            return todos.value.filter(todo => !todo.completed).length;
        });
        
        return {
            newTodo,
            todos,
            currentFilter,
            filters,
            addTodo,
            removeTodo,
            filteredTodos,
            remainingCount
        };
    }
};
</script>

<style scoped>
.todo-app {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

.todo-list {
    list-style: none;
    padding: 0;
}

.todo-list li {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.completed span {
    text-decoration: line-through;
    color: #999;
}

.filters button {
    margin-right: 10px;
    padding: 5px 10px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
}

.filters button.active {
    background: #42b983;
    color: white;
}
</style>
```

## 总结

Vue.js是一个优秀的前端框架，具有以下优势：

### 优点
- **学习曲线平缓**：易于上手
- **渐进式采用**：可以逐步引入
- **性能优秀**：虚拟DOM和响应式系统
- **生态丰富**：完整的工具链
- **社区活跃**：大量资源和插件

### 适用场景
- **中小型项目**：快速开发
- **渐进式改造**：逐步替换jQuery等
- **移动端应用**：结合Cordova等
- **桌面应用**：结合Electron

### 学习建议
1. **掌握基础**：HTML、CSS、JavaScript
2. **理解核心概念**：响应式、组件化、指令
3. **实践项目**：从简单到复杂
4. **学习生态**：Vue Router、Vuex/Pinia
5. **关注最新发展**：Vue 3新特性

Vue.js是一个值得学习和使用的现代前端框架，无论是初学者还是有经验的开发者都能从中受益。