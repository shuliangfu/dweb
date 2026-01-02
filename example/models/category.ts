/**
 * 产品分类模型（MongoDB）
 * 使用 MongoModel 定义，提供类型安全的产品分类数据管理
 * 只支持一级分类
 */

import { MongoModel } from "@dreamer/dweb/database";

/**
 * 产品分类模型类
 * 继承 MongoModel，提供完整的 ODM 功能
 */
export class Category extends MongoModel {
  // 集合名称
  static override collectionName = "categories";

  // 主键字段名（MongoDB 默认使用 _id）
  static override primaryKey = "_id";

  // 字段定义和验证规则
  static override schema = {
    // 分类名称：必填，长度 1-50
    name: {
      type: "string" as const,
      validate: {
        required: true,
        min: 1,
        max: 50,
        message: "分类名称长度必须在 1-50 之间",
      },
    },

    // 分类描述：可选，最大长度 500
    description: {
      type: "string" as const,
      validate: {
        required: false,
        max: 500,
      },
      default: null,
    },

    // 分类图标/图片 URL：可选
    icon: {
      type: "string" as const,
      validate: {
        required: false,
      },
      default: null,
    },

    // 排序权重：可选，数字越大越靠前，默认为 0
    sort: {
      type: "number" as const,
      validate: {
        required: false,
        min: 0,
      },
      default: 0,
    },

    // 状态：枚举类型，默认为 active
    status: {
      type: "enum" as const,
      enum: ["active", "inactive"],
      default: "active",
      validate: {
        required: true,
      },
    },
  };

  // 索引定义
  static override indexes = [
    // 分类名称唯一索引
    { field: "name", unique: true },
    // 状态索引（用于查询活跃分类）
    { field: "status" },
    // 排序索引（用于排序查询）
    { field: "sort", direction: -1 as const },
    // 创建时间索引（用于排序，降序）
    { field: "createdAt", direction: -1 as const },
  ];

  // 启用时间戳（自动管理 createdAt 和 updatedAt）
  static override timestamps = true;

  // 启用软删除（删除时设置 deletedAt 而不是真正删除）
  static override softDelete = true;

  // 作用域定义（用于常用查询）
  static override scopes = {
    // 活跃分类
    active: () => ({ status: "active" }),
    // 非活跃分类
    inactive: () => ({ status: "inactive" }),
    // 已删除分类（软删除）
    deleted: () => ({ deletedAt: { $exists: true, $ne: null } }),
  };

  /**
   * 根据分类名称查找分类
   * @param name 分类名称
   * @returns 分类实例或 null
   */
  static async findByName(name: string): Promise<Category | null> {
    return (await this.findOne({ name })) as Category | null;
  }

  /**
   * 获取所有活跃分类（按排序权重降序）
   * @returns 分类列表
   */
  static async findAllActive(): Promise<Category[]> {
    return await this.find({ status: "active" })
      .sort({ sort: -1, createdAt: -1 })
      .findAll() as Category[];
  }
}

// 导出模型
export default Category;
