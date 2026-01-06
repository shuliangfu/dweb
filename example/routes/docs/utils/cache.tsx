/**
 * 缓存工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "缓存函数 - DWeb 框架文档",
  description:
    "DWeb 框架的缓存工具函数，提供简单的内存缓存功能，支持过期时间（TTL）和自动清理",
};

export default function CachePage() {
  const quickStartCode = `import {
  setCache,
  getCache,
  hasCache,
  deleteCache,
  clearCache,
  cached,
} from "@dreamer/dweb/utils/cache";

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

  @cached(1800, (id: number) => \`user:\${id}\`) // 自定义缓存键
  async getUserById(id: number) {
    return { id, name: "Alice" };
  }
}`;

  const content = {
    title: "缓存函数",
    description:
      "提供简单的内存缓存功能，支持过期时间（TTL）和自动清理。所有函数在服务端和客户端都可用。",
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
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
