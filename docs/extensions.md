# 扩展系统

DWeb 框架提供了强大的扩展系统，为原生类型（String、Array、Date、Object、Request）提供实用的扩展方法，以及丰富的辅助函数库，帮助开发者提高开发效率。

## 目录结构

```
src/extensions/
├── mod.ts              # 统一导出入口
├── types.ts            # 扩展类型定义
├── registry.ts         # 扩展注册器
├── builtin/            # 内置扩展
│   ├── string.ts       # String 扩展
│   ├── array.ts        # Array 扩展
│   ├── date.ts         # Date 扩展
│   ├── object.ts       # Object 扩展
│   └── request.ts      # Request 扩展
├── helpers/            # 辅助函数
│   ├── validation.ts   # 验证函数
│   ├── format.ts       # 格式化函数
│   ├── crypto.ts       # 加密函数
│   └── cache.ts        # 缓存函数
└── user/               # 用户自定义扩展
    └── index.ts
```

## 快速开始

### 初始化扩展系统

在使用扩展方法之前，需要先初始化扩展系统：

```typescript
import { setupExtensions } from "@dreamer/dweb/extensions";

// 初始化所有内置扩展
setupExtensions();
```

### 使用扩展方法

初始化后，可以直接在原生类型上使用扩展方法：

```typescript
// String 扩展
"hello world".capitalize(); // "Hello world"
"hello-world".toCamelCase(); // "helloWorld"
"test@example.com".isEmail(); // true

// Array 扩展
[1, 2, 3, 2, 1].unique(); // [1, 2, 3]
[{ id: 1 }, { id: 2 }, { id: 1 }].uniqueBy('id'); // [{ id: 1 }, { id: 2 }]

// Date 扩展
new Date().format("YYYY-MM-DD"); // "2024-01-15"
new Date().fromNow(); // "2小时前"
new Date().isToday(); // true

// Object 扩展
const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
user.pick(['name', 'email']); // { name: 'Alice', email: 'alice@example.com' }
user.omit(['id']); // { name: 'Alice', email: 'alice@example.com' }
```

### 使用辅助函数

辅助函数可以直接导入使用，无需初始化：

```typescript
import { validateEmail, formatCurrency, sha256, setCache } from "@dreamer/dweb/extensions";

// 验证函数
validateEmail("test@example.com"); // true

// 格式化函数
formatCurrency(1234.56); // "¥1,234.56"

// 加密函数
const hash = await sha256("hello world");

// 缓存函数
setCache("key", "value", 3600); // 缓存1小时
```

## String 扩展

为 String 类型提供字符串处理相关的扩展方法。

### capitalize()

将字符串首字母大写，其余字母小写。

```typescript
"hello world".capitalize(); // "Hello world"
"HELLO".capitalize(); // "Hello"
"".capitalize(); // ""
```

### toCamelCase()

将字符串转换为驼峰格式（camelCase）。

```typescript
"hello-world".toCamelCase(); // "helloWorld"
"hello_world".toCamelCase(); // "helloWorld"
"hello world".toCamelCase(); // "helloWorld"
"get-user-list".toCamelCase(); // "getUserList"
```

### toKebabCase()

将字符串转换为短横线格式（kebab-case）。

```typescript
"helloWorld".toKebabCase(); // "hello-world"
"Hello World".toKebabCase(); // "hello-world"
"getUserList".toKebabCase(); // "get-user-list"
```

### toSnakeCase()

将字符串转换为下划线格式（snake_case）。

```typescript
"helloWorld".toSnakeCase(); // "hello_world"
"hello-world".toSnakeCase(); // "hello_world"
"getUserList".toSnakeCase(); // "get_user_list"
```

### toTitleCase()

将字符串转换为标题格式（Title Case）。

```typescript
"hello world".toTitleCase(); // "Hello World"
"hello-world".toTitleCase(); // "Hello-World"
"THE QUICK BROWN FOX".toTitleCase(); // "The Quick Brown Fox"
```

### trimAll()

移除首尾空白并压缩中间空白为单个空格。

```typescript
"  hello    world  ".trimAll(); // "hello world"
"  multiple    spaces   here  ".trimAll(); // "multiple spaces here"
```

### isEmpty()

检查字符串是否为空（去除空白后）。

```typescript
"".isEmpty(); // true
"   ".isEmpty(); // true
"hello".isEmpty(); // false
"  hello  ".isEmpty(); // false
```

### isEmail()

检查字符串是否为有效的邮箱地址。

```typescript
"user@example.com".isEmail(); // true
"invalid.email".isEmail(); // false
"test@domain".isEmail(); // false
"user.name@example.co.uk".isEmail(); // true
```

