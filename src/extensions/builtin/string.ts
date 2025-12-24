/**
 * String 内置扩展
 * 为 String 类型提供实用的扩展方法
 */

import { registerExtension } from '../registry.ts';

/**
 * 初始化 String 扩展
 * 注册所有 String 类型的扩展方法
 */
export function initStringExtensions(): void {
  /**
   * 首字母大写
   * 将字符串的首字母转换为大写，其余字母转换为小写
   * 
   * @example
   * ```typescript
   * "hello world".capitalize(); // "Hello world"
   * "HELLO".capitalize(); // "Hello"
   * "".capitalize(); // ""
   * ```
   */
  registerExtension({
    name: 'capitalize',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      if (this.length === 0) return this;
      return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
    },
    description: '将字符串首字母大写，其余字母小写',
  });

  /**
   * 转换为驼峰格式
   * 将短横线、下划线或空格分隔的字符串转换为驼峰格式（camelCase）
   * 
   * @example
   * ```typescript
   * "hello-world".toCamelCase(); // "helloWorld"
   * "hello_world".toCamelCase(); // "helloWorld"
   * "hello world".toCamelCase(); // "helloWorld"
   * "get-user-list".toCamelCase(); // "getUserList"
   * ```
   */
  registerExtension({
    name: 'toCamelCase',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    },
    description: '将字符串转换为驼峰格式（camelCase）',
  });

  /**
   * 转换为短横线格式
   * 将驼峰、下划线或空格分隔的字符串转换为短横线格式（kebab-case）
   * 
   * @example
   * ```typescript
   * "helloWorld".toKebabCase(); // "hello-world"
   * "Hello World".toKebabCase(); // "hello-world"
   * "getUserList".toKebabCase(); // "get-user-list"
   * ```
   */
  registerExtension({
    name: 'toKebabCase',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    },
    description: '将字符串转换为短横线格式（kebab-case）',
  });

  /**
   * 转换为下划线格式
   * 将驼峰、短横线或空格分隔的字符串转换为下划线格式（snake_case）
   * 
   * @example
   * ```typescript
   * "helloWorld".toSnakeCase(); // "hello_world"
   * "hello-world".toSnakeCase(); // "hello_world"
   * "getUserList".toSnakeCase(); // "get_user_list"
   * ```
   */
  registerExtension({
    name: 'toSnakeCase',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    },
    description: '将字符串转换为下划线格式（snake_case）',
  });

  /**
   * 转换为标题格式
   * 将字符串中每个单词的首字母大写，其余字母小写
   * 
   * @example
   * ```typescript
   * "hello world".toTitleCase(); // "Hello World"
   * "hello-world".toTitleCase(); // "Hello-World"
   * "THE QUICK BROWN FOX".toTitleCase(); // "The Quick Brown Fox"
   * ```
   */
  registerExtension({
    name: 'toTitleCase',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    },
    description: '将字符串转换为标题格式（Title Case）',
  });

  /**
   * 移除首尾空白并压缩中间空白
   * 移除字符串首尾的空白字符，并将中间的多个连续空白字符压缩为单个空格
   * 
   * @example
   * ```typescript
   * "  hello    world  ".trimAll(); // "hello world"
   * "  multiple    spaces   here  ".trimAll(); // "multiple spaces here"
   * ```
   */
  registerExtension({
    name: 'trimAll',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this.trim().replace(/\s+/g, ' ');
    },
    description: '移除首尾空白并压缩中间空白为单个空格',
  });

  /**
   * 检查是否为空字符串
   * 检查字符串在去除首尾空白后是否为空
   * 
   * @returns {boolean} 如果字符串为空或只包含空白字符则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * "".isEmpty(); // true
   * "   ".isEmpty(); // true
   * "hello".isEmpty(); // false
   * "  hello  ".isEmpty(); // false
   * ```
   */
  registerExtension({
    name: 'isEmpty',
    type: 'method',
    target: 'String',
    handler: function (this: string): boolean {
      return this.trim().length === 0;
    },
    description: '检查字符串是否为空（去除空白后）',
  });

  /**
   * 检查是否为有效邮箱
   * 使用正则表达式验证字符串是否符合邮箱地址格式
   * 
   * @returns {boolean} 如果是有效的邮箱地址则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * "user@example.com".isEmail(); // true
   * "invalid.email".isEmail(); // false
   * "test@domain".isEmail(); // false
   * "user.name@example.co.uk".isEmail(); // true
   * ```
   */
  registerExtension({
    name: 'isEmail',
    type: 'method',
    target: 'String',
    handler: function (this: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(this);
    },
    description: '检查字符串是否为有效的邮箱地址',
  });

  /**
   * 检查是否为有效URL
   * 使用 URL 构造函数验证字符串是否为有效的 URL 地址
   * 
   * @returns {boolean} 如果是有效的 URL 则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * "https://example.com".isUrl(); // true
   * "http://localhost:3000".isUrl(); // true
   * "not-a-url".isUrl(); // false
   * "ftp://files.example.com".isUrl(); // true
   * ```
   */
  registerExtension({
    name: 'isUrl',
    type: 'method',
    target: 'String',
    handler: function (this: string): boolean {
      try {
        new URL(this);
        return true;
      } catch {
        return false;
      }
    },
    description: '检查字符串是否为有效的URL',
  });

  /**
   * 截断字符串
   * 如果字符串长度超过指定长度，则截断并添加后缀
   * 
   * @param {number} length - 最大长度
   * @param {string} [suffix='...'] - 截断后添加的后缀，默认为 "..."
   * @returns {string} 截断后的字符串
   * 
   * @example
   * ```typescript
   * "Hello World".truncate(5); // "Hello..."
   * "Hello World".truncate(11); // "Hello World"
   * "Hello World".truncate(5, ">>"); // "Hello>>"
   * "测试文本内容".truncate(4); // "测试文本..."
   * ```
   */
  registerExtension({
    name: 'truncate',
    type: 'method',
    target: 'String',
    handler: function (this: string, length: number, suffix: string = '...'): string {
      if (this.length <= length) return this;
      return this.slice(0, length) + suffix;
    },
    description: '截断字符串到指定长度，可添加后缀',
  });

  /**
   * 移除HTML标签
   * 移除字符串中的所有 HTML 标签，只保留文本内容
   * 
   * @returns {string} 移除 HTML 标签后的字符串
   * 
   * @example
   * ```typescript
   * "<p>Hello <b>World</b></p>".stripHtml(); // "Hello World"
   * "<div>Content</div>".stripHtml(); // "Content"
   * "No tags".stripHtml(); // "No tags"
   * ```
   */
  registerExtension({
    name: 'stripHtml',
    type: 'method',
    target: 'String',
    handler: function (this: string): string {
      return this.replace(/<[^>]*>/g, '');
    },
    description: '移除字符串中的所有HTML标签',
  });
}

