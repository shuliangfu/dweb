/**
 * GraphQL 查询解析器
 *
 * 解析 GraphQL 查询字符串，提取查询信息。
 *
 * @module features/graphql/parser
 */

import type { GraphQLError } from "./types.ts";

/**
 * 解析后的查询信息
 */
export interface ParsedQuery {
  /** 操作类型（query、mutation、subscription） */
  operation: "query" | "mutation" | "subscription";
  /** 操作名称 */
  operationName?: string;
  /** 选择的字段 */
  fields: ParsedField[];
  /** 查询变量 */
  variables: Record<string, unknown>;
}

/**
 * 解析后的字段信息
 */
export interface ParsedField {
  /** 字段名称 */
  name: string;
  /** 别名 */
  alias?: string;
  /** 参数 */
  args: Record<string, unknown>;
  /** 子字段 */
  fields?: ParsedField[];
  /** 字段路径 */
  path: string[];
}

/**
 * 解析 GraphQL 查询字符串
 *
 * @param query - GraphQL 查询字符串
 * @param variables - 查询变量
 * @returns 解析后的查询信息
 *
 * @example
 * ```typescript
 * const parsed = parseQuery('{ user(id: 1) { id name } }');
 * ```
 */
export function parseQuery(
  query: string,
  variables: Record<string, unknown> = {},
): ParsedQuery {
  // 移除注释和多余空白
  const cleaned = query
    .replace(/#[^\n]*/g, "") // 移除注释
    .replace(/\s+/g, " ") // 合并空白
    .trim();

  // 简单的解析实现（支持基本查询语法）
  const operationMatch = cleaned.match(
    /^(query|mutation|subscription)\s+(\w+)?/,
  );
  const operation = (operationMatch?.[1] || "query") as
    | "query"
    | "mutation"
    | "subscription";
  const operationName = operationMatch?.[2];

  // 提取字段
  const fields = extractFields(cleaned, []);

  return {
    operation,
    operationName,
    fields,
    variables,
  };
}

/**
 * 提取字段
 *
 * @param query - 查询字符串片段
 * @param path - 当前路径
 * @returns 字段列表
 */
function extractFields(query: string, path: string[]): ParsedField[] {
  const fields: ParsedField[] = [];

  // 查找字段选择集（花括号内的内容）
  const braceMatch = query.match(/\{([^}]+)\}/);
  if (!braceMatch) {
    return fields;
  }

  const fieldContent = braceMatch[1];
  const fieldPattern =
    /(\w+)(?:\s*:\s*(\w+))?\s*(?:\(([^)]*)\))?\s*(\{[^}]*\})?/g;

  let match;
  while ((match = fieldPattern.exec(fieldContent)) !== null) {
    const [, aliasOrName, name, argsStr, subFields] = match;
    const fieldName = name || aliasOrName;
    const fieldAlias = name ? aliasOrName : undefined;

    // 解析参数
    const args: Record<string, unknown> = {};
    if (argsStr) {
      const argPattern = /(\w+):\s*([^,]+)/g;
      let argMatch;
      while ((argMatch = argPattern.exec(argsStr)) !== null) {
        const [, argName, argValue] = argMatch;
        args[argName] = parseValue(argValue.trim());
      }
    }

    // 提取子字段
    const nestedFields = subFields
      ? extractFields(subFields, [...path, fieldName])
      : undefined;

    fields.push({
      name: fieldName,
      alias: fieldAlias,
      args,
      fields: nestedFields,
      path: [...path, fieldName],
    });
  }

  return fields;
}

/**
 * 解析值（字符串、数字、布尔值、变量、null）
 *
 * @param value - 值字符串
 * @returns 解析后的值
 */
function parseValue(value: string): unknown {
  // 移除引号
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // 布尔值
  if (value === "true") return true;
  if (value === "false") return false;

  // null
  if (value === "null") return null;

  // 变量（以 $ 开头）
  if (value.startsWith("$")) {
    return { __variable: value.slice(1) };
  }

  // 数字
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // 字符串（默认）
  return value;
}

/**
 * 验证 GraphQL 查询
 *
 * @param query - GraphQL 查询字符串
 * @param maxDepth - 最大查询深度
 * @param maxComplexity - 最大查询复杂度
 * @returns 错误列表（如果有）
 */
export function validateQuery(
  query: string,
  maxDepth: number = 10,
  maxComplexity: number = 1000,
): GraphQLError[] {
  const errors: GraphQLError[] = [];

  try {
    const parsed = parseQuery(query);

    // 检查查询深度
    const depth = calculateDepth(parsed.fields);
    if (depth > maxDepth) {
      errors.push({
        message: `查询深度 ${depth} 超过最大深度 ${maxDepth}`,
        extensions: { maxDepth, actualDepth: depth },
      });
    }

    // 检查查询复杂度
    const complexity = calculateComplexity(parsed.fields);
    if (complexity > maxComplexity) {
      errors.push({
        message: `查询复杂度 ${complexity} 超过最大复杂度 ${maxComplexity}`,
        extensions: { maxComplexity, actualComplexity: complexity },
      });
    }
  } catch (error) {
    errors.push({
      message: error instanceof Error ? error.message : "查询解析失败",
    });
  }

  return errors;
}

/**
 * 计算查询深度
 *
 * @param fields - 字段列表
 * @returns 查询深度
 */
function calculateDepth(fields: ParsedField[]): number {
  if (fields.length === 0) {
    return 1;
  }

  let maxDepth = 1;
  for (const field of fields) {
    if (field.fields && field.fields.length > 0) {
      const depth = 1 + calculateDepth(field.fields);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * 计算查询复杂度
 *
 * @param fields - 字段列表
 * @returns 查询复杂度
 */
function calculateComplexity(fields: ParsedField[]): number {
  let complexity = 0;

  for (const field of fields) {
    complexity += 1; // 每个字段基础复杂度为 1

    if (field.fields && field.fields.length > 0) {
      complexity += calculateComplexity(field.fields);
    }
  }

  return complexity;
}
