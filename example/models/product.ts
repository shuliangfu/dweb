/**
 * 产品模型（MongoDB）
 * 使用 MongoModel 定义，提供类型安全的产品数据管理
 */

import { MongoModel } from "@dreamer/dweb/database";

/**
 * 产品模型类
 * 继承 MongoModel，提供完整的 ODM 功能
 */
export class Product extends MongoModel {
  // 集合名称
  static override collectionName = "products";

  // 主键字段名（MongoDB 默认使用 _id）
  static override primaryKey = "_id";

  // 字段定义和验证规则
  static override schema = {
    // 产品名称：必填，长度 1-100
    name: {
      type: "string" as const,
      validate: {
        required: true,
        min: 1,
        max: 100,
        message: "产品名称长度必须在 1-100 之间",
      },
    },

    // 产品描述：可选，最大长度 2000
    description: {
      type: "string" as const,
      validate: {
        required: false,
        max: 2000,
      },
      default: null,
    },

    // 价格：必填，必须大于 0
    price: {
      type: "number" as const,
      validate: {
        required: true,
        min: 0.01,
        message: "价格必须大于 0",
      },
    },

    // 原价（用于显示折扣）：可选，必须大于等于现价
    originalPrice: {
      type: "number" as const,
      validate: {
        required: false,
        min: 0.01,
      },
      default: null,
    },

    // 分类ID：必填，关联到分类表
    categoryId: {
      type: "string" as const,
      validate: {
        required: true,
        message: "分类ID不能为空",
      },
    },

    // 库存数量：必填，必须大于等于 0
    stock: {
      type: "number" as const,
      validate: {
        required: true,
        min: 0,
        message: "库存数量不能为负数",
      },
      default: 0,
    },

    // 产品图片：数组，至少一张图片
    images: {
      type: "array" as const,
      validate: {
        required: true,
        min: 1,
        message: "至少需要一张产品图片",
      },
      default: [],
    },

    // 产品状态：枚举类型，默认为 active
    status: {
      type: "enum" as const,
      enum: ["active", "inactive", "sold_out"],
      default: "active",
      validate: {
        required: true,
      },
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

    // 销量：可选，默认为 0
    sales: {
      type: "number" as const,
      validate: {
        required: false,
        min: 0,
      },
      default: 0,
    },
  };

  // 索引定义
  static override indexes = [
    // 分类ID索引（用于按分类查询）
    { field: "categoryId" },
    // 状态索引（用于查询上架产品）
    { field: "status" },
    // 价格索引（用于价格范围查询）
    { field: "price" },
    // 排序索引（用于排序查询）
    { field: "sort", direction: -1 as const },
    // 销量索引（用于按销量排序）
    { field: "sales", direction: -1 as const },
    // 创建时间索引（用于排序，降序）
    { field: "createdAt", direction: -1 as const },
    // 复合索引：分类 + 状态（用于按分类查询上架产品）
    { fields: { categoryId: 1, status: 1 } },
  ];

  // 启用时间戳（自动管理 createdAt 和 updatedAt）
  static override timestamps = true;

  // 启用软删除（删除时设置 deletedAt 而不是真正删除）
  static override softDelete = true;

  // 作用域定义（用于常用查询）
  static override scopes = {
    // 上架产品
    active: () => ({ status: "active" }),
    // 下架产品
    inactive: () => ({ status: "inactive" }),
    // 售罄产品
    soldOut: () => ({ status: "sold_out" }),
    // 有库存产品
    inStock: () => ({ stock: { $gt: 0 } }),
    // 已删除产品（软删除）
    deleted: () => ({ deletedAt: { $exists: true, $ne: null } }),
  };

  /**
   * 根据分类ID查找产品
   * @param categoryId 分类ID
   * @returns 产品列表
   */
  static async findByCategoryId(categoryId: string): Promise<Product[]> {
    return await this.find({ categoryId, status: "active" })
      .sort({ sort: -1, createdAt: -1 })
      .findAll() as Product[];
  }

  /**
   * 根据分类ID查找上架产品
   * @param categoryId 分类ID
   * @returns 产品列表
   */
  static async findActiveByCategoryId(categoryId: string): Promise<Product[]> {
    return await this.find({ categoryId, status: "active", stock: { $gt: 0 } })
      .sort({ sort: -1, sales: -1, createdAt: -1 })
      .findAll() as Product[];
  }

  /**
   * 减少库存
   * @param quantity 减少的数量
   * @returns 是否成功
   */
  async decreaseStock(quantity: number): Promise<boolean> {
    const currentStock = this["stock"] as number;
    if (currentStock < quantity) {
      return false;
    }
    this["stock"] = currentStock - quantity;

    // 如果库存为0，更新状态为售罄
    if (this["stock"] === 0) {
      this["status"] = "sold_out";
    }

    await this.save();
    return true;
  }

  /**
   * 增加库存
   * @param quantity 增加的数量
   */
  async increaseStock(quantity: number): Promise<void> {
    const currentStock = this["stock"] as number;
    this["stock"] = currentStock + quantity;

    // 如果之前是售罄状态，恢复为活跃状态
    if (this["status"] === "sold_out") {
      this["status"] = "active";
    }

    await this.save();
  }

  /**
   * 增加销量
   * @param quantity 增加的数量
   */
  async increaseSales(quantity: number): Promise<void> {
    const currentSales = (this["sales"] as number) || 0;
    this["sales"] = currentSales + quantity;
    await this.save();
  }
}

// 导出模型
export default Product;
