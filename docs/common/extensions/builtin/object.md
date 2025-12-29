## Object 扩展

为 Object 类型提供对象操作相关的扩展方法。

### pick()

从对象中选择指定的键。

```typescript
const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
user.pick(['name', 'email']);
// { name: 'Alice', email: 'alice@example.com' }
```

### omit()

从对象中排除指定的键。

```typescript
const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
user.omit(['id', 'age']);
// { name: 'Alice', email: 'alice@example.com' }
```

### deepClone()

深度克隆对象，包括嵌套对象和数组。

```typescript
const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
const cloned = obj.deepClone();
cloned.b.c = 5;
// obj.b.c 仍然是 2，因为进行了深度克隆

const date = new Date();
const clonedDate = date.deepClone();
// clonedDate 是新的 Date 对象
```

### deepMerge()

深度合并两个对象，嵌套对象会递归合并。

```typescript
const obj1 = { a: 1, b: { c: 2, d: 3 } };
const obj2 = { b: { c: 4, e: 5 }, f: 6 };
obj1.deepMerge(obj2);
// { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }
```

### isEmpty()

检查对象是否为空（无属性）。

```typescript
({}).isEmpty(); // true
({ name: 'Alice' }).isEmpty(); // false
```

### get()

通过路径获取嵌套对象的值。

```typescript
const obj = { user: { profile: { name: 'Alice' } } };
obj.get('user.profile.name'); // 'Alice'
obj.get('user.profile.age', 0); // 0（路径不存在，返回默认值）
obj.get('user.email'); // undefined
```

### set()

通过路径设置嵌套对象的值。

```typescript
const obj: Record<string, unknown> = {};
obj.set('user.profile.name', 'Alice');
// obj = { user: { profile: { name: 'Alice' } } }

const config: Record<string, unknown> = { db: { host: 'localhost' } };
config.set('db.port', 3000);
// config = { db: { host: 'localhost', port: 3000 } }
```
