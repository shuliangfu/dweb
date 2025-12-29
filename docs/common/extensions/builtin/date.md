## Date 扩展

为 Date 类型提供日期处理相关的扩展方法。

### format()

格式化日期为指定格式的字符串。

```typescript
const date = new Date(2024, 0, 15, 14, 30, 45);
date.format(); // "2024-01-15 14:30:45"
date.format('YYYY-MM-DD'); // "2024-01-15"
date.format('YYYY年MM月DD日'); // "2024年01月15日"
```

支持的占位符：
- `YYYY`: 四位年份
- `MM`: 两位月份（01-12）
- `DD`: 两位日期（01-31）
- `HH`: 两位小时（00-23）
- `mm`: 两位分钟（00-59）
- `ss`: 两位秒数（00-59）

### fromNow()

获取相对时间描述（如：2小时前）。

```typescript
const date = new Date();
date.setHours(date.getHours() - 2);
date.fromNow(); // "2小时前"

const future = new Date();
future.setDate(future.getDate() + 5);
future.fromNow(); // "5天后"
```

### isToday()

检查日期是否为今天。

```typescript
const today = new Date();
today.isToday(); // true

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.isToday(); // false
```

### isYesterday()

检查日期是否为昨天。

```typescript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.isYesterday(); // true
```

### isTomorrow()

检查日期是否为明天。

```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.isTomorrow(); // true
```

### isThisWeek()

检查日期是否在本周（从周日开始到周六结束）。

```typescript
const today = new Date();
today.isThisWeek(); // true

const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
lastWeek.isThisWeek(); // false
```

### isThisMonth()

检查日期是否在本月。

```typescript
const today = new Date();
today.isThisMonth(); // true

const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);
lastMonth.isThisMonth(); // false
```

### isThisYear()

检查日期是否在今年。

```typescript
const today = new Date();
today.isThisYear(); // true

const lastYear = new Date();
lastYear.setFullYear(lastYear.getFullYear() - 1);
lastYear.isThisYear(); // false
```

### startOfDay()

获取当天的开始时间（00:00:00.000）。

```typescript
const date = new Date(2024, 0, 15, 14, 30, 45);
date.startOfDay(); // 2024-01-15 00:00:00.000
```

### endOfDay()

获取当天的结束时间（23:59:59.999）。

```typescript
const date = new Date(2024, 0, 15, 14, 30, 45);
date.endOfDay(); // 2024-01-15 23:59:59.999
```

### addDays()

添加指定天数。

```typescript
const date = new Date(2024, 0, 15);
date.addDays(5); // 2024-01-20
date.addDays(-3); // 2024-01-12
```

### addMonths()

添加指定月数。

```typescript
const date = new Date(2024, 0, 15);
date.addMonths(2); // 2024-03-15
date.addMonths(-1); // 2023-12-15
```

### addYears()

添加指定年数。

```typescript
const date = new Date(2024, 0, 15);
date.addYears(1); // 2025-01-15
date.addYears(-2); // 2022-01-15
```
