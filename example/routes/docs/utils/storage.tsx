/**
 * 存储工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "存储工具 - DWeb 框架文档",
  description:
    "DWeb 框架的存储工具函数，封装 localStorage 和 sessionStorage，提供自动 JSON 序列化、过期时间等功能",
};

export default function StoragePage() {
  const quickStartCode =
    `import { setStorage, getStorage, removeStorage } from "@dreamer/dweb/utils/storage";

// 存储数据（自动序列化）
setStorage('user', { id: 1, name: 'Alice' });

// 获取数据（自动反序列化）
const user = getStorage('user');
// { id: 1, name: 'Alice' }

// 删除数据
removeStorage('user');`;

  const basicCode =
    `import { setStorage, getStorage, removeStorage, clearStorage } from "@dreamer/dweb/utils/storage";

// 存储对象
setStorage('user', { id: 1, name: 'Alice' });

// 存储数组
setStorage('items', [1, 2, 3]);

// 存储到 sessionStorage
setStorage('token', 'abc123', 'sessionStorage');

// 获取数据
const user = getStorage<User>('user');
// { id: 1, name: 'Alice' }

const token = getStorage('token', 'sessionStorage');

// 删除指定键
removeStorage('user');
removeStorage('token', 'sessionStorage');

// 清空所有存储
clearStorage(); // 清空 localStorage
clearStorage('sessionStorage'); // 清空 sessionStorage`;

  const expiryCode =
    `import { setStorageWithExpiry, getStorageWithExpiry } from "@dreamer/dweb/utils/storage";

// 存储 token，1 小时后过期
setStorageWithExpiry('token', 'abc123', 3600);

// 存储临时数据，5 分钟后过期
setStorageWithExpiry('temp', { data: 'xxx' }, 300);

// 获取带过期时间的存储
const token = getStorageWithExpiry('token');
if (!token) {
  // token 不存在或已过期，需要重新获取
}`;

  const managementCode =
    `import { hasStorage, getStorageKeys, getStorageSize, getTotalStorageSize } from "@dreamer/dweb/utils/storage";

// 检查存储是否存在
if (hasStorage('user')) {
  const user = getStorage('user');
}

// 获取所有存储键
const keys = getStorageKeys();
// ['user', 'token', 'settings']

// 获取指定键的存储大小
const size = getStorageSize('user');
console.log(\`用户数据占用 \${size} 字节\`);

// 获取所有存储的总大小
const totalSize = getTotalStorageSize();
console.log(\`localStorage 总占用 \${totalSize} 字节\`);`;

  const exampleCode = `import {
  setStorage,
  getStorage,
  setStorageWithExpiry,
  getStorageWithExpiry,
  hasStorage,
} from "@dreamer/dweb/utils/storage";

// 存储用户信息
setStorage('user', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});

// 存储带过期时间的 token
setStorageWithExpiry('token', 'abc123', 3600); // 1小时后过期

// 检查并获取数据
if (hasStorage('user')) {
  const user = getStorage('user');
  console.log(user);
}

// 获取 token（自动检查过期）
const token = getStorageWithExpiry('token');
if (token) {
  // 使用 token
} else {
  // token 已过期，重新获取
}`;

  const apiCode = `// 基础操作
- setStorage(key, value, type?) - 设置存储
- getStorage<T>(key, type?) - 获取存储
- removeStorage(key, type?) - 删除存储
- clearStorage(type?) - 清空所有存储
- hasStorage(key, type?) - 检查存储是否存在
- getStorageKeys(type?) - 获取所有存储键

// 带过期时间的存储
- setStorageWithExpiry(key, value, ttl, type?) - 设置带过期时间的存储
- getStorageWithExpiry<T>(key, type?) - 获取带过期时间的存储

// 存储大小
- getStorageSize(key, type?) - 获取指定键的存储大小（字节）
- getTotalStorageSize(type?) - 获取所有存储的总大小（字节）

// 类型
- StorageType - 存储类型（'localStorage' | 'sessionStorage'）`;

  const content = {
    title: "存储工具",
    description:
      "封装 localStorage 和 sessionStorage，提供自动 JSON 序列化、过期时间等功能。",
    sections: [
      {
        title: "环境兼容性",
        blocks: [
          {
            type: "alert",
            variant: "warning",
            title: "客户端专用",
            content:
              "所有存储工具函数仅在浏览器环境可用。在服务端环境调用这些函数会抛出异常。",
          },
        ],
      },
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
        title: "基础操作",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "设置存储",
            blocks: [
              {
                type: "text",
                content: "自动将值序列化为 JSON 字符串存储。",
              },
              {
                type: "code",
                code: basicCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "带过期时间的存储",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "设置带过期时间的存储",
            blocks: [
              {
                type: "text",
                content: "存储的值会在指定时间后自动过期。",
              },
              {
                type: "code",
                code: expiryCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "存储管理",
        blocks: [
          {
            type: "code",
            code: managementCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: exampleCode,
            language: "typescript",
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
