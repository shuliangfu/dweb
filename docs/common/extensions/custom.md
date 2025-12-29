# 自定义扩展

你可以注册自己的扩展方法和辅助函数。

## 注册自定义扩展

你可以注册自己的扩展方法：

```typescript
import { registerExtension } from "@dreamer/dweb/extensions";

// 注册 String 扩展
registerExtension({
  name: 'reverse',
  type: 'method',
  target: 'String',
  handler: function (this: string): string {
    return this.split('').reverse().join('');
  },
  description: '反转字符串',
});

// 使用自定义扩展
"hello".reverse(); // "olleh"
```

## 注册辅助函数

你也可以注册辅助函数：

```typescript
import { registerExtension } from "@dreamer/dweb/extensions";

registerExtension({
  name: 'myHelper',
  type: 'helper',
  handler: function (value: string): string {
    return value.toUpperCase();
  },
  description: '转换为大写',
});

// 通过注册器获取
import { extensionRegistry } from "@dreamer/dweb/extensions";
const helper = extensionRegistry.get('myHelper');
const result = helper?.handler("hello"); // "HELLO"
```

## 启用/禁用扩展

你可以动态启用或禁用扩展：

```typescript
import { enableExtension, disableExtension } from "@dreamer/dweb/extensions";

// 禁用扩展
disableExtension('capitalize');

// 启用扩展
enableExtension('capitalize');
```

## 扩展类型

扩展系统支持三种类型：

- `method` - 方法扩展，添加到原生类型的原型上
- `helper` - 辅助函数，通过注册器访问
- `utility` - 工具函数，直接导出使用

## 扩展目标

方法扩展可以应用到以下目标：

- `String` - String 类型
- `Array` - Array 类型
- `Date` - Date 类型
- `Object` - Object 类型
- `Request` - Request 类型
- `global` - 全局对象

## 注意事项

1. 扩展名称必须唯一
2. 方法扩展会修改原生类型的原型，请谨慎使用
3. 建议在项目启动时统一注册扩展
4. 扩展可以动态启用/禁用，但建议保持稳定

