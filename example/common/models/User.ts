/**
 * 用户模型
 * 用于定义共享的数据模型
 */

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function createUser(data: Partial<User>): User {
  return {
    id: data.id || Date.now(),
    name: data.name || '',
    email: data.email || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}
