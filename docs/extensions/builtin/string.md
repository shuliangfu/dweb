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
