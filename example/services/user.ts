/**
 * 用户服务示例
 * 演示如何创建和使用服务
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    // 初始化一些示例用户
    this.users.set("1", { id: "1", name: "Alice", email: "alice@example.com" });
    this.users.set("2", { id: "2", name: "Bob", email: "bob@example.com" });
  }

  /**
   * 根据 ID 获取用户
   */
  getUserById(id: string): User | null {
    return this.users.get(id) || null;
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 创建用户
   */
  createUser(user: Omit<User, "id">): User {
    const id = String(this.users.size + 1);
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  /**
   * 更新用户
   */
  updateUser(id: string, updates: Partial<Omit<User, "id">>): User | null {
    const user = this.users.get(id);
    if (!user) {
      return null;
    }
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * 删除用户
   */
  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
