### store - 状态管理

状态管理插件提供了跨组件的响应式状态管理功能，支持服务端和客户端，可以用于在多个组件之间共享状态。

#### 技术亮点

*   **同构架构 (Isomorphic Architecture)**：
    支持服务端渲染 (SSR) 和客户端激活 (Hydration)。服务端为每个请求创建独立的 Store 实例，防止跨请求状态污染；客户端通过 `onResponse` 钩子自动获取服务端状态，实现无缝接管。

*   **即时编译 (JIT Compilation)**：
    利用 `esbuild` 在运行时即时编译和压缩客户端脚本 (`browser.ts`)，并支持从 JSR 包中远程加载代码，无需复杂的构建配置即可实现高性能的客户端逻辑。

#### 特性
- ✅ 跨组件状态共享
- ✅ 响应式更新（订阅模式）
- ✅ 服务端和客户端支持
- ✅ 可选持久化（localStorage）
- ✅ 函数式更新支持
- ✅ 声明式的 `defineStore` API，简洁易用
- ✅ 自动收集初始状态，无需手动配置
- ✅ 完整的 TypeScript 类型推断

**基本配置：**

```typescript
import { store } from "@dreamer/dweb/plugins";

// 方式1：手动配置 initialState（传统方式）
app.plugin(store({
  persist: true, // 是否启用持久化（默认 false）
  storageKey: 'dweb-store', // 持久化存储键名（默认 'dweb-store'）
  enableServer: true, // 是否在服务端启用（默认 true）
  initialState: { // 初始状态
    user: null,
    count: 0,
  },
}));

// 方式2：自动收集（推荐，使用 defineStore）
// 只需导入 stores 文件，store 插件会自动收集初始状态

app.plugin(store({
  persist: true,
  storageKey: 'dweb-store',
  // 不需要手动配置 initialState，会自动从已注册的 stores 中收集
}));
```

**配置选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `persist` | `boolean` | `false` | 是否启用持久化，启用后状态会保存到 localStorage |
| `storageKey` | `string` | `'dweb-store'` | 持久化存储的键名 |
| `enableServer` | `boolean` | `true` | 是否在服务端启用，每个请求会有独立的 Store 实例 |
| `initialState` | `Record<string, unknown>` | `{}` | 初始状态对象 |

**defineStore API（推荐，声明式 API）：**

支持两种定义方式：**对象式（Options API）** 和 **函数式（Setup API）**。

**方式 1：对象式定义（Options API）**

```typescript
// stores/example.ts
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
}

export const exampleStore = defineStore('example', {
  state: (): ExampleStoreState => ({
    count: 0,
    message: '',
  }),
  actions: {
    // this 类型会自动推断，无需手动指定
    increment() {
      this.count++;
    },
    setMessage(message: string) {
      this.message = message;
    },
  },
});
```

**方式 2：函数式定义（Setup API）**

```typescript
// stores/example-setup.ts
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
}

export const exampleStoreSetup = defineStore('example-setup', ({ storeAction }) => {
  // 定义初始状态
  const count: number = 0;
  const message: string = '';
  
  // 定义 actions
  // 使用 storeAction 辅助函数，需要手动指定状态类型参数
  // 这样可以让 this 类型正确推断，无需手动指定 this 类型
  const increment = storeAction<ExampleStoreState>(function() {
    this.count = (this.count || 0) + 1;
  });
  
  const setMessage = storeAction<ExampleStoreState>(function(msg: string) {
    this.message = msg;
  });
  
  // 返回状态和 actions
  return {
    count,
    message,
    increment,
    setMessage,
  };
});
```

**在组件中使用（两种方式用法相同）：**

```typescript
import { exampleStore } from '../stores/example.ts';
// 或
import { exampleStoreSetup } from '../stores/example-setup.ts';

export default function MyPage() {
  const [state, setState] = useState(exampleStore.$state);

  useEffect(() => {
    const unsubscribe = exampleStore.$subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe?.();
  }, []);

  return (
    <div>
      <p>Count: {exampleStore.count}</p>
      <button onClick={() => exampleStore.increment()}>+1</button>
      <button onClick={() => exampleStore.$reset()}>重置</button>
    </div>
  );
}
```

**两种方式对比：**

| 特性 | 对象式（Options API） | 函数式（Setup API） |
|------|---------------------|-------------------|
| 结构清晰度 | ✅ 高 | ⚠️ 中等 |
| this 类型推断 | ✅ 自动推断 | ✅ 使用 storeAction，需指定类型参数 |
| 灵活性 | ⚠️ 中等 | ✅ 高 |
| 适用场景 | 简单状态管理 | 复杂逻辑和计算 |
| 推荐度 | ✅ 推荐（大多数情况） | ⚠️ 特殊场景 |

**传统客户端 API：**

