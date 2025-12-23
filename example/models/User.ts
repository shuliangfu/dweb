/**
 * 用户模型（MongoDB）
 * 使用 MongoModel 定义，提供类型安全的用户数据管理
 */

import { MongoModel } from "@dreamer/dweb";

/**
 * 用户模型类
 * 继承 MongoModel，提供完整的 ODM 功能
 */
export class User extends MongoModel {
  // 集合名称
  static override collectionName = "users";

  // 主键字段名（MongoDB 默认使用 _id）
  static override primaryKey = "_id";

  // 字段定义和验证规则
  static override schema = {
    // 用户名：必填，长度 2-50，只能包含字母、数字和下划线
    username: {
      type: "string" as const,
      validate: {
        required: true,
        min: 2,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        message: "用户名只能包含字母、数字和下划线，长度 2-50",
      },
    },

    // 邮箱：必填，邮箱格式验证
    email: {
      type: "string" as const,
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "邮箱格式不正确",
      },
    },

    // 密码：必填，最小长度 8
    password: {
      type: "string" as const,
      validate: {
        required: true,
        min: 8,
        message: "密码长度至少 8 位",
      },
    },

    // 昵称：可选，最大长度 50
    nickname: {
      type: "string" as const,
      validate: {
        required: false,
        max: 50,
      },
      default: null,
    },

    // 头像 URL：可选
    avatar: {
      type: "string" as const,
      validate: {
        required: false,
      },
      default: null,
    },

    // 年龄：可选，范围 0-150
    age: {
      type: "number" as const,
      validate: {
        required: false,
        min: 0,
        max: 150,
      },
      default: null,
    },

    // 状态：枚举类型，默认为 active
    status: {
      type: "enum" as const,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      validate: {
        required: true,
      },
    },

    // 角色：数组类型，默认为空数组
    roles: {
      type: "array" as const,
      default: [],
      validate: {
        required: false,
      },
    },

    // 手机号：可选，11 位数字
    phone: {
      type: "string" as const,
      validate: {
        required: false,
        pattern: /^1[3-9]\d{9}$/,
        message: "手机号格式不正确",
      },
      default: null,
    },

    // 最后登录时间：可选
    lastLoginAt: {
      type: "date" as const,
      validate: {
        required: false,
      },
      default: null,
    },
  };

  // 索引定义
  static override indexes = [
    // 邮箱唯一索引
    { field: "email", unique: true },
    // 用户名唯一索引
    // { field: "username", unique: true },
    // 手机号唯一索引（可选字段，但如果有值则必须唯一）
    { field: "phone", unique: true, sparse: true },
    // 状态索引（用于查询活跃用户）
    { field: "status" },
    // 创建时间索引（用于排序，降序）
    { field: "createdAt", direction: -1 as const },
  ];

  // 启用时间戳（自动管理 createdAt 和 updatedAt）
  static override timestamps = true;

  // 启用软删除（删除时设置 deletedAt 而不是真正删除）
  static override softDelete = true;

  // 作用域定义（用于常用查询）
  static override scopes = {
    // 活跃用户
    active: () => ({ status: "active" }),
    // 非活跃用户
    inactive: () => ({ status: "inactive" }),
    // 已删除用户（软删除）
    deleted: () => ({ deletedAt: { $exists: true, $ne: null } }),
  };

  /**
   * 根据邮箱查找用户
   * @param email 邮箱地址
   * @returns 用户实例或 null
   */
  static async findByEmail(email: string): Promise<User | null> {
    return (await this.findOne({ email })) as User | null;
  }

  /**
   * 根据用户名查找用户
   * @param username 用户名
   * @returns 用户实例或 null
   */
  static async findByUsername(username: string): Promise<User | null> {
    return (await this.findOne({ username })) as User | null;
  }

  /**
   * 验证密码（示例方法，实际应用中应使用加密库）
   * @param plainPassword 明文密码
   * @returns 是否匹配
   */
  verifyPassword(plainPassword: string): boolean {
    // 注意：这里只是示例，实际应用中应该使用 bcrypt 等加密库
    // 并且密码应该存储在加密后的形式
    // 使用索引签名访问属性
    const password = this["password"] as string | undefined;
    return password === plainPassword;
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(): Promise<void> {
    // 使用索引签名访问和设置属性
    this["lastLoginAt"] = new Date();
    await this.save();
  }
}

// 导出模型
export default User;
