/**
 * GraphQL 功能模块入口
 * 导出所有 GraphQL 相关的公共 API
 *
 * @module features/graphql
 */

export { GraphQLServer } from "./server.ts";
export { parseQuery, validateQuery } from "./parser.ts";
export { executeQuery } from "./executor.ts";
export type {
  GraphQLArgument,
  GraphQLConfig,
  GraphQLContext,
  GraphQLError,
  GraphQLField,
  GraphQLInfo,
  GraphQLRequest,
  GraphQLResolver,
  GraphQLResponse,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
} from "./types.ts";
export type { ParsedField, ParsedQuery } from "./parser.ts";