```typescript
import { 
  getStore, 
  getStoreState, 
  setStoreState, 
  subscribeStore,
  resetStore 
} from '@dreamer/dweb/client';

// 方式1：获取 Store 实例（适用于需要多次操作）
const store = getStore();
if (store) {
  const state = store.getState();        // 获取状态
  store.setState({ count: 1 });          // 更新状态
  const unsubscribe = store.subscribe((state) => {
    console.log('状态变化:', state);
  });
  store.reset();                         // 重置状态
}

// 方式2：直接获取状态值（更简洁，适用于只读取一次）
const state = getStoreState<{ count: number }>();
if (state) {
  console.log(state.count);
}

// 方式3：更新状态
setStoreState({ count: 1 });
// 或使用函数式更新
setStoreState((prev) => ({ count: prev.count + 1 }));

// 方式4：订阅状态变化
const unsubscribe = subscribeStore((state) => {
  console.log('状态变化:', state);
});
// 取消订阅
if (unsubscribe) {
  unsubscribe();
}

// 方式5：重置状态
resetStore();
```

**在 React/Preact 组件中使用：**

```typescript
import { useEffect, useState } from 'preact/hooks';
import { getStoreState, setStoreState, subscribeStore } from '@dreamer/dweb/client';

interface NavState {
  currentPath: string;
  navOpen: boolean;
}

export default function Navbar() {
  const [state, setState] = useState<NavState | null>(null);

  useEffect(() => {
    // 初始化状态
    const initialState = getStoreState<NavState>();
    setState(initialState);

    // 订阅状态变化
    const unsubscribe = subscribeStore<NavState>((newState) => {
      setState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const toggleNav = () => {
    setStoreState<NavState>((prev) => ({
      ...prev,
      navOpen: !prev?.navOpen,
    }));
  };

  return (
    <nav>
      <button onClick={toggleNav}>
        {state?.navOpen ? '关闭' : '打开'}
      </button>
    </nav>
  );
}
```

**服务端使用（在 load 函数中）：**

```typescript
import type { LoadContext } from '@dreamer/dweb';

export async function load({ store }: LoadContext) {
  if (!store) {
    return {};
  }
  
  // 设置状态（这些状态会自动传递到客户端 Store）
  store.setState({ user: { id: 1, name: 'John' } });
  
  // 获取状态
  const state = store.getState();
  return { user: state.user };
}
```

**注意**：在 `load` 函数中设置的状态会自动同步到客户端 Store。服务端 Store 的状态会在响应时注入到客户端 Store 脚本中，客户端 Store 会使用服务端状态初始化（优先级：服务端状态 > localStorage > 初始状态）。

**API 参考：**

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getStore()` | - | `Store \| null` | 获取 Store 实例，适用于需要多次操作 |
| `getStoreState<T>()` | - | `T \| null` | 直接获取当前状态值，更简洁 |
| `setStoreState<T>(updater)` | `Partial<T> \| ((prev: T) => Partial<T>)` | `void` | 设置状态，支持对象或函数式更新 |
| `subscribeStore<T>(listener)` | `(state: T) => void` | `(() => void) \| null` | 订阅状态变化，返回取消订阅函数 |
| `resetStore()` | - | `void` | 重置状态到初始值 |

**服务端到客户端状态同步：**

在 `load` 函数中设置的状态会自动同步到客户端 Store。工作流程如下：

1. 服务端 `load` 函数中调用 `store.setState()` 设置状态
2. 响应时，服务端 Store 的状态被注入到客户端 Store 脚本中
3. 客户端 Store 初始化时，会合并服务端状态（优先级：服务端状态 > localStorage > 初始状态）
4. 客户端组件可以通过 `getStoreState()` 获取到服务端设置的状态

**示例：**

```typescript
// 服务端 load 函数
export async function load({ store }: LoadContext) {
  if (store) {
    // 设置状态（会自动传递到客户端）
    store.setState({ user: { id: 1, name: 'John' } });
  }
  return {};
}

// 客户端组件
import { getStoreState } from '@dreamer/dweb/client';

export default function MyPage() {
  useEffect(() => {
    // 可以直接获取到服务端设置的状态
    const state = getStoreState<{ user: { id: number; name: string } }>();
    console.log(state?.user); // { id: 1, name: 'John' }
  }, []);
  
  return <div>...</div>;
}
```

**注意事项：**

1. **服务端 Store**：每个请求都有独立的 Store 实例，不会在请求之间共享状态
2. **客户端 Store**：全局共享一个 Store 实例，所有组件共享同一份状态
3. **状态同步**：服务端 Store 的状态会在响应时自动注入到客户端 Store，客户端 Store 初始化时会合并服务端状态
4. **状态优先级**：服务端状态 > localStorage > 初始状态
5. **持久化**：启用 `persist` 后，状态会自动保存到 localStorage，页面刷新后会自动恢复
6. **类型安全**：建议为 Store 状态定义 TypeScript 类型，以获得更好的类型提示
7. **客户端 API**：所有客户端 API 函数在服务端渲染时返回 `null`，不会报错
8. **导入路径**：客户端 API 需要从 `@dreamer/dweb/client` 导入，而不是从 `@dreamer/dweb`
