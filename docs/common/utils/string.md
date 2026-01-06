# 字符串工具

提供字符串转换、格式化等工具函数，用于处理字符串格式转换。

**环境兼容性：** 通用（服务端和客户端都可用）

## 快速开始

```typescript
import {
  capitalize,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  kebabToCamel,
} from "@dreamer/dweb/utils/string";

// 首字母大写
capitalize("hello world"); // "Hello world"

// 转换为驼峰格式
toCamelCase("hello-world"); // "helloWorld"

// 转换为短横线格式
toKebabCase("helloWorld"); // "hello-world"

// 转换为下划线格式
toSnakeCase("helloWorld"); // "hello_world"
```

## 字符串转换

### 首字母大写

将字符串的首字母转换为大写，其余字母转换为小写。

```typescript
import { capitalize } from "@dreamer/dweb/utils/string";

capitalize("hello");     // "Hello"
capitalize("HELLO");     // "Hello"
capitalize("hello world"); // "Hello world"
capitalize("");          // ""
```

**参数：**
- `str`: 字符串

**返回值：** 转换后的字符串

### 转换为驼峰格式

将短横线、下划线或空格分隔的字符串转换为驼峰格式（camelCase）。

```typescript
import { toCamelCase } from "@dreamer/dweb/utils/string";

toCamelCase("hello-world");      // "helloWorld"
toCamelCase("hello_world");      // "helloWorld"
toCamelCase("hello world");      // "helloWorld"
toCamelCase("hello-world-test"); // "helloWorldTest"
```

**参数：**
- `str`: 字符串

**返回值：** 驼峰格式的字符串

### 转换为短横线格式

将驼峰、下划线或空格分隔的字符串转换为短横线格式（kebab-case）。

```typescript
import { toKebabCase } from "@dreamer/dweb/utils/string";

toKebabCase("helloWorld");      // "hello-world"
toKebabCase("hello_world");     // "hello-world"
toKebabCase("hello world");     // "hello-world"
toKebabCase("HelloWorld");      // "hello-world"
```

**参数：**
- `str`: 字符串

**返回值：** 短横线格式的字符串

### 转换为下划线格式

将驼峰、短横线或空格分隔的字符串转换为下划线格式（snake_case）。

```typescript
import { toSnakeCase } from "@dreamer/dweb/utils/string";

toSnakeCase("helloWorld");      // "hello_world"
toSnakeCase("hello-world");     // "hello_world"
toSnakeCase("hello world");     // "hello_world"
toSnakeCase("HelloWorld");      // "hello_world"
```

**参数：**
- `str`: 字符串

**返回值：** 下划线格式的字符串

### 短横线转驼峰（已废弃）

将短横线格式转换为驼峰格式。

```typescript
import { kebabToCamel } from "@dreamer/dweb/utils/string";

kebabToCamel("hello-world"); // "helloWorld"
```

**注意：** 此函数已废弃，请使用 `toCamelCase` 代替。

**参数：**
- `kebabCase`: 短横线格式的字符串

**返回值：** 驼峰格式的字符串

## 使用示例

### 组件名称转换

```typescript
import { toCamelCase, toKebabCase } from "@dreamer/dweb/utils/string";

// 从文件名生成组件名
const fileName = "user-profile";
const componentName = toCamelCase(fileName);
// "userProfile" -> UserProfile

// 从组件名生成 CSS 类名
const componentName = "UserProfile";
const className = toKebabCase(componentName);
// "user-profile"
```

### API 路由名称转换

```typescript
import { toKebabCase, toSnakeCase } from "@dreamer/dweb/utils/string";

// 从函数名生成路由路径
const functionName = "getUserProfile";
const routePath = toKebabCase(functionName);
// "/api/get-user-profile"

// 从函数名生成数据库表名
const functionName = "getUserProfile";
const tableName = toSnakeCase(functionName);
// "get_user_profile"
```

### 表单字段名称转换

```typescript
import { toCamelCase, toSnakeCase } from "@dreamer/dweb/utils/string";

// 从 HTML 表单字段名转换为对象属性名
const fieldName = "user-name";
const propertyName = toCamelCase(fieldName);
// "userName"

// 从对象属性名转换为数据库字段名
const propertyName = "userName";
const dbFieldName = toSnakeCase(propertyName);
// "user_name"
```

## API 参考

### capitalize

```typescript
function capitalize(str: string): string
```

首字母大写，其余字母小写。

### toCamelCase

```typescript
function toCamelCase(str: string): string
```

转换为驼峰格式（camelCase）。

### toKebabCase

```typescript
function toKebabCase(str: string): string
```

转换为短横线格式（kebab-case）。

### toSnakeCase

```typescript
function toSnakeCase(str: string): string
```

转换为下划线格式（snake_case）。

### kebabToCamel

```typescript
function kebabToCamel(kebabCase: string): string
```

短横线格式转驼峰格式（已废弃，请使用 `toCamelCase`）。
