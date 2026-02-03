/**
 * 用户服务
 * 模拟用户数据存储和操作
 */

import type { CreateUserRequest, UpdateUserRequest, User } from "../types/mod.ts";

/** 模拟用户数据库 */
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

/** 自增 ID */
let nextId = 4;

/**
 * 获取所有用户
 * @returns 用户列表
 */
export function getAllUsers(): User[] {
  return Array.from(users.values());
}

/**
 * 根据 ID 获取用户
 * @param id - 用户 ID
 * @returns 用户或 undefined
 */
export function getUserById(id: string): User | undefined {
  return users.get(id);
}

/**
 * 创建用户
 * @param data - 创建用户请求
 * @returns 新用户
 */
export function createUser(data: CreateUserRequest): User {
  const id = String(nextId++);
  const user: User = {
    id,
    name: data.name,
    email: data.email,
    role: data.role || "user",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
    createdAt: new Date().toISOString(),
  };
  users.set(id, user);
  return user;
}

/**
 * 更新用户
 * @param id - 用户 ID
 * @param data - 更新数据
 * @returns 更新后的用户或 undefined
 */
export function updateUser(id: string, data: UpdateUserRequest): User | undefined {
  const user = users.get(id);
  if (!user) return undefined;

  const updated: User = {
    ...user,
    ...data,
  };
  users.set(id, updated);
  return updated;
}

/**
 * 删除用户
 * @param id - 用户 ID
 * @returns 是否删除成功
 */
export function deleteUser(id: string): boolean {
  return users.delete(id);
}
