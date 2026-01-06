# 性能优化工具

提供性能优化相关的工具函数，包括防抖、节流、批量处理、内存监控等功能。

**环境兼容性：**
- `debounce`、`throttle`、`batchProcess`、`formatMemorySize`：**通用**（服务端和客户端都可用）
- `getMemoryUsage`：**服务端专用**（仅在 Deno 服务端环境可用，客户端调用会抛出异常）

## 快速开始

```typescript
import { debounce, throttle, batchProcess, getMemoryUsage, formatMemorySize } from "@dreamer/dweb/utils/performance";

// 防抖函数
const debouncedSearch = debounce((query: string) => {
  console.log("搜索:", query);
}, 300);

// 节流函数
const throttledScroll = throttle(() => {
  console.log("滚动事件");
}, 100);

// 批量处理
const results = await batchProcess(items, async (item) => {
  return await processItem(item);
}, 10);

// 内存监控
const memory = getMemoryUsage();
console.log(formatMemorySize(memory.heapUsed));
```

## 防抖和节流

### 防抖函数

防抖函数用于优化频繁调用的函数，在指定时间内只执行最后一次调用。

```typescript
import { debounce } from "@dreamer/dweb/utils/performance";

// 搜索输入防抖
const debouncedSearch = debounce((query: string) => {
  // 执行搜索逻辑
  searchAPI(query);
}, 300);

// 使用
input.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});
```

**参数：**
- `func`: 要防抖的函数
- `wait`: 等待时间（毫秒）

**返回值：** 防抖后的函数

### 节流函数

节流函数用于限制函数调用频率，在指定时间内最多执行一次。

```typescript
import { throttle } from "@dreamer/dweb/utils/performance";

// 滚动事件节流
const throttledScroll = throttle(() => {
  // 执行滚动处理逻辑
  updateScrollPosition();
}, 100);

// 使用
window.addEventListener("scroll", throttledScroll);
```

**参数：**
- `func`: 要节流的函数
- `limit`: 时间限制（毫秒）

**返回值：** 节流后的函数

## 批量处理

### 批量处理函数

批量处理函数用于优化大量数据的处理，将数据分批处理以避免内存溢出或性能问题。

```typescript
import { batchProcess } from "@dreamer/dweb/utils/performance";

// 批量处理数据
const items = [/* 大量数据 */];
const results = await batchProcess(
  items,
  async (item) => {
    // 处理单个项目
    return await processItem(item);
  },
  10 // 每批处理 10 个项目
);
```

**参数：**
- `items`: 要处理的数据数组
- `processor`: 处理函数，接收单个项目并返回处理结果
- `batchSize`: 每批处理的数量，默认为 10

**返回值：** Promise，解析为处理结果数组

**使用场景：**
- 批量数据库操作
- 批量 API 请求
- 大量文件处理
- 图片批量处理

## 内存监控

### 获取内存使用情况

获取当前进程的内存使用情况（仅在服务端 Deno 环境中可用）。

```typescript
import { getMemoryUsage } from "@dreamer/dweb/utils/performance";

const memory = getMemoryUsage();
console.log({
  rss: memory.rss,           // 常驻集大小
  heapTotal: memory.heapTotal, // 堆总大小
  heapUsed: memory.heapUsed,   // 已使用堆大小
  external: memory.external,   // 外部内存
});
```

**返回值：** 内存使用情况对象
- `rss`: 常驻集大小（Resident Set Size）
- `heapTotal`: 堆总大小
- `heapUsed`: 已使用堆大小
- `external`: 外部内存

**注意：** 此函数仅在服务端 Deno 环境中可用。在客户端环境调用会抛出异常。

### 格式化内存大小

将字节数格式化为可读的内存大小字符串。

```typescript
import { formatMemorySize } from "@dreamer/dweb/utils/performance";

formatMemorySize(1024);        // "1.00 KB"
formatMemorySize(1048576);    // "1.00 MB"
formatMemorySize(1073741824); // "1.00 GB"
```

**参数：**
- `bytes`: 字节数

**返回值：** 格式化后的内存大小字符串（如 "1.00 MB"）

## 使用示例

### 搜索输入防抖

```typescript
import { debounce } from "@dreamer/dweb/utils/performance";

const searchInput = document.getElementById("search");

const debouncedSearch = debounce(async (query: string) => {
  if (query.length < 2) return;

  const results = await fetch(`/api/search?q=${query}`)
    .then(res => res.json());

  renderResults(results);
}, 300);

searchInput.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});
```

### 窗口大小调整节流

```typescript
import { throttle } from "@dreamer/dweb/utils/performance";

const throttledResize = throttle(() => {
  // 更新布局
  updateLayout();
}, 200);

window.addEventListener("resize", throttledResize);
```

### 批量数据处理

```typescript
import { batchProcess } from "@dreamer/dweb/utils/performance";

// 批量上传文件
const files = [/* 文件列表 */];
const uploadResults = await batchProcess(
  files,
  async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    return await response.json();
  },
  5 // 每批上传 5 个文件
);
```

### 内存监控示例

```typescript
import { getMemoryUsage, formatMemorySize } from "@dreamer/dweb/utils/performance";

// 定期监控内存使用
setInterval(() => {
  const memory = getMemoryUsage();
  console.log(`堆内存使用: ${formatMemorySize(memory.heapUsed)}`);
  console.log(`总内存: ${formatMemorySize(memory.heapTotal)}`);
}, 5000);
```

## API 参考

### debounce

```typescript
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void
```

防抖函数，在指定时间内只执行最后一次调用。

### throttle

```typescript
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void
```

节流函数，限制函数调用频率。

### batchProcess

```typescript
function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  batchSize?: number,
): Promise<R[]>
```

批量处理函数，将数据分批处理。

### getMemoryUsage

```typescript
function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}
```

获取内存使用情况（仅在服务端可用）。

### formatMemorySize

```typescript
function formatMemorySize(bytes: number): string
```

格式化内存大小为可读字符串。