### isUrl()

检查字符串是否为有效的 URL。

```typescript
"https://example.com".isUrl(); // true
"http://localhost:3000".isUrl(); // true
"not-a-url".isUrl(); // false
"ftp://files.example.com".isUrl(); // true
```

### truncate()

截断字符串到指定长度，可添加后缀。

```typescript
"Hello World".truncate(5); // "Hello..."
"Hello World".truncate(11); // "Hello World"
"Hello World".truncate(5, ">>"); // "Hello>>"
"测试文本内容".truncate(4); // "测试文本..."
```

### stripHtml()

移除字符串中的所有 HTML 标签。

```typescript
"<p>Hello <b>World</b></p>".stripHtml(); // "Hello World"
"<div>Content</div>".stripHtml(); // "Content"
"No tags".stripHtml(); // "No tags"
```

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

## Request 扩展

为 Request 类型提供请求处理相关的扩展方法。

### getQuery()

从请求 URL 中获取查询参数。

```typescript
// URL: /api/users?page=1&limit=10
request.getQuery('page'); // "1"
request.getQuery('limit'); // "10"
request.getQuery(); // { page: "1", limit: "10" }
request.getQuery('sort'); // null
```

### getParams()

获取路由路径中的参数（需要在路由系统中设置 params）。

```typescript
// 路由: /api/users/:id/posts/:postId
// 请求: /api/users/123/posts/456
// 如果路由系统设置了 params
request.getParams(); // { id: "123", postId: "456" }
```

### isAjax()

检查请求是否为 AJAX 请求。

```typescript
// 设置了 X-Requested-With: XMLHttpRequest 的请求
request.isAjax(); // true

// Content-Type 为 application/json 的请求
request.isAjax(); // true

// 普通页面请求
request.isAjax(); // false
```

### isMobile()

检查请求是否来自移动设备。

```typescript
// User-Agent 包含 Mobile、Android、iPhone 或 iPad
request.isMobile(); // true

// 普通桌面浏览器
request.isMobile(); // false
```

### getIp()

从请求头中获取客户端真实IP地址。

```typescript
// 如果请求头包含 X-Forwarded-For: 192.168.1.1, 10.0.0.1
request.getIp(); // "192.168.1.1"（取第一个IP）

// 如果请求头包含 X-Real-IP: 192.168.1.1
request.getIp(); // "192.168.1.1"

// 如果都没有，返回 'unknown'
request.getIp(); // "unknown"
```

### isMethod()

检查请求的 HTTP 方法是否与指定方法匹配。

```typescript
// GET 请求
request.isMethod('GET'); // true
request.isMethod('get'); // true（不区分大小写）
request.isMethod('POST'); // false

// POST 请求
request.isMethod('POST'); // true
request.isMethod('PUT'); // false
```

### getJson()

获取请求体并解析为 JSON 对象。

```typescript
// 请求体: { "name": "Alice", "age": 30 }
const data = await request.getJson();
// data = { name: "Alice", age: 30 }

// 如果请求体不是有效的 JSON
const invalid = await request.getJson();
// invalid = null
```

### getText()

获取请求体的文本内容。

```typescript
// 请求体: "Hello World"
const text = await request.getText();
// text = "Hello World"

// 如果请求体为空或获取失败
const empty = await request.getText();
// empty = ""
```

## 辅助函数

### 验证函数

提供常用的数据验证函数。

```typescript
import {
  validateEmail,
  validateUrl,
  validatePhone,
  validateIdCard,
  validatePassword,
  validateRange,
  validateLength,
  validateNumber,
  validateInteger,
  validatePositive,
  validateEmpty,
} from "@dreamer/dweb/extensions";

// 验证邮箱
validateEmail("test@example.com"); // true

// 验证URL
validateUrl("https://example.com"); // true

// 验证手机号（中国）
validatePhone("13800138000"); // true

// 验证身份证号（中国）
validateIdCard("110101199001011234"); // true

// 验证密码强度
validatePassword("MyP@ssw0rd", 8);
// { valid: true, strength: 'strong', message: '密码强度强' }

// 验证数字范围
validateRange(50, 0, 100); // true

// 验证字符串长度
validateLength("hello", 3, 10); // true

// 验证是否为空值
validateEmpty(""); // true
validateEmpty([]); // true
validateEmpty({}); // true
```

### 格式化函数

提供常用的数据格式化函数。

