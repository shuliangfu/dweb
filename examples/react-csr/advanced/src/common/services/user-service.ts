/**
 * 用户服务
 */

import type { User } from "../types/mod.ts";

const users: Map<string, User> = new Map([
  ["1", {
    id: "1",
    name: "张三",
    email: "zhangsan@example.com",
    role: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan",
    createdAt: "2024-01-01T00:00:00Z",
  }],
  ["2", {
    id: "2",
    name: "李四",
    email: "lisi@example.com",
    role: "user",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisi",
    createdAt: "2024-01-15T00:00:00Z",
  }],
  ["3", {
    id: "3",
    name: "王五",
    email: "wangwu@example.com",
    role: "guest",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu",
    createdAt: "2024-02-01T00:00:00Z",
  }],
]);

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}
