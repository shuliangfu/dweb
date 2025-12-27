/**
 * 索引定义类型
 */

/**
 * 索引方向（用于排序）
 */
export type IndexDirection =
  | 1
  | -1
  | "asc"
  | "desc"
  | "ascending"
  | "descending";

/**
 * 索引类型
 */
export type IndexType =
  | "normal"
  | "unique"
  | "text"
  | "geospatial"
  | "hashed"
  | "compound";

/**
 * 单个字段索引定义
 */
export interface SingleFieldIndex {
  /**
   * 字段名
   */
  field: string;
  /**
   * 索引方向（1 或 'asc' 表示升序，-1 或 'desc' 表示降序）
   */
  direction?: IndexDirection;
  /**
   * 索引类型
   */
  type?: IndexType;
  /**
   * 是否唯一索引
   */
  unique?: boolean;
  /**
   * 是否稀疏索引（MongoDB，只索引存在该字段的文档）
   */
  sparse?: boolean;
  /**
   * 是否部分索引（SQL，带条件的索引）
   */
  partial?: string; // SQL WHERE 条件
  /**
   * 索引名称（可选，自动生成）
   */
  name?: string;
}

/**
 * 复合索引定义
 */
export interface CompoundIndex {
  /**
   * 字段和方向的映射
   */
  fields: Record<string, IndexDirection>;
  /**
   * 索引类型
   */
  type?: IndexType;
  /**
   * 是否唯一索引
   */
  unique?: boolean;
  /**
   * 索引名称（可选，自动生成）
   */
  name?: string;
}

/**
 * 文本索引定义（MongoDB）
 */
export interface TextIndex {
  /**
   * 字段和权重的映射
   */
  fields: Record<string, number>;
  /**
   * 默认语言
   */
  defaultLanguage?: string;
  /**
   * 索引名称（可选，自动生成）
   */
  name?: string;
}

/**
 * 地理空间索引定义（MongoDB）
 */
export interface GeospatialIndex {
  /**
   * 字段名（必须是 GeoJSON 或坐标对）
   */
  field: string;
  /**
   * 索引类型：'2d', '2dsphere'
   */
  type: "2d" | "2dsphere";
  /**
   * 索引名称（可选，自动生成）
   */
  name?: string;
}

/**
 * 索引定义（可以是单个字段、复合、文本或地理空间）
 */
export type IndexDefinition =
  | SingleFieldIndex
  | CompoundIndex
  | TextIndex
  | GeospatialIndex;

/**
 * 索引定义数组
 */
export type IndexDefinitions = IndexDefinition[];
