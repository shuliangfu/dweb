## 表格输出工具

### 基本表格

```typescript
import { table } from "@dreamer/dweb/console";

const data = [
  { name: "Alice", age: 25, city: "Beijing" },
  { name: "Bob", age: 30, city: "Shanghai" },
  { name: "Charlie", age: 35, city: "Guangzhou" },
];

table(data, [
  { header: "姓名", width: 15, align: "left" },
  { header: "年龄", width: 10, align: "right" },
  { header: "城市", width: 0, align: "left" },
], {
  border: true,
  borderStyle: "single",
  header: true,
});
```

### 键值对表格

```typescript
import { keyValueTable } from "@dreamer/dweb/console";

keyValueTable({
  "版本": "1.0.0",
  "作者": "DWeb Team",
  "许可证": "MIT",
  "仓库": "https://github.com/shuliangfu/dweb",
});
```

### 进度条

```typescript
import { progressBar } from "@dreamer/dweb/console";

// 显示进度条
for (let i = 0; i <= 100; i += 10) {
  progressBar(i, 100, 30, "处理中");
  await new Promise((resolve) => setTimeout(resolve, 200));
}
```
