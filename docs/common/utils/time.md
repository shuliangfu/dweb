# 时间工具

提供时间计算、转换、判断等功能。

**环境兼容性：** 通用（服务端和客户端都可用）

## 快速开始

```typescript
import { addDays, diffDays, isToday, startOfDay } from "@dreamer/dweb/utils";

// 添加天数
const tomorrow = addDays(new Date(), 1);

// 计算天数差
const days = diffDays(date1, date2);

// 判断是否为今天
if (isToday(date)) {
  // 今天
}

// 获取一天的开始时间
const start = startOfDay(new Date());
```

## 时间计算

### 添加时间

```typescript
import { addDays, addHours, addMinutes, addMonths, addYears } from "@dreamer/dweb/utils";

// 添加天数
addDays(new Date(), 7); // 7 天后
addDays(new Date(), -1); // 1 天前

// 添加小时
addHours(new Date(), 2); // 2 小时后
addHours(new Date(), -1); // 1 小时前

// 添加分钟
addMinutes(new Date(), 30); // 30 分钟后

// 添加月数
addMonths(new Date(), 1); // 1 个月后

// 添加年数
addYears(new Date(), 1); // 1 年后
```

## 时间差计算

### 计算时间差

计算两个日期之间的时间差。

```typescript
import { diffDays, diffHours, diffMinutes, diffSeconds } from "@dreamer/dweb/utils";

// 计算天数差
diffDays(new Date('2024-01-01'), new Date('2024-01-10')); // 9

// 计算小时差
diffHours(new Date('2024-01-01 10:00'), new Date('2024-01-01 15:00')); // 5

// 计算分钟差
diffMinutes(new Date('2024-01-01 10:00'), new Date('2024-01-01 10:30')); // 30

// 计算秒数差
diffSeconds(new Date('2024-01-01 10:00:00'), new Date('2024-01-01 10:00:30')); // 30
```

## 日期判断

### 判断日期

```typescript
import { isToday, isYesterday, isTomorrow, isSameDay } from "@dreamer/dweb/utils";

// 判断是否为今天
isToday(new Date()); // true

// 判断是否为昨天
const yesterday = addDays(new Date(), -1);
isYesterday(yesterday); // true

// 判断是否为明天
const tomorrow = addDays(new Date(), 1);
isTomorrow(tomorrow); // true

// 判断是否为同一天
isSameDay(new Date('2024-01-01 10:00'), new Date('2024-01-01 15:00')); // true
```

### 判断日期范围

```typescript
import { isInRange } from "@dreamer/dweb/utils";

isInRange(
  new Date('2024-01-15'),
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// true
```

## 日期边界

### 一天的边界

```typescript
import { startOfDay, endOfDay } from "@dreamer/dweb/utils";

// 获取一天的开始时间（00:00:00.000）
startOfDay(new Date('2024-01-01 15:30:45'));
// 2024-01-01 00:00:00.000

// 获取一天的结束时间（23:59:59.999）
endOfDay(new Date('2024-01-01 15:30:45'));
// 2024-01-01 23:59:59.999
```

### 一周的边界

```typescript
import { startOfWeek, endOfWeek } from "@dreamer/dweb/utils";

// 获取一周的开始时间（周一 00:00:00.000）
startOfWeek(new Date('2024-01-05')); // 假设是周五
// 2024-01-01 00:00:00.000（周一）

// 获取一周的结束时间（周日 23:59:59.999）
endOfWeek(new Date('2024-01-05')); // 假设是周五
// 2024-01-07 23:59:59.999（周日）

// 自定义一周的开始（从周日开始）
startOfWeek(new Date('2024-01-05'), 0); // 0=周日，1=周一
```

### 一月的边界

```typescript
import { startOfMonth, endOfMonth } from "@dreamer/dweb/utils";

// 获取一月的开始时间
startOfMonth(new Date('2024-01-15'));
// 2024-01-01 00:00:00.000

// 获取一月的结束时间
endOfMonth(new Date('2024-01-15'));
// 2024-01-31 23:59:59.999
```

### 一年的边界

```typescript
import { startOfYear, endOfYear } from "@dreamer/dweb/utils";

// 获取一年的开始时间
startOfYear(new Date('2024-06-15'));
// 2024-01-01 00:00:00.000

// 获取一年的结束时间
endOfYear(new Date('2024-06-15'));
// 2024-12-31 23:59:59.999
```

## 完整示例

```typescript
import {
  addDays,
  diffDays,
  isToday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from "@dreamer/dweb/utils";

// 计算未来日期
const nextWeek = addDays(new Date(), 7);

// 计算日期差
const daysUntilEvent = diffDays(new Date(), eventDate);

// 判断日期
if (isToday(createdAt)) {
  console.log('今天创建');
}

// 获取日期范围
const todayStart = startOfDay(new Date());
const todayEnd = endOfDay(new Date());

// 获取本周范围
const weekStart = startOfWeek(new Date());
const weekEnd = endOfWeek(new Date());
```

## API 参考

### 时间计算
- `addDays(date, days)` - 添加天数
- `addHours(date, hours)` - 添加小时
- `addMinutes(date, minutes)` - 添加分钟
- `addMonths(date, months)` - 添加月数
- `addYears(date, years)` - 添加年数

### 时间差计算
- `diffDays(date1, date2)` - 计算天数差
- `diffHours(date1, date2)` - 计算小时差
- `diffMinutes(date1, date2)` - 计算分钟差
- `diffSeconds(date1, date2)` - 计算秒数差

### 日期判断
- `isToday(date)` - 判断是否为今天
- `isYesterday(date)` - 判断是否为昨天
- `isTomorrow(date)` - 判断是否为明天
- `isSameDay(date1, date2)` - 判断是否为同一天
- `isInRange(date, startDate, endDate)` - 判断日期是否在范围内

### 日期边界
- `startOfDay(date)` - 获取一天的开始时间
- `endOfDay(date)` - 获取一天的结束时间
- `startOfWeek(date, weekStartsOn?)` - 获取一周的开始时间
- `endOfWeek(date, weekStartsOn?)` - 获取一周的结束时间
- `startOfMonth(date)` - 获取一月的开始时间
- `endOfMonth(date)` - 获取一月的结束时间
- `startOfYear(date)` - 获取一年的开始时间
- `endOfYear(date)` - 获取一年的结束时间