```typescript
import {
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatPercent,
  formatPhone,
  formatIdCard,
  formatBankCard,
  formatText,
} from "@dreamer/dweb/extensions";

// 格式化数字（添加千分位）
formatNumber(1234567.89, 2); // "1,234,567.89"

// 格式化货币
formatCurrency(1234.56); // "¥1,234.56"
formatCurrency(1234.56, '$', 2); // "$1,234.56"

// 格式化文件大小
formatFileSize(1024); // "1 KB"
formatFileSize(1048576); // "1 MB"

// 格式化日期
formatDate(new Date(), "YYYY-MM-DD"); // "2024-01-15"

// 格式化相对时间
formatRelativeTime(new Date(Date.now() - 3600000)); // "1小时前"

// 格式化百分比
formatPercent(75, 100); // "75.00%"

// 格式化手机号（隐藏中间4位）
formatPhone("13800138000"); // "138****8000"

// 格式化身份证号（隐藏中间部分）
formatIdCard("110101199001011234"); // "110***********1234"

// 格式化银行卡号（隐藏中间部分）
formatBankCard("6222021234567890123"); // "6222 **** **** 0123"

// 格式化文本（截断）
formatText("Hello World", 5); // "Hello..."
```

### 加密函数

提供常用的加密、哈希、签名等功能。

```typescript
import {
  randomString,
  generateUUID,
  sha256,
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  simpleEncrypt,
  simpleDecrypt,
  sign,
  verifySignature,
} from "@dreamer/dweb/extensions";

// 生成随机字符串
randomString(32); // "aB3dEf9gHiJkLmNoPqRsTuVwXyZ0123456789"

// 生成UUID
generateUUID(); // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"

// SHA-256 哈希
const hash = await sha256("hello world");

// Base64 编码/解码
const encoded = base64Encode("Hello World"); // "SGVsbG8gV29ybGQ="
const decoded = base64Decode(encoded); // "Hello World"

// URL 安全 Base64
const urlEncoded = base64UrlEncode("Hello World");
const urlDecoded = base64UrlDecode(urlEncoded);

// 简单加密/解密（XOR，仅用于简单场景）
const encrypted = simpleEncrypt("data", "key");
const decrypted = simpleDecrypt(encrypted, "key");

// 生成签名（HMAC-SHA256）
const signature = await sign("data", "secret");

// 验证签名
const isValid = await verifySignature("data", signature, "secret");
```

### 缓存函数

提供简单的内存缓存功能。

```typescript
import {
  setCache,
  getCache,
  hasCache,
  deleteCache,
  clearCache,
  cached,
} from "@dreamer/dweb/extensions";

// 设置缓存（TTL 为秒）
setCache("user:1", { id: 1, name: "Alice" }, 3600); // 缓存1小时

// 获取缓存
const user = getCache<{ id: number; name: string }>("user:1");

// 检查缓存是否存在
hasCache("user:1"); // true

// 删除缓存
deleteCache("user:1");

// 清空所有缓存
clearCache();

// 使用缓存装饰器
class UserService {
  @cached(3600) // 缓存1小时
  async getUser(id: number) {
    // 从数据库获取用户
    return { id, name: "Alice" };
  }

  @cached(1800, (id: number) => `user:${id}`) // 自定义缓存键
  async getUserById(id: number) {
    return { id, name: "Alice" };
  }
}
```

## 自定义扩展

### 注册自定义扩展

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

### 注册辅助函数

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

### 启用/禁用扩展

你可以动态启用或禁用扩展：

```typescript
import { enableExtension, disableExtension } from "@dreamer/dweb/extensions";

// 禁用扩展
disableExtension('capitalize');

// 启用扩展
enableExtension('capitalize');
```

## API 参考

### setupExtensions()

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

### initExtensions()

初始化所有内置扩展（不包含用户扩展）。

```typescript
function initExtensions(): void;
```

### registerExtension()

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

### extensionRegistry

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

## 注意事项

1. **初始化顺序**：在使用扩展方法之前，必须先调用 `setupExtensions()` 初始化扩展系统。

2. **类型安全**：扩展方法在运行时添加到原型上，TypeScript 可能无法识别。如果需要类型支持，可以使用类型声明合并。

3. **性能考虑**：扩展方法会修改原生类型的原型，虽然性能影响很小，但在大量使用时应考虑性能。

4. **兼容性**：扩展方法可能与某些库或框架冲突，建议在项目启动时统一初始化。

5. **缓存装饰器**：`@cached` 装饰器仅适用于类方法，不适用于普通函数。

## 相关文档

- [核心模块](./core.md) - 框架核心功能
- [中间件](./middleware.md) - 中间件系统
- [插件](./plugins.md) - 插件系统
- [控制台工具](./console.md) - 命令行工具

