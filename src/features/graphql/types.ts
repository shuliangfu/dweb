/**
 * GraphQL 功能类型定义
 *
 * @module features/graphql/types
 */

/**
 * GraphQL 标量类型
 */
export type GraphQLScalarType = "String" | "Int" | "Float" | "Boolean" | "ID";

/**
 * GraphQL 类型定义
 */
export interface GraphQLType {
  /** 类型名称 */
  name: string;
  /** 类型描述 */
  description?: string;
  /** 字段定义 */
  fields?: Record<string, GraphQLField>;
  /** 是否为标量类型 */
  isScalar?: boolean;
  /** 是否为列表类型 */
  isList?: boolean;
  /** 是否为非空类型 */
  isNonNull?: boolean;
  /** 列表项是否为非空 */
  isListNonNull?: boolean;
}

/**
 * GraphQL 字段定义
 */
export interface GraphQLField {
  /** 字段类型 */
  type: string | GraphQLType;
  /** 字段描述 */
  description?: string;
  /** 参数定义 */
  args?: Record<string, GraphQLArgument>;
  /** 是否为非空 */
  isNonNull?: boolean;
  /** 是否为列表 */
  isList?: boolean;
  /** 列表项是否为非空 */
  isListNonNull?: boolean;
  /** 解析器函数 */
  resolve?: GraphQLResolver;
}

/**
 * GraphQL 参数定义
 */
export interface GraphQLArgument {
  /** 参数类型 */
  type: string | GraphQLScalarType;
  /** 参数描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** 是否为非空 */
  isNonNull?: boolean;
  /** 是否为列表 */
  isList?: boolean;
}

/**
 * GraphQL 解析器函数
 *
 * @param parent - 父对象（对于嵌套字段）
 * @param args - 查询参数
 * @param context - 上下文对象（包含请求信息、数据库等）
 * @param info - 查询信息（字段选择、路径等）
 * @returns 解析结果
 */
export type GraphQLResolver = (
  parent: unknown,
  args: Record<string, unknown>,
  context: GraphQLContext,
  info: GraphQLInfo,
) => unknown | Promise<unknown>;

/**
 * GraphQL 上下文对象
 */
export interface GraphQLContext {
  /** 请求对象 */
  req?: unknown;
  /** 数据库适配器（如果配置了数据库） */
  db?: unknown;
  /** 用户信息（如果已认证） */
  user?: unknown;
  /** 自定义上下文数据 */
  [key: string]: unknown;
}

/**
 * GraphQL 查询信息
 */
export interface GraphQLInfo {
  /** 字段名称 */
  fieldName: string;
  /** 字段路径 */
  path: string[];
  /** 选择的字段 */
  selectedFields?: string[];
  /** 查询变量 */
  variables?: Record<string, unknown>;
}

/**
 * GraphQL Schema 定义
 */
export interface GraphQLSchema {
  /** Query 类型定义 */
  query?: GraphQLType;
  /** Mutation 类型定义 */
  mutation?: GraphQLType;
  /** Subscription 类型定义（暂不支持） */
  subscription?: GraphQLType;
  /** 自定义类型定义 */
  types?: Record<string, GraphQLType>;
  /** 标量类型定义 */
  scalars?: Record<string, GraphQLScalarType>;
}

/**
 * GraphQL 查询请求
 */
export interface GraphQLRequest {
  /** 查询字符串 */
  query: string;
  /** 操作名称（可选） */
  operationName?: string;
  /** 查询变量（可选） */
  variables?: Record<string, unknown>;
}

/**
 * GraphQL 响应
 */
export interface GraphQLResponse {
  /** 查询结果 */
  data?: unknown;
  /** 错误列表 */
  errors?: GraphQLError[];
  /** 扩展信息 */
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL 错误
 */
export interface GraphQLError {
  /** 错误消息 */
  message: string;
  /** 错误位置 */
  locations?: Array<{ line: number; column: number }>;
  /** 错误路径 */
  path?: Array<string | number>;
  /** 扩展信息 */
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL 服务器配置
 */
export interface GraphQLConfig {
  /** GraphQL 端点路径（默认: '/graphql'） */
  path?: string;
  /** 是否启用 GraphiQL（开发环境，默认: true） */
  graphiql?: boolean;
  /** GraphiQL 路径（默认: '/graphiql'） */
  graphiqlPath?: string;
  /** 是否启用查询验证（默认: true） */
  validation?: boolean;
  /** 是否启用查询缓存（默认: true） */
  cache?: boolean;
  /** 最大查询深度（默认: 10） */
  maxDepth?: number;
  /** 最大查询复杂度（默认: 1000） */
  maxComplexity?: number;
  /** 上下文生成函数 */
  context?: (req: unknown) => GraphQLContext | Promise<GraphQLContext>;
}
