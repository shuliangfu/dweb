/**
 * 用户相关类型定义
 * 前后端共享
 */

/** 用户角色 */
export type UserRole = "admin" | "user" | "guest";

/** 用户接口 */
export interface User {
  /** 用户 ID */
  id: string;
  /** 用户名 */
  name: string;
  /** 邮箱 */
  email: string;
  /** 角色 */
  role: UserRole;
  /** 头像 URL */
  avatar?: string;
  /** 创建时间 */
  createdAt: string;
}

/** 创建用户请求 */
export interface CreateUserRequest {
  name: string;
  email: string;
  role?: UserRole;
}

/** 更新用户请求 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
}

/** API 响应格式 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
