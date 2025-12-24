# 数组工具

提供数组操作的补充工具函数（与 builtin/array.ts 的扩展方法互补）。

**环境兼容性：** 通用（服务端和客户端都可用）

## 快速开始

```typescript
import { chunk, unique, groupBy, intersection } from "@dreamer/dweb/extensions";

// 数组分块
const chunks = chunk([1, 2, 3, 4, 5], 2);

// 数组去重
const uniqueItems = unique([1, 2, 2, 3, 3, 3]);

// 按条件分组
const grouped = groupBy(users, 'role');

// 数组交集
const common = intersection([1, 2, 3], [2, 3, 4]);
```

## 数组操作

### 数组分块

将数组分割成指定大小的块。

```typescript
import { chunk } from "@dreamer/dweb/extensions";

chunk([1, 2, 3, 4, 5], 2);
// [[1, 2], [3, 4], [5]]
```

### 数组扁平化

将嵌套数组扁平化为一维数组。

```typescript
import { flatten } from "@dreamer/dweb/extensions";

flatten([1, [2, 3], [4, [5, 6]]]);
// [1, 2, 3, 4, 5, 6]

flatten([1, [2, [3, [4]]]], 2);
// [1, 2, 3, [4]]（只扁平化两层）
```

### 数组去重

去除数组中的重复元素。

```typescript
import { unique } from "@dreamer/dweb/extensions";

unique([1, 2, 2, 3, 3, 3]);
// [1, 2, 3]

unique(['a', 'b', 'a', 'c']);
// ['a', 'b', 'c']
```

## 数组分组和排序

### 按条件分组

根据指定的键或函数对数组进行分组。

```typescript
import { groupBy } from "@dreamer/dweb/extensions";

const users = [
  { id: 1, role: 'admin', name: 'Alice' },
  { id: 2, role: 'user', name: 'Bob' },
  { id: 3, role: 'admin', name: 'Charlie' },
];

// 按键分组
groupBy(users, 'role');
// { admin: [{ id: 1, ... }, { id: 3, ... }], user: [{ id: 2, ... }] }

// 按函数分组
groupBy(users, (user) => user.name.length);
// { 5: [{ id: 1, ... }, { id: 2, ... }], 7: [{ id: 3, ... }] }
```

### 按条件排序

根据指定的键或函数对数组进行排序。

```typescript
import { sortBy } from "@dreamer/dweb/extensions";

const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
];

// 按键排序（升序）
sortBy(users, 'age');
// 按年龄升序排序

// 按函数排序（降序）
sortBy(users, (user) => user.name.length, 'desc');
// 按名字长度降序排序
```

## 数组随机操作

### 数组洗牌

随机打乱数组元素的顺序。

```typescript
import { shuffle } from "@dreamer/dweb/extensions";

shuffle([1, 2, 3, 4, 5]);
// [3, 1, 5, 2, 4]（随机顺序）
```

### 随机采样

从数组中随机选择指定数量的元素。

```typescript
import { sample } from "@dreamer/dweb/extensions";

sample([1, 2, 3, 4, 5], 3);
// [2, 5, 1]（随机选择 3 个元素）
```

## 数组分割

### 数组分割

将数组分割为满足条件和不满足条件的两部分。

```typescript
import { partition } from "@dreamer/dweb/extensions";

partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
// [[2, 4], [1, 3, 5]]
```

## 数组压缩和解压

### 数组压缩

将多个数组压缩成一个二维数组。

```typescript
import { zip } from "@dreamer/dweb/extensions";

zip([1, 2, 3], ['a', 'b', 'c']);
// [[1, 'a'], [2, 'b'], [3, 'c']]
```

### 数组解压

将压缩后的二维数组解压为多个数组。

```typescript
import { unzip } from "@dreamer/dweb/extensions";

unzip([[1, 'a'], [2, 'b'], [3, 'c']]);
// [[1, 2, 3], ['a', 'b', 'c']]
```

## 集合操作

### 数组交集

获取多个数组的交集（出现在所有数组中的元素）。

```typescript
import { intersection } from "@dreamer/dweb/extensions";

intersection([1, 2, 3], [2, 3, 4], [3, 4, 5]);
// [3]
```

### 数组并集

获取多个数组的并集（所有数组中的唯一元素）。

```typescript
import { union } from "@dreamer/dweb/extensions";

union([1, 2, 3], [2, 3, 4], [3, 4, 5]);
// [1, 2, 3, 4, 5]
```

### 数组差集

获取第一个数组相对于其他数组的差集。

```typescript
import { difference } from "@dreamer/dweb/extensions";

difference([1, 2, 3, 4], [2, 3], [3, 4]);
// [1]
```

## 数组统计

### 数组统计函数

> **注意：** `sum`, `average`, `max`, `min` 函数已移至 `math.ts`。如需使用，请从 `@dreamer/dweb/extensions` 导入，这些函数在 `math.ts` 中提供相同的功能。

```typescript
import { sum, average, max, min } from "@dreamer/dweb/extensions";

// 求和
sum([1, 2, 3, 4, 5]); // 15

// 平均值
average([1, 2, 3, 4, 5]); // 3

// 最大值
max([1, 5, 3, 9, 2]); // 9

// 最小值
min([1, 5, 3, 9, 2]); // 1
```

> 这些函数现在位于 [数学工具](./math.md) 模块中。

## 完整示例

```typescript
import {
  chunk,
  groupBy,
  sortBy,
  intersection,
  union,
  sum,
  average,
} from "@dreamer/dweb/extensions";

// 分页处理
const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pages = chunk(items, 3);
// [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

// 用户分组
const users = [
  { id: 1, role: 'admin', age: 30 },
  { id: 2, role: 'user', age: 25 },
  { id: 3, role: 'admin', age: 35 },
];
const grouped = groupBy(users, 'role');
const sorted = sortBy(users, 'age', 'desc');

// 集合操作
const commonTags = intersection(tags1, tags2, tags3);
const allTags = union(tags1, tags2, tags3);

// 统计
const total = sum(scores);
const avg = average(scores);
```

## API 参考

### 基础操作
- `chunk<T>(array, size)` - 数组分块
- `flatten<T>(array, depth?)` - 数组扁平化
- `unique<T>(array)` - 数组去重

### 分组和排序
- `groupBy<T>(array, keyOrFn)` - 按条件分组
- `sortBy<T>(array, keyOrFn, order?)` - 按条件排序

### 随机操作
- `shuffle<T>(array)` - 数组洗牌
- `sample<T>(array, count)` - 随机采样

### 数组分割
- `partition<T>(array, predicate)` - 数组分割

### 数组压缩
- `zip<T>(...arrays)` - 数组压缩
- `unzip<T>(array)` - 数组解压

### 集合操作
- `intersection<T>(...arrays)` - 数组交集
- `union<T>(...arrays)` - 数组并集
- `difference<T>(array, ...arrays)` - 数组差集

### 统计函数

> **注意：** `sum`, `average`, `max`, `min` 函数已移至 [数学工具](./math.md) 模块。这些函数在 `math.ts` 中提供相同的功能。

