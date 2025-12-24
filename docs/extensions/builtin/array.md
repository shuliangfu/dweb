## Array 扩展

为 Array 类型提供数组操作相关的扩展方法。

### groupBy()

按指定键或函数对数组进行分组。

```typescript
// 按对象属性分组
const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' }
];
users.groupBy('role');
// { admin: [{ name: 'Alice', role: 'admin' }, { name: 'Charlie', role: 'admin' }], user: [{ name: 'Bob', role: 'user' }] }

// 按函数分组
[1, 2, 3, 4, 5].groupBy(n => n % 2 === 0 ? 'even' : 'odd');
// { even: [2, 4], odd: [1, 3, 5] }
```

### unique()

移除数组中的重复元素。

```typescript
[1, 2, 2, 3, 3, 3].unique(); // [1, 2, 3]
['a', 'b', 'a', 'c'].unique(); // ['a', 'b', 'c']
```

### uniqueBy()

按指定键或函数对数组进行去重。

```typescript
// 按对象属性去重
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice' }
];
users.uniqueBy('id');
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

// 按函数去重
[{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 2 }].uniqueBy(item => item.x);
// [{ x: 1, y: 2 }, { x: 2, y: 2 }]
```

### chunk()

将数组分割成指定大小的块。

```typescript
[1, 2, 3, 4, 5, 6, 7].chunk(3);
// [[1, 2, 3], [4, 5, 6], [7]]

[1, 2, 3, 4].chunk(2);
// [[1, 2], [3, 4]]
```

### flatten()

将嵌套数组扁平化到指定深度。

```typescript
[1, [2, 3], [4, [5, 6]]].flatten();
// [1, 2, 3, 4, [5, 6]]

[1, [2, 3], [4, [5, 6]]].flatten(2);
// [1, 2, 3, 4, 5, 6]

[[1, 2], [3, 4]].flatten();
// [1, 2, 3, 4]
```

### sortBy()

按指定键或函数对数组进行排序。

```typescript
// 按对象属性排序
const users = [
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Charlie', age: 35 }
];
users.sortBy('age');
// [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]

users.sortBy('age', 'desc');
// [{ name: 'Charlie', age: 35 }, { name: 'Bob', age: 30 }, { name: 'Alice', age: 25 }]

// 按函数排序
[3, 1, 4, 1, 5].sortBy(n => n);
// [1, 1, 3, 4, 5]
```

### firstOrDefault()

获取数组的第一个元素，如果数组为空则返回默认值。

```typescript
[1, 2, 3].firstOrDefault(); // 1
[].firstOrDefault(); // undefined
[].firstOrDefault(0); // 0
['a', 'b'].firstOrDefault('default'); // 'a'
```

### lastOrDefault()

获取数组的最后一个元素，如果数组为空则返回默认值。

```typescript
[1, 2, 3].lastOrDefault(); // 3
[].lastOrDefault(); // undefined
[].lastOrDefault(0); // 0
['a', 'b'].lastOrDefault('default'); // 'b'
```

### isEmpty()

检查数组是否为空。

```typescript
[].isEmpty(); // true
[1, 2, 3].isEmpty(); // false
```

### shuffle()

随机打乱数组元素。

```typescript
[1, 2, 3, 4, 5].shuffle();
// 可能返回 [3, 1, 5, 2, 4] 或其他随机顺序

const arr = [1, 2, 3];
const shuffled = arr.shuffle();
// arr 仍然是 [1, 2, 3]
// shuffled 是打乱后的数组
```
