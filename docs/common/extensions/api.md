# API 参考

扩展系统的完整 API 文档。

## setupExtensions()

初始化所有内置扩展。

```typescript
function setupExtensions(initUserExtensions?: boolean): void;
```

**参数：**
- `initUserExtensions` (可选): 是否初始化用户扩展，默认为 `false`

**示例：**
```typescript
import { setupExtensions } from "@dreamer/dweb/extensions";
setupExtensions(); // 只初始化内置扩展
setupExtensions(true); // 初始化内置扩展和用户扩展
```

## initExtensions()

初始化所有内置扩展（不包含用户扩展）。

```typescript
function initExtensions(): void;
```

## registerExtension()

注册自定义扩展。

```typescript
function registerExtension(extension: Extension): void;
```

**参数：**
- `extension`: 扩展定义对象

**Extension 接口：**
```typescript
interface Extension {
  name: string;              // 扩展名称（唯一标识）
  type: ExtensionType;       // 扩展类型：'method' | 'helper' | 'utility'
  target?: ExtensionTarget; // 扩展目标：'String' | 'Array' | 'Date' | 'Object' | 'Request' | 'global'
  handler: Function;         // 扩展处理函数
  description?: string;      // 扩展描述
  version?: string;          // 扩展版本
  enabled?: boolean;         // 是否启用（默认 true）
}
```

## extensionRegistry

扩展注册器实例，提供扩展管理功能。

```typescript
import { extensionRegistry } from "@dreamer/dweb/extensions";

// 获取扩展
const ext = extensionRegistry.get('capitalize');

// 获取所有扩展
const all = extensionRegistry.getAll();

// 获取指定类型的扩展
const methods = extensionRegistry.getAll('method');

// 检查扩展是否存在
const exists = extensionRegistry.has('capitalize');

// 移除扩展
extensionRegistry.remove('capitalize');

// 启用扩展
extensionRegistry.enable('capitalize');

// 禁用扩展
extensionRegistry.disable('capitalize');

// 清空所有扩展
extensionRegistry.clear();
```

## 类型定义

### ExtensionType

```typescript
type ExtensionType = 'method' | 'helper' | 'utility';
```

### ExtensionTarget

```typescript
type ExtensionTarget = 
  | 'String' 
  | 'Array' 
  | 'Date' 
  | 'Object' 
  | 'Request' 
  | 'Response'
  | 'global';
```

## 注意事项

1. **初始化顺序**：在使用扩展方法之前，必须先调用 `setupExtensions()` 初始化扩展系统。

2. **类型安全**：扩展方法在运行时添加到原型上，TypeScript 可能无法识别。如果需要类型支持，可以使用类型声明合并。

3. **性能考虑**：扩展方法会修改原生类型的原型，虽然性能影响很小，但在大量使用时应考虑性能。

4. **兼容性**：扩展方法可能与某些库或框架冲突，建议在项目启动时统一初始化。

5. **缓存装饰器**：`@cached` 装饰器仅适用于类方法，不适用于普通函数。

