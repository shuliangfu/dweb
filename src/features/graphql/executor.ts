/**
 * GraphQL 查询执行器
 * 
 * 执行 GraphQL 查询，调用解析器函数并返回结果。
 * 
 * @module features/graphql/executor
 */

import type {
  GraphQLSchema,
  GraphQLType,
  GraphQLContext,
  GraphQLInfo,
  GraphQLResponse,
} from './types.ts';
import type { ParsedQuery, ParsedField } from './parser.ts';

/**
 * 执行 GraphQL 查询
 * 
 * @param schema - GraphQL Schema
 * @param query - 解析后的查询
 * @param context - 上下文对象
 * @returns 查询结果
 * 
 * @example
 * ```typescript
 * const result = await executeQuery(schema, parsedQuery, context);
 * ```
 */
export async function executeQuery(
  schema: GraphQLSchema,
  query: ParsedQuery,
  context: GraphQLContext
): Promise<GraphQLResponse> {
  try {
    // 根据操作类型选择根类型
    const rootType = query.operation === 'mutation'
      ? schema.mutation
      : schema.query;

    if (!rootType) {
      return {
        errors: [{
          message: `${query.operation} 操作未定义`,
        }],
      };
    }

    // 执行查询
    const data: Record<string, unknown> = {};

    for (const field of query.fields) {
      try {
        const result = await executeField(
          rootType,
          field,
          null,
          query.variables,
          context,
          schema
        );
        const key = field.alias || field.name;
        data[key] = result;
      } catch (error) {
        return {
          data,
          errors: [{
            message: error instanceof Error ? error.message : String(error),
            path: field.path,
          }],
        };
      }
    }

    return { data };
  } catch (error) {
    return {
      errors: [{
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}

/**
 * 执行字段
 * 
 * @param type - 字段类型
 * @param field - 字段信息
 * @param parent - 父对象
 * @param variables - 查询变量
 * @param context - 上下文
 * @param schema - Schema
 * @returns 字段值
 */
async function executeField(
  type: GraphQLType,
  field: ParsedField,
  parent: unknown,
  variables: Record<string, unknown>,
  context: GraphQLContext,
  schema: GraphQLSchema
): Promise<unknown> {
  // 获取字段定义
  const fieldDef = type.fields?.[field.name];
  if (!fieldDef) {
    throw new Error(`字段 ${field.name} 未定义`);
  }

  // 解析参数
  const args: Record<string, unknown> = {};
  if (fieldDef.args) {
    for (const [argName, argDef] of Object.entries(fieldDef.args)) {
      const argValue = field.args[argName];
      if (argValue !== undefined) {
        // 如果是变量，从 variables 中获取
        if (typeof argValue === 'object' && argValue !== null && '__variable' in argValue) {
          const varName = (argValue as { __variable: string }).__variable;
          args[argName] = variables[varName];
        } else {
          args[argName] = argValue;
        }
      } else if (argDef.defaultValue !== undefined) {
        args[argName] = argDef.defaultValue;
      } else if (argDef.isNonNull) {
        throw new Error(`必需参数 ${argName} 未提供`);
      }
    }
  }

  // 创建查询信息
  const info: GraphQLInfo = {
    fieldName: field.name,
    path: field.path,
    selectedFields: field.fields?.map(f => f.name),
    variables,
  };

  // 调用解析器
  let value: unknown;
  if (fieldDef.resolve) {
    value = await fieldDef.resolve(parent, args, context, info);
  } else {
    // 如果没有解析器，尝试从 parent 中获取
    if (parent && typeof parent === 'object') {
      value = (parent as Record<string, unknown>)[field.name];
    } else {
      value = null;
    }
  }

  // 处理子字段
  if (field.fields && field.fields.length > 0 && value !== null && value !== undefined) {
    // 获取字段类型
    const fieldTypeName = typeof fieldDef.type === 'string' ? fieldDef.type : fieldDef.type.name;
    const fieldType = schema.types?.[fieldTypeName];

    if (fieldType) {
      // 如果是列表
      if (fieldDef.isList && Array.isArray(value)) {
        value = await Promise.all(
          value.map((item) => executeFields(fieldType, field.fields!, item, variables, context, schema))
        );
      } else {
        // 单个对象
        value = await executeFields(fieldType, field.fields, value, variables, context, schema);
      }
    }
  }

  return value;
}

/**
 * 执行多个字段
 * 
 * @param type - 对象类型
 * @param fields - 字段列表
 * @param parent - 父对象
 * @param variables - 查询变量
 * @param context - 上下文
 * @param schema - Schema
 * @returns 结果对象
 */
async function executeFields(
  type: GraphQLType,
  fields: ParsedField[],
  parent: unknown,
  variables: Record<string, unknown>,
  context: GraphQLContext,
  schema: GraphQLSchema
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    try {
      const value = await executeField(type, field, parent, variables, context, schema);
      const key = field.alias || field.name;
      result[key] = value;
    } catch (error) {
      // 记录错误但继续处理其他字段
      console.error(`执行字段 ${field.name} 失败:`, error);
    }
  }

  return result;
}

