/**
 * 字符串工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "字符串工具 - DWeb 框架文档",
  description: "DWeb 框架的字符串处理工具函数，提供字符串格式转换等功能",
};

export default function StringPage() {
  const quickStartCode = `import {
  capitalize,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  kebabToCamel,
} from "@dreamer/dweb/utils";

// 首字母大写
capitalize("hello world"); // "Hello world"

// 转换为驼峰格式
toCamelCase("hello-world"); // "helloWorld"

// 转换为短横线格式
toKebabCase("helloWorld"); // "hello-world"

// 转换为下划线格式
toSnakeCase("helloWorld"); // "hello_world"`;

  const capitalizeCode = `import { capitalize } from "@dreamer/dweb/utils";

capitalize("hello");     // "Hello"
capitalize("HELLO");     // "Hello"
capitalize("hello world"); // "Hello world"
capitalize("");          // ""`;

  const toCamelCaseCode = `import { toCamelCase } from "@dreamer/dweb/utils";

toCamelCase("hello-world");      // "helloWorld"
toCamelCase("hello_world");      // "helloWorld"
toCamelCase("hello world");      // "helloWorld"
toCamelCase("hello-world-test"); // "helloWorldTest"`;

  const toKebabCaseCode = `import { toKebabCase } from "@dreamer/dweb/utils";

toKebabCase("helloWorld");      // "hello-world"
toKebabCase("hello_world");      // "hello-world"
toKebabCase("hello world");     // "hello-world"
toKebabCase("HelloWorld");      // "hello-world"`;

  const toSnakeCaseCode = `import { toSnakeCase } from "@dreamer/dweb/utils";

toSnakeCase("helloWorld");      // "hello_world"
toSnakeCase("hello-world");     // "hello_world"
toSnakeCase("hello world");     // "hello_world"
toSnakeCase("HelloWorld");      // "hello_world"`;

  const kebabToCamelCode = `import { kebabToCamel } from "@dreamer/dweb/utils";

kebabToCamel("hello-world"); // "helloWorld"`;

  const componentExampleCode =
    `import { toCamelCase, toKebabCase } from "@dreamer/dweb/utils";

// 从文件名生成组件名
const fileName = "user-profile";
const componentName = toCamelCase(fileName);
// "userProfile" -> UserProfile

// 从组件名生成 CSS 类名
const componentName = "UserProfile";
const className = toKebabCase(componentName);
// "user-profile"`;

  const apiRouteExampleCode =
    `import { toKebabCase, toSnakeCase } from "@dreamer/dweb/utils";

// 从函数名生成路由路径
const functionName = "getUserProfile";
const routePath = toKebabCase(functionName);
// "/api/get-user-profile"

// 从函数名生成数据库表名
const functionName = "getUserProfile";
const tableName = toSnakeCase(functionName);
// "get_user_profile"`;

  const formFieldExampleCode =
    `import { toCamelCase, toSnakeCase } from "@dreamer/dweb/utils";

// 从 HTML 表单字段名转换为对象属性名
const fieldName = "user-name";
const propertyName = toCamelCase(fieldName);
// "userName"

// 从对象属性名转换为数据库字段名
const propertyName = "userName";
const dbFieldName = toSnakeCase(propertyName);
// "user_name"`;

  const apiCode = `// 首字母大写
function capitalize(str: string): string

// 转换为驼峰格式
function toCamelCase(str: string): string

// 转换为短横线格式
function toKebabCase(str: string): string

// 转换为下划线格式
function toSnakeCase(str: string): string

// 短横线转驼峰（已废弃）
function kebabToCamel(kebabCase: string): string`;

  const content = {
    title: "字符串工具",
    description:
      "提供字符串转换、格式化等工具函数，用于处理字符串格式转换。所有函数在服务端和客户端都可用。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "字符串转换",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "首字母大写",
            blocks: [
              {
                type: "text",
                content: "将字符串的首字母转换为大写，其余字母转换为小写。",
              },
              {
                type: "code",
                code: capitalizeCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `str`: 字符串\n\n**返回值：** 转换后的字符串",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "转换为驼峰格式",
            blocks: [
              {
                type: "text",
                content:
                  "将短横线、下划线或空格分隔的字符串转换为驼峰格式（camelCase）。",
              },
              {
                type: "code",
                code: toCamelCaseCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `str`: 字符串\n\n**返回值：** 驼峰格式的字符串",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "转换为短横线格式",
            blocks: [
              {
                type: "text",
                content:
                  "将驼峰、下划线或空格分隔的字符串转换为短横线格式（kebab-case）。",
              },
              {
                type: "code",
                code: toKebabCaseCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `str`: 字符串\n\n**返回值：** 短横线格式的字符串",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "转换为下划线格式",
            blocks: [
              {
                type: "text",
                content:
                  "将驼峰、短横线或空格分隔的字符串转换为下划线格式（snake_case）。",
              },
              {
                type: "code",
                code: toSnakeCaseCode,
                language: "typescript",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `str`: 字符串\n\n**返回值：** 下划线格式的字符串",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "短横线转驼峰（已废弃）",
            blocks: [
              {
                type: "code",
                code: kebabToCamelCode,
                language: "typescript",
              },
              {
                type: "alert",
                level: "warning",
                content: "此函数已废弃，请使用 `toCamelCase` 代替。",
              },
              {
                type: "text",
                content:
                  "**参数：**\n- `kebabCase`: 短横线格式的字符串\n\n**返回值：** 驼峰格式的字符串",
              },
            ],
          },
        ],
      },
      {
        title: "使用示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "组件名称转换",
            blocks: [
              {
                type: "code",
                code: componentExampleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "API 路由名称转换",
            blocks: [
              {
                type: "code",
                code: apiRouteExampleCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "表单字段名称转换",
            blocks: [
              {
                type: "code",
                code: formFieldExampleCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiCode,
            language: "typescript",
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
