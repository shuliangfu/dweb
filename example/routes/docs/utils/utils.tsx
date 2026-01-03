/**
 * 工具函数库文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "工具函数库 - DWeb 框架文档",
  description: "DWeb 框架的常用工具函数，包括防抖、节流、深拷贝、对象操作等",
};

export default function UtilsPage() {
  const quickStartCode =
    `import { debounce, deepClone, isEmpty, pick } from "@dreamer/dweb/utils";

// 防抖函数
const debouncedSearch = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 深拷贝
const cloned = deepClone(complexObject);

// 空值判断
if (isEmpty(value)) {
  // 处理空值
}

// 对象选择
const selected = pick(user, ['name', 'email']);`;

  const debounceCode = `import { debounce } from "@dreamer/dweb/utils";

const debouncedSearch = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 快速调用多次，只会在停止调用 300ms 后执行一次
debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc'); // 只会执行这一次`;

  const throttleCode = `import { throttle } from "@dreamer/dweb/utils";

const throttledScroll = throttle(() => {
  console.log('滚动事件');
}, 100);

// 频繁触发，但每 100ms 最多执行一次
window.addEventListener('scroll', throttledScroll);`;

  const deepCloneCode = `import { deepClone } from "@dreamer/dweb/utils";

const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
const cloned = deepClone(obj);
cloned.b.c = 5;
// obj.b.c 仍然是 2，因为进行了深度克隆

const date = new Date();
const clonedDate = deepClone(date);
// clonedDate 是新的 Date 对象`;

  const deepMergeCode = `import { deepMerge } from "@dreamer/dweb/utils";

const obj1 = { a: 1, b: { c: 2, d: 3 } };
const obj2 = { b: { c: 4, e: 5 }, f: 6 };
const merged = deepMerge(obj1, obj2);
// { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }`;

  const pickOmitCode = `import { pick, omit } from "@dreamer/dweb/utils";

const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };

// 选择指定键
const selected = pick(user, ['name', 'email']);
// { name: 'Alice', email: 'alice@example.com' }

// 排除指定键
const omitted = omit(user, ['id', 'age']);
// { name: 'Alice', email: 'alice@example.com' }`;

  const getValueCode = `import { getValue, set } from "@dreamer/dweb/utils";

const user = { profile: { name: 'Alice' } };

// 获取嵌套属性
getValue(user, 'profile.name'); // 'Alice'
getValue(user, 'profile.age', 0); // 0（路径不存在，返回默认值）
getValue(user, ['profile', 'name']); // 'Alice'（使用数组路径）

// 设置嵌套属性
const user2 = {};
set(user2, 'profile.name', 'Alice');
// { profile: { name: 'Alice' } }

set(user2, ['profile', 'age'], 30);
// { profile: { name: 'Alice', age: 30 } }`;

  const isEmptyCode = `import { isEmpty } from "@dreamer/dweb/utils";

isEmpty(null); // true
isEmpty(undefined); // true
isEmpty(''); // true
isEmpty('   '); // true
isEmpty([]); // true
isEmpty({}); // true
isEmpty(0); // false
isEmpty(false); // false`;

  const isEqualCode = `import { isEqual } from "@dreamer/dweb/utils";

isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
isEqual([1, 2, 3], [1, 2, 3]); // true
isEqual({ a: 1 }, { a: 2 }); // false`;

  const asyncCode = `import { sleep, retry } from "@dreamer/dweb/utils";

// 延迟函数
await sleep(1000); // 等待 1 秒
console.log('1 秒后执行');

// 重试函数包装器
const result = await retry(
  () => fetch('/api/data'),
  {
    times: 3,           // 重试次数
    delay: 1000,        // 重试延迟（毫秒）
    onRetry: (error, attempt) => {
      console.log(\`重试第 \${attempt} 次\`);
    },
  }
);`;

  const apiCode = `// 防抖和节流
- debounce<T>(func, wait) - 防抖函数
- throttle<T>(func, limit) - 节流函数

// 对象操作
- deepClone<T>(value) - 深拷贝
- deepMerge<T>(target, source) - 深度合并
- pick<T, K>(obj, keys) - 选择指定键
- omit<T, K>(obj, keys) - 排除指定键
- getValue<T>(obj, path, defaultValue?) - 安全获取嵌套属性
- set<T>(obj, path, value) - 安全设置嵌套属性

// 值判断
- isEmpty(value) - 判断是否为空
- isEqual(a, b) - 深度比较是否相等

// 异步工具
- sleep(ms) - 延迟函数
- retry<T>(fn, options?) - 重试函数包装器`;

  const content = {
    title: "工具函数库",
    description:
      "提供常用的工具函数，包括防抖、节流、深拷贝、对象操作等。所有函数在服务端和客户端都可用。",
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
        title: "防抖和节流",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "防抖函数",
            blocks: [
              {
                type: "text",
                content: "限制函数调用频率，在指定时间内只执行最后一次调用。",
              },
              {
                type: "code",
                code: debounceCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "节流函数",
            blocks: [
              {
                type: "text",
                content: "限制函数执行频率，在指定时间内最多执行一次。",
              },
              {
                type: "code",
                code: throttleCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "对象操作",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "深拷贝",
            blocks: [
              {
                type: "text",
                content:
                  "深度克隆对象，包括嵌套对象和数组，返回完全独立的新对象。",
              },
              {
                type: "code",
                code: deepCloneCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "深度合并",
            blocks: [
              {
                type: "text",
                content: "深度合并两个对象，嵌套对象会递归合并。",
              },
              {
                type: "code",
                code: deepMergeCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "对象选择",
            blocks: [
              {
                type: "text",
                content: "从对象中选择或排除指定键。",
              },
              {
                type: "code",
                code: pickOmitCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "安全访问嵌套属性",
            blocks: [
              {
                type: "text",
                content: "使用路径字符串安全地获取或设置嵌套对象的属性值。",
              },
              {
                type: "code",
                code: getValueCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "值判断",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "空值判断",
            blocks: [
              {
                type: "text",
                content:
                  "检查值是否为空（null、undefined、空字符串、空数组或空对象）。",
              },
              {
                type: "code",
                code: isEmptyCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "深度比较",
            blocks: [
              {
                type: "text",
                content: "递归比较两个值是否相等，包括嵌套对象和数组。",
              },
              {
                type: "code",
                code: isEqualCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "异步工具",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "延迟函数",
            blocks: [
              {
                type: "text",
                content: "返回一个 Promise，在指定时间后 resolve。",
              },
              {
                type: "code",
                code: asyncCode,
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
